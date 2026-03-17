import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRICING,
  RESTAURANT_MAX_CAPACITY,
  TABLE_CAPACITY,
  TABLE_COUNT,
  UMBRELLA_ROWS,
  UMBRELLAS_PER_ROW,
} from '../data/config';
import { hasSupabaseEnv, supabase } from './supabase';

const createDemoUmbrellas = () => {
  const data = [];
  for (let row = 1; row <= UMBRELLA_ROWS; row += 1) {
    for (let number = 1; number <= UMBRELLAS_PER_ROW; number += 1) {
      const code = `F${row}-O${String(number).padStart(2, '0')}`;
      data.push({
        id: crypto.randomUUID(),
        code,
        row_number: row,
        spot_number: number,
        is_active: true,
      });
    }
  }
  return data;
};

const createDemoTables = () =>
  Array.from({ length: TABLE_COUNT }, (_, index) => ({
    id: crypto.randomUUID(),
    code: `T${String(index + 1).padStart(2, '0')}`,
    seats: TABLE_CAPACITY,
    is_active: true,
  }));

const demoState = {
  settings: {
    beerpong_enabled: true,
    restaurant_max_capacity: RESTAURANT_MAX_CAPACITY,
  },
  umbrellas: createDemoUmbrellas(),
  tables: createDemoTables(),
  reservations: [],
  tournaments: [],
  matches: [],
};

function activeReservation(item) {
  return ['Nuova', 'In attesa', 'Confermata'].includes(item.status);
}

function normalizeSupabaseError(error) {
  if (!error) return 'Errore sconosciuto.';
  const message = String(error.message || '');
  const lower = message.toLowerCase();
  if (lower.includes('duplicate key')) return 'Il posto selezionato non è più disponibile.';
  if (lower.includes('violates check constraint')) return 'I dati inseriti non rispettano i controlli richiesti.';
  if (lower.includes('permission')) return 'Permessi insufficienti per completare l’operazione.';
  return message;
}

function buildPaymentDefaults(bookingType, paymentMethod) {
  if (bookingType === 'ristorante') {
    return {
      payment_method: PAYMENT_METHODS.PAY_ON_SITE,
      payment_status: PAYMENT_STATUSES.PAY_ON_SITE,
      payment_amount: 0,
    };
  }

  if (paymentMethod === PAYMENT_METHODS.PAY_ON_SITE) {
    return {
      payment_method: PAYMENT_METHODS.PAY_ON_SITE,
      payment_status: PAYMENT_STATUSES.PAY_ON_SITE,
      payment_amount: bookingType === 'ombrellone' ? PRICING.umbrellaCents : PRICING.beerpongCents,
    };
  }

  return {
    payment_method: paymentMethod,
    payment_status: PAYMENT_STATUSES.PENDING,
    payment_amount: bookingType === 'ombrellone' ? PRICING.umbrellaCents : PRICING.beerpongCents,
  };
}

function computeUmbrellaOccupiedSet(reservations, date) {
  return new Set(
    reservations
      .filter(
        (item) =>
          item.booking_type === 'ombrellone' &&
          item.booking_date === date &&
          item.umbrella_code &&
          activeReservation(item)
      )
      .map((item) => item.umbrella_code)
  );
}

function computeTableOccupiedMap(reservations, date, service) {
  const selected = reservations.filter(
    (item) =>
      item.booking_type === 'ristorante' &&
      item.booking_date === date &&
      (item.service_type || 'cena') === service &&
      item.table_code &&
      activeReservation(item)
  );

  return selected.reduce((acc, item) => {
    acc[item.table_code] = item;
    return acc;
  }, {});
}

function nextPowerOfTwo(value) {
  let current = 2;
  while (current < value) current *= 2;
  return current;
}

function padBracketTeams(participants) {
  const teams = participants.map((item) => ({
    reservation_id: item.id,
    team_name: item.team_name,
    contact_name: item.full_name,
  }));
  const size = nextPowerOfTwo(Math.max(teams.length, 2));
  while (teams.length < size) teams.push(null);
  return { teams, size };
}

