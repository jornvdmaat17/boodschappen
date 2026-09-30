import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import ProductPicker from '../components/ProductPicker';
import QtyControl from '../components/QtyControl';
import OptionalItemsModal from '../components/OptionalItemsModal';
import ImportRecipeModal from '../components/ImportRecipeModal';
import { DAY_NAMES, SPECIAL_DAYS } from '../types';
import type { Recipe, Store, RecipeProduct } from '../types';

interface DayChoice {
  recipe_id: number | null;
  special: string | null;
}

function nextSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d.toISOString().slice(0, 10);
}

export default function WeeklyCreatePage() {
  const [storeId, setStoreId] = useState<number | ''>('');
  const [shoppingDate, setShoppingDate] = useState(nextSunday());
  const [days, setDays] = useState<DayChoice[]>(
    Array.from({ length: 7 }, () => ({ recipe_id: null, special: null }))
  );

  function setDay(day: number, choice: DayChoice) {
    setDays((prev) => prev.map((d, i) => (i === day ? choice : d)));
  }
  const [newRecipeForDay, setNewRecipeForDay] = useState<number | null>(null);
  const [aiForDay, setAiForDay] = useState<number | null>(null);
  const [askOptional, setAskOptional] = useState<RecipeProduct[] | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery<Store[]>({ queryKey: ['stores'], queryFn: () => api('/stores') });
  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });

  const createList = useMutation({
    mutationFn: (optional_include: number[]) =>
      api('/shopping-lists', {
        method: 'POST',
        body: JSON.stringify({
          type: 'weekly',
          store_id: storeId,
          days: days.map((d, day_of_week) => ({ day_of_week, ...d })),
          optional_include,
          shopping_date: shoppingDate,
        }),
      }),
    onSuccess: (list: any) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['today-menu'] });
      navigate(`/list/${list.id}`);
    },
  });

  function generate() {
    const selected = recipes.filter((r) => days.some((d) => d.recipe_id === r.id));
    const optionals = new Map<number, RecipeProduct>();
    for (const r of selected) {
      for (const p of r.products) if (p.optional) optionals.set(p.id, p);
    }
    if (optionals.size > 0) setAskOptional([...optionals.values()]);
    else createList.mutate([]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nieuwe weeklijst</h1>

      <div className="bg-white rounded-xl shadow p-4">
        <label className="text-sm font-medium block mb-1">Boodschappendag</label>
        <input
          type="date"
          value={shoppingDate}
          onChange={(e) => setShoppingDate(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3"
        />
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
              value={days[day].special ? `s:${days[day].special}` : days[day].recipe_id ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith('s:')) setDay(day, { recipe_id: null, special: v.slice(2) });
                else setDay(day, { recipe_id: v ? Number(v) : null, special: null });
              }}
              className="flex-1 min-w-0 border border-stone-300 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="">— geen maaltijd —</option>
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
            <button
              onClick={() => setNewRecipeForDay(day)}
              className="text-emerald-700 text-sm font-medium whitespace-nowrap"
              title="Nieuw recept"
            >
              + nieuw
            </button>
            <button
              onClick={() => setAiForDay(day)}
              className="text-sm"
              title="Laat AI iets bedenken dat afwijkt van de rest van de week"
            >
              ✨
            </button>
          </div>
        ))}
      </div>

      {aiForDay !== null && (
        <ImportRecipeModal
          initialMode="ai"
          avoid={recipes
            .filter((r) => days.some((d) => d.recipe_id === r.id))
            .map((r) => ({ name: r.name, products: r.products.map((p) => p.name) }))}
          onClose={() => setAiForDay(null)}
          onCreated={(recipe) => {
            setDay(aiForDay, { recipe_id: recipe.id, special: null });
            setAiForDay(null);
          }}
        />
      )}

      {newRecipeForDay !== null && (
        <NewRecipeModal
          onClose={() => setNewRecipeForDay(null)}
          onCreated={(recipe) => {
            setDay(newRecipeForDay, { recipe_id: recipe.id, special: null });
            setNewRecipeForDay(null);
          }}
        />
      )}

      {askOptional && (
        <OptionalItemsModal
          products={askOptional}
          onClose={() => setAskOptional(null)}
          onConfirm={(ids) => {
            setAskOptional(null);
            createList.mutate(ids);
          }}
        />
      )}

      <button
        onClick={generate}
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
  const [sourceUrl, setSourceUrl] = useState('');
  const [products, setProducts] = useState<RecipeProduct[]>([]);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      api<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          source_url: sourceUrl.trim() || null,
          items: products.map((p) => ({ product_id: p.id, quantity: p.quantity, optional: p.optional })),
        }),
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
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Link naar het recept (optioneel)"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        <ProductPicker
          onPick={(p) =>
            setProducts((prev) =>
              prev.some((x) => x.id === p.id) ? prev : [...prev, { ...p, quantity: 1, optional: false }]
            )
          }
          excludeIds={products.map((p) => p.id)}
        />
        <div className="flex flex-wrap gap-1.5">
          {products.map((p) => (
            <span
              key={p.id}
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${
                p.optional ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {p.name}
              <QtyControl
                value={p.quantity}
                onChange={(q) =>
                  setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, quantity: q } : x)))
                }
              />
              <button
                onClick={() =>
                  setProducts((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, optional: !x.optional } : x))
                  )
                }
                title="Soms nodig"
                className={`rounded-full px-1.5 font-semibold ${
                  p.optional ? 'bg-amber-200' : 'bg-white/70 text-stone-500'
                }`}
              >
                soms
              </button>
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
