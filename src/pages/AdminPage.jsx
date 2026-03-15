import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogOut,
  Search,
  Settings,
  Shield,
  Trophy,
} from 'lucide-react';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import {
  getBeerpongParticipants,
  getPublicSettings,
  getReservations,
  getTableAvailability,
  getUmbrellaAvailability,
  updatePaymentStatus,
  updateReservationStatus,
  updateSettings,
} from '../lib/db';
import SectionTitle from '../components/SectionTitle';
import StatusBadge from '../components/StatusBadge';
import UmbrellaMap from '../components/UmbrellaMap';
import TableMap from '../components/TableMap';
import { formatEuroFromCents, PAYMENT_STATUSES } from '../data/config';

function PaymentBadge({ status }) {
  const styles = {
    'Da pagare in loco': 'bg-amber-50 text-amber-700',
    'In attesa pagamento': 'bg-sky-50 text-sky-700',
    Pagato: 'bg-emerald-50 text-emerald-700',
    Fallito: 'bg-rose-50 text-rose-700',
    Rimborsato: 'bg-violet-50 text-violet-700',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{status || '—'}</span>;
}

export default function AdminPage({ settings, onSettingsChanged }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [reservations, setReservations] = useState([]);
  const [beerpongParticipants, setBeerpongParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [serviceType, setServiceType] = useState('cena');
  const [umbrellaMap, setUmbrellaMap] = useState([]);
  const [tableMap, setTableMap] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && hasSupabaseEnv) return;
    refreshData();
  }, [session, selectedDate, serviceType]);

  async function refreshData() {
    setLoading(true);
    setError('');
    try {
      const [reservationRows, umbrellas, tables, participants] = await Promise.all([
        getReservations(),
        getUmbrellaAvailability(selectedDate),
        getTableAvailability(selectedDate, serviceType),
        getBeerpongParticipants(),
      ]);
      setReservations(reservationRows);
      setUmbrellaMap(umbrellas);
      setTableMap(tables);
      setBeerpongParticipants(participants);
    } catch (err) {
      setError(err.message || 'Errore nel caricamento dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!hasSupabaseEnv) {
      setSession({ user: { email: 'demo-admin@locale.it' } });
      return;
    }
    setAuthLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'Login non riuscito.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!hasSupabaseEnv) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  }

  async function handleToggleBeerpong() {
    setSavingSettings(true);
    setError('');
    try {
      await updateSettings({ beerpong_enabled: !settings.beerpong_enabled });
      const newSettings = await getPublicSettings();
      onSettingsChanged(newSettings);
    } catch (err) {
      setError(err.message || 'Errore aggiornamento impostazioni.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleChangeStatus(id, status) {
    try {
      await updateReservationStatus(id, status);
      await refreshData();
    } catch (err) {
      setError(err.message || 'Errore aggiornamento stato.');
    }
  }

  async function handleChangePayment(id, status) {
    try {
      await updatePaymentStatus(id, status);
      await refreshData();
    } catch (err) {
      setError(err.message || 'Errore aggiornamento pagamento.');
    }
  }

  const filteredReservations = useMemo(() => {
    const q = query.toLowerCase();
    return reservations.filter((r) => {
      const matchesQuery = [r.full_name, r.booking_type, r.booking_date, r.status, r.umbrella_code, r.table_code, r.team_name, r.payment_status, r.payment_method].join(' ').toLowerCase().includes(q);
      const matchesType = bookingFilter === 'all' ? true : r.booking_type === bookingFilter;
      const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' ? true : (r.payment_status || '') === paymentFilter;
      return matchesQuery && matchesType && matchesStatus && matchesPayment;
    });
  }, [bookingFilter, paymentFilter, query, reservations, statusFilter]);

  const stats = useMemo(() => {
    const paidAmount = reservations.filter((r) => r.payment_status === PAYMENT_STATUSES.PAID).reduce((sum, r) => sum + Number(r.payment_amount || 0), 0);
    const pendingPayments = reservations.filter((r) => r.payment_status === PAYMENT_STATUSES.PENDING).length;
    return { paidAmount, pendingPayments };
  }, [reservations]);

  if (!session) {
    return (
      <section className="mx-auto flex max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3"><Shield className="h-6 w-6 text-slate-900" /></div>
            <div><h2 className="text-2xl font-bold text-slate-900">Login admin</h2><p className="text-sm text-slate-500">Area privata del gestore</p></div>
          </div>
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={hasSupabaseEnv} /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={hasSupabaseEnv} /></Field>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white">{authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Accedi</button>
          </form>
          {!hasSupabaseEnv ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Modalità demo attiva: manca la configurazione Supabase nel file .env.</div> : null}
          {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow="Dashboard privata" title="Gestione personale del ristorante" subtitle="Controlli prenotazioni, pagamenti, ombrelloni, tavoli e beerpong da un’unica interfaccia responsive." />
        <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"><LogOut className="h-4 w-4" />Esci</button>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-5">
        <StatCard title="Totale richieste" value={reservations.length} />
        <StatCard title="Da gestire" value={reservations.filter((r) => r.status === 'Nuova' || r.status === 'In attesa').length} />
        <StatCard title="Confermate" value={reservations.filter((r) => r.status === 'Confermata').length} />
        <StatCard title="Pagamenti in attesa" value={stats.pendingPayments} />
        <StatCard title="Incassato" value={formatEuroFromCents(stats.paidAmount)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Settings className="h-5 w-5 text-slate-900" /><h3 className="text-xl font-semibold text-slate-900">Impostazioni</h3></div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Il beerpong è visibile al pubblico solo quando è attivato qui.</p>
            <button disabled={savingSettings} onClick={handleToggleBeerpong} className={`mt-6 rounded-2xl px-5 py-3 text-sm font-semibold ${settings.beerpong_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
              {savingSettings ? 'Salvataggio...' : settings.beerpong_enabled ? 'Torneo attivo' : 'Torneo disattivato'}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-xl font-semibold text-slate-900">Vista disponibilità</h3><p className="text-sm text-slate-600">Seleziona data e servizio per controllare la situazione reale.</p></div>
              <div className="flex flex-wrap gap-3">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"><option value="pranzo">Pranzo</option><option value="cena">Cena</option></select>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 font-semibold text-slate-900">Mappa ombrelloni</p>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <UmbrellaMap spots={umbrellaMap} readOnly />}
              </div>
              <div>
                <p className="mb-3 font-semibold text-slate-900">Mappa tavoli</p>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <TableMap tables={tableMap} readOnly />}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-slate-900" /><h3 className="text-xl font-semibold text-slate-900">Lista partecipanti Beer Pong</h3></div>
            <p className="mt-2 text-sm text-slate-600">Entrano in lista solo le iscrizioni con pagamento in loco o pagamento online riuscito.</p>
            <div className="mt-4 space-y-3">
              {beerpongParticipants.length ? beerpongParticipants.map((participant) => (
                <div key={participant.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{participant.team_name}</p>
                      <p className="text-sm text-slate-600">{participant.full_name} · {participant.phone}</p>
                    </div>
                    <PaymentBadge status={participant.payment_status} />
                  </div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Nessun partecipante registrato.</div>}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div><h3 className="text-xl font-semibold text-slate-900">Prenotazioni ricevute</h3><p className="mt-1 text-sm text-slate-600">Filtra, controlla i pagamenti e cambia stato a ogni richiesta.</p></div>
              <div className="relative w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca prenotazione" className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-slate-900" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"><option value="all">Tutti i tipi</option><option value="ombrellone">Ombrelloni</option><option value="ristorante">Ristorante</option><option value="beerpong">Beer Pong</option></select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"><option value="all">Tutti gli stati</option><option value="Nuova">Nuova</option><option value="In attesa">In attesa</option><option value="Confermata">Confermata</option><option value="Annullata">Annullata</option></select>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"><option value="all">Tutti i pagamenti</option><option value="Da pagare in loco">Da pagare in loco</option><option value="In attesa pagamento">In attesa pagamento</option><option value="Pagato">Pagato</option><option value="Fallito">Fallito</option><option value="Rimborsato">Rimborsato</option></select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">{reservation.booking_type}</span>
                      <StatusBadge status={reservation.status} />
                      <PaymentBadge status={reservation.payment_status} />
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-900">{reservation.full_name}</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p>Telefono: {reservation.phone}</p>
                      <p>Email: {reservation.email || '-'}</p>
                      <p>Data: {reservation.booking_date}</p>
                      <p>Ombrellone: {reservation.umbrella_code || '-'}</p>
                      <p>Tavolo: {reservation.table_code || '-'}</p>
                      <p>Squadra: {reservation.team_name || '-'}</p>
                      <p>Metodo pagamento: {reservation.payment_method || '-'}</p>
                      <p>Importo: {formatEuroFromCents(Number(reservation.payment_amount || 0))}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {['Confermata', 'In attesa', 'Annullata'].map((status) => (
                        <button key={status} onClick={() => handleChangeStatus(reservation.id, status)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">{status}</button>
                      ))}
                    </div>
                    {(reservation.booking_type === 'ombrellone' || reservation.booking_type === 'beerpong') ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleChangePayment(reservation.id, PAYMENT_STATUSES.PAID)} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"><CreditCard className="mr-1 inline h-4 w-4" />Segna pagato</button>
                        <button onClick={() => handleChangePayment(reservation.id, PAYMENT_STATUSES.FAILED)} className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">Segna fallito</button>
                        <button onClick={() => handleChangePayment(reservation.id, PAYMENT_STATUSES.REFUNDED)} className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">Rimborsato</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {!filteredReservations.length && !loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">Nessuna prenotazione trovata.</div> : null}
          </div>
        </div>
      </div>

      {error ? <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">{error}</div> : null}
      {!hasSupabaseEnv ? <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">La UI è pronta da hostare. Per renderla realmente persistente, configura Supabase e applica lo schema SQL incluso.</div> : null}
    </section>
  );
}

function StatCard({ title, value }) { return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="font-semibold text-slate-900">{title}</p><p className="mt-4 text-3xl font-bold text-slate-900">{value}</p></div>; }
function Field({ label, children }) { return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-slate-900" />; }
