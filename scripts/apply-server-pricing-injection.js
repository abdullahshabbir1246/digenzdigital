const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

console.log('Original server.js length:', code.length);

// 1. Definition of injectAuthoritativePricing
const injectFunction = `
function injectAuthoritativePricing(htmlStr, products, settings, filePath) {
  if (!htmlStr || !Array.isArray(products) || products.length === 0) return htmlStr;
  const currency = (settings && settings.currencySymbol) || '$';
  const currPrefix = currency.length === 1 ? currency : (currency + ' ');
  const norm = s => (s || '').toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]/g, '');

  // 1. If this is an individual pricing detail page (/pricing/<slug>/index.html) or contains .subspac
  if (htmlStr.includes('class="subspac"') || (filePath && filePath.toLowerCase().includes(path.sep + 'pricing' + path.sep))) {
    let targetProduct = null;
    if (filePath) {
      const parts = filePath.replace(/\\\\/g, '/').split('/');
      const pricingIdx = parts.lastIndexOf('pricing');
      if (pricingIdx !== -1 && parts[pricingIdx + 1]) {
        const dirSlug = norm(parts[pricingIdx + 1]);
        targetProduct = products.find(p => norm(p.slug) === dirSlug || norm(p.name) === dirSlug || dirSlug.includes(norm(p.slug)) || norm(p.slug).includes(dirSlug));
      }
    }
    if (!targetProduct) {
      const headingMatch = htmlStr.match(/<h[123][^>]*class="[^"]*(?:main-heading|myheading)[^"]*"[^>]*>([\\s\\S]*?)<\\/h[123]>/i)
                        || htmlStr.match(/<div class="subspac"[^>]*>[\\s\\S]*?<h[23]>([\\s\\S]*?)<\\/h[23]>/i)
                        || htmlStr.match(/<title>([\\s\\S]*?)<\\/title>/i);
      if (headingMatch) {
        const titleNorm = norm(headingMatch[1]);
        targetProduct = products.find(p => norm(p.name) === titleNorm || norm(p.slug) === titleNorm || titleNorm.includes(norm(p.slug)) || titleNorm.includes(norm(p.name)));
      }
    }

    if (targetProduct) {
      const saleVal = targetProduct.salePrice;
      const regVal = targetProduct.price;
      const hasSale = saleVal && saleVal < regVal;
      const formattedPrice = Number(hasSale ? saleVal : regVal).toLocaleString();
      const formattedOld = Number(regVal).toLocaleString();
      const descText = targetProduct.description || '';

      const detailPriceHtml = hasSale
        ? \`<h6><span class="old">\${currPrefix}\${formattedOld}</span> \${currPrefix}\${formattedPrice} <span><b class="monthss"></b>\${descText}</span></h6>\`
        : \`<h6>\${currPrefix}\${formattedPrice} <span><b class="monthss"></b>\${descText}</span></h6>\`;

      htmlStr = htmlStr.replace(/<h6>(?:<span class="old">[\\s\\S]*?<\\/span>)?([\\s\\S]*?)<\\/h6>/i, detailPriceHtml);

      if (Array.isArray(targetProduct.features) && targetProduct.features.length > 0 && htmlStr.includes('class="subscription-list"')) {
        const featuresHtml = targetProduct.features.map(f => \`<li><h6>\${f}</h6><span class="tick"></span></li>\`).join('');
        htmlStr = htmlStr.replace(/(<ul class="subscription-list"[^>]*>)[\\s\\S]*?(<\\/ul>)/i, \`$1\${featuresHtml}$2\`);
      }
    }
  }

  // 2. Update all .packwrap cards (e.g. on index.html, packages/index.html, service pages)
  if (htmlStr.includes('packwrap')) {
    const cardChunks = htmlStr.split(/(<div class="packwrap[^"]*">)/i);
    for (let i = 1; i < cardChunks.length; i += 2) {
      let cardBody = cardChunks[i + 1];
      const titleMatch = cardBody.match(/<h3>([\\s\\S]*?)<\\/h3>/i);
      if (!titleMatch) continue;

      const titleText = titleMatch[1].replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
      const titleNorm = norm(titleText);
      const prod = products.find(p => norm(p.name) === titleNorm || norm(p.slug) === titleNorm || titleNorm.includes(norm(p.slug)) || norm(p.slug).includes(titleNorm));
      if (prod) {
        const saleVal = prod.salePrice;
        const regVal = prod.price;
        const hasSale = saleVal && saleVal < regVal;
        const formattedPrice = Number(hasSale ? saleVal : regVal).toLocaleString();
        const formattedOld = Number(regVal).toLocaleString();

        const priceHtml = hasSale
          ? \`<h4><span>Starting at </span> \${currPrefix}\${formattedPrice} <small style="text-decoration: line-through; opacity: 0.6; font-size: 0.68em; margin-left: 6px; font-weight: normal; color: #8892b0;">\${currPrefix}\${formattedOld}</small></h4>\`
          : \`<h4><span>Starting at </span> \${currPrefix}\${formattedPrice}</h4>\`;

        cardBody = cardBody.replace(/<h4>[\\s\\S]*?<\\/h4>/i, priceHtml);

        if (prod.description) {
          cardBody = cardBody.replace(/<h[25]>[\\s\\S]*?<\\/h[25]>/i, \`<h5>\${prod.description}</h5>\`);
        }

        // Update data-pkg-price on CTA buttons
        cardBody = cardBody.replace(/(class="btn-pack"[^>]*)/i, (m) => {
          if (m.includes('data-pkg-price=')) {
            return m.replace(/data-pkg-price="[^"]*"/i, \`data-pkg-price="\${hasSale ? saleVal : regVal}"\`);
          }
          return \`\${m} data-pkg-price="\${hasSale ? saleVal : regVal}"\`;
        });

        cardChunks[i + 1] = cardBody;
      }
    }
    htmlStr = cardChunks.join('');
  }

  return htmlStr;
}
`;

