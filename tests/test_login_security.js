const http = require('http');
const server = require('../server.js');

const PORT = 8096;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(bodyStr); } catch (e) { parsed = bodyStr; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: bodyStr });
      });
    });
    req.on('error', reject);
    if (data) {
      if (typeof data === 'object') {
        req.write(JSON.stringify(data));
      } else {
        req.write(data);
      }
    }
    req.end();
  });
}

server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`RUNNING DIGENZ ADMIN LOGIN SECURITY TEST SUITE`);
  console.log(`======================================================\n`);

  try {
    // 1. Verify /admin/ HTML markup
    console.log('[STEP 1] Inspecting /admin/ login page HTML...');
    const pageRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/admin/',
      method: 'GET'
    });

    if (pageRes.status !== 200) throw new Error(`/admin/ returned status ${pageRes.status}`);

    const html = pageRes.rawBody;

    // A. Verify no default credentials anywhere on page
    if (html.includes('Default Login:')) {
      throw new Error('/admin/ still displays "Default Login:" text!');
    }
    if (html.includes('admin123')) {
      throw new Error('/admin/ still exposes password "admin123" in HTML!');
    }
    if (html.includes('value="admin"') || html.includes("value='admin'")) {
      throw new Error('/admin/ still has pre-filled value="admin" on username input!');
    }
    if (html.includes('value="admin123"') || html.includes("value='admin123'")) {
      throw new Error('/admin/ still has pre-filled value="admin123" on password input!');
    }

    // B. Verify form fields and button are preserved
    if (!html.includes('id="loginEmail"') || !html.includes('placeholder="Enter username or email"')) {
      throw new Error('/admin/ missing loginEmail field with proper placeholder!');
    }
    if (!html.includes('id="loginPassword"') || !html.includes('placeholder="Enter password"')) {
      throw new Error('/admin/ missing loginPassword field with proper placeholder!');
    }
    if (!html.includes('Authenticate Access')) {
      throw new Error('/admin/ missing "Authenticate Access" button!');
    }

    console.log('[PASS] /admin/ login page verified: Exposed credentials box, default passwords, and prefilled values are 100% removed.');

    // 2. Test failed login response does not leak credentials
    console.log('\n[STEP 2] Testing failed authentication response for credential leaks...');
    const badLoginRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin', password: 'wrongPassword99' });

    if (badLoginRes.status !== 401) throw new Error(`Expected status 401, got ${badLoginRes.status}`);
    if (JSON.stringify(badLoginRes.body).includes('admin123')) {
      throw new Error('Failed login response still leaks "admin123" in error message!');
    }
    console.log('[PASS] Failed login returned 401 with generic error: "' + badLoginRes.body.error + '" (no credential leak).');

    // 3. Test successful authentication still works perfectly
    console.log('\n[STEP 3] Testing valid administrator authentication...');
    const goodLoginRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin', password: 'admin123' });

    if (goodLoginRes.status !== 200 || !goodLoginRes.body.token) {
      throw new Error('Valid login failed: ' + JSON.stringify(goodLoginRes.body));
    }
    console.log('[PASS] Administrator authenticated successfully (token received, user role: ' + goodLoginRes.body.user.role + ').');

    console.log('\n======================================================');
    console.log('ALL ADMIN LOGIN SECURITY TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAILED]:', err.message);
    process.exit(1);
  }
});
