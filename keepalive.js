const https = require('https');

const URL = 'https://power-plan-backend.onrender.com/health';

https.get(URL, (res) => {
  console.log(`[${new Date().toISOString()}] ping → ${res.statusCode}`);
}).on('error', (e) => {
  console.error(`[${new Date().toISOString()}] ping failed:`, e.message);
});
