function MatchTeamButton({ name, winner, onPick, editable }) {
  return (
    <button
      type="button"
      disabled={!editable || !name}
      onClick={() => name && onPick?.(name)}
      className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
        winner
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
          : name
            ? 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
            : 'border-dashed border-slate-200 bg-slate-50 text-slate-400'
      } ${!editable || !name ? 'cursor-default' : ''}`}
    >
      {name || '—'}
    </button>
  );
}

function MatchCard({ match, editable, onSelectWinner }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm min-w-[220px]">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <span>Match {match.match_number}</span>
        <span>{match.status}</span>
      </div>
      <div className="space-y-2">
        <MatchTeamButton
          name={match.team1_name}
          winner={match.winner_name === match.team1_name && !!match.team1_name}
          editable={editable}
          onPick={(name) => onSelectWinner?.(match, name)}
        />
        <MatchTeamButton
          name={match.team2_name}
          winner={match.winner_name === match.team2_name && !!match.team2_name}
          editable={editable}
          onPick={(name) => onSelectWinner?.(match, name)}
        />
      </div>
      {match.winner_name ? (
        <div className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">
          Vince: {match.winner_name}
        </div>
      ) : null}
    </div>
  );
}

export default function BeerpongBracket({ tournament, matches = [], editable = false, onSelectWinner, title }) {
  if (!tournament || !matches.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Nessun tabellone generato. Aggiungi le squadre e genera il torneo dalla dashboard admin.
      </div>
    );
  }

  const rounds = Array.from(new Set(matches.map((item) => item.round_number))).sort((a, b) => a - b);
  const roundLabels = {
    1: 'Primo turno',
    2: 'Quarti / Secondo turno',
    3: 'Semifinale',
    4: 'Finale',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title || tournament.title}</h3>
          <p className="text-sm text-slate-600">
            Tabellone da {tournament.bracket_size} squadre • {editable ? 'clicca sulla squadra vincente per farla avanzare' : 'visualizzazione torneo'}
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Stato {tournament.status}</div>
      </div>

      <div className="mt-6 overflow-x-auto pb-4">
        <div className="flex min-w-max items-start gap-12">
          {rounds.map((round) => {
            const roundMatches = matches.filter((item) => item.round_number === round);
            return (
              <div key={round} className="min-w-[240px]">
                <div className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {roundLabels[round] || `Turno ${round}`}
                </div>
                <div className="flex flex-col gap-6">
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} editable={editable} onSelectWinner={onSelectWinner} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
