import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Category } from '../types';

interface CategoryRow extends Category {
  product_count: number;
}

export default function CategoriesPage() {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<CategoryRow[]>({
    queryKey: ['categories'],
    queryFn: () => api('/categories'),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    setError('');
  }

  const createCategory = useMutation({
    mutationFn: () => api('/categories', { method: 'POST', body: JSON.stringify({ name: newName }) }),
    onSuccess: () => {
      refresh();
      setNewName('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const renameCategory = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      refresh();
      setEditingId(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => api(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Categorieën</h1>
      <p className="text-sm text-stone-500">
        Categorieën gelden voor alle winkels. Per winkel bepaal je bij <b>Winkels</b> de volgorde.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createCategory.mutate();
        }}
        className="bg-white rounded-xl shadow p-4 flex gap-2"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nieuwe categorie (bijv. zuivel)"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!newName.trim() || createCategory.isPending}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-40"
        >
          Toevoegen
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl shadow divide-y divide-stone-100">
        {categories.map((cat) => (
          <div key={cat.id} className="px-4 py-2.5 flex items-center gap-3">
            {editingId === cat.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editName.trim()) renameCategory.mutate({ id: cat.id, name: editName });
                }}
                className="flex-1 flex gap-2"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="flex-1 border border-emerald-400 rounded-lg px-2 py-1 text-sm"
                />
                <button type="submit" className="text-sm text-emerald-700 font-medium">
                  Opslaan
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-sm text-stone-500">
                  Annuleren
                </button>
              </form>
            ) : (
              <>
                <span className="flex-1 text-sm">{cat.name}</span>
                <span className="text-xs text-stone-400">
                  {cat.product_count} product{cat.product_count === 1 ? '' : 'en'}
                </span>
                <button
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditName(cat.name);
                  }}
                  className="text-sm text-emerald-700"
                >
                  Wijzigen
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Categorie "${cat.name}" verwijderen?`)) deleteCategory.mutate(cat.id);
                  }}
                  disabled={cat.product_count > 0}
                  title={cat.product_count > 0 ? 'In gebruik door producten' : 'Verwijderen'}
                  className="text-stone-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-stone-300"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-stone-500 p-4">Nog geen categorieën.</p>}
      </div>
    </div>
  );
}
