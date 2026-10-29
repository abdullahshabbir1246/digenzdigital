const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

function syncStaticHTMLPricingAndBanners(products, banners, settings) {
  try {
    const currency = (settings && settings.currencySymbol) || '$';
    const files = [
      path.join(BASE_DIR, 'index.html'),
      path.join(BASE_DIR, 'index.htm'),
      path.join(BASE_DIR, 'packages', 'index.html')
    ];

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) continue;
      let content = fs.readFileSync(filePath, 'utf8');

      const cardChunks = content.split(/(<div class="packwrap[^"]*">)/i);
      let changed = false;

      for (let i = 1; i < cardChunks.length; i += 2) {
        let cardBody = cardChunks[i + 1];
        const titleMatch = cardBody.match(/<h3>([\s\S]*?)<\/h3>/i);
        if (!titleMatch) continue;

        const titleText = titleMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const prod = products.find(p => norm(p.name) === norm(titleText) || norm(p.slug) === norm(titleText));
        if (prod) {
          const priceHtml = prod.salePrice && prod.salePrice < prod.price
            ? `<h4><span>Starting at </span> ${currency}${prod.salePrice} <small style="text-decoration: line-through; opacity: 0.6; font-size: 0.68em; margin-left: 6px; font-weight: normal; color: #8892b0;">${currency}${prod.price}</small></h4>`
            : `<h4><span>Starting at </span> ${currency}${prod.price}</h4>`;

          cardBody = cardBody.replace(/<h4>[\s\S]*?<\/h4>/i, () => priceHtml);

          if (prod.description) {
            cardBody = cardBody.replace(/<h[25]>[\s\S]*?<\/h[25]>/i, () => `<h5>${prod.description}</h5>`);
          }

          cardChunks[i + 1] = cardBody;
          changed = true;
        }
      }

      if (changed) {
        content = cardChunks.join('');
      }

      if (banners && banners.length > 0) {
        const activeBanner = banners.find(b => b.isActive) || banners[0];
        if (activeBanner && activeBanner.title) {
          content = content.replace(
            /<div class="tophd-ind"[^>]*>[\s\S]*?<\/div>/i,
            () => `<div class="tophd-ind">${activeBanner.title}</div>`
          );
        }
      }

      fs.writeFileSync(filePath, content, 'utf8');
    }
  } catch (err) {
    console.error('[SSR Sync] Failed to sync static HTML files:', err.message);
  }
}

module.exports = { syncStaticHTMLPricingAndBanners };
