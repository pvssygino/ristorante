import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import { venue } from '../data/config';

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Privacy"
        title="Informativa privacy"
        subtitle="Informazioni essenziali sul trattamento dei dati raccolti tramite il sito e le prenotazioni online."
      />

      <div className="mt-8 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-sky-700" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{venue.legal.ownerLabel}</h3>
              <p className="mt-2 text-slate-600">{venue.privacyContactName}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-700" /> {venue.address}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-sky-700" /> {venue.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-sky-700" /> {venue.email}</p>
              </div>
            </div>
          </div>
        </div>

        <Card title="Quali dati raccogliamo">
          Raccogliamo i dati inseriti nel modulo di prenotazione, come nome, numero di telefono, email, data della prenotazione, preferenze di servizio, eventuale nome squadra Beer Pong e informazioni relative al pagamento dei servizi online.
        </Card>

        <Card title="Perché utilizziamo i dati">{venue.legal.dataPurpose}</Card>

        <Card title="Base giuridica">
          Il trattamento è necessario per dare seguito alla tua richiesta di prenotazione, per eventuali comunicazioni di servizio e, ove previsto, per gestire il pagamento dei servizi prenotati online.
        </Card>

        <Card title="Conservazione">{venue.legal.retainedData}</Card>

        <Card title="Servizi terzi">
          Il sito può utilizzare servizi esterni come Google Maps, PayPal e Stripe per mostrare mappe e gestire pagamenti. Questi servizi possono trattare dati personali secondo le rispettive informative privacy.
        </Card>

        <Card title="I tuoi diritti">
          Puoi richiedere accesso, rettifica o cancellazione dei tuoi dati, oltre a chiedere informazioni sul loro trattamento, scrivendo ai contatti indicati sopra.
        </Card>

        <p className="text-sm text-slate-500">Ultimo aggiornamento: {venue.privacyLastUpdated}</p>
      </div>
    </section>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{children}</p>
    </div>
  );
}
