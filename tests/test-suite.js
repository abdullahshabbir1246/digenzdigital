const http = require('http');
const server = require('../server.js');

const PORT = 8098;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString('utf8');
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
  console.log(`Starting DIGENZ Master Verification Suite on port ${PORT}...`);
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

  try {
    // 1. Static Admin Entry
    const adminPage = await request({ hostname: 'localhost', port: PORT, path: '/admin/', method: 'GET' });
    assert(adminPage.status === 200 && adminPage.body.includes('DIGENZ — Master Admin Dashboard'), 'Admin Dashboard SPA loaded at /admin/');

    // 2. Admin CSS
    const adminCss = await request({ hostname: 'localhost', port: PORT, path: '/admin/css/admin.css', method: 'GET' });
    assert(adminCss.status === 200 && adminCss.body.includes('--gold-primary'), 'Admin CSS served with gold theme variables');

    // 3. Admin JS
    const adminJs = await request({ hostname: 'localhost', port: PORT, path: '/admin/js/admin.js', method: 'GET' });
    assert(adminJs.status === 200 && adminJs.body.includes('Admin = (function()'), 'Admin JS controller loaded');

    // 4. Auth Login
    const login = await request({
      hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@digenz.com', password: 'Admin@Digenz2026!' });
    assert(login.status === 200 && login.body.token, 'Admin authentication succeeded');
    const token = login.body.token;

    // 5. Protected Stats
    const stats = await request({
      hostname: 'localhost', port: PORT, path: '/api/dashboard/stats', method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(stats.status === 200 && stats.body.totalProducts > 0, `Stats endpoint returned ${stats.body.totalProducts} products and ${stats.body.totalOrders} orders`);

    // 6. Products CRUD
    const prods = await request({ hostname: 'localhost', port: PORT, path: '/api/products', method: 'GET' });
    assert(prods.status === 200 && prods.body.products.length > 0, 'Public products list accessible');

    // 7. Categories CRUD
    const cats = await request({ hostname: 'localhost', port: PORT, path: '/api/categories', method: 'GET' });
    assert(cats.status === 200 && cats.body.categories.length === 8, '8 core categories verified');

    // 8. Coupon Engine
    const coupon = await request({
      hostname: 'localhost', port: PORT, path: '/api/coupons/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { code: 'DIGENZ10', orderValue: 150 });
    assert(coupon.status === 200 && coupon.body.discountAmount === 15, 'Coupon DIGENZ10 successfully applied 10% discount');

    // 9. Invoice View
    const orders = await request({
      hostname: 'localhost', port: PORT, path: '/api/orders', method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orderId = orders.body.orders[0].id;
    const inv = await request({ hostname: 'localhost', port: PORT, path: `/api/orders/${orderId}/invoice`, method: 'GET' });
    assert(inv.status === 200 && inv.body.includes('DIGENZ') && inv.body.includes('INVOICE'), 'Printable invoice generated');

    // 10. Public Site Live Script
    const liveJs = await request({ hostname: 'localhost', port: PORT, path: '/assets/js/digenz-live.js', method: 'GET' });
    assert(liveJs.status === 200 && liveJs.body.includes('initDigenzLive'), 'Live public website integration script active');

    // 11. Sitemap
    const sitemap = await request({ hostname: 'localhost', port: PORT, path: '/sitemap.xml', method: 'GET' });
    assert(sitemap.status === 200 && sitemap.body.includes('digenzstore.com'), 'sitemap.xml verified');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    console.log(`\nVerification Suite Result: ${passed} PASSED, ${failed} FAILED.`);
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
});
