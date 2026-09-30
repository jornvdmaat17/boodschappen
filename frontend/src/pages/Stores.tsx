import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../api/client';
import type { Store, StoreCategory, Category } from '../types';

export default function StoresPage() {
  const [newName, setNewName] = useState('');
  const [openStore, setOpenStore] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery<Store[]>({ queryKey: ['stores'], queryFn: () => api('/stores') });

  const createStore = useMutation({
    mutationFn: () => api('/stores', { method: 'POST', body: JSON.stringify({ name: newName }) }),
    onSuccess: (store: any) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setNewName('');
      setOpenStore(store.id);
    },
  });

  const deleteStore = useMutation({
    mutationFn: (id: number) => api(`/stores/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stores'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Winkels</h1>

      <div className="bg-white rounded-xl shadow p-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nieuwe winkel (bijv. Lidl)"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => createStore.mutate()}
          disabled={!newName.trim() || createStore.isPending}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-40"
        >
          Toevoegen
        </button>
      </div>

      <div className="space-y-2">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-xl shadow">
            <div className="px-4 py-3 flex items-center justify-between">
              <button onClick={() => setOpenStore(openStore === store.id ? null : store.id)} className="font-medium flex-1 text-left">
                {store.name}
              </button>
              <div className="flex gap-3 text-sm items-center">
                <button
                  onClick={() => setOpenStore(openStore === store.id ? null : store.id)}
                  className="text-emerald-700"
                >
                  {openStore === store.id ? 'Sluiten' : 'Indeling'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Winkel "${store.name}" verwijderen?`)) deleteStore.mutate(store.id);
                  }}
                  className="text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
            {openStore === store.id && <StoreLayout storeId={store.id} />}
          </div>
        ))}
        {stores.length === 0 && <p className="text-sm text-stone-500">Nog geen winkels.</p>}
      </div>
    </div>
  );
}

function SortableCategoryRow({
  cat,
  index,
  total,
  busy,
  onMove,
  onRemove,
}: {
  cat: StoreCategory;
  index: number;
  total: number;
  busy: boolean;
  onMove: (index: number, delta: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.category_id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-stone-50 rounded-lg px-2 py-1.5 ${
        isDragging ? 'shadow-lg ring-2 ring-emerald-400 relative z-10' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-stone-400 px-1 py-1 cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label={`Versleep ${cat.name}`}
      >
        ⠿
      </button>
      <span className="text-xs text-stone-400 w-5">{index + 1}.</span>
      <span className="flex-1 text-sm">{cat.name}</span>
      <button
        onClick={() => onMove(index, -1)}
        disabled={index === 0 || busy}
        className="text-stone-400 disabled:opacity-20 px-1"
      >
        ↑
      </button>
      <button
        onClick={() => onMove(index, 1)}
        disabled={index === total - 1 || busy}
        className="text-stone-400 disabled:opacity-20 px-1"
      >
        ↓
      </button>
      <button onClick={onRemove} disabled={busy} className="text-stone-300 hover:text-red-500 px-1">
        ✕
      </button>
    </div>
  );
}

function StoreLayout({ storeId }: { storeId: number }) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const { data: ordered = [] } = useQuery<StoreCategory[]>({
    queryKey: ['store-categories', storeId],
    queryFn: () => api(`/stores/${storeId}/categories`),
  });
  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api('/categories'),
  });

  const save = useMutation({
    mutationFn: (items: { category_id: number; order_position: number }[]) =>
      api(`/stores/${storeId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ categories: items }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-categories', storeId] }),
  });

  function commit(next: StoreCategory[]) {
    // Optimistic: show the new order immediately, server confirms via invalidation.
    queryClient.setQueryData(['store-categories', storeId], next);
    save.mutate(next.map((c, i) => ({ category_id: c.category_id, order_position: i + 1 })));
  }

  function move(index: number, delta: number) {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ordered.findIndex((c) => c.category_id === active.id);
    const to = ordered.findIndex((c) => c.category_id === over.id);
    if (from === -1 || to === -1) return;
    commit(arrayMove(ordered, from, to));
  }

  const unused = allCategories.filter((c) => !ordered.some((o) => o.category_id === c.id));

  return (
    <div className="border-t border-stone-100 p-4 space-y-3">
      <p className="text-xs text-stone-500">
        Volgorde van boven naar beneden = looproute door de winkel. Sleep aan ⠿ of gebruik de pijltjes.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={ordered.map((c) => c.category_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {ordered.map((cat, i) => (
              <SortableCategoryRow
                key={cat.category_id}
                cat={cat}
                index={i}
                total={ordered.length}
                busy={save.isPending}
                onMove={move}
                onRemove={() => commit(ordered.filter((o) => o.category_id !== cat.category_id))}
              />
            ))}
            {ordered.length === 0 && <p className="text-sm text-stone-400">Nog geen categorieën gekozen.</p>}
          </div>
        </SortableContext>
      </DndContext>
      {unused.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-500 mb-1">Categorie toevoegen:</p>
          <div className="flex flex-wrap gap-1.5">
            {unused.map((c) => (
              <button
                key={c.id}
                onClick={() => commit([...ordered, { category_id: c.id, order_position: 0, name: c.name }])}
                disabled={save.isPending}
                className="text-xs bg-stone-100 px-2.5 py-1 rounded-full hover:bg-emerald-100 disabled:opacity-40"
              >
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
