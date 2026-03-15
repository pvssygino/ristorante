export default function TableMap({ tables = [], selected, onSelect, readOnly = false }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tables.map((table) => {
        const occupied = Boolean(table.occupied);
        const isSelected = selected === table.code;
        const disabled = readOnly ? false : occupied;
        return (
          <button
            key={table.code}
            type="button"
            disabled={disabled}
            onClick={() => !readOnly && onSelect?.(table.code)}
            className={`rounded-3xl border p-5 text-left transition ${
              occupied
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5'
            } ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{table.code}</span>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">{table.seats} posti</span>
            </div>
            <div className="mt-4 rounded-full border border-current/20 px-4 py-8 text-center text-sm font-semibold">
              Tavolo
            </div>
            <p className="mt-4 text-sm opacity-80">
              {occupied ? `Occupato${table.reservation?.guest_count ? ` · ${table.reservation.guest_count} persone` : ''}` : 'Disponibile'}
            </p>
          </button>
        );
      })}
    </div>
  );
}
