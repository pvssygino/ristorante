import { Clock, Instagram, Mail, MapPin, Phone, Smartphone } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import { venue } from '../data/config';

export default function ContactsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionTitle eyebrow="Contatti" title="Tutte le indicazioni per raggiungerci" subtitle="Indirizzo, telefono, orari, mappa e pulsanti rapidi per contattarci in un attimo." />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Row icon={<MapPin className="mt-0.5 h-5 w-5 text-sky-700" />} title="Indirizzo" value={venue.address} />
          <Row icon={<Phone className="mt-0.5 h-5 w-5 text-sky-700" />} title="Telefono" value={venue.phone} />
          <Row icon={<Mail className="mt-0.5 h-5 w-5 text-sky-700" />} title="Email" value={venue.email} />
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-sky-700" />
            <div>
              <p className="font-semibold text-slate-900">Orari</p>
              <div className="space-y-1 text-slate-600">{venue.hours.map((line) => <p key={line}>{line}</p>)}</div>
            </div>
          </div>
          <div className="pt-2">
            <div className="flex flex-wrap gap-3">
              <a href={`tel:${venue.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"><Phone className="h-4 w-4" /> Chiama</a>
              <a href={venue.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"><Smartphone className="h-4 w-4" /> WhatsApp</a>
              <a href={venue.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-700"><Instagram className="h-4 w-4" /> Instagram</a>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="font-semibold text-slate-900">Mappa</p>
            <p className="text-sm text-slate-500">Apri direttamente il percorso dal tuo smartphone.</p>
          </div>
          <div className="h-[420px] w-full">
            <iframe title="Mappa" src={`https://www.google.com/maps?q=${encodeURIComponent(venue.mapsEmbedQuery)}&z=16&output=embed`} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div className="border-t border-slate-200 px-6 py-4">
            <a href={venue.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700"><MapPin className="h-4 w-4" /> Apri su Google Maps</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ icon, title, value }) {
  return (
    <div className="flex items-start gap-3">{icon}<div><p className="font-semibold text-slate-900">{title}</p><p className="text-slate-600">{value}</p></div></div>
  );
}
