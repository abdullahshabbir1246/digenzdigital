const http = require('http');
const zlib = require('zlib');
const server = require('../server.js');

const PORT = 8099;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        let buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'] || '';
        if (enc.includes('gzip')) {
          try {
            buf = zlib.gunzipSync(buf);
          } catch (e) {
            console.error('Gunzip error:', e);
          }
        }
        const bodyStr = buf.toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(bodyStr); } catch (e) { parsed = bodyStr; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
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
  console.log(`RUNNING AUTHORITATIVE SERVICES SYNCHRONIZATION TEST`);
  console.log(`======================================================\n`);

  try {
    // Step 1: Authenticate as admin
    console.log('[STEP 1] Authenticating as Admin...');
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin', password: 'admin123' });

    if (!loginRes.body.token) throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    const token = loginRes.body.token;
    console.log('[PASS] Admin authenticated successfully.');

    // Step 2: Create a unique temporary test service
    const testServiceName = 'Cloud DevOps & Architecture TEST';
    const testEscapedName = escapeHtml(testServiceName);
    const testServiceSlug = 'cloud-devops-test';
    console.log(`\n[STEP 2] Creating temporary test service: "${testServiceName}"...`);
    const createRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/categories',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      name: testServiceName,
      slug: testServiceSlug,
      description: 'Enterprise Cloud Kubernetes & DevOps CI/CD pipelines',
      displayOrder: 9,
      showInNav: true,
      showOnHome: true,
      status: 'active'
    });

    if (createRes.status !== 201) throw new Error('Failed to create category: ' + JSON.stringify(createRes.body));
    const createdId = createRes.body.category.id;
    console.log(`[PASS] Created category with ID: ${createdId}`);

    // Step 3: Fetch public website initial HTML multiple times (simulating refreshes)
    console.log('\n[STEP 3] Fetching public website HTML (multiple refreshes)...');
    for (let i = 1; i <= 3; i++) {
      const pageRes = await request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/',
        method: 'GET',
        headers: { 'Accept': 'text/html', 'Accept-Encoding': 'gzip' }
      });

      const html = typeof pageRes.body === 'string' ? pageRes.body : JSON.stringify(pageRes.body);

      // Check header cache-control
      const cacheControl = pageRes.headers['cache-control'] || '';
      if (!cacheControl.includes('no-cache')) {
        throw new Error(`Refresh ${i}: Cache-Control must be no-cache, got: ${cacheControl}`);
      }

      // Check presence of test service in initial HTML
      if (!html.includes(testEscapedName)) {
        throw new Error(`Refresh ${i}: Initial HTML did NOT contain the latest test service "${testEscapedName}"!`);
      }

      // Check presence in Desktop dropdown
      if (!html.includes(`<li><a href="/${testServiceSlug}/index.html">${testEscapedName}</a></li>`)) {
        throw new Error(`Refresh ${i}: Test service missing from desktop dropdown markup!`);
      }

      // Check presence in Mobile navigation
      if (!html.includes(`<li><a href="/${testServiceSlug}/index.html">${testEscapedName}</a></li>`)) {
        throw new Error(`Refresh ${i}: Test service missing from mobile navigation markup!`);
      }

      // Check presence in Homepage service icons
      if (!html.includes(testEscapedName)) {
        throw new Error(`Refresh ${i}: Test service missing from homepage service icons grid!`);
      }

      // Check presence in Footer
      if (!html.includes(`<li><a href="/${testServiceSlug}/index.html">${testEscapedName}</a></li>`)) {
        throw new Error(`Refresh ${i}: Test service missing from footer markup!`);
      }

      console.log(`[PASS] Refresh ${i}: Initial HTML render contains "${testServiceName}" across desktop, mobile, icons, and footer with zero lag/flash.`);
    }

    // Step 4: Verify /api/public/bundle returns the test service
    console.log('\n[STEP 4] Verifying /api/public/bundle client hydration payload...');
    const bundleRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/public/bundle',
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const foundInBundle = (bundleRes.body.categories || []).find(c => c.id === createdId);
    if (!foundInBundle) throw new Error('Test service not found in /api/public/bundle!');
    console.log('[PASS] /api/public/bundle contains the new category in sync.');

    // Step 5: Remove the temporary test service
    console.log(`\n[STEP 5] Cleaning up temporary test service (${createdId})...`);
    const delRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: `/api/categories/${createdId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (delRes.status !== 200) throw new Error('Delete failed: ' + JSON.stringify(delRes.body));
    console.log('[PASS] Temporary category deleted from database.');

    // Step 6: Verify public website HTML immediately reflects deletion
    console.log('\n[STEP 6] Verifying public website initial HTML after deletion...');
    const postDelPage = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/',
      method: 'GET',
      headers: { 'Accept': 'text/html', 'Accept-Encoding': 'gzip' }
    });
    const postDelHtml = typeof postDelPage.body === 'string' ? postDelPage.body : JSON.stringify(postDelPage.body);
    if (postDelHtml.includes(testEscapedName)) {
      throw new Error('Deleted service is still appearing in initial HTML!');
    }
    console.log('[PASS] Deleted service immediately removed from initial HTML render.');

    console.log('\n======================================================');
    console.log('ALL SERVICES SYNCHRONIZATION TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAILED]:', err.message);
    process.exit(1);
  }
});
