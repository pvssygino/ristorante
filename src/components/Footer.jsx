import { Instagram, Mail, MapPin, Phone, ShieldCheck, Smartphone } from 'lucide-react';
import { venue } from '../data/config';

export default function Footer({ onAdminOpen, onPrivacyOpen, onContactsOpen }) {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr,0.9fr,0.9fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img src={venue.logoPath} alt={`Logo ${venue.name}`} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
            <div>
              <p className="text-lg font-semibold text-slate-900">{venue.name}</p>
              <p className="text-sm text-slate-500">{venue.tagline}</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">{venue.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={venue.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"><Smartphone className="h-4 w-4" /> WhatsApp</a>
            <a href={venue.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-700"><Instagram className="h-4 w-4" /> Instagram</a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Contatti</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-sky-700" /> {venue.address}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-sky-700" /> <a href={`tel:${venue.phone.replace(/\s+/g, '')}`} className="hover:text-slate-900">{venue.phone}</a></p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-sky-700" /> <a href={`mailto:${venue.email}`} className="hover:text-slate-900">{venue.email}</a></p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Link utili</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <button onClick={onContactsOpen} className="text-left text-slate-600 hover:text-slate-900">Contatti e mappa</button>
            <button onClick={onPrivacyOpen} className="inline-flex items-center gap-2 text-left text-slate-600 hover:text-slate-900"><ShieldCheck className="h-4 w-4" /> Privacy policy</button>
            <button onClick={onAdminOpen} className="text-left text-slate-600 hover:text-slate-900">Area riservata</button>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} {venue.name}. Tutti i diritti riservati.</p>
          <p>Prenotazioni online, gestione eventi e contatti ufficiali del locale.</p>
        </div>
      </div>
    </footer>
  );
}