function buildBracketMatchesFromParticipants(participants, tournamentId) {
  const { teams, size } = padBracketTeams(participants);
  const rounds = Math.log2(size);
  const matches = [];

  for (let round = 1; round <= rounds; round += 1) {
    const roundMatchCount = size / 2 ** round;
    for (let matchNumber = 1; matchNumber <= roundMatchCount; matchNumber += 1) {
      const match = {
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        round_number: round,
        match_number: matchNumber,
        team1_name: null,
        team2_name: null,
        team1_reservation_id: null,
        team2_reservation_id: null,
        winner_name: null,
        winner_reservation_id: null,
        status: 'pending',
      };

      if (round === 1) {
        const team1 = teams[(matchNumber - 1) * 2] || null;
        const team2 = teams[(matchNumber - 1) * 2 + 1] || null;
        match.team1_name = team1?.team_name || null;
        match.team1_reservation_id = team1?.reservation_id || null;
        match.team2_name = team2?.team_name || null;
        match.team2_reservation_id = team2?.reservation_id || null;
      }

      matches.push(match);
    }
  }

  return propagateBracket(matches);
}

function propagateBracket(matches) {
  const cloned = matches
    .map((item) => ({ ...item }))
    .sort((a, b) => a.round_number - b.round_number || a.match_number - b.match_number);

  const byRound = new Map();
  cloned.forEach((match) => {
    const list = byRound.get(match.round_number) || [];
    list.push(match);
    byRound.set(match.round_number, list);
  });

  const maxRound = Math.max(...cloned.map((item) => item.round_number), 1);

  // reset non-first-round participants before recomputing
  cloned.forEach((match) => {
    if (match.round_number > 1) {
      match.team1_name = null;
      match.team2_name = null;
      match.team1_reservation_id = null;
      match.team2_reservation_id = null;
    }
  });

  // auto resolve byes and propagate winners forward round by round
  for (let round = 1; round <= maxRound; round += 1) {
    const currentRound = byRound.get(round) || [];

    currentRound.forEach((match) => {
      const hasTeam1 = Boolean(match.team1_name);
      const hasTeam2 = Boolean(match.team2_name);

      if (!match.winner_name) {
        if (hasTeam1 && !hasTeam2) {
          match.winner_name = match.team1_name;
          match.winner_reservation_id = match.team1_reservation_id;
          match.status = 'bye';
        } else if (!hasTeam1 && hasTeam2) {
          match.winner_name = match.team2_name;
          match.winner_reservation_id = match.team2_reservation_id;
          match.status = 'bye';
        } else {
          match.winner_reservation_id =
            match.winner_name === match.team1_name ? match.team1_reservation_id :
            match.winner_name === match.team2_name ? match.team2_reservation_id : null;
          match.status = match.winner_name ? 'completed' : (hasTeam1 || hasTeam2 ? 'ready' : 'pending');
        }
      } else {
        match.winner_reservation_id =
          match.winner_name === match.team1_name ? match.team1_reservation_id :
          match.winner_name === match.team2_name ? match.team2_reservation_id : null;
        match.status = 'completed';
      }

      if (match.winner_name && round < maxRound) {
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const nextRoundMatches = byRound.get(round + 1) || [];
        const nextMatch = nextRoundMatches.find((item) => item.match_number === nextMatchNumber);
        if (nextMatch) {
          if (match.match_number % 2 === 1) {
            nextMatch.team1_name = match.winner_name;
            nextMatch.team1_reservation_id = match.winner_reservation_id;
          } else {
            nextMatch.team2_name = match.winner_name;
            nextMatch.team2_reservation_id = match.winner_reservation_id;
          }
        }
      }
    });
  }

  return cloned;
}

