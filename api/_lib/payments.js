import { createClient } from '@supabase/supabase-js';

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadReservationOrThrow(reservationId) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('reservations').select('*').eq('id', reservationId).single();
  if (error) throw error;
  return data;
}

export async function updateReservationPayment(reservationId, payload) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from('reservations').update(payload).eq('id', reservationId);
  if (error) throw error;
}

export function getBaseUrl(req, explicit) {
  if (explicit) return explicit;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export async function getPayPalAccessToken() {
  const clientId = requireEnv('PAYPAL_CLIENT_ID');
  const secret = requireEnv('PAYPAL_CLIENT_SECRET');
  const base = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  const tokenResponse = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(tokenData.error_description || 'Unable to authenticate with PayPal.');
  }

  return { accessToken: tokenData.access_token, base };
}
