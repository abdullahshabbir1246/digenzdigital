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
  console.log('Testing live Homepage: https://www.digendigital.com/index.html');
  const home = await fetchUrl('https://www.digendigital.com/index.html?t=' + Date.now());
  console.log('Homepage Status:', home.status);
  console.log('Homepage Textarea exists:', home.data.includes('<textarea id="projectdescr"'));
  console.log('Homepage Submit button exists:', home.data.includes("Let's Grow Your Business"));
  const waMatches = home.data.match(/wa\.me[^\s"']+/g);
  console.log('Homepage wa.me links found on live:', waMatches);
  const contact = await fetchUrl('https://www.digendigital.com/contact-us/index.html?t=' + Date.now());
  console.log('HTTP Status:', contact.status);
  
  console.log('JotForm IFrame exists:', contact.data.includes('JotFormIFrame'));
  console.log('First Name field exists:', contact.data.includes('name="name"'));
  console.log('Last Name field exists:', contact.data.includes('name="lastName"'));
  console.log('Email field exists:', contact.data.includes('name="email"'));
  console.log('Phone field exists:', contact.data.includes('name="phone"'));
  console.log('Project Description exists:', contact.data.includes('name="projectdescr"'));
  console.log('Submit button exists:', contact.data.includes("Let's Grow Your Business"));
  
  const formMatch = contact.data.match(/<form class="cmxform footerForm"[\s\S]*?<\/form>/i);
  if (formMatch) {
    console.log('\n--- LIVE NATIVE FORM MARKUP ---\n' + formMatch[0]);
  }
}

run().catch(console.error);
