const fs = require('fs');
const path = require('path');
const { db } = require('../db.js');

async function check() {
  console.log('=== PRICING DIAGNOSIS ===\n');

  // 1. Connect and fetch database products
  db.initSync();
  await db.ensureFreshData();
  const dbProducts = db.data.products || [];
  console.log(`Database has ${dbProducts.length} products.\n`);

  console.log('Sample DB Products:');
  dbProducts.slice(0, 10).forEach(p => {
    console.log(`- ID: ${p.id} | Slug: ${p.slug} | Name: "${p.name}" | Price: $${p.price} | Sale: ${p.salePrice || 'N/A'}`);
  });

  // 2. Check HTML files on disk for what prices are hardcoded
  console.log('\n--- Checking index.html static HTML prices ---');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const chunks = indexHtml.split(/<div class="packwrap[^"]*">/i);
  console.log(`Found ${chunks.length - 1} packwrap cards in index.html:`);
  for (let i = 1; i < chunks.length; i++) {
    const c = chunks[i];
    const titleMatch = c.match(/<h3>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown';
    const priceMatch = c.match(/<h4>([\s\S]*?)<\/h4>/i);
    const price = priceMatch ? priceMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'Unknown';
    
    // Find matching DB product
    const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = dbProducts.find(p => norm(p.name) === norm(title) || norm(p.slug) === norm(title));
    const dbPrice = matched ? `$${matched.salePrice || matched.price}` : 'NOT FOUND IN DB';

    console.log(`Card ${i}: "${title}"`);
    console.log(`   HTML Hardcoded: ${price}`);
    console.log(`   DB Actual:      ${dbPrice}`);
    if (matched && !price.includes(String(matched.salePrice || matched.price))) {
      console.log(`   ⚠️ MISMATCH DETECTED! HTML shows old price, DB has new price!`);
    }
  }

  // 3. Check packages/index.html
  console.log('\n--- Checking packages/index.html static HTML prices ---');
  const pkgHtml = fs.readFileSync(path.join(__dirname, '..', 'packages', 'index.html'), 'utf8');
  const pkgChunks = pkgHtml.split(/<div class="packwrap[^"]*">/i);
  console.log(`Found ${pkgChunks.length - 1} packwrap cards in packages/index.html:`);
  for (let i = 1; i < Math.min(pkgChunks.length, 10); i++) {
    const c = pkgChunks[i];
    const titleMatch = c.match(/<h3>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown';
    const priceMatch = c.match(/<h4>([\s\S]*?)<\/h4>/i);
    const price = priceMatch ? priceMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'Unknown';
    const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = dbProducts.find(p => norm(p.name) === norm(title) || norm(p.slug) === norm(title));
    const dbPrice = matched ? `$${matched.salePrice || matched.price}` : 'NOT FOUND IN DB';
    console.log(`Card ${i}: "${title}" | HTML: ${price} | DB: ${dbPrice}`);
  }

  // 4. Check a pricing detail page, e.g. pricing/business-website-package/index.html
  console.log('\n--- Checking pricing detail pages ---');
  const detailPath = path.join(__dirname, '..', 'pricing', 'business-website-package', 'index.html');
  if (fs.existsSync(detailPath)) {
    const detailHtml = fs.readFileSync(detailPath, 'utf8');
    const h6Match = detailHtml.match(/<h6>([\s\S]*?)<\/h6>/i);
    console.log(`business-website-package <h6> in HTML:`, h6Match ? h6Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'none');
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
