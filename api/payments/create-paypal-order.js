import { getBaseUrl, getPayPalAccessToken, json, loadReservationOrThrow, updateReservationPayment } from '../_lib/payments.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const { reservationId, amountCents, currency = 'EUR', siteUrl } = req.body || {};
    if (!reservationId || !amountCents) return json(res, 400, { error: 'reservationId and amountCents are required.' });

    const reservation = await loadReservationOrThrow(reservationId);
    const { accessToken, base } = await getPayPalAccessToken();
    const baseUrl = getBaseUrl(req, siteUrl);

    const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: reservationId,
            amount: {
              currency_code: currency.toUpperCase(),
              value: (amountCents / 100).toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: `${baseUrl}/api/payments/capture-paypal-order?reservationId=${encodeURIComponent(reservationId)}`,
              cancel_url: `${baseUrl}/?page=prenotazioni&payment_provider=paypal&payment_result=cancel&reservation_id=${encodeURIComponent(reservationId)}`,
              user_action: 'PAY_NOW',
            },
          },
        },
      }),
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok) return json(res, 500, { error: orderData.message || 'Unable to create PayPal order.' });

    const approvalLink = orderData.links?.find((link) => link.rel === 'approve')?.href;
    if (!approvalLink) return json(res, 500, { error: 'PayPal did not return an approval URL.' });

    await updateReservationPayment(reservationId, {
      payment_reference: orderData.id,
      provider_session_id: orderData.id,
      payment_method: 'paypal_online',
      payment_status: 'In attesa pagamento',
    });

    return json(res, 200, { url: approvalLink, orderId: orderData.id });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to create PayPal order.' });
  }
}
