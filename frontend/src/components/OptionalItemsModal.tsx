import { useState } from 'react';
import type { RecipeProduct } from '../types';

// Asks which "sometimes needed" recipe products to include; all start checked.
export default function OptionalItemsModal({
  products,
  onConfirm,
  onClose,
}: {
  products: RecipeProduct[];
  onConfirm: (includeIds: number[]) => void;
  onClose: () => void;
}) {
  const [included, setIncluded] = useState<Set<number>>(new Set(products.map((p) => p.id)));

  function toggle(id: number) {
    setIncluded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-lg p-5 w-full max-w-md space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold">Soms nodig</h2>
        <p className="text-sm text-stone-500">
          Heb je deze nog in huis? Vink af wat je <b>niet</b> hoeft te kopen.
        </p>
        <div className="space-y-1">
          {products.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 bg-stone-50 rounded-lg px-3 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={included.has(p.id)}
                onChange={() => toggle(p.id)}
                className="w-5 h-5 accent-emerald-600"
              />
              <span className="text-sm">
                {p.quantity >= 2 && <b className="text-emerald-700 mr-1">{p.quantity}×</b>}
                {p.name}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={() => onConfirm([...included])}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Toevoegen aan lijst
          </button>
        </div>
      </div>
    </div>
  );
}
