import Stripe from 'stripe';
import { getBaseUrl, json, loadReservationOrThrow, requireEnv, updateReservationPayment } from '../_lib/payments.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    const { reservationId, amountCents, currency = 'EUR', siteUrl } = req.body || {};
    if (!reservationId || !amountCents) return json(res, 400, { error: 'reservationId and amountCents are required.' });

    const reservation = await loadReservationOrThrow(reservationId);
    const baseUrl = getBaseUrl(req, siteUrl);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: reservation.booking_type === 'ombrellone' ? 'Prenotazione ombrellone' : 'Iscrizione Beer Pong',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?page=prenotazioni&payment_provider=stripe&payment_result=success&reservation_id=${reservationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?page=prenotazioni&payment_provider=stripe&payment_result=cancel&reservation_id=${reservationId}`,
      metadata: {
        reservation_id: reservationId,
        booking_type: reservation.booking_type,
      },
    });

    await updateReservationPayment(reservationId, {
      payment_reference: session.id,
      provider_session_id: session.id,
      payment_method: 'card_online',
      payment_status: 'In attesa pagamento',
    });

    return json(res, 200, { url: session.url, sessionId: session.id });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to create Stripe session.' });
  }
}
