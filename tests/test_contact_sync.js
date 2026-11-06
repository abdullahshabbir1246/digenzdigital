const http = require('http');
const assert = require('assert');
const { db } = require('../db');

// Ensure db is loaded
if (!db.data) db.initSync();

function request(port, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, host: '127.0.0.1', ...options }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('=== RUNNING CONTACT DETAILS SYNCHRONIZATION TEST ===\n');

  const server = require('../server');
  const port = 8099;

  await new Promise((resolve, reject) => {
    server.listen(port, err => {
      if (err) return reject(err);
      resolve();
    });
  });
  console.log(`✓ Test server listening on http://127.0.0.1:${port}`);

  try {
    // 1. Authenticate as Admin
    console.log('\n[STEP 1] Authenticating as Admin...');
    const loginRes = await request(port, {
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });

    assert.strictEqual(loginRes.status, 200, 'Login failed');
    const token = loginRes.body.token;
    console.log('✓ Admin authenticated successfully.');

    // 2. Update Settings with Temporary Phone and Address
    const testPhone = '03001234567';
    const testAddress = 'Suite 999 Innovation Tower, Tech District, London';

    console.log(`\n[STEP 2] Updating Settings via PUT /api/settings with:`);
    console.log(`  - Phone: ${testPhone}`);
    console.log(`  - Address: ${testAddress}`);

    const updateRes = await request(port, {
      path: '/api/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      supportPhone: testPhone,
      businessAddress: testAddress
    });

    assert.strictEqual(updateRes.status, 200, 'Settings update failed');
    assert.strictEqual(updateRes.body.settings.supportPhone, testPhone);
    assert.strictEqual(updateRes.body.settings.businessAddress, testAddress);
    console.log('✓ PUT /api/settings returned updated values.');

    // 3. Confirm GET /api/settings reflects both values
    console.log('\n[STEP 3] Verifying GET /api/settings...');
    const getSettingsRes = await request(port, { path: '/api/settings', method: 'GET' });
    assert.strictEqual(getSettingsRes.body.supportPhone, testPhone);
    assert.strictEqual(getSettingsRes.body.businessAddress, testAddress);
    console.log('✓ GET /api/settings has updated phone and address.');

    // 4. Confirm GET /api/content/contact is 100% in sync
    console.log('\n[STEP 4] Verifying GET /api/content/contact...');
    const getContactRes = await request(port, { path: '/api/content/contact', method: 'GET' });
    assert.strictEqual(getContactRes.body.phone, testPhone);
    assert.strictEqual(getContactRes.body.address, testAddress);
    console.log('✓ GET /api/content/contact has updated phone and address.');

    // 5. Confirm GET /api/public/bundle has both
    console.log('\n[STEP 5] Verifying GET /api/public/bundle (Single-Roundtrip Hydration)...');
    const getBundleRes = await request(port, { path: '/api/public/bundle', method: 'GET' });
    assert.strictEqual(getBundleRes.body.settings.supportPhone, testPhone);
    assert.strictEqual(getBundleRes.body.settings.businessAddress, testAddress);
    console.log('✓ GET /api/public/bundle returns new phone and address.');

    // 6. Test Public Website HTML Dynamic Injection on Homepage
    console.log('\n[STEP 6] Testing Public Homepage HTML Dynamic Injection...');
    const homeHtmlRes = await request(port, { path: '/', method: 'GET' });
    assert(homeHtmlRes.raw.includes('href="tel:+923001234567"'), 'Homepage HTML must have updated tel: link');
    assert(homeHtmlRes.raw.includes(testPhone), 'Homepage HTML must have visible test phone number');
    assert(homeHtmlRes.raw.includes(testAddress), 'Homepage HTML footer must have updated address');
    console.log('✓ Homepage HTML dynamically injected with new phone & address.');

    // 7. Test Public Website Contact Page HTML Dynamic Injection
    console.log('\n[STEP 7] Testing Public Contact Page HTML Dynamic Injection...');
    const contactHtmlRes = await request(port, { path: '/contact-us/index.html', method: 'GET' });
    assert(contactHtmlRes.raw.includes('href="tel:+923001234567"'), 'Contact Page HTML must have updated tel: link');
    assert(contactHtmlRes.raw.includes(testPhone), 'Contact Page HTML must have visible test phone number');
    assert(contactHtmlRes.raw.includes(testAddress), 'Contact Page HTML footer & VISIT US box must have updated address');
    console.log('✓ Contact-us page dynamically injected with new phone & address.');

    // 8. Test 2-way sync: Update via PUT /api/content/contact
    const testPhone2 = '03119876543';
    const testAddress2 = 'Level 42 Cyber Heights, Singapore 018981';

    console.log(`\n[STEP 8] Testing 2-Way Sync via PUT /api/content/contact with:`);
    console.log(`  - Phone: ${testPhone2}`);
    console.log(`  - Address: ${testAddress2}`);

    const updateContactRes = await request(port, {
      path: '/api/content/contact',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      phone: testPhone2,
      alternatePhone: testPhone2,
      address: testAddress2,
      email: 'contact@digendigital.com'
    });

    assert.strictEqual(updateContactRes.status, 200, 'Content contact update failed');
    
    // Check that Settings also automatically picked it up
    const verifySettings2 = await request(port, { path: '/api/settings', method: 'GET' });
    assert.strictEqual(verifySettings2.body.supportPhone, testPhone2);
    assert.strictEqual(verifySettings2.body.businessAddress, testAddress2);
    console.log('✓ 2-Way sync confirmed: Settings automatically updated from CMS Contact!');

    // 9. Restore the intended final business details
    console.log('\n[STEP 9] Restoring intended final business details...');
    const finalPhone = '03190039048';
    const finalAddress = '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ';

    await request(port, {
      path: '/api/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      supportPhone: finalPhone,
      businessAddress: finalAddress
    });

    const finalSettings = await request(port, { path: '/api/settings', method: 'GET' });
    assert.strictEqual(finalSettings.body.supportPhone, finalPhone);
    assert.strictEqual(finalSettings.body.businessAddress, finalAddress);
    console.log(`✓ Final details restored: Phone=${finalPhone}, Address=${finalAddress}`);

    console.log('\n======================================================');
    console.log('ALL CONTACT SYNCHRONIZATION TESTS PASSED WITH 100%!');
    console.log('======================================================\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err);
    server.close();
    process.exit(1);
  }
}

runTest();