if (!code.includes('function injectAuthoritativePricing')) {
  const marker = "const http = require('http');";
  const pos = code.indexOf(marker);
  if (pos !== -1) {
    code = code.substring(0, pos) + injectFunction + '\n\n' + code.substring(pos);
    console.log('✓ Injected injectAuthoritativePricing function into server.js');
  } else {
    console.error('Marker "const http = require(\'http\');" not found!');
  }
}

// 2. Call injectAuthoritativePricing in request handling
const targetReqHandling = `      if (db.data && !isAdminPage) {
        if (Array.isArray(db.data.categories) && db.data.categories.length > 0) {
          htmlStr = injectAuthoritativeServices(htmlStr, db.data.categories);
        }
        htmlStr = injectAuthoritativeContact(htmlStr, db.data.settings, db.data.content);
      }`;

const replacementReqHandling = `      if (db.data && !isAdminPage) {
        if (Array.isArray(db.data.products) && db.data.products.length > 0) {
          htmlStr = injectAuthoritativePricing(htmlStr, db.data.products, db.data.settings, filePath);
        }
        if (Array.isArray(db.data.categories) && db.data.categories.length > 0) {
          htmlStr = injectAuthoritativeServices(htmlStr, db.data.categories);
        }
        htmlStr = injectAuthoritativeContact(htmlStr, db.data.settings, db.data.content);
      }`;

if (code.includes('injectAuthoritativeServices(htmlStr, db.data.categories)') && !code.includes('injectAuthoritativePricing(htmlStr, db.data.products')) {
  // Use regex to tolerate \r\n vs \n
  const regex = /if\s*\(\s*db\.data\s*&&\s*!isAdminPage\s*\)\s*\{[\s\S]*?htmlStr\s*=\s*injectAuthoritativeContact\([^)]*\);\s*\}/i;
  code = code.replace(regex, replacementReqHandling);
  console.log('✓ Added injectAuthoritativePricing call in server.js request handler');
}

// 3. Trigger sync on POST /api/products
if (!code.includes("syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);\n      db.logAudit(session.email, 'CREATE_PRODUCT'")) {
  code = code.replace(
    /db\.data\.products\.unshift\(newProduct\);\s*await db\.save\('products'\);/i,
    `db.data.products.unshift(newProduct);\n      await db.save('products');\n      syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);`
  );
  console.log('✓ Added syncStaticHTMLPricingAndBanners to POST /api/products');
}

// 4. Trigger sync on PUT /api/products/:id
if (!code.includes("syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);\n      db.logAudit(session.email, 'UPDATE_PRODUCT'")) {
  code = code.replace(
    /await db\.save\('products'\);\s*db\.logAudit\(session\.email,\s*'UPDATE_PRODUCT'/i,
    `await db.save('products');\n      syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);\n      db.logAudit(session.email, 'UPDATE_PRODUCT'`
  );
  console.log('✓ Added syncStaticHTMLPricingAndBanners to PUT /api/products/:id');
}

// 5. Trigger sync on DELETE /api/products/:id
if (!code.includes("syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);\n      db.logAudit(session.email, 'DELETE_PRODUCT'")) {
  code = code.replace(
    /await db\.save\('products'\);\s*db\.logAudit\(session\.email,\s*'DELETE_PRODUCT'/i,
    `await db.save('products');\n      syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);\n      db.logAudit(session.email, 'DELETE_PRODUCT'`
  );
  console.log('✓ Added syncStaticHTMLPricingAndBanners to DELETE /api/products/:id');
}

// 6. Trigger sync on PUT /api/settings
if (!code.includes("syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);") && code.includes("syncStaticHTMLContactSettings(db.data.settings);")) {
  code = code.replace(
    /syncStaticHTMLContactSettings\(db\.data\.settings\);/i,
    `syncStaticHTMLContactSettings(db.data.settings);\n        syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);`
  );
  console.log('✓ Added syncStaticHTMLPricingAndBanners to PUT /api/settings');
}

// 7. Initial sync on direct server listen
if (!code.includes("syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);") && code.includes("server.listen(PORT, () => {")) {
  code = code.replace(
    /server\.listen\(PORT,\s*\(\)\s*=>\s*\{/i,
    `server.listen(PORT, () => {\n    try {\n      if (db.data && Array.isArray(db.data.products) && db.data.products.length > 0) {\n        syncStaticHTMLPricingAndBanners(db.data.products, db.data.banners, db.data.settings);\n      }\n    } catch (e) {}`
  );
  console.log('✓ Added initial sync on server listen');
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Successfully updated server.js! New length:', code.length);
