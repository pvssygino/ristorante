import { motion } from 'framer-motion';
import { ArrowRight, Clock3, Instagram, MapPin, Smartphone, Trophy, Umbrella, UtensilsCrossed } from 'lucide-react';
import { dishes, venue } from '../data/config';
import SectionTitle from '../components/SectionTitle';

export default function HomePage({ onBookingOpen, onContactsOpen }) {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_left,_rgba(15,23,42,0.06),_transparent_30%)]" />
        <div class="relative mx-auto grid max-w-7xl gap-10 px-4 pt-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-8 lg:pb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="mb-4 inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-800">{venue.heroBadge}</span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">{venue.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{venue.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onBookingOpen} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm">Prenota ora <ArrowRight className="h-4 w-4" /></button>
              <button onClick={onContactsOpen} className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700">Contatti e mappa</button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <a href={venue.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 font-medium text-emerald-700"><Smartphone className="h-4 w-4" /> WhatsApp</a>
              <a href={venue.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-4 py-2 font-medium text-fuchsia-700"><Instagram className="h-4 w-4" /> Instagram</a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { icon: <Umbrella className="h-5 w-5" />, title: 'Ombrelloni', text: '4 file da 10 posti' },
                { icon: <UtensilsCrossed className="h-5 w-5" />, title: 'Ristorante', text: '20 tavoli da 4 posti' },
                { icon: <Trophy className="h-5 w-5" />, title: 'Beerpong', text: 'Prenotazione e iscrizione online' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900">{item.icon}<span className="font-semibold">{item.title}</span></div>
                  <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="grid gap-4 sm:grid-cols-2">
            <img src="/img/foto1.png" alt="Tavolo vista mare" className="h-64 w-full rounded-3xl object-cover shadow-lg sm:h-full" />
            <div className="grid gap-4">
              <img src="/img/foto2.jpg" alt="Piatti tipici" className="h-40 w-full rounded-3xl object-cover shadow-lg" />
              <div className="overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg">
                <img src="/img/logo.png" alt="Ambiente The Shark" className="h-[28rem] w-full object-cover opacity-90" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-3">
          <InfoTile icon={<MapPin className="h-5 w-5 text-sky-700" />} title="Dove siamo" text={venue.address} />
          <InfoTile icon={<Clock3 className="h-5 w-5 text-sky-700" />} title="Orari" text={venue.hours[0]} />
          <InfoTile icon={<Smartphone className="h-5 w-5 text-sky-700" />} title="Contatto diretto" text="Prenotazioni rapide anche da smartphone." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Galleria" title="Piatti tipici e atmosfera del locale" subtitle={venue.gallerySubtitle} />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {dishes.map((dish, index) => (
            <motion.article
              key={dish.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <img src={dish.image} alt={dish.title} className="h-56 w-full object-cover" />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-900">{dish.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{dish.note}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dish.ingredients.map((ingredient) => (
                    <span key={ingredient} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{ingredient}</span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </main>
  );
}

function InfoTile({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-900">{icon}<span className="font-semibold">{title}</span></div>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}
