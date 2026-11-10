const https = require('https');

function post(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = https.request(`https://www.digendigital.com${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function put(urlPath, token, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = https.request(`https://www.digendigital.com${urlPath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Logging in to live Admin API...');
  const loginRes = await post('/api/auth/login', {
    email: 'admin@digenz.com',
    password: 'admin123'
  });
  console.log('Login result:', loginRes);
  if (!loginRes.data || !loginRes.data.token) {
    console.error('Failed to log in to live admin');
    return;
  }
  const token = loginRes.data.token;
  console.log('Updating Startup Logo Package description in live MongoDB Atlas...');
  const putRes = await put('/api/products/prod-startup-logo-package', token, {
    description: 'Suitable for potential super-startups and brand revamps for companies.',
    price: 125,
    salePrice: 105
  });
  console.log('PUT result:', putRes);
}

run().catch(console.error);
