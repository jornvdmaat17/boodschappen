import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useListRoom } from '../hooks/useSocket';
import ProductPicker from '../components/ProductPicker';
import { DAY_NAMES } from '../types';
import type { ShoppingListDetail, Recipe, ListItem } from '../types';

export default function ListViewPage() {
  const { id } = useParams();
  const listId = Number(id);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const queryClient = useQueryClient();

  const { data: list, isLoading } = useQuery<ShoppingListDetail>({
    queryKey: ['list', listId],
    queryFn: () => api(`/shopping-lists/${listId}`),
  });

  useListRoom(listId, () => {
    queryClient.invalidateQueries({ queryKey: ['list', listId] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  });

  const toggleItem = useMutation({
    mutationFn: ({ productId, checked }: { productId: number; checked: boolean }) =>
      api(`/shopping-lists/${listId}/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ checked }),
      }),
    onMutate: ({ productId, checked }) => {
      queryClient.setQueryData<ShoppingListDetail>(['list', listId], (old) =>
        old
          ? { ...old, items: old.items.map((i) => (i.product_id === productId ? { ...i, checked } : i)) }
          : old
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list', listId] }),
  });

  const addItem = useMutation({
    mutationFn: (product_id: number) =>
      api(`/shopping-lists/${listId}/items`, { method: 'POST', body: JSON.stringify({ product_id }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['list', listId] }),
  });

  const removeItem = useMutation({
    mutationFn: (productId: number) =>
      api(`/shopping-lists/${listId}/items/${productId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['list', listId] }),
  });

  const addRecipe = useMutation({
    mutationFn: (recipe_id: number) =>
      api(`/shopping-lists/${listId}/recipes`, { method: 'POST', body: JSON.stringify({ recipe_id }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      setShowAddRecipe(false);
    },
  });

  const setCompleted = useMutation({
    mutationFn: (completed: boolean) =>
      api(`/shopping-lists/${listId}`, { method: 'PUT', body: JSON.stringify({ completed }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  if (isLoading || !list) return <p className="text-stone-500">Laden...</p>;

  const done = !!list.completed_at;
  const groups: { key: string; name: string; items: ListItem[] }[] = [];
  for (const item of list.items) {
    const key = item.category_name ?? 'overig';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, name: item.category_name ?? 'Overig', items: [item] });
  }
  const checkedCount = list.items.filter((i) => i.checked).length;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {list.type === 'weekly' ? '📅 Weeklijst' : '⚡ Snelle lijst'}
          </h1>
          <p className="text-sm text-stone-500">
            {list.store_name} · {checkedCount}/{list.items.length} gedaan
            {done && ' · afgerond'}
          </p>
        </div>
        <Link to="/" className="text-sm text-emerald-700">
          ← terug
        </Link>
      </div>

      {list.type === 'weekly' && list.meal_plan && (
        <div className="bg-white rounded-xl shadow">
          <button
            onClick={() => setShowMealPlan(!showMealPlan)}
            className="w-full px-4 py-3 flex justify-between items-center text-sm font-medium"
          >
            <span>Maaltijden deze week</span>
            <span className="text-stone-400">{showMealPlan ? '▲' : '▼'}</span>
          </button>
          {showMealPlan && <MealPlanEditor listId={listId} plan={list.meal_plan} disabled={done} />}
        </div>
      )}

      {!done && (
        <div className="bg-white rounded-xl shadow p-4 space-y-2">
          <ProductPicker onPick={(p) => addItem.mutate(p.id)} excludeIds={list.items.map((i) => i.product_id)} />
          <button onClick={() => setShowAddRecipe(!showAddRecipe)} className="text-sm text-emerald-700 font-medium">
            {showAddRecipe ? '− recept toevoegen' : '+ recept toevoegen'}
          </button>
          {showAddRecipe && <RecipeAdder onAdd={(id) => addRecipe.mutate(id)} />}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group, gi) => (
          <div key={gi} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-2 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {group.name}
            </div>
            <div className="divide-y divide-stone-100">
              {group.items.map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={done}
                    onChange={(e) => toggleItem.mutate({ productId: item.product_id, checked: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600"
                  />
                  <span className={`flex-1 text-sm ${item.checked ? 'line-through text-stone-400' : ''}`}>
                    {item.product_name}
                  </span>
                  {!done && (
                    <button
                      onClick={() => removeItem.mutate(item.product_id)}
                      className="text-stone-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {list.items.length === 0 && <p className="text-sm text-stone-500 text-center py-6">Nog geen producten.</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-3">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setCompleted.mutate(!done)}
            className={`w-full rounded-xl py-2.5 font-medium ${
              done ? 'bg-stone-200 text-stone-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {done ? 'Heropenen' : 'Lijst afronden ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MealPlanEditor({
  listId,
  plan,
  disabled,
}: {
  listId: number;
  plan: { day_of_week: number; recipe_id: number | null }[];
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });

  const updateDay = useMutation({
    mutationFn: ({ day, recipe_id }: { day: number; recipe_id: number | null }) =>
      api(`/shopping-lists/${listId}/meal-plan/${day}`, {
        method: 'PUT',
        body: JSON.stringify({ recipe_id }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['list', listId] }),
  });

  const byDay = new Map(plan.map((d) => [d.day_of_week, d.recipe_id]));

  return (
    <div className="border-t border-stone-100 divide-y divide-stone-50">
      {DAY_NAMES.map((name, day) => (
        <div key={day} className="px-4 py-2 flex items-center gap-3">
          <span className="w-24 text-sm">{name}</span>
          <select
            value={byDay.get(day) ?? ''}
            disabled={disabled || updateDay.isPending}
            onChange={(e) =>
              updateDay.mutate({ day, recipe_id: e.target.value ? Number(e.target.value) : null })
            }
            className="flex-1 border border-stone-200 rounded-lg px-2 py-1 text-sm"
          >
            <option value="">— geen —</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function RecipeAdder({ onAdd }: { onAdd: (id: number) => void }) {
  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });
  return (
    <div className="flex flex-wrap gap-2">
      {recipes.map((r) => (
        <button
          key={r.id}
          onClick={() => onAdd(r.id)}
          className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-emerald-100"
        >
          {r.name}
        </button>
      ))}
      {recipes.length === 0 && <p className="text-sm text-stone-500">Nog geen recepten.</p>}
    </div>
  );
}
