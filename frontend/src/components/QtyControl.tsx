// Quantity stepper: at 1 only a "+" shows; from 2 the count and "−" appear.
export default function QtyControl({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {value >= 2 && (
        <>
          <button
            type="button"
            onClick={() => onChange(value - 1)}
            disabled={disabled}
            className="w-5 h-5 leading-none rounded-full bg-white/70 text-stone-600 text-xs font-bold disabled:opacity-40"
            aria-label="Minder"
          >
            −
          </button>
          <span className="text-xs font-semibold tabular-nums min-w-[1.5em] text-center">{value}×</span>
        </>
      )}
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="w-5 h-5 leading-none rounded-full bg-white/70 text-stone-600 text-xs font-bold disabled:opacity-40"
        aria-label="Meer"
      >
        +
      </button>
    </span>
  );
}
