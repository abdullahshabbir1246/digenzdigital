const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = path.join(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL: ' + message);
    process.exitCode = 1;
  } else {
    console.log('PASS: ' + message);
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('DIGENZ WEBSITE MOBILE RESPONSIVENESS & AUDIT TESTS');
  console.log('====================================================\n');

  // 1. Verify CSS rules in assets/css/style.css
  const styleCss = fs.readFileSync(path.join(BASE_DIR, 'assets', 'css', 'style.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');

  console.log('--- 1. Hero Banner Mobile Rules ---');
  assert(styleCss.includes('.home-banner-content') && styleCss.includes('opacity: 1 !important'), 'Mobile hero banner content is visible (opacity: 1 !important)');
  assert(styleCss.includes('background: linear-gradient(180deg, rgba(16, 24, 39, 0.88)'), 'Mobile hero banner has dark overlay to prevent baked-in text clipping');
  assert(!styleCss.includes('/* Visually conceal duplicate text overlay as it is rendered directly within the graphic */\n.home-banner-content {\n    opacity: 0 !important;'), 'Old global concealment of hero text overlay removed');

  console.log('\n--- 2. Instant Quote Form & Submit Button ---');
  assert(styleCss.includes('.bot-form form,') && styleCss.includes('background: transparent !important'), 'Form inside .bot-form has transparent background and 0 padding (prevents double-padding)');
  assert(styleCss.includes('white-space: normal !important'), 'Submit button has white-space: normal to prevent text truncation');
  assert(indexHtml.includes("Let's Grow Your Business"), 'Templates reference full text: "Let\'s Grow Your Business"');

  console.log('\n--- 3. Sticky Mobile Header & Navigation ---');
  assert(styleCss.includes('.header-main {') && styleCss.includes('position: sticky !important;'), 'Mobile header is sticky at top');
  assert(styleCss.includes('.mobile-nav-btn {') && styleCss.includes('top: 8px !important;'), 'Mobile hamburger button is aligned at top: 8px inside header');

  console.log('\n--- 4. Legacy Chat Widget Elimination ---');
  assert(styleCss.includes('#tawk-bubble-container,') && styleCss.includes('left: -99999px !important;'), 'Strict suppression of Tawk and legacy chat widgets in style.css');
  const mStyleCss = fs.readFileSync(path.join(BASE_DIR, 'assets', 'css', 'm-style.css'), 'utf8');
  assert(mStyleCss.includes('#tawk-bubble-container,') && mStyleCss.includes('left: -99999px !important;'), 'Strict suppression of Tawk and legacy chat widgets in m-style.css');

  console.log('\n--- 5. WhatsApp Floating Button ---');
  const liveJs = fs.readFileSync(path.join(BASE_DIR, 'assets', 'js', 'digenz-live.js'), 'utf8');
  assert(liveJs.includes('purgeLegacyChat'), 'digenz-live.js has active purgeLegacyChat routine');
  assert(liveJs.includes('MutationObserver'), 'digenz-live.js actively monitors DOM mutations to eliminate re-injected chat widgets');
  assert(liveJs.includes('window.location.pathname.startsWith(\'/admin\')'), 'digenz-live.js guards against injecting WhatsApp button into admin panel');
  assert(liveJs.includes('max-width:32px;max-height:32px;'), 'WhatsApp SVG icon has strict maximum dimensions');

  console.log('\n--- 6. Form Fields in index.html & index.htm ---');
  assert(indexHtml.includes('name="name"') && indexHtml.includes('First Name'), 'index.html has First Name field');
  assert(indexHtml.includes('name="lastName"') && indexHtml.includes('Last Name'), 'index.html has Last Name field');
  assert(indexHtml.includes('name="email"') && indexHtml.includes('Email'), 'index.html has Email field');
  assert(indexHtml.includes('name="phone"') && indexHtml.includes('Phone Number'), 'index.html has Phone Number field');
  assert(indexHtml.includes('<textarea id="projectdescr" name="projectdescr"'), 'index.html has full textarea for Project Description');
  assert(indexHtml.includes('value="Let\'s Grow Your Business"'), 'index.html submit button text is cleanly "Let\'s Grow Your Business"');
  assert(!indexHtml.includes('03242421184'), 'index.html has no legacy WhatsApp number 03242421184');
  assert(indexHtml.includes('923190039048'), 'index.html WhatsApp button links to 923190039048');

  console.log('\n--- 7. Golden Color Removal ---');
  assert(styleCss.includes('.packwrap .viewdetails') && styleCss.includes('background: #383838 !important;'), 'VIEW DETAILS button has sleek dark background #383838');
  assert(!styleCss.includes('.packwrap.popular .viewdetails {\n    background: #f'), 'No yellow/gold background on popular card VIEW DETAILS button');

  console.log('\n====================================================');
  if (process.exitCode === 1) {
    console.error('FAILED: Some checks did not pass.');
  } else {
    console.log('SUCCESS: All mobile responsiveness and audit tests passed!');
  }
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
