import { useEffect, useState } from 'react';
import Footer from './components/Footer';
import Header from './components/Header';
import ContactsPage from './pages/ContactsPage';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import PrivacyPage from './pages/PrivacyPage';
import BeerpongTournamentPage from './pages/BeerpongTournamentPage';
import { getPublicSettings } from './lib/db';

function readInitialPage() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  if (page === 'prenotazioni' || page === 'contatti' || page === 'admin' || page === 'privacy' || page === 'torneo') return page;
  if (params.get('payment_result')) return 'prenotazioni';
  return 'home';
}

export default function App() {
  const [page, setPage] = useState(readInitialPage());
  const [settings, setSettings] = useState({ beerpong_enabled: true, restaurant_max_capacity: 80 });

  useEffect(() => {
    getPublicSettings().then(setSettings).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {page !== 'admin' ? <Header current={page} setCurrent={setPage} /> : null}

      {page === 'home' ? <HomePage onBookingOpen={() => setPage('prenotazioni')} onContactsOpen={() => setPage('contatti')} /> : null}
      {page === 'contatti' ? <ContactsPage /> : null}
      {page === 'prenotazioni' ? <BookingPage settings={settings} onReservationCreated={() => {}} onPrivacyOpen={() => setPage('privacy')} /> : null}
      {page === 'privacy' ? <PrivacyPage /> : null}
      {page === 'torneo' ? <BeerpongTournamentPage /> : null}
      {page === 'admin' ? <AdminPage settings={settings} onSettingsChanged={setSettings} /> : null}

      {page !== 'admin' ? <Footer onAdminOpen={() => setPage('admin')} onPrivacyOpen={() => setPage('privacy')} onContactsOpen={() => setPage('contatti')} /> : null}
    </div>
  );
}
