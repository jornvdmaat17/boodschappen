import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import ProductPicker from '../components/ProductPicker';
import { DAY_NAMES } from '../types';
import type { Recipe, Store, Product } from '../types';

export default function WeeklyCreatePage() {
  const [storeId, setStoreId] = useState<number | ''>('');
  const [days, setDays] = useState<(number | null)[]>(Array(7).fill(null));
  const [newRecipeForDay, setNewRecipeForDay] = useState<number | null>(null);
  const navigate = useNavigate();

  const { data: stores = [] } = useQuery<Store[]>({ queryKey: ['stores'], queryFn: () => api('/stores') });
  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });

  const createList = useMutation({
    mutationFn: () =>
      api('/shopping-lists', {
        method: 'POST',
        body: JSON.stringify({
          type: 'weekly',
          store_id: storeId,
          days: days.map((recipe_id, day_of_week) => ({ day_of_week, recipe_id })),
        }),
      }),
    onSuccess: (list: any) => navigate(`/list/${list.id}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nieuwe weeklijst</h1>

      <div className="bg-white rounded-xl shadow p-4">
        <label className="text-sm font-medium block mb-1">Winkel</label>
        {stores.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nog geen winkels. <Link to="/stores" className="text-emerald-700 underline">Voeg eerst een winkel toe</Link>.
          </p>
        ) : (
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : '')}
            className="w-full border border-stone-300 rounded-lg px-3 py-2"
          >
            <option value="">Kies een winkel...</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl shadow divide-y divide-stone-100">
        {DAY_NAMES.map((name, day) => (
          <div key={day} className="p-3 flex items-center gap-3">
            <span className="w-24 text-sm font-medium">{name}</span>
            <select
              value={days[day] ?? ''}
              onChange={(e) => {
                const next = [...days];
                next[day] = e.target.value ? Number(e.target.value) : null;
                setDays(next);
              }}
              className="flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="">— geen maaltijd —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setNewRecipeForDay(day)}
              className="text-emerald-700 text-sm font-medium whitespace-nowrap"
              title="Nieuw recept"
            >
              + nieuw
            </button>
          </div>
        ))}
      </div>

      {newRecipeForDay !== null && (
        <NewRecipeModal
          onClose={() => setNewRecipeForDay(null)}
          onCreated={(recipe) => {
            const next = [...days];
            next[newRecipeForDay] = recipe.id;
            setDays(next);
            setNewRecipeForDay(null);
          }}
        />
      )}

      <button
        onClick={() => createList.mutate()}
        disabled={!storeId || createList.isPending}
        className="w-full bg-emerald-600 text-white rounded-xl py-3 font-medium hover:bg-emerald-700 disabled:opacity-40"
      >
        {createList.isPending ? 'Bezig...' : 'Lijst genereren'}
      </button>
      <p className="text-xs text-stone-500 text-center">
        Vaste items worden automatisch toegevoegd aan de lijst.
      </p>
    </div>
  );
}

function NewRecipeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Recipe) => void }) {
  const [name, setName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      api<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify({ name, product_ids: products.map((p) => p.id) }),
      }),
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onCreated(recipe);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold">Nieuw recept</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam van het recept"
          autoFocus
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        <ProductPicker
          onPick={(p) => setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))}
          excludeIds={products.map((p) => p.id)}
        />
        <div className="flex flex-wrap gap-1.5">
          {products.map((p) => (
            <span key={p.id} className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {p.name}
              <button onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))}>✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600">
            Annuleren
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
