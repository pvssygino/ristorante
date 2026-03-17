import Stripe from 'stripe';
import { json, requireEnv, updateReservationPayment } from '../_lib/payments.js';
import { sendBookingEmailsByReservationId } from '../_lib/notifications.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    const { session_id: sessionId, reservationId } = req.query || {};
    if (!sessionId || !reservationId) return json(res, 400, { error: 'Missing session_id or reservationId.' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return json(res, 400, { error: 'Stripe session not paid yet.' });
    }

    await updateReservationPayment(reservationId, {
      payment_status: 'Pagato',
      payment_reference: session.payment_intent || session.id,
      provider_session_id: session.id,
      paid_at: new Date().toISOString(),
      status: 'Confermata',
    });
    try { await sendBookingEmailsByReservationId(reservationId, 'payment_success'); } catch {}

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to verify Stripe session.' });
  }
}
