import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { DAY_NAMES, formatDate, specialLabel } from '../types';
import type { ShoppingListSummary, Store, TodayMenu } from '../types';

export default function DashboardPage() {
  const [pickingStore, setPickingStore] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery<ShoppingListSummary[]>({
    queryKey: ['lists'],
    queryFn: () => api('/shopping-lists'),
  });
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: () => api('/stores'),
  });
  const { data: todayMenu } = useQuery<TodayMenu | null>({
    queryKey: ['today-menu'],
    queryFn: () => api('/shopping-lists/menu/today'),
  });

  const createQuick = useMutation({
    mutationFn: (store_id: number) =>
      api('/shopping-lists', { method: 'POST', body: JSON.stringify({ type: 'quick', store_id }) }),
    onSuccess: (list: any) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      navigate(`/list/${list.id}`);
    },
  });

  const deleteList = useMutation({
    mutationFn: (id: number) => api(`/shopping-lists/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });

  const active = lists.filter((l) => !l.completed_at);
  const completed = lists.filter((l) => l.completed_at);

  return (
    <div className="space-y-6">
      {todayMenu && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-2xl shadow p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-100">
            Vanavond · {DAY_NAMES[new Date().getDay()]}
          </p>
          <p className="text-lg font-bold mt-0.5">
            {todayMenu.special ? specialLabel(todayMenu.special) : `🍽️ ${todayMenu.recipe_name}`}
          </p>
          {todayMenu.description && (
            <p className="text-sm text-emerald-50 mt-1 line-clamp-2">{todayMenu.description}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/weekly/new"
          className="bg-emerald-600 text-white rounded-2xl p-5 text-center font-medium hover:bg-emerald-700 shadow"
        >
          <div className="text-2xl mb-1">📅</div>
          Nieuwe weeklijst
        </Link>
        <button
          onClick={() => setPickingStore(!pickingStore)}
          className="bg-white border-2 border-emerald-600 text-emerald-700 rounded-2xl p-5 text-center font-medium hover:bg-emerald-50 shadow"
        >
          <div className="text-2xl mb-1">⚡</div>
          Snelle lijst
        </button>
      </div>

      {pickingStore && (
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-medium mb-2">Voor welke winkel?</p>
          {stores.length === 0 ? (
            <p className="text-sm text-stone-500">
              Nog geen winkels. <Link to="/stores" className="text-emerald-700 underline">Voeg eerst een winkel toe</Link>.
            </p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => createQuick.mutate(s.id)}
                  disabled={createQuick.isPending}
                  className="px-4 py-2 bg-stone-100 rounded-lg text-sm hover:bg-emerald-100 disabled:opacity-50"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="font-semibold text-stone-700 mb-2">Actieve lijsten</h2>
        {active.length === 0 && <p className="text-sm text-stone-500">Geen actieve lijsten.</p>}
        <div className="space-y-2">
          {active.map((list) => (
            <Link
              key={list.id}
              to={`/list/${list.id}`}
              className="block bg-white rounded-xl shadow p-4 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">
                    {list.type === 'weekly' ? '📅 Weeklijst' : '⚡ Snelle lijst'}
                  </span>
                  <span className="text-stone-500 text-sm ml-2">
                    {list.store_name} · {formatDate(list.shopping_date)}
                  </span>
                </div>
                <span className="text-sm text-stone-500">
                  {list.checked_count}/{list.item_count}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${list.item_count > 0 ? (100 * list.checked_count) / list.item_count : 0}%`,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-stone-700 mb-2">Afgerond</h2>
          <div className="space-y-2">
            {completed.slice(0, 10).map((list) => (
              <div key={list.id} className="bg-white/60 rounded-xl p-3 flex items-center justify-between text-sm">
                <Link to={`/list/${list.id}`} className="text-stone-600">
                  {list.type === 'weekly' ? '📅' : '⚡'} {list.store_name} — {formatDate(list.shopping_date)}
                </Link>
                <button
                  onClick={() => deleteList.mutate(list.id)}
                  className="text-stone-400 hover:text-red-600"
                  title="Verwijderen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
