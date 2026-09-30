import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Category, Product } from '../types';

interface Props {
  onPick: (product: Product) => void;
  excludeIds?: number[];
  autoFocus?: boolean;
}

// Search existing products or create a new one (with category) on the fly.
export default function ProductPicker({ onPick, excludeIds = [], autoFocus }: Props) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('');
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api('/products'),
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api('/categories'),
  });

  const createProduct = useMutation({
    mutationFn: (body: { name: string; category_id: number | null }) =>
      api<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSearch('');
      setCreating(false);
      setNewCategoryId('');
      onPick(product);
    },
  });

  const term = search.trim().toLowerCase();
  const matches = products.filter(
    (p) => !excludeIds.includes(p.id) && (term === '' || p.name.toLowerCase().includes(term))
  );
  const exactMatch = products.some((p) => p.name.toLowerCase() === term);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCreating(false);
        }}
        placeholder="Zoek of voeg product toe..."
        autoFocus={autoFocus}
        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {term !== '' && (
        <div className="mt-1 border border-stone-200 rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
          {matches.slice(0, 8).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onPick(p);
                setSearch('');
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 flex justify-between"
            >
              <span>{p.name}</span>
              <span className="text-stone-400 text-xs">{p.category_name || 'geen categorie'}</span>
            </button>
          ))}
          {!exactMatch && !creating && (
            <button
              onClick={() => setCreating(true)}
              className="w-full text-left px-3 py-2 text-sm text-emerald-700 font-medium hover:bg-emerald-50"
            >
              + "{search.trim()}" als nieuw product
            </button>
          )}
          {creating && (
            <div className="px-3 py-2 flex gap-2 items-center border-t border-stone-100">
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 border border-stone-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Categorie...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  createProduct.mutate({ name: search.trim(), category_id: newCategoryId || null })
                }
                disabled={createProduct.isPending}
                className="bg-emerald-600 text-white text-sm px-3 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                Toevoegen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
