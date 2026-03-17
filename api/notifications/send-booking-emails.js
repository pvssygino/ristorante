import { json } from '../_lib/payments.js';
import { sendBookingEmailsByReservationId } from '../_lib/notifications.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const { reservationId, stage = 'created' } = req.body || {};
    if (!reservationId) return json(res, 400, { error: 'reservationId is required.' });
    const result = await sendBookingEmailsByReservationId(reservationId, stage);
    return json(res, 200, result);
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to send booking emails.' });
  }
}
