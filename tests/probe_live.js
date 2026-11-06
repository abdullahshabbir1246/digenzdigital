const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing live website: https://www.digendigital.com');
  const home = await fetchUrl('https://www.digendigital.com/?t=' + Date.now());
  console.log('Homepage status:', home.status);
  
  const telMatches = [...new Set(home.data.match(/tel:[^"'\s>]+/g) || [])];
  console.log('Tel links found on Homepage:', telMatches);

  const addressMatches = [...new Set(home.data.match(/<p class="address-1?">[\s\S]*?<\/p>/g) || [])];
  console.log('Address markup on Homepage:', addressMatches);

  console.log('\nTesting Contact page: https://www.digendigital.com/contact-us/index.html');
  const contact = await fetchUrl('https://www.digendigital.com/contact-us/index.html?t=' + Date.now());
  console.log('Contact Us status:', contact.status);
  
  const contactTel = [...new Set(contact.data.match(/tel:[^"'\s>]+/g) || [])];
  console.log('Tel links found on Contact page:', contactTel);

  const visitUsMatch = contact.data.match(/<h5>VISIT US<\/h5>[\s\S]*?<\/div>/);
  console.log('VISIT US section on Contact page:', visitUsMatch ? visitUsMatch[0] : 'Not found');
}

run().catch(console.error);
