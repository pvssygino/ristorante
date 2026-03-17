import { useEffect, useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import BeerpongBracket from '../components/BeerpongBracket';
import { getBeerpongTournament } from '../lib/db';

export default function BeerpongTournamentPage() {
  const [state, setState] = useState({ tournament: null, matches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const result = await getBeerpongTournament();
        if (mounted) setState(result);
      } catch (err) {
        if (mounted) setError(err.message || 'Errore caricamento torneo.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Torneo Beer Pong"
        title="Tabellone ufficiale"
        subtitle="Consulta il tabellone aggiornato in tempo reale e scopri il prossimo avversario." 
      />
      <div className="mt-8">
        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Caricamento tabellone...</div> : null}
        {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">{error}</div> : null}
        {!loading && !error ? <BeerpongBracket tournament={state.tournament} matches={state.matches} editable={false} displayMode title={state.tournament?.title || 'Torneo Beer Pong'} /> : null}
      </div>
    </section>
  );
}
