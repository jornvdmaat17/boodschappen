import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Product, Category } from '../types';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('');
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api('/products') });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api('/categories'),
  });

  const createProduct = useMutation({
    mutationFn: () =>
      api('/products', {
        method: 'POST',
        body: JSON.stringify({ name: newName, category_id: newCategoryId || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setNewName('');
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, category_id }: { id: number; category_id: number | null }) =>
      api(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ category_id }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const term = search.trim().toLowerCase();
  const visible = products.filter((p) => term === '' || p.name.toLowerCase().includes(term));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Producten</h1>

      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <p className="text-sm font-medium">Nieuw product</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam"
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value ? Number(e.target.value) : '')}
            className="border border-stone-300 rounded-lg px-2 py-2 text-sm"
          >
            <option value="">Categorie...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => createProduct.mutate()}
            disabled={!newName.trim() || createProduct.isPending}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Zoeken..."
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
      />

      <div className="bg-white rounded-xl shadow divide-y divide-stone-100">
        {visible.map((p) => (
          <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
            <span className="flex-1 text-sm">{p.name}</span>
            <select
              value={p.category_id ?? ''}
              onChange={(e) =>
                updateProduct.mutate({ id: p.id, category_id: e.target.value ? Number(e.target.value) : null })
              }
              className="border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-600"
            >
              <option value="">geen categorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (confirm(`"${p.name}" verwijderen?`)) deleteProduct.mutate(p.id);
              }}
              className="text-stone-300 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        ))}
        {visible.length === 0 && <p className="text-sm text-stone-500 p-4">Geen producten gevonden.</p>}
      </div>
    </div>
  );
}
