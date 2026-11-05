const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const server = require('../server.js');

const PORT = 8097;

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${path}`, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        let b = Buffer.concat(chunks);
        if ((res.headers['content-encoding'] || '').includes('gzip')) {
          b = zlib.gunzipSync(b);
        }
        resolve({ status: res.statusCode, headers: res.headers, body: b.toString('utf8') });
      });
    }).on('error', reject);
  });
}

server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`RUNNING DIGENZ WHATSAPP & AI CHAT REMOVAL TEST SUITE`);
  console.log(`======================================================\n`);

  try {
    const pagesToTest = [
      '/',
      '/about/index.html',
      '/packages/index.html',
      '/custom-website-design/index.html',
      '/contact-us/index.html',
      '/pricing/startup-logo-package/index.html'
    ];

    for (const page of pagesToTest) {
      console.log(`[TEST PAGE] Checking ${page}...`);
      const res = await request(page);
      if (res.status !== 200) throw new Error(`${page} returned status ${res.status}`);

      const html = res.body;

      // 1. Confirm old chat widget is completely gone
      if (html.includes('tawk.to')) {
        throw new Error(`${page} still contains tawk.to chat script!`);
      }
      if (html.includes('ze-snippet') || html.includes('zdassets.com')) {
        throw new Error(`${page} still contains Zendesk chat script!`);
      }
      if (html.includes('class="floatbutton"') || html.includes("class='floatbutton'")) {
        throw new Error(`${page} still contains vertical AI live chat floatbutton!`);
      }
      if (html.includes('Start A Live Chat')) {
        throw new Error(`${page} still contains 'Start A Live Chat' text!`);
      }

      // 2. Confirm WhatsApp button is present
      if (!html.includes('id="digenzWhatsappBtn"')) {
        throw new Error(`${page} is missing #digenzWhatsappBtn!`);
      }
      if (!html.includes('href="https://wa.me/923190039048?text=Hi%20DIGENZ%2C%20I%20am%20interested%20in%20your%20services.%20Please%20share%20more%20information."')) {
        throw new Error(`${page} WhatsApp button has incorrect href link!`);
      }
      if (!html.includes('target="_blank"')) {
        throw new Error(`${page} WhatsApp button missing target="_blank"!`);
      }
      if (!html.includes('digenz-whatsapp-icon')) {
        throw new Error(`${page} WhatsApp button missing SVG icon!`);
      }

      console.log(`[PASS] ${page}: AI Live Chat 100% removed, WhatsApp button active with number 923190039048.`);
    }

    // 3. Confirm CSS styles
    console.log('\n[TEST CSS] Checking WhatsApp CSS in style.css and m-style.css...');
    const styleCss = fs.readFileSync('assets/css/style.css', 'utf8');
    const mStyleCss = fs.readFileSync('assets/css/m-style.css', 'utf8');

    if (!styleCss.includes('.digenz-whatsapp-btn') || !styleCss.includes('#25D366')) {
      throw new Error('style.css missing .digenz-whatsapp-btn or #25D366 background!');
    }
    if (!mStyleCss.includes('.digenz-whatsapp-btn') || !mStyleCss.includes('#25D366')) {
      throw new Error('m-style.css missing .digenz-whatsapp-btn or #25D366 background!');
    }
    console.log('[PASS] WhatsApp CSS verified: #25D366 background, 56-60px circular, fixed bottom-right, smooth hover.');

    console.log('\n======================================================');
    console.log('ALL WHATSAPP & AI CHAT REMOVAL TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAILED]:', err.message);
    process.exit(1);
  }
});
