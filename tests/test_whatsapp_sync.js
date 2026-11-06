const assert = require('assert');
const http = require('http');
const path = require('path');

process.env.PORT = '8097';
const { db, hashPassword } = require('../db');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== [TEST] Starting DIGENZ WhatsApp Management Test Suite ===\n');
  
  // Start server on port 8097
  const server = require('../server');
  await new Promise(r => server.listen(8097, r));

  let cookie = '';

  // 1. Authenticate as Admin
  console.log('[Test 1] Authenticating as Admin...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'admin@digenz.com', password: 'Admin@Digenz2026!' }));

  assert.strictEqual(loginRes.status, 200, 'Login must succeed (200 OK)');
  const loginData = JSON.parse(loginRes.body);
  const token = loginData.token;
  assert(token, 'Must return session token');
  cookie = `Bearer ${token}`;
  console.log('  -> Admin authenticated successfully.\n');

  // 2. Test WhatsApp Settings Update via PUT /api/settings
  console.log('[Test 2] Updating WhatsApp Business Number via PUT /api/settings...');
  const testWaNumber = '+92 319 9998877';
  const testWaGreeting = 'Testing dynamic greeting from admin panel!';

  const updateRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/api/settings',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': cookie
    }
  }, JSON.stringify({
    whatsappNumber: testWaNumber,
    whatsappGreeting: testWaGreeting
  }));

  assert.strictEqual(updateRes.status, 200, 'Settings update must succeed');
  const updateData = JSON.parse(updateRes.body);
  assert.strictEqual(updateData.settings.whatsappNumber, testWaNumber, 'whatsappNumber must match saved value');
  assert.strictEqual(updateData.settings.whatsappGreeting, testWaGreeting, 'whatsappGreeting must match saved value');
  console.log('  -> Settings updated and verified via API.\n');

  // 3. Verify GET /api/settings & GET /api/content/contact synchronization
  console.log('[Test 3] Verifying 2-way synchronization in GET /api/settings and GET /api/content/contact...');
  const getSettingsRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/api/settings',
    method: 'GET'
  });
  assert.strictEqual(getSettingsRes.status, 200);
  const sData = JSON.parse(getSettingsRes.body);
  assert.strictEqual(sData.whatsappNumber, testWaNumber);
  assert.strictEqual(sData.whatsappGreeting, testWaGreeting);

  const getContentRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/api/content/contact',
    method: 'GET'
  });
  assert.strictEqual(getContentRes.status, 200);
  const cData = JSON.parse(getContentRes.body);
  assert.strictEqual(cData.whatsapp, testWaNumber);
  assert.strictEqual(cData.whatsappGreeting, testWaGreeting);
  console.log('  -> 2-way sync confirmed between settings and content.contact.\n');

  // 4. Verify Public Page HTML Injection
  console.log('[Test 4] Verifying Public Page Dynamic HTML Injection for WhatsApp Floating Button...');
  const homeRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/',
    method: 'GET'
  });
  assert.strictEqual(homeRes.status, 200);
  const expectedUrl = `https://wa.me/923199998877?text=${encodeURIComponent(testWaGreeting)}`;
  assert(homeRes.body.includes(expectedUrl), 'Public page must contain normalized WhatsApp URL with dynamic greeting');
  assert(homeRes.body.includes('id="digenzWhatsappBtn"'), 'Public page must include floating WhatsApp button');
  console.log('  -> Public page renders authoritative WhatsApp link: ' + expectedUrl + '\n');

  // 5. Verify Admin Panel Has ZERO Injected WhatsApp Buttons
  console.log('[Test 5] Verifying Admin Panel has no injected floating WhatsApp button...');
  const adminRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/admin/',
    method: 'GET'
  });
  assert.strictEqual(adminRes.status, 200);
  assert(!adminRes.body.includes('id="digenzWhatsappBtn"'), 'Admin panel must NEVER contain injected floating WhatsApp button');
  console.log('  -> Admin panel is clean and free of floating chat widgets.\n');

  // 6. Restore Production WhatsApp Number & Greeting
  console.log('[Test 6] Restoring production WhatsApp Number (+92 319 0039048)...');
  const prodWaNumber = '+92 319 0039048';
  const prodWaGreeting = 'Hi DIGENZ, I am interested in your services. Please share more information.';

  const restoreRes = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/api/settings',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': cookie
    }
  }, JSON.stringify({
    whatsappNumber: prodWaNumber,
    whatsappGreeting: prodWaGreeting
  }));
  assert.strictEqual(restoreRes.status, 200);

  const finalHome = await request({
    hostname: '127.0.0.1',
    port: 8097,
    path: '/',
    method: 'GET'
  });
  const prodExpectedUrl = `https://wa.me/923190039048?text=${encodeURIComponent(prodWaGreeting)}`;
  assert(finalHome.body.includes(prodExpectedUrl), 'Public page must render restored production WhatsApp URL');
  console.log('  -> Restored production URL verified on public website: ' + prodExpectedUrl + '\n');

  console.log('=== ALL WHATSAPP INTEGRATION TESTS PASSED (6/6) ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
