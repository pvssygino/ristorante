import Stripe from 'stripe';
import { requireEnv, updateReservationPayment } from '../_lib/payments.js';

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  try {
    const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    const signature = req.headers['stripe-signature'];
    const payload = await readRawBody(req);
    const event = stripe.webhooks.constructEvent(payload, signature, requireEnv('STRIPE_WEBHOOK_SECRET'));

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const reservationId = session.metadata?.reservation_id;
      if (reservationId && session.payment_status === 'paid') {
        await updateReservationPayment(reservationId, {
          payment_status: 'Pagato',
          payment_reference: session.payment_intent || session.id,
          provider_session_id: session.id,
          paid_at: new Date().toISOString(),
          status: 'Confermata',
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid Stripe webhook.' });
  }
}
