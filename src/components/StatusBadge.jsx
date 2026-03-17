const styles = {
  Nuova: 'bg-amber-50 text-amber-700',
  Confermata: 'bg-emerald-50 text-emerald-700',
  'In attesa': 'bg-sky-50 text-sky-700',
  Annullata: 'bg-rose-50 text-rose-700',
};

export default function StatusBadge({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}
