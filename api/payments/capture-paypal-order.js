import { getPayPalAccessToken, updateReservationPayment } from '../_lib/payments.js';
import { sendBookingEmailsByReservationId } from '../_lib/notifications.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  try {
    const { token, reservationId } = req.query || {};
    if (!token || !reservationId) return res.status(400).send('Missing token or reservationId');

    const { accessToken, base } = await getPayPalAccessToken();
    const captureResponse = await fetch(`${base}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureResponse.json();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const redirectBase = `${proto}://${host}`;

    if (!captureResponse.ok) {
      return res.redirect(`${redirectBase}/?page=prenotazioni&payment_provider=paypal&payment_result=cancel&reservation_id=${encodeURIComponent(reservationId)}`);
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || captureData.id;
    await updateReservationPayment(reservationId, {
      payment_status: 'Pagato',
      payment_reference: captureId,
      provider_session_id: token,
      paid_at: new Date().toISOString(),
      status: 'Confermata',
    });
    try { await sendBookingEmailsByReservationId(reservationId, 'payment_success'); } catch {}

    return res.redirect(`${redirectBase}/?page=prenotazioni&payment_provider=paypal&payment_result=success&reservation_id=${encodeURIComponent(reservationId)}`);
  } catch (error) {
    return res.status(500).send(error.message || 'Unable to capture PayPal order');
  }
}