function getDemoTournamentState() {
  const tournament = [...demoState.tournaments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
  const matches = tournament ? demoState.matches.filter((item) => item.tournament_id === tournament.id) : [];
  return { tournament, matches: propagateBracket(matches) };
}

async function persistMatchRows(matchRows) {
  if (!matchRows.length) return [];

  for (const row of matchRows) {
    const payload = {
      tournament_id: row.tournament_id,
      round_number: row.round_number,
      match_number: row.match_number,
      team1_name: row.team1_name ?? null,
      team2_name: row.team2_name ?? null,
      team1_reservation_id: row.team1_reservation_id ?? null,
      team2_reservation_id: row.team2_reservation_id ?? null,
      winner_name: row.winner_name ?? null,
      winner_reservation_id: row.winner_reservation_id ?? null,
      status: row.status ?? 'pending',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('beerpong_matches')
      .update(payload)
      .eq('id', row.id);

    if (error) throw new Error(normalizeSupabaseError(error));
  }

  return matchRows;
}

async function insertMatchRows(matchRows) {
  if (!matchRows.length) return [];

  const rows = matchRows.map((row) => ({
    id: row.id,
    tournament_id: row.tournament_id,
    round_number: row.round_number,
    match_number: row.match_number,
    team1_name: row.team1_name ?? null,
    team2_name: row.team2_name ?? null,
    team1_reservation_id: row.team1_reservation_id ?? null,
    team2_reservation_id: row.team2_reservation_id ?? null,
    winner_name: row.winner_name ?? null,
    winner_reservation_id: row.winner_reservation_id ?? null,
    status: row.status ?? 'pending',
  }));

  const { error } = await supabase.from('beerpong_matches').insert(rows);
  if (error) throw new Error(normalizeSupabaseError(error));
  return rows;
}

export async function getPublicSettings() {
  if (!hasSupabaseEnv) return demoState.settings;
  const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw new Error(normalizeSupabaseError(error));
  return data || demoState.settings;
}

export async function updateSettings(payload) {
  if (!hasSupabaseEnv) {
    demoState.settings = { ...demoState.settings, ...payload };
    return demoState.settings;
  }

  const { data: existing, error: readError } = await supabase.from('settings').select('id').limit(1).maybeSingle();
  if (readError) throw new Error(normalizeSupabaseError(readError));

  if (existing?.id) {
    const { data, error } = await supabase.from('settings').update(payload).eq('id', existing.id).select().single();
    if (error) throw new Error(normalizeSupabaseError(error));
    return data;
  }

  const { data, error } = await supabase.from('settings').insert(payload).select().single();
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
}

export async function getUmbrellas() {
  if (!hasSupabaseEnv) return demoState.umbrellas;
  const { data, error } = await supabase.from('umbrella_spots').select('*').order('row_number').order('spot_number');
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
}

export async function getTables() {
  if (!hasSupabaseEnv) return demoState.tables;
  const { data, error } = await supabase.from('restaurant_tables').select('*').order('code');
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
}

export async function getReservations(filters = {}) {
  if (!hasSupabaseEnv) return demoState.reservations;

  let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });
  if (filters.date) query = query.eq('booking_date', filters.date);
  if (filters.bookingType) query = query.eq('booking_type', filters.bookingType);
  if (filters.serviceType) query = query.eq('service_type', filters.serviceType);
  const { data, error } = await query;
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
}

export async function getBeerpongParticipants() {
  const reservations = await getReservations({ bookingType: 'beerpong' });
  return reservations.filter(
    (item) =>
      item.booking_type === 'beerpong' &&
      item.team_name &&
      activeReservation(item) &&
      (item.payment_method === PAYMENT_METHODS.PAY_ON_SITE || item.payment_status === PAYMENT_STATUSES.PAID)
  );
}

export async function createReservation(payload) {
  if (!hasSupabaseEnv) {
    const row = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      status: 'Nuova',
      ...payload,
    };
    demoState.reservations.unshift(row);
    return row;
  }

  const { error } = await supabase.from('reservations').insert(payload);
  if (error) throw new Error(normalizeSupabaseError(error));
  return { ...payload, status: 'Nuova' };
}

export async function updateReservationStatus(id, status) {
  if (!hasSupabaseEnv) {
    demoState.reservations = demoState.reservations.map((item) => (item.id === id ? { ...item, status } : item));
    return demoState.reservations.find((item) => item.id === id);
  }

  const { data, error } = await supabase.from('reservations').update({ status }).eq('id', id).select().single();
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
}

export async function updatePaymentStatus(id, paymentStatus) {
  const payload = {
    payment_status: paymentStatus,
    paid_at: paymentStatus === PAYMENT_STATUSES.PAID ? new Date().toISOString() : null,
  };

  if (!hasSupabaseEnv) {
    demoState.reservations = demoState.reservations.map((item) => (item.id === id ? { ...item, ...payload } : item));
    return demoState.reservations.find((item) => item.id === id);
  }

  const { data, error } = await supabase.from('reservations').update(payload).eq('id', id).select().single();
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
}

