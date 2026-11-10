const https = require('https');

const BASE_URL = 'https://www.digendigital.com';

function fetchLive(path) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}?v=${Date.now()}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, statusCode: 500, error: err.message, body: '' });
    });
  });
}

async function probeLive() {
  console.log('--- Probing Live Production Website Pricing ---');
  
  // 1. Homepage
  const home = await fetchLive('/');
  console.log(`[LIVE] GET / -> HTTP ${home.statusCode} (${home.body.length} bytes)`);
  console.log('  Contains legacy $14,999:', home.body.includes('$14,999'));
  console.log('  Contains legacy $29,999:', home.body.includes('$29,999'));
  console.log('  Contains legacy $49,999:', home.body.includes('$49,999'));
  console.log('  Contains DB $187 (Startup Web):', home.body.includes('$187'));
  console.log('  Contains DB $375 (Prof Web):', home.body.includes('$375'));
  console.log('  Contains DB $625 (Elite Web):', home.body.includes('$625'));
  console.log('  Contains DB $50 (Startup Logo):', home.body.includes('$50'));

  // 2. Packages page
  const pkg = await fetchLive('/packages/');
  console.log(`\n[LIVE] GET /packages/ -> HTTP ${pkg.statusCode} (${pkg.body.length} bytes)`);
  console.log('  Contains legacy $14,999:', pkg.body.includes('$14,999'));
  console.log('  Contains DB $187:', pkg.body.includes('$187'));
  console.log('  Contains DB $375:', pkg.body.includes('$375'));
  console.log('  Contains DB $625:', pkg.body.includes('$625'));

  // 3. Detail page
  const detail = await fetchLive('/pricing/startup-website-package/');
  console.log(`\n[LIVE] GET /pricing/startup-website-package/ -> HTTP ${detail.statusCode} (${detail.body.length} bytes)`);
  console.log('  Contains legacy $249.99:', detail.body.includes('$249.99'));
  console.log('  Contains legacy $499.98:', detail.body.includes('$499.98'));
  console.log('  Contains DB $187:', detail.body.includes('$187'));
  console.log('  Contains DB $468 (reg):', detail.body.includes('$468'));

  const success = !home.body.includes('$14,999') && home.body.includes('$187') && !detail.body.includes('$249.99') && detail.body.includes('$187');
  console.log(`\n========================================`);
  console.log(`Live Probe Result: ${success ? 'ALL CHECKS PASSED' : 'WAITING FOR VERCEL DEPLOYMENT'}`);
  console.log(`========================================`);
}

probeLive().catch(err => console.error(err));
