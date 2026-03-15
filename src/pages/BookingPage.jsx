import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Trophy,
  Umbrella,
  UtensilsCrossed,
} from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import UmbrellaMap from '../components/UmbrellaMap';
import TableMap from '../components/TableMap';
import {
  buildReservationPayload,
  confirmStripeSessionFromRedirect,
  createReservation,
  getTableAvailability,
  getUmbrellaAvailability,
  startOnlineCheckout,
  notifyBookingEmails,
} from '../lib/db';
import { formatEuroFromCents, PAYMENT_METHODS, PRICING } from '../data/config';

const initialForm = {
  bookingType: 'ombrellone',
  fullName: '',
  phone: '',
  email: '',
  bookingDate: '',
  serviceType: 'cena',
  timeSlot: '20:30',
  guestCount: 2,
  notes: '',
  umbrellaCode: '',
  tableCode: '',
  teamName: '',
  paymentMethod: PAYMENT_METHODS.PAY_ON_SITE,
  privacyAccepted: false,
};

function readPaymentFeedback() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.get('payment_result')) return null;
  return {
    result: params.get('payment_result'),
    provider: params.get('payment_provider') || '',
    reservationId: params.get('reservation_id') || '',
    sessionId: params.get('session_id') || '',
    canceled: params.get('payment_result') === 'cancel',
  };
}

