export const venue = {
  name: 'The Shark',
  tagline: 'Sapori di mare, relax in spiaggia e serate speciali',
  description:
    'Un ristorante sul mare pensato per chi vuole vivere una giornata completa tra cucina, relax in spiaggia e serate estive.',
  address: 'Via Stracia Mare, 89038 Palizzi Marina (RC)',
  phone: '+39 339 681 0624',
  email: 'polimeno46@gmail.com',
  mapsEmbedQuery: '37.9182422,15.9851447',
  logoPath: '/img/logo-circle.svg',
  heroBadge: 'Ristorante • Lido • Eventi',
  heroTitle: 'Il piacere del mare, della buona cucina e del sole d’estate.',
  heroSubtitle: 'Prenota ombrellone, tavolo o torneo Beer Pong in pochi passaggi e vivi un’esperienza completa tra sapori, relax e divertimento.',
  gallerySubtitle: 'I sapori del mare e della nostra cucina, raccontati nei nostri piatti.',
  hours: [
    'Lunedì - Venerdì: 12:00 - 15:00 / 19:00 - 23:30',
    'Sabato - Domenica: 12:00 - 16:00 / 19:00 - 00:00',
  ],
  instagramUrl: 'https://instagram.com/theshark',
  whatsappUrl: 'https://wa.me/393396810624',
  mapsUrl: 'https://www.google.com/maps?q=37.9182422,15.9851447',
  privacyContactName: 'The Shark',
  privacyLastUpdated: '15 marzo 2026',
  legal: {
    ownerLabel: 'Titolare del trattamento',
    dataPurpose: 'Gestione delle prenotazioni, dell’assistenza ai clienti e dei pagamenti collegati ai servizi online.',
    retainedData: 'Nome, telefono, email, dati di prenotazione, eventuale metodo di pagamento e stato della transazione.',
  },
};

export const dishes = [
  {
    title: 'Paccheri, spada e melanzane',
    image: '/img/piatto1.jpg',
    note: 'Uno dei grandi classici del locale.',
    ingredients: ['paccheri', 'melanzane', 'pesce spada', 'prezzemolo', 'olio EVO'],
  },
  {
    title: 'Zuppa di pesce',
    image: '/img/piatto2.jpg',
    note: 'Un piatto ricco, intenso e perfetto da condividere.',
    ingredients: ['cozze', 'gamberi', 'pomodori', 'bruschette'],
  },
  {
    title: 'Paccheri e scampi',
    image: '/img/piatto3.jpg',
    note: 'Fresca e ideale per il pranzo in spiaggia.',
    ingredients: ['paccheri', 'scampi', 'basilico', 'olio EVO'],
  },
  {
    title: 'Linguine alle vongole',
    image: '/img/piatto4.jpg',
    note: 'Semplicità e profumo di mare.',
    ingredients: ['vongole', 'prezzemolo', 'aglio', 'olio EVO'],
  },
];

export const UMBRELLA_ROWS = 4;
export const UMBRELLAS_PER_ROW = 10;
export const TABLE_COUNT = 20;
export const TABLE_CAPACITY = 4;
export const RESTAURANT_MAX_CAPACITY = TABLE_COUNT * TABLE_CAPACITY;

export const PAYMENT_METHODS = {
  PAY_ON_SITE: 'pay_on_site',
  CARD_ONLINE: 'card_online',
  PAYPAL_ONLINE: 'paypal_online',
};

export const PAYMENT_STATUSES = {
  PAY_ON_SITE: 'Da pagare in loco',
  PENDING: 'In attesa pagamento',
  PAID: 'Pagato',
  FAILED: 'Fallito',
  REFUNDED: 'Rimborsato',
};

export const PRICING = {
  umbrellaCents: 2500,
  beerpongCents: 1500,
  currency: 'EUR',
};

export function formatEuroFromCents(value) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format((value || 0) / 100);
}