export async function getUmbrellaAvailability(date) {
  const umbrellas = await getUmbrellas();

  if (!date) {
    return umbrellas.map((item) => ({ ...item, occupied: false, reservation: null }));
  }

  if (!hasSupabaseEnv) {
    const occupied = computeUmbrellaOccupiedSet(demoState.reservations, date);
    return umbrellas.map((item) => ({
      ...item,
      occupied: occupied.has(item.code),
      reservation: occupied.has(item.code) ? { umbrella_code: item.code } : null,
    }));
  }

  const { data, error } = await supabase.rpc('get_public_umbrella_occupancy', { target_date: date });
  if (error) throw new Error(normalizeSupabaseError(error));

  const occupiedMap = Object.fromEntries(
    (data || []).map((item) => [
      item.umbrella_code,
      { full_name: item.full_name, phone: item.phone, status: item.status },
    ])
  );

  return umbrellas.map((item) => ({
    ...item,
    occupied: Boolean(occupiedMap[item.code]),
    reservation: occupiedMap[item.code] || null,
  }));
}

export async function getTableAvailability(date, service) {
  const tables = await getTables();

  if (!date || !service) {
    return tables.map((item) => ({ ...item, occupied: false, reservation: null }));
  }

  if (!hasSupabaseEnv) {
    const occupiedMap = computeTableOccupiedMap(demoState.reservations, date, service);
    return tables.map((item) => ({
      ...item,
      occupied: Boolean(occupiedMap[item.code]),
      reservation: occupiedMap[item.code] || null,
    }));
  }

  const { data, error } = await supabase.rpc('get_public_table_occupancy', {
    target_date: date,
    target_service: service,
  });
  if (error) throw new Error(normalizeSupabaseError(error));

  const occupiedMap = Object.fromEntries(
    (data || []).map((item) => [
      item.table_code,
      {
        full_name: item.full_name,
        phone: item.phone,
        guest_count: item.guest_count,
        status: item.status,
      },
    ])
  );

  return tables.map((item) => ({
    ...item,
    occupied: Boolean(occupiedMap[item.code]),
    reservation: occupiedMap[item.code] || null,
  }));
}

function getAppBaseUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export async function startOnlineCheckout({ reservationId, bookingType, paymentMethod, amountCents }) {
  const endpoint =
    paymentMethod === PAYMENT_METHODS.CARD_ONLINE
      ? '/api/payments/create-stripe-session'
      : '/api/payments/create-paypal-order';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reservationId,
      bookingType,
      amountCents,
      currency: PRICING.currency,
      siteUrl: getAppBaseUrl(),
    }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Impossibile avviare il pagamento online.');
  if (result.url) {
    window.location.href = result.url;
    return result;
  }
  throw new Error('Il provider non ha restituito un URL di checkout valido.');
}

