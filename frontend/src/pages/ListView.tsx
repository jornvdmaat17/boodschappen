import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useListRoom } from '../hooks/useSocket';
import ProductPicker from '../components/ProductPicker';
import QtyControl from '../components/QtyControl';
import OptionalItemsModal from '../components/OptionalItemsModal';
import { DAY_NAMES, SPECIAL_DAYS, formatDate } from '../types';
import type { ShoppingListDetail, Recipe, ListItem, RecipeProduct, MealPlanDay } from '../types';

export default function ListViewPage() {
  const { id } = useParams();
  const listId = Number(id);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const prevComplete = useRef<Record<string, boolean> | null>(null);
  const prevAllDone = useRef<boolean | null>(null);
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

  const setItemQty = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      api(`/shopping-lists/${listId}/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),
    onMutate: ({ productId, quantity }) => {
      queryClient.setQueryData<ShoppingListDetail>(['list', listId], (old) =>
        old
          ? { ...old, items: old.items.map((i) => (i.product_id === productId ? { ...i, quantity } : i)) }
          : old
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['list', listId] }),
  });

  const removeItem = useMutation({
    mutationFn: (productId: number) =>
      api(`/shopping-lists/${listId}/items/${productId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['list', listId] }),
  });

  const addRecipe = useMutation({
    mutationFn: ({ recipe_id, optional_include }: { recipe_id: number; optional_include: number[] }) =>
      api(`/shopping-lists/${listId}/recipes`, {
        method: 'POST',
        body: JSON.stringify({ recipe_id, optional_include }),
      }),
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

  const setDate = useMutation({
    mutationFn: (shopping_date: string) =>
      api(`/shopping-lists/${listId}`, { method: 'PUT', body: JSON.stringify({ shopping_date }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const items = list?.items;

  // Auto-collapse a category the moment its last item is checked, with a small
  // confetti burst; a bigger one when the whole list is done. Only on
  // transitions, never on initial load.
  useEffect(() => {
    if (!items) return;
    const completeNow: Record<string, boolean> = {};
    for (const item of items) {
      const key = item.category_name ?? 'overig';
      completeNow[key] = (completeNow[key] ?? true) && item.checked;
    }
    const allDone = items.length > 0 && items.every((i) => i.checked);
    const prev = prevComplete.current;
    if (prev !== null) {
      for (const [key, isDone] of Object.entries(completeNow)) {
        if (isDone && prev[key] === false) {
          setCollapsed((c) => ({ ...c, [key]: true }));
          confetti({ particleCount: 45, spread: 70, startVelocity: 25, origin: { y: 0.6 } });
        }
      }
      if (allDone && prevAllDone.current === false) {
        confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
        confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
        setTimeout(
          () => confetti({ particleCount: 120, spread: 120, startVelocity: 35, origin: { y: 0.5 } }),
          250
        );
      }
    }
    prevComplete.current = completeNow;
    prevAllDone.current = allDone;
  }, [items]);

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
          <p className="text-sm text-stone-500 flex items-center gap-1 flex-wrap">
            <span>{list.store_name} ·</span>
            {done ? (
              <span>{formatDate(list.shopping_date)}</span>
            ) : (
              <input
                type="date"
                value={list.shopping_date.slice(0, 10)}
                onChange={(e) => e.target.value && setDate.mutate(e.target.value)}
                className="border border-stone-200 rounded px-1 py-0.5 text-xs text-stone-600 bg-white"
              />
            )}
            <span>· {checkedCount}/{list.items.length} gedaan{done && ' · afgerond'}</span>
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
          {showAddRecipe && (
            <RecipeAdder onAdd={(recipe_id, optional_include) => addRecipe.mutate({ recipe_id, optional_include })} />
          )}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const groupDone = group.items.every((i) => i.checked);
          const groupChecked = group.items.filter((i) => i.checked).length;
          const isCollapsed = collapsed[group.key] ?? false;
          return (
          <div key={group.key} className="bg-white rounded-xl shadow overflow-hidden">
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
              className={`w-full px-4 py-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide ${
                groupDone ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-50 text-stone-500'
              }`}
            >
              <span>
                {groupDone && '✓ '}
                {group.name}
              </span>
              <span className="flex items-center gap-2 normal-case font-normal">
                {groupChecked}/{group.items.length}
                <span className="text-stone-400">{isCollapsed ? '▸' : '▾'}</span>
              </span>
            </button>
            {!isCollapsed && (
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
                  <span className={`flex-1 min-w-0 text-sm ${item.checked ? 'line-through text-stone-400' : ''}`}>
                    {(done || item.checked) && item.quantity >= 2 && (
                      <b className="text-emerald-700 mr-1">{item.quantity}×</b>
                    )}
                    {item.product_name}
                  </span>
                  {!done && !item.checked && (
                    <QtyControl
                      value={item.quantity}
                      onChange={(q) => setItemQty.mutate({ productId: item.product_id, quantity: q })}
                    />
                  )}
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
            )}
          </div>
          );
        })}
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
  plan: MealPlanDay[];
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState<{ day: number; recipeId: number; products: RecipeProduct[] } | null>(
    null
  );
  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });

  const updateDay = useMutation({
    mutationFn: ({
      day,
      recipe_id,
      special,
      optional_include,
    }: {
      day: number;
      recipe_id: number | null;
      special: string | null;
      optional_include: number[];
    }) =>
      api(`/shopping-lists/${listId}/meal-plan/${day}`, {
        method: 'PUT',
        body: JSON.stringify({ recipe_id, special, optional_include }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      queryClient.invalidateQueries({ queryKey: ['today-menu'] });
    },
  });

  function changeDay(day: number, value: string) {
    if (value.startsWith('s:')) {
      return updateDay.mutate({ day, recipe_id: null, special: value.slice(2), optional_include: [] });
    }
    const recipeId = value ? Number(value) : null;
    const recipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;
    const optionals = recipe?.products.filter((p) => p.optional) ?? [];
    if (recipeId && optionals.length > 0) setAsking({ day, recipeId, products: optionals });
    else updateDay.mutate({ day, recipe_id: recipeId, special: null, optional_include: [] });
  }

  const byDay = new Map<number, MealPlanDay>(plan.map((d) => [d.day_of_week, d]));

  return (
    <div className="border-t border-stone-100 divide-y divide-stone-50">
      {DAY_NAMES.map((name, day) => (
        <div key={day} className="px-4 py-2 flex items-center gap-3">
          <span className="w-24 text-sm">{name}</span>
          <select
            value={
              byDay.get(day)?.special
                ? `s:${byDay.get(day)!.special}`
                : byDay.get(day)?.recipe_id ?? ''
            }
            disabled={disabled || updateDay.isPending}
            onChange={(e) => changeDay(day, e.target.value)}
            className="flex-1 min-w-0 border border-stone-200 rounded-lg px-2 py-1 text-sm"
          >
            <option value="">— geen —</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {SPECIAL_DAYS.map((s) => (
              <option key={s.value} value={`s:${s.value}`}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {asking && (
        <OptionalItemsModal
          products={asking.products}
          onClose={() => setAsking(null)}
          onConfirm={(ids) => {
            updateDay.mutate({
              day: asking.day,
              recipe_id: asking.recipeId,
              special: null,
              optional_include: ids,
            });
            setAsking(null);
          }}
        />
      )}
    </div>
  );
}

function RecipeAdder({ onAdd }: { onAdd: (id: number, optionalInclude: number[]) => void }) {
  const [asking, setAsking] = useState<{ recipeId: number; products: RecipeProduct[] } | null>(null);
  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });

  function pick(recipe: Recipe) {
    const optionals = recipe.products.filter((p) => p.optional);
    if (optionals.length > 0) setAsking({ recipeId: recipe.id, products: optionals });
    else onAdd(recipe.id, []);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {recipes.map((r) => (
        <button
          key={r.id}
          onClick={() => pick(r)}
          className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-emerald-100"
        >
          {r.name}
        </button>
      ))}
      {recipes.length === 0 && <p className="text-sm text-stone-500">Nog geen recepten.</p>}
      {asking && (
        <OptionalItemsModal
          products={asking.products}
          onClose={() => setAsking(null)}
          onConfirm={(ids) => {
            onAdd(asking.recipeId, ids);
            setAsking(null);
          }}
        />
      )}
    </div>
  );
}
