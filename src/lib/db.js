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
};

function activeReservation(item) {
  return ['Nuova', 'In attesa', 'Confermata'].includes(item.status);
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

function normalizeSupabaseError(error) {
  if (!error) return 'Errore sconosciuto.';
  const message = String(error.message || '');
  if (message.toLowerCase().includes('duplicate key')) return 'Il posto selezionato non è più disponibile.';
  if (message.toLowerCase().includes('violates check constraint')) return 'I dati inseriti non rispettano i controlli richiesti.';
  if (message.toLowerCase().includes('permission')) return 'Permessi insufficienti per completare l’operazione.';
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
    const { data, error } = await supabase
      .from('settings')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
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
  if (!hasSupabaseEnv) {
    return demoState.reservations;
  }

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

  const { data, error } = await supabase.from('reservations').insert(payload).select().single();
  if (error) throw new Error(normalizeSupabaseError(error));
  return data;
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
    return umbrellas.map((item) => ({
      ...item,
      occupied: false,
      reservation: null,
    }));
  }

  if (!hasSupabaseEnv) {
    const occupied = computeUmbrellaOccupiedSet(demoState.reservations, date);
    return umbrellas.map((item) => ({
      ...item,
      occupied: occupied.has(item.code),
      reservation: occupied.has(item.code) ? { umbrella_code: item.code } : null,
    }));
  }

  const { data, error } = await supabase.rpc('get_public_umbrella_occupancy', {
    target_date: date,
  });

  if (error) throw new Error(normalizeSupabaseError(error));

  const occupiedMap = Object.fromEntries(
    (data || []).map((item) => [
      item.umbrella_code,
      {
        full_name: item.full_name,
        phone: item.phone,
        status: item.status,
      },
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
    return tables.map((item) => ({
      ...item,
      occupied: false,
      reservation: null,
    }));
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
    email: form.email || null,
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
