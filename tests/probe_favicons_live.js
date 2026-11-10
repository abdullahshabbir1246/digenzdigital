const https = require('https');

const BASE_URL = 'https://www.digendigital.com';

function fetchUrl(path) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}?v=${Date.now()}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          path,
          statusCode: res.statusCode,
          headers: res.headers,
          length: buffer.length,
          preview: buffer.slice(0, 100).toString('utf8'),
          rawBody: buffer.toString('utf8')
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, statusCode: 500, error: err.message });
    });
  });
}

async function probeLive() {
  console.log('--- Probing Live DIGENZ Favicon Deployment ---');
  const urls = [
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-48x48.png',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png',
    '/site.webmanifest',
    '/'
  ];

  for (const u of urls) {
    const res = await fetchUrl(u);
    const ct = res.headers ? res.headers['content-type'] : 'unknown';
    console.log(`[LIVE PROBE] ${u} -> Status: ${res.statusCode}, Content-Type: ${ct}, Size: ${res.length} bytes`);
    if (u === '/') {
      const match = res.rawBody.match(/<!-- DIGENZ Official Brand Favicons -->[\s\S]*?<meta name="theme-color"[^>]*>/i);
      console.log('\n[LIVE HOME HEAD FAVICON BLOCK]:');
      console.log(match ? match[0] : 'Not found in rawBody');
    }
  }
}

probeLive().catch(err => console.error(err));