export async function confirmStripeSessionFromRedirect(sessionId, reservationId) {
  const response = await fetch(`/api/payments/stripe-success?session_id=${encodeURIComponent(sessionId)}&reservationId=${encodeURIComponent(reservationId)}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Pagamento non confermato.');
  return result;
}

export async function notifyBookingEmails(reservationId, stage = 'created') {
  try {
    const response = await fetch('/api/notifications/send-booking-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId, stage }),
    });
    if (!response.ok) throw new Error('notification_failed');
    return await response.json();
  } catch {
    return { ok: false };
  }
}

export function buildReservationPayload(form) {
  const paymentDefaults = buildPaymentDefaults(form.bookingType, form.paymentMethod);

  return {
    booking_type: form.bookingType,
    full_name: form.fullName,
    phone: form.phone,
    email: null,
    booking_date: form.bookingDate,
    service_type: form.bookingType === 'ristorante' ? form.serviceType : null,
    time_slot: form.bookingType === 'ristorante' ? form.timeSlot : null,
    guest_count: form.bookingType === 'ristorante' ? Number(form.guestCount) : null,
    notes: form.notes || null,
    umbrella_code: form.bookingType === 'ombrellone' ? form.umbrellaCode : null,
    table_code: form.bookingType === 'ristorante' ? form.tableCode : null,
    team_name: form.bookingType === 'beerpong' ? form.teamName : null,
    status: 'Nuova',
    ...paymentDefaults,
    payment_reference: null,
    paid_at: null,
    privacy_accepted: Boolean(form.privacyAccepted),
    privacy_accepted_at: form.privacyAccepted ? new Date().toISOString() : null,
  };
}

export async function getBeerpongTournament() {
  if (!hasSupabaseEnv) {
    return getDemoTournamentState();
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from('beerpong_tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (tournamentError) throw new Error(normalizeSupabaseError(tournamentError));

  if (!tournament) return { tournament: null, matches: [] };

  const { data: matches, error: matchesError } = await supabase
    .from('beerpong_matches')
    .select('*')
    .eq('tournament_id', tournament.id)
    .order('round_number')
    .order('match_number');
  if (matchesError) throw new Error(normalizeSupabaseError(matchesError));

  return { tournament, matches: propagateBracket(matches || []) };
}

export async function generateBeerpongTournament({ title, participants }) {
  if (!participants.length) throw new Error('Servono almeno 2 squadre per generare il tabellone.');

  if (!hasSupabaseEnv) {
    demoState.tournaments = [];
    demoState.matches = [];
    const tournament = {
      id: crypto.randomUUID(),
      title: title?.trim() || 'Torneo Beer Pong',
      status: 'in_progress',
      bracket_size: nextPowerOfTwo(Math.max(participants.length, 2)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const matches = buildBracketMatchesFromParticipants(participants, tournament.id);
    demoState.tournaments.push(tournament);
    demoState.matches.push(...matches);
    return { tournament, matches };
  }

  await supabase.from('beerpong_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('beerpong_tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const tournamentPayload = {
    title: title?.trim() || 'Torneo Beer Pong',
    status: 'in_progress',
    bracket_size: nextPowerOfTwo(Math.max(participants.length, 2)),
  };

  const { data: tournament, error: tournamentError } = await supabase
    .from('beerpong_tournaments')
    .insert(tournamentPayload)
    .select()
    .single();
  if (tournamentError) throw new Error(normalizeSupabaseError(tournamentError));

  const matches = buildBracketMatchesFromParticipants(participants, tournament.id);
  await insertMatchRows(matches);
  return { tournament, matches };
}

export async function updateBeerpongMatchWinner(matchId, winnerName) {
  if (!winnerName) return null;

  if (!hasSupabaseEnv) {
    const state = getDemoTournamentState();
    const updated = state.matches.map((match) =>
      match.id === matchId
        ? { ...match, winner_name: winnerName, status: 'completed', updated_at: new Date().toISOString() }
        : match
    );
    demoState.matches = propagateBracket(updated);
    return demoState.matches.find((item) => item.id === matchId) || null;
  }

  const { data: match, error: matchError } = await supabase
    .from('beerpong_matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (matchError) throw new Error(normalizeSupabaseError(matchError));

  const { data: allMatches, error: allError } = await supabase
    .from('beerpong_matches')
    .select('*')
    .eq('tournament_id', match.tournament_id)
    .order('round_number')
    .order('match_number');
  if (allError) throw new Error(normalizeSupabaseError(allError));

  const updatedMatches = propagateBracket(
    (allMatches || []).map((item) =>
      item.id === matchId
        ? { ...item, winner_name: winnerName, status: 'completed', updated_at: new Date().toISOString() }
        : item
    )
  );

  await persistMatchRows(updatedMatches);
  return updatedMatches.find((item) => item.id === matchId) || null;
}

export async function resetBeerpongTournament() {
  if (!hasSupabaseEnv) {
    demoState.tournaments = [];
    demoState.matches = [];
    return true;
  }

  const { error: matchesError } = await supabase.from('beerpong_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (matchesError) throw new Error(normalizeSupabaseError(matchesError));
  const { error: tournamentsError } = await supabase.from('beerpong_tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (tournamentsError) throw new Error(normalizeSupabaseError(tournamentsError));
  return true;
}
