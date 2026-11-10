const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Fix server.js
const serverFile = path.join(rootDir, 'server.js');
let serverCode = fs.readFileSync(serverFile, 'utf8');

// Replace detail h6 replacement
serverCode = serverCode.replace(
  /htmlStr = htmlStr\.replace\(\/<h6>[\s\S]*?<\/h6>\/i,\s*detailPriceHtml\);/g,
  'htmlStr = htmlStr.replace(/<h6>[\\s\\S]*?<\\/h6>/i, () => detailPriceHtml);'
);

// Replace card h4 replacement
serverCode = serverCode.replace(
  /cardBody = cardBody\.replace\(\/<h4>\[\\s\\S\]\*\?<\\\/h4>\/i,\s*priceHtml\);/g,
  'cardBody = cardBody.replace(/<h4>[\\s\\S]*?<\\/h4>/i, () => priceHtml);'
);

// Replace card h5 replacement
serverCode = serverCode.replace(
  /cardBody = cardBody\.replace\(\/<h\[25\]>\[\\s\\S\]\*\?<\\\/h\[25\]>\/i,\s*`<h5>\${prod\.description}<\/h5>`\);/g,
  'cardBody = cardBody.replace(/<h[25]>[\\s\\S]*?<\\/h[25]>/i, () => `<h5>${prod.description}</h5>`);'
);

fs.writeFileSync(serverFile, serverCode, 'utf8');
console.log('✓ Fixed server.js replacers');

// 2. Fix sync-html.js
const syncFile = path.join(rootDir, 'sync-html.js');
let syncCode = fs.readFileSync(syncFile, 'utf8');

syncCode = syncCode.replace(
  /const updated = content\.replace\(\/<h6>[\s\S]*?<\/h6>\/i,\s*detailPriceHtml\);/g,
  'const updated = content.replace(/<h6>[\\s\\S]*?<\\/h6>/i, () => detailPriceHtml);'
);

fs.writeFileSync(syncFile, syncCode, 'utf8');
console.log('✓ Fixed sync-html.js replacers');

// 3. Update data/db.json to clean Startup Logo Package description and ensure salePrice: 105
const dbFile = path.join(rootDir, 'data', 'db.json');
const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const logoProd = (dbData.products || []).find(p => p.id === 'prod-startup-logo-package' || p.slug === 'startup-logo-package');
if (logoProd) {
  logoProd.salePrice = 105;
  logoProd.price = 125;
  logoProd.description = 'Suitable for potential super-startups and brand revamps for companies.';
  fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2), 'utf8');
  console.log('✓ Updated prod-startup-logo-package in data/db.json (price: 125, sale: 105, clean description)');
}

// 4. Run syncStaticHTMLPricingAndBanners
const { syncStaticHTMLPricingAndBanners } = require('../sync-html');
syncStaticHTMLPricingAndBanners(dbData.products, dbData.banners, dbData.settings);
console.log('✓ Re-synchronized all static HTML files on disk with clean replacers');

// 5. Verify pricing/startup-logo-package/index.html
const logoHtmlFile = path.join(rootDir, 'pricing', 'startup-logo-package', 'index.html');
const logoHtml = fs.readFileSync(logoHtmlFile, 'utf8');
const h6Match = logoHtml.match(/<h6>[\s\S]*?<\/h6>/i);
console.log('\nVerified pricing/startup-logo-package/index.html <h6>:');
console.log(h6Match ? h6Match[0] : 'not found');

if (h6Match && !h6Match[0].includes('25</span>') && !h6Match[0].includes('05 <span>') && h6Match[0].includes('$105')) {
  console.log('\nSUCCESS: No corrupted fragments, clean $105 price verified!');
} else {
  console.error('\nERROR: Still contains corrupted fragments!');
}
