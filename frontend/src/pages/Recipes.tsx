import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import ProductPicker from '../components/ProductPicker';
import type { Recipe, Product } from '../types';

export default function RecipesPage() {
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
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
        <button
          onClick={() => setEditing('new')}
          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          + Nieuw recept
        </button>
      </div>

      {editing && (
        <RecipeForm
          recipe={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="space-y-2">
        {recipes.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{r.name}</h2>
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.products.map((p) => (
                <span key={p.id} className="bg-stone-100 text-xs px-2 py-1 rounded-full">
                  {p.name}
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

function RecipeForm({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const [name, setName] = useState(recipe?.name ?? '');
  const [products, setProducts] = useState<Product[]>(recipe?.products ?? []);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({ name, product_ids: products.map((p) => p.id) });
      return recipe
        ? api(`/recipes/${recipe.id}`, { method: 'PUT', body })
        : api('/recipes', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    },
  });

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
      <ProductPicker
        onPick={(p) => setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))}
        excludeIds={products.map((p) => p.id)}
      />
      <div className="flex flex-wrap gap-1.5">
        {products.map((p) => (
          <span
            key={p.id}
            className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
          >
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
