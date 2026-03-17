export default function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-base leading-7 text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
