import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import ProductPicker from '../components/ProductPicker';
import QtyControl from '../components/QtyControl';
import ImportRecipeModal from '../components/ImportRecipeModal';
import type { Recipe, RecipeProduct } from '../types';

export default function RecipesPage() {
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const { data: recipes = [] } = useQuery<Recipe[]>({ queryKey: ['recipes'], queryFn: () => api('/recipes') });

  const deleteRecipe = useMutation({
    mutationFn: (id: number) => api(`/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recepten</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImporting(true)}
            className="bg-white border border-emerald-600 text-emerald-700 text-sm px-3 py-2 rounded-lg hover:bg-emerald-50"
          >
            🔗 Importeer
          </button>
          <button
            onClick={() => setEditing('new')}
            className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            + Nieuw recept
          </button>
        </div>
      </div>

      {importing && <ImportRecipeModal onClose={() => setImporting(false)} />}

      {editing && (
        <RecipeForm
          // Remount when switching recipes so the form doesn't keep the previous one's fields.
          key={editing === 'new' ? 'new' : editing.id}
          recipe={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="space-y-2">
        {recipes.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {r.name}
                {r.source_url && (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs font-normal text-emerald-700 underline decoration-dotted"
                  >
                    bron ↗
                  </a>
                )}
              </h2>
              <div className="flex gap-3 text-sm">
                <button onClick={() => setEditing(r)} className="text-emerald-700">
                  Bewerken
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Recept "${r.name}" verwijderen?`)) deleteRecipe.mutate(r.id);
                  }}
                  className="text-red-500"
                >
                  Verwijderen
                </button>
              </div>
            </div>
            {r.description && <Description text={r.description} />}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.products.map((p) => (
                <span
                  key={p.id}
                  className={`text-xs px-2 py-1 rounded-full ${
                    p.optional ? 'bg-amber-50 text-amber-700' : 'bg-stone-100'
                  }`}
                >
                  {p.quantity >= 2 ? `${p.quantity}× ` : ''}
                  {p.name}
                  {p.optional ? ' (soms)' : ''}
                </span>
              ))}
              {r.products.length === 0 && <span className="text-xs text-stone-400">Geen producten</span>}
            </div>
          </div>
        ))}
        {recipes.length === 0 && <p className="text-sm text-stone-500">Nog geen recepten.</p>}
      </div>
    </div>
  );
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p
      onClick={() => setExpanded(!expanded)}
      className={`mt-1 text-xs text-stone-500 whitespace-pre-line cursor-pointer ${
        expanded ? '' : 'line-clamp-2'
      }`}
      title={expanded ? 'Klik om in te klappen' : 'Klik om alles te lezen'}
    >
      {text}
    </p>
  );
}

function RecipeForm({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const [name, setName] = useState(recipe?.name ?? '');
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [products, setProducts] = useState<RecipeProduct[]>(recipe?.products ?? []);
  const queryClient = useQueryClient();

  // The form renders at the top of the page; scroll there once it's in the DOM
  // (scrolling before it renders gets undone when the inserted form shifts the page).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({
        name,
        source_url: sourceUrl.trim(),
        description: description.trim(),
        items: products.map((p) => ({ product_id: p.id, quantity: p.quantity, optional: p.optional })),
      });
      return recipe
        ? api(`/recipes/${recipe.id}`, { method: 'PUT', body })
        : api('/recipes', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    },
  });

  function setQty(id: number, quantity: number) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, quantity } : p)));
  }

  function toggleOptional(id: number) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, optional: !p.optional } : p)));
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3 border-2 border-emerald-200">
      <h2 className="font-bold">{recipe ? 'Recept bewerken' : 'Nieuw recept'}</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Naam van het recept"
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
      />
      <input
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="Link naar het recept (optioneel, bijv. Instagram)"
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Beschrijving of notities (optioneel)"
        rows={3}
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
            <QtyControl value={p.quantity} onChange={(q) => setQty(p.id, q)} />
            <button
              onClick={() => toggleOptional(p.id)}
              title="Soms nodig: bij het toevoegen aan een lijst wordt gevraagd of je dit nodig hebt"
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
      <p className="text-xs text-stone-400">
        "soms" = soms nodig: bij het toevoegen aan een lijst wordt gevraagd of je het moet kopen.
      </p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600">
          Annuleren
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}
