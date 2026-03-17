# Ristorante Real V2

## Avvio locale

```bash
npm install
npm run dev
```

## Variabili ambiente client

Copia `.env.example` in `.env` e imposta:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Variabili ambiente server su Vercel

Aggiungi anche queste nelle Project Settings di Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV`

## Database

Esegui `supabase/schema.sql` nel SQL Editor del progetto Supabase.

## Pagamenti reali

### Carta / debito
Il progetto usa **Stripe Checkout** tramite l'endpoint:
- `api/payments/create-stripe-session.js`

Webhook Stripe:
- `api/payments/stripe-webhook.js`

Verifica redirect success:
- `api/payments/stripe-success.js`

### PayPal
Il progetto usa **PayPal Orders API** tramite:
- `api/payments/create-paypal-order.js`
- `api/payments/capture-paypal-order.js`

## Cosa devi configurare per metterlo davvero in produzione

### Stripe
1. Crea account Stripe.
2. Copia chiave test o live in `STRIPE_SECRET_KEY`.
3. In Stripe crea un webhook verso:
   - `https://tuodominio.it/api/payments/stripe-webhook`
4. Copia il signing secret in `STRIPE_WEBHOOK_SECRET`.
5. In modalità test puoi usare le carte di test ufficiali di Stripe.

### PayPal
1. Crea una app su PayPal Developer.
2. Copia `Client ID` e `Client Secret`.
3. Imposta `PAYPAL_ENV=sandbox` per test oppure `live` per produzione.
4. Se vuoi, puoi aggiungere anche un webhook PayPal in futuro; il progetto aggiorna già lo stato tramite il capture endpoint di ritorno.

## Note funzionali

- Ombrellone e Beer Pong permettono pagamento in loco, Stripe Checkout o PayPal.
- Ristorante resta pagabile solo in presenza.
- La dashboard admin mostra stato prenotazione, stato pagamento, importi e lista Beer Pong.
- La lista Beer Pong include solo iscrizioni con pagamento in loco o pagamento online riuscito.


## Variabili ambiente aggiuntive
Per attivare email automatiche base usa Resend impostando `RESEND_API_KEY`, `FROM_EMAIL` e `OWNER_NOTIFICATION_EMAIL`. Se mancano, il sito continua a funzionare ma non invia email.

## Privacy
La prenotazione richiede il consenso privacy. Se aggiorni Supabase, riesegui `supabase/schema.sql` per aggiungere `privacy_accepted` e `privacy_accepted_at`.
