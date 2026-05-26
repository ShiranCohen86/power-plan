module.exports = {
  stripe: {
    name: 'Stripe (תשלומים)',
    optional: false,
    keywords: ['stripe', 'payment', 'checkout', 'billing', 'subscription', 'credit card'],
    fields: [
      { key: 'STRIPE_SECRET_KEY',      label: 'Secret Key',       placeholder: 'sk_live_...' },
      { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Publishable Key',  placeholder: 'pk_live_...' },
    ],
    howto: 'console.stripe.com → Developers → API Keys',
  },
  twilio: {
    name: 'Twilio (SMS / WhatsApp)',
    optional: true,
    keywords: ['twilio', 'sms', 'whatsapp', 'otp', 'phone verification', 'text message'],
    fields: [
      { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID',  placeholder: 'AC...' },
      { key: 'TWILIO_AUTH_TOKEN',  label: 'Auth Token',   placeholder: '' },
      { key: 'TWILIO_PHONE',       label: 'Phone Number', placeholder: '+1...' },
    ],
    howto: 'console.twilio.com → Account → API keys & tokens',
  },
  googlemaps: {
    name: 'Google Maps',
    optional: true,
    keywords: ['google maps', 'google map', 'mapbox', 'geolocation', 'geocoding', 'maps api'],
    fields: [
      { key: 'GOOGLE_MAPS_KEY', label: 'API Key', placeholder: 'AIza...' },
    ],
    howto: 'console.cloud.google.com → APIs & Services → Maps JavaScript API → Create credentials',
  },
  openai: {
    name: 'OpenAI',
    optional: true,
    keywords: ['openai', 'gpt-4', 'gpt-3', 'chatgpt', 'dall-e', 'openai api'],
    fields: [
      { key: 'OPENAI_API_KEY', label: 'API Key', placeholder: 'sk-...' },
    ],
    howto: 'platform.openai.com → API keys → Create new secret key',
  },
  pusher: {
    name: 'Pusher (Realtime)',
    optional: true,
    keywords: ['pusher', 'ably', 'soketi', 'pusher channels'],
    fields: [
      { key: 'PUSHER_APP_ID',  label: 'App ID',  placeholder: '' },
      { key: 'PUSHER_KEY',     label: 'Key',     placeholder: '' },
      { key: 'PUSHER_SECRET',  label: 'Secret',  placeholder: '' },
      { key: 'PUSHER_CLUSTER', label: 'Cluster', placeholder: 'eu' },
    ],
    howto: 'dashboard.pusher.com → Your App → App Keys',
  },
  algolia: {
    name: 'Algolia (חיפוש)',
    optional: true,
    keywords: ['algolia', 'full-text search', 'search engine', 'meilisearch'],
    fields: [
      { key: 'ALGOLIA_APP_ID',   label: 'App ID',   placeholder: '' },
      { key: 'ALGOLIA_API_KEY',  label: 'API Key',  placeholder: '' },
    ],
    howto: 'dashboard.algolia.com → Settings → API Keys',
  },
  firebase: {
    name: 'Firebase',
    optional: false,
    keywords: ['firebase', 'firestore', 'firebase auth', 'firebase storage'],
    fields: [
      { key: 'FIREBASE_PROJECT_ID',     label: 'Project ID',     placeholder: '' },
      { key: 'FIREBASE_PRIVATE_KEY',    label: 'Private Key',    placeholder: '' },
      { key: 'FIREBASE_CLIENT_EMAIL',   label: 'Client Email',   placeholder: '' },
    ],
    howto: 'console.firebase.google.com → Project Settings → Service Accounts → Generate new private key',
  },
};
