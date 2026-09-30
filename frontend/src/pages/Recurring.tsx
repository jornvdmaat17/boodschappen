import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import ProductPicker from '../components/ProductPicker';
import { FREQUENCIES } from '../types';
import type { RecurringItem } from '../types';

export default function RecurringPage() {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery<RecurringItem[]>({
    queryKey: ['recurring'],
    queryFn: () => api('/recurring-items'),
  });

  const addItem = useMutation({
    mutationFn: (product_id: number) =>
      api('/recurring-items', { method: 'POST', body: JSON.stringify({ product_id, frequency: 'weekly' }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] }),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...body }: { id: number; frequency?: string; active?: boolean }) =>
      api(`/recurring-items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => api(`/recurring-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Vaste items</h1>
      <p className="text-sm text-stone-500">
        Deze producten worden automatisch aan elke nieuwe weeklijst toegevoegd.
      </p>

      <div className="bg-white rounded-xl shadow p-4">
        <ProductPicker onPick={(p) => addItem.mutate(p.id)} excludeIds={items.map((i) => i.product_id)} />
      </div>

      <div className="bg-white rounded-xl shadow divide-y divide-stone-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={item.active}
              onChange={(e) => updateItem.mutate({ id: item.id, active: e.target.checked })}
              className="w-4 h-4 accent-emerald-600"
              title="Actief"
            />
            <span className={`flex-1 text-sm ${item.active ? '' : 'text-stone-400'}`}>{item.product_name}</span>
            <select
              value={item.frequency}
              onChange={(e) => updateItem.mutate({ id: item.id, frequency: e.target.value })}
              className="border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-600"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button onClick={() => deleteItem.mutate(item.id)} className="text-stone-300 hover:text-red-500">
              ✕
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-stone-500 p-4">Nog geen vaste items.</p>}
      </div>
    </div>
  );
}