export default function BookingPage({ settings, onReservationCreated, onPrivacyOpen }) {
  const [form, setForm] = useState(initialForm);
  const [umbrellaSpots, setUmbrellaSpots] = useState([]);
  const [tables, setTables] = useState([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const bookingOptions = useMemo(() => {
    const options = [
      { key: 'ombrellone', label: 'Ombrellone', icon: <Umbrella className="h-6 w-6" />, text: 'Selezione visuale del posto' },
      { key: 'ristorante', label: 'Ristorante', icon: <UtensilsCrossed className="h-6 w-6" />, text: 'Scelta tavolo e posti' },
    ];
    if (settings?.beerpong_enabled) options.push({ key: 'beerpong', label: 'Beerpong', icon: <Trophy className="h-6 w-6" />, text: 'Iscrizione torneo' });
    return options;
  }, [settings]);

  const payableOnline = form.bookingType === 'ombrellone' || form.bookingType === 'beerpong';
  const paymentAmountCents = form.bookingType === 'ombrellone' ? PRICING.umbrellaCents : form.bookingType === 'beerpong' ? PRICING.beerpongCents : 0;

  useEffect(() => {
    async function loadVisualMap() {
      if (!form.bookingDate) return;
      setLoadingMap(true);
      try {
        if (form.bookingType === 'ombrellone') {
          const data = await getUmbrellaAvailability(form.bookingDate);
          setUmbrellaSpots(data);
        }
        if (form.bookingType === 'ristorante') {
          const data = await getTableAvailability(form.bookingDate, form.serviceType);
          setTables(data);
        }
      } catch (err) {
        setError(err.message || 'Errore nel caricamento disponibilità.');
      } finally {
        setLoadingMap(false);
      }
    }
    loadVisualMap();
  }, [form.bookingDate, form.bookingType, form.serviceType]);

  useEffect(() => {
    const feedback = readPaymentFeedback();
    if (!feedback) return;

    async function finalizePayment() {
      try {
        if (feedback.result === 'success' && feedback.provider === 'stripe' && feedback.sessionId && feedback.reservationId) {
          await confirmStripeSessionFromRedirect(feedback.sessionId, feedback.reservationId);
          setSuccess('Pagamento online completato e prenotazione confermata.');
        } else if (feedback.result === 'success') {
          setSuccess('Pagamento online completato e prenotazione aggiornata.');
        } else {
          setError('Pagamento annullato o non completato. La prenotazione resta in attesa finché non aggiorni il pagamento.');
        }
      } catch (err) {
        setError(err.message || 'Errore nella verifica del pagamento online.');
      } finally {
        const url = new URL(window.location.href);
        ['payment_result', 'payment_provider', 'reservation_id', 'session_id', 'page'].forEach((key) => url.searchParams.delete(key));
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }

    finalizePayment();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);
    try {
      if (form.bookingType === 'ombrellone' && !form.umbrellaCode) throw new Error('Seleziona un ombrellone disponibile.');
      if (form.bookingType === 'ristorante' && !form.tableCode) throw new Error('Seleziona un tavolo disponibile.');
      if (form.bookingType === 'beerpong' && !form.teamName) throw new Error('Inserisci il nome della squadra.');
      if (payableOnline && !form.paymentMethod) throw new Error('Seleziona un metodo di pagamento.');
      if (!form.privacyAccepted) throw new Error('Devi accettare l’informativa privacy per proseguire.');

      const payload = buildReservationPayload(form);
      const reservation = await createReservation(payload);
      onReservationCreated?.();

      if (payableOnline && form.paymentMethod !== PAYMENT_METHODS.PAY_ON_SITE) {
        await startOnlineCheckout({
          reservationId: reservation.id,
          bookingType: form.bookingType,
          paymentMethod: form.paymentMethod,
          amountCents: paymentAmountCents,
        });
        return;
      }

      await notifyBookingEmails(reservation.id, 'created');
      setSuccess('Prenotazione inviata correttamente. Controlla anche la tua email per il riepilogo.');
      setForm({ ...initialForm, bookingType: 'ombrellone' });
      setUmbrellaSpots([]);
      setTables([]);
    } catch (err) {
      setError(err.message || 'Errore durante l’invio della prenotazione.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Prenotazioni"
        title="Prenotazioni reali con selezione visuale"
        subtitle="Per ombrelloni e tavoli il cliente vede una mappa grafica simile a una prenotazione posti, sia da mobile che da desktop."
      />

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid gap-6 ${bookingOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {bookingOptions.map((option) => (
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    bookingType: option.key,
                    umbrellaCode: '',
                    tableCode: '',
                    teamName: '',
                    paymentMethod: option.key === 'ristorante' ? PAYMENT_METHODS.PAY_ON_SITE : prev.paymentMethod,
                  }))
                }
                className={`rounded-3xl border p-5 text-left transition ${
                  form.bookingType === option.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'
                }`}
              >
                {option.icon}
                <p className="mt-3 font-semibold">{option.label}</p>
                <p className={`mt-1 text-sm ${form.bookingType === option.key ? 'text-slate-300' : 'text-slate-600'}`}>{option.text}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
            <Field label="Nome e cognome"><Input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} required /></Field>
            <Field label="Telefono"><Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} /></Field>
            <Field label="Data"><Input type="date" value={form.bookingDate} onChange={(e) => updateField('bookingDate', e.target.value)} required /></Field>

            {form.bookingType === 'ristorante' ? (
              <>
                <Field label="Servizio">
                  <Select value={form.serviceType} onChange={(e) => updateField('serviceType', e.target.value)}>
                    <option value="pranzo">Pranzo</option>
                    <option value="cena">Cena</option>
                  </Select>
                </Field>
                <Field label="Persone">
                  <Select value={form.guestCount} onChange={(e) => updateField('guestCount', e.target.value)}>
                    {[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}
                  </Select>
                </Field>
                <Field label="Fascia oraria"><Input value={form.timeSlot} onChange={(e) => updateField('timeSlot', e.target.value)} /></Field>
              </>
            ) : null}

            {form.bookingType === 'beerpong' ? <Field label="Nome squadra"><Input value={form.teamName} onChange={(e) => updateField('teamName', e.target.value)} required /></Field> : null}

            <div className="md:col-span-2">
              <Field label="Note aggiuntive">
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-slate-900" />
              </Field>
            </div>
          </div>

          {payableOnline ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Pagamento</h3>
                  <p className="text-sm text-slate-600">Scegli se pagare all’arrivo oppure online. Importo previsto: {formatEuroFromCents(paymentAmountCents)}.</p>
                </div>
                <CreditCard className="h-6 w-6 text-slate-500" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { value: PAYMENT_METHODS.PAY_ON_SITE, label: 'Paga in loco', text: 'Confermi e paghi all’arrivo.' },
                  { value: PAYMENT_METHODS.CARD_ONLINE, label: 'Carta online', text: 'Redirect Stripe Checkout.' },
                  { value: PAYMENT_METHODS.PAYPAL_ONLINE, label: 'PayPal online', text: 'Redirect PayPal checkout.' },
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => updateField('paymentMethod', method.value)}
                    className={`rounded-2xl border p-4 text-left ${form.paymentMethod === method.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    <p className="font-semibold">{method.label}</p>
                    <p className={`mt-1 text-sm ${form.paymentMethod === method.value ? 'text-slate-300' : 'text-slate-500'}`}>{method.text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {form.bookingType === 'ombrellone' && form.bookingDate ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div><h3 className="text-lg font-semibold text-slate-900">Seleziona l’ombrellone</h3><p className="text-sm text-slate-600">4 file da 10 posti. I rossi sono occupati per la data selezionata.</p></div>
                {loadingMap ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : null}
              </div>
              <UmbrellaMap spots={umbrellaSpots} selected={form.umbrellaCode} onSelect={(code) => updateField('umbrellaCode', code)} />
            </div>
          ) : null}

          {form.bookingType === 'ristorante' && form.bookingDate ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div><h3 className="text-lg font-semibold text-slate-900">Seleziona il tavolo</h3><p className="text-sm text-slate-600">20 tavoli da 4 posti. I tavoli occupati nel servizio scelto sono evidenziati.</p></div>
                {loadingMap ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : null}
              </div>
              <TableMap tables={tables.filter((item) => item.seats >= Number(form.guestCount || 0))} selected={form.tableCode} onSelect={(code) => updateField('tableCode', code)} />
            </div>
          ) : null}


          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.privacyAccepted}
                onChange={(e) => updateField('privacyAccepted', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                required
              />
              <span>
                Ho letto e accetto l’informativa privacy per la gestione della prenotazione e degli eventuali pagamenti online.{' '}
                <button type="button" onClick={onPrivacyOpen} className="font-medium text-sky-700 underline underline-offset-4">Leggi la privacy policy</button>.
              </span>
            </label>
          </div>

          <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            {sending ? 'Invio in corso...' : payableOnline && form.paymentMethod !== PAYMENT_METHODS.PAY_ON_SITE ? 'Vai al pagamento' : 'Invia richiesta'}
          </button>
        </form>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Riepilogo</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {form.bookingType === 'ombrellone'
                ? form.umbrellaCode || 'Seleziona un ombrellone'
                : form.bookingType === 'ristorante'
                  ? form.tableCode || 'Seleziona un tavolo'
                  : form.teamName || 'Inserisci la squadra'}
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Cliente:</span> {form.fullName || '-'}</p>
              <p><span className="font-medium text-slate-900">Telefono:</span> {form.phone || '-'}</p>
              <p><span className="font-medium text-slate-900">Data:</span> {form.bookingDate || '-'}</p>
              {payableOnline ? <p><span className="font-medium text-slate-900">Importo:</span> {formatEuroFromCents(paymentAmountCents)}</p> : null}
            </div>
          </div>

          {success ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
              <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Operazione completata</p><p className="mt-1 text-sm">{success}</p></div></div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
              <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Errore</p><p className="mt-1 text-sm">{error}</p></div></div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-slate-900" />; }
function Select(props) { return <select {...props} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-slate-900" />; }
