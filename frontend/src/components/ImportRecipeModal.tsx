import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import ProductPicker from './ProductPicker';
import type { Product } from '../types';

interface ImportResult {
  name: string;
  source_url: string;
  ingredients: string[];
}

interface Row {
  text: string;
  product: Product | null;
  include: boolean;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Suggest the longest product whose name appears as a word in the ingredient line.
function suggestProduct(line: string, products: Product[]): Product | null {
  const lower = line.toLowerCase();
  let best: Product | null = null;
  for (const p of products) {
    const name = p.name.toLowerCase();
    const variants = [name, `${name}s`, `${name}en`];
    const hit = variants.some((v) =>
      new RegExp(`(^|[^a-zà-ÿ])${escapeRegExp(v)}([^a-zà-ÿ]|$)`).test(lower)
    );
    if (hit && (!best || name.length > best.name.length)) best = p;
  }
  return best;
}

export default function ImportRecipeModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pickingRow, setPickingRow] = useState<number | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api('/products') });

  const fetchRecipe = useMutation({
    mutationFn: async () => {
      const imported = await api<ImportResult>('/recipes/import-url', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      const prods = await queryClient.fetchQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => api('/products'),
      });
      return { imported, prods };
    },
    onSuccess: ({ imported, prods }) => {
      setError('');
      setName(imported.name);
      setSourceUrl(imported.source_url);
      setRows(
        imported.ingredients.map((text) => {
          const product = suggestProduct(text, prods);
          return { text, product, include: product !== null };
        })
      );
    },
    onError: (e: Error) => setError(e.message),
  });

  const save = useMutation({
    mutationFn: () => {
      const chosen = rows!.filter((r) => r.include && r.product);
      const seen = new Set<number>();
      const items = chosen
        .filter((r) => (seen.has(r.product!.id) ? false : (seen.add(r.product!.id), true)))
        .map((r) => ({ product_id: r.product!.id, quantity: 1 }));
      return api('/recipes', {
        method: 'POST',
        body: JSON.stringify({ name, source_url: sourceUrl, items }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev!.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const includedCount = rows?.filter((r) => r.include && r.product).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold">Recept importeren</h2>

        {!rows && (
          <>
            <p className="text-sm text-stone-500">
              Plak een link van bijvoorbeeld jumbo.com/recepten. (ah.nl blokkeert helaas automatisch
              ophalen.)
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.jumbo.com/recepten/..."
                autoFocus
                className="flex-1 min-w-0 border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => fetchRecipe.mutate()}
                disabled={!url.trim() || fetchRecipe.isPending}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-40"
              >
                {fetchRecipe.isPending ? 'Bezig...' : 'Ophalen'}
              </button>
            </div>
          </>
        )}

        {rows && (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-medium"
            />
            <p className="text-sm text-stone-500">
              Vink aan wat je wilt toevoegen en koppel een product. Regels zonder vinkje (zoals kruiden
              die je al hebt) worden overgeslagen.
            </p>
            <div className="space-y-1.5">
              {rows.map((row, i) => (
                <div key={i} className="bg-stone-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.include && row.product !== null}
                      disabled={row.product === null}
                      onChange={(e) => updateRow(i, { include: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 shrink-0"
                    />
                    <span className="flex-1 min-w-0 text-xs text-stone-500 break-words">{row.text}</span>
                    {row.product ? (
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                        {row.product.name}
                        <button onClick={() => updateRow(i, { product: null, include: false })}>✕</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setPickingRow(pickingRow === i ? null : i)}
                        className="text-xs text-emerald-700 font-medium shrink-0"
                      >
                        {pickingRow === i ? 'sluit' : 'kies product'}
                      </button>
                    )}
                  </div>
                  {pickingRow === i && !row.product && (
                    <div className="mt-2">
                      <ProductPicker
                        autoFocus
                        onPick={(p) => {
                          updateRow(i, { product: p, include: true });
                          setPickingRow(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600">
            Annuleren
          </button>
          {rows && (
            <button
              onClick={() => save.mutate()}
              disabled={!name.trim() || includedCount === 0 || save.isPending}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
            >
              Recept opslaan ({includedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
