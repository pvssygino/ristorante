import { UMBRELLA_ROWS, UMBRELLAS_PER_ROW } from '../data/config';

export default function UmbrellaMap({ spots = [], selected, onSelect, readOnly = false }) {
  const rows = Array.from({ length: UMBRELLA_ROWS }, (_, i) => i + 1).map((rowNumber) => ({
    rowNumber,
    items: spots.filter((item) => item.row_number === rowNumber),
  }));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[700px] space-y-4">
        {rows.map((row) => (
          <div key={row.rowNumber} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-slate-900">Fila {row.rowNumber}</p>
              <p className="text-sm text-slate-500">{UMBRELLAS_PER_ROW} ombrelloni</p>
            </div>
            <div className="grid grid-cols-10 gap-3">
              {row.items.map((spot) => {
                const isSelected = selected === spot.code;
                const occupied = Boolean(spot.occupied);
                const disabled = readOnly ? false : occupied;
                return (
                  <button
                    key={spot.code}
                    type="button"
                    disabled={disabled}
                    onClick={() => !readOnly && onSelect?.(spot.code)}
                    className={`rounded-2xl border px-3 py-4 text-center text-sm font-semibold transition ${
                      occupied
                        ? 'border-rose-200 bg-rose-100 text-rose-700'
                        : isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:-translate-y-0.5'
                    } ${disabled ? 'cursor-not-allowed' : ''}`}
                  >
                    <div>☂️</div>
                    <div className="mt-2">{spot.code}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
