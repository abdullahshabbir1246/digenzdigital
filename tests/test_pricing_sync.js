const fs = require('fs');
const path = require('path');
const http = require('http');
const { db, hashPassword } = require('../db');

const rootDir = path.resolve(__dirname, '..');

async function testPricingSync() {
  console.log('=== ADMIN PANEL PRICING SYNCHRONIZATION TEST ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Initialize DB and load products
  db.initSync();
  await db.ensureFreshData();
  const products = db.data.products || [];
  assert(products.length >= 40, `Loaded ${products.length} products from database`);

  const startupWeb = products.find(p => p.id === 'prod-startup-website-package');
  const profWeb = products.find(p => p.id === 'prod-professional-website-package');
  const eliteWeb = products.find(p => p.id === 'prod-elite-website-package');
  const startupLogo = products.find(p => p.id === 'prod-startup-logo-package');

  assert(startupWeb && startupWeb.salePrice === 187, `Startup Web DB price is $${startupWeb?.salePrice} (reg $${startupWeb?.price})`);
  assert(profWeb && profWeb.salePrice === 375, `Prof Web DB price is $${profWeb?.salePrice} (reg $${profWeb?.price})`);
  assert(eliteWeb && eliteWeb.salePrice === 625, `Elite Web DB price is $${eliteWeb?.salePrice} (reg $${eliteWeb?.price})`);
  assert(startupLogo && startupLogo.salePrice === 50, `Startup Logo DB price is $${startupLogo?.salePrice} (reg $${startupLogo?.price})`);

  // 2. Verify static index.html on disk contains NO old prices ($14,999, $29,999, $49,999)
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert(!indexHtml.includes('$14,999'), 'index.html contains NO legacy $14,999');
  assert(!indexHtml.includes('$29,999'), 'index.html contains NO legacy $29,999');
  assert(!indexHtml.includes('$49,999'), 'index.html contains NO legacy $49,999');
  assert(indexHtml.includes('$187'), 'index.html contains authoritative $187 for Startup Web');
  assert(indexHtml.includes('$375'), 'index.html contains authoritative $375 for Prof Web');
  assert(indexHtml.includes('$625'), 'index.html contains authoritative $625 for Elite Web');

  // 3. Verify packages/index.html on disk
  const pkgHtml = fs.readFileSync(path.join(rootDir, 'packages', 'index.html'), 'utf8');
  assert(!pkgHtml.includes('$14,999'), 'packages/index.html contains NO legacy $14,999');
  assert(pkgHtml.includes('$187'), 'packages/index.html contains authoritative $187 for Startup Web');

  // 4. Verify detail page pricing/startup-website-package/index.html
  const detailFile = path.join(rootDir, 'pricing', 'startup-website-package', 'index.html');
  const detailHtml = fs.readFileSync(detailFile, 'utf8');
  assert(!detailHtml.includes('$249.99'), 'startup-website-package detail page contains NO legacy $249.99');
  assert(!detailHtml.includes('$499.98'), 'startup-website-package detail page contains NO legacy $499.98');
  assert(detailHtml.includes('$187'), 'startup-website-package detail page contains authoritative $187');
  assert(detailHtml.includes('$468'), 'startup-website-package detail page contains authoritative $468 (reg price)');

  // 5. Test Live Server Dynamic Rendering
  console.log('\n--- Testing Server Dynamic Rendering (Initial Payload 0ms) ---');
  const server = require('../server.js');
  const PORT = 3898;

  await new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  function getPage(urlPath) {
    return new Promise((resolve) => {
      http.get(`http://127.0.0.1:${PORT}${urlPath}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
    });
  }

  const homeRes = await getPage('/');
  assert(homeRes.status === 200, 'GET / returned HTTP 200');
  assert(!homeRes.body.includes('$14,999'), 'Server GET / initial HTML payload contains NO $14,999');
  assert(homeRes.body.includes('$187'), 'Server GET / initial HTML payload contains $187 for Startup Web');
  assert(homeRes.body.includes('$375'), 'Server GET / initial HTML payload contains $375 for Prof Web');
  assert(homeRes.body.includes('$625'), 'Server GET / initial HTML payload contains $625 for Elite Web');
  assert(homeRes.headers['cache-control'].includes('no-cache'), 'Server GET / headers have Cache-Control: no-cache');

  const detailRes = await getPage('/pricing/startup-website-package/');
  assert(detailRes.status === 200, 'GET /pricing/startup-website-package/ returned HTTP 200');
  assert(!detailRes.body.includes('$249.99'), 'Server detail page initial HTML contains NO $249.99');
  assert(detailRes.body.includes('$187'), 'Server detail page initial HTML contains $187');

  // 6. Test Admin Panel PUT /api/products/:id updates DB, Server HTML, and Disk Files
  console.log('\n--- Testing Full End-to-End Admin Update Synchronization ---');
  
  // Create admin session token
  const testSession = db.createSession({ email: 'admin@digenz.com', role: 'superadmin' });
  const adminToken = testSession.token;

  function putJSON(urlPath, data) {
    return new Promise((resolve) => {
      const payload = JSON.stringify(data);
      const req = http.request(`http://127.0.0.1:${PORT}${urlPath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
      });
      req.write(payload);
      req.end();
    });
  }

  // Temporary price change
  const origPrice = startupWeb.price;
  const origSale = startupWeb.salePrice;
  const testPrice = 888;
  const testSale = 333;

  console.log(`[TEST ACTION] Changing Startup Web price to $${testSale} (reg $${testPrice}) via Admin API...`);
  const putRes = await putJSON('/api/products/prod-startup-website-package', {
    price: testPrice,
    salePrice: testSale
  });
  assert(putRes.status === 200 && putRes.data.success, 'PUT /api/products/prod-startup-website-package returned success');

  // Check DB in-memory and disk
  assert(db.data.products.find(p => p.id === 'prod-startup-website-package').salePrice === testSale, `DB memory updated to $${testSale}`);
  
  // Immediate GET / from server (simulating visitor opening site right after admin saved)
  const homeAfterUpdate = await getPage('/');
  assert(homeAfterUpdate.body.includes(`$${testSale}`), `Server GET / initial HTML payload immediately reflects new admin price $${testSale} (0ms delay)`);
  assert(!homeAfterUpdate.body.includes('$187'), 'Server GET / initial HTML no longer contains previous $187');

  // Check disk file
  const indexHtmlAfterUpdate = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert(indexHtmlAfterUpdate.includes(`$${testSale}`), `index.html on disk immediately contains new admin price $${testSale}`);

  // Check detail disk file
  const detailHtmlAfterUpdate = fs.readFileSync(detailFile, 'utf8');
  assert(detailHtmlAfterUpdate.includes(`$${testSale}`), `detail page on disk immediately contains new admin price $${testSale}`);

  // Restore original prices
  console.log(`[TEST ACTION] Restoring original Startup Web price to $${origSale} (reg $${origPrice})...`);
  const restoreRes = await putJSON('/api/products/prod-startup-website-package', {
    price: origPrice,
    salePrice: origSale
  });
  assert(restoreRes.status === 200 && restoreRes.data.success, 'Restored original price via Admin API');

  // Final verification of restoration
  const homeFinal = await getPage('/');
  assert(homeFinal.body.includes(`$${origSale}`), `Server GET / initial HTML payload restored to $${origSale}`);
  assert(!homeFinal.body.includes(`$${testSale}`), 'Server GET / initial HTML contains no remnants of test price');

  server.close();

  console.log(`\n========================================`);
  console.log(`Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

testPricingSync().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
