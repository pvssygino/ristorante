import { getServerSupabase, loadReservationOrThrow } from './payments.js';

function optionalEnv(name) {
  return process.env[name] || '';
}

function bookingLabel(type) {
  return type === 'ombrellone' ? 'Prenotazione ombrellone' : type === 'ristorante' ? 'Prenotazione ristorante' : 'Iscrizione Beer Pong';
}

function buildHtml({ reservation, venueName, stage }) {
  const rows = [
    ['Tipo', bookingLabel(reservation.booking_type)],
    ['Cliente', reservation.full_name],
    ['Telefono', reservation.phone],
    ['Email', reservation.email || '-'],
    ['Data', reservation.booking_date],
    ['Ombrellone', reservation.umbrella_code || '-'],
    ['Tavolo', reservation.table_code || '-'],
    ['Squadra', reservation.team_name || '-'],
    ['Metodo pagamento', reservation.payment_method || '-'],
    ['Stato pagamento', reservation.payment_status || '-'],
  ];
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 16px;font-size:24px">${venueName}</h2>
      <p style="margin:0 0 16px;font-size:15px">${stage === 'payment_success' ? 'Il pagamento online è stato registrato correttamente.' : 'Abbiamo ricevuto una nuova richiesta dal sito.'}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k,v])=>`<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;width:180px">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${v}</td></tr>`).join('')}</table>
    </div>`;
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = optionalEnv('RESEND_API_KEY');
  const from = optionalEnv('FROM_EMAIL') || 'The Shark <onboarding@resend.dev>';
  if (!apiKey || !to) return { skipped: true };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html }),
  });

  if (!response.ok) {
    const data = await response.text();
    throw new Error(data || 'Unable to send email with Resend.');
  }

  return response.json();
}

export async function sendBookingEmailsByReservationId(reservationId, stage = 'created') {
  const reservation = await loadReservationOrThrow(reservationId);
  const settingsClient = getServerSupabase();
  const { data: setting } = await settingsClient.from('settings').select('*').limit(1).maybeSingle();
  const venueName = optionalEnv('VENUE_NAME') || 'The Shark';
  const ownerEmail = optionalEnv('OWNER_NOTIFICATION_EMAIL');
  const html = buildHtml({ reservation, venueName, stage });
  const subjectBase = `${venueName} • ${bookingLabel(reservation.booking_type)}`;

  if (ownerEmail) {
    await sendWithResend({
      to: ownerEmail,
      subject: stage === 'payment_success' ? `${subjectBase} pagata online` : `${subjectBase} ricevuta`,
      html,
    });
  }

  if (reservation.email) {
    await sendWithResend({
      to: reservation.email,
      subject: stage === 'payment_success' ? `${venueName}: pagamento confermato` : `${venueName}: richiesta ricevuta`,
      html,
    });
  }

  return { ok: true, setting };
}
