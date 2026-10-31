const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

function getAllHtmlFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === '.git' || file === 'node_modules' || file === 'admin') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getAllHtmlFiles(fullPath));
      } else if (file.endsWith('.html') || file.endsWith('.htm')) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

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

function syncStaticHTMLContactSettings(settings) {
  if (!settings) return;
  const newPhone = (settings.supportPhone || '').trim();
  const rawDigits = newPhone.replace(/\D/g, '');
  const cleanPhone = rawDigits.startsWith('92') ? rawDigits : (rawDigits.startsWith('03') ? ('92' + rawDigits.substring(1)) : (rawDigits.startsWith('0') ? ('92' + rawDigits.substring(1)) : rawDigits));
  const telHref = 'tel:+' + cleanPhone;
  const newEmail = (settings.supportEmail || '').trim();
  const currency = (settings.currencySymbol || '').trim();

  let files = [];
  try {
    files = getAllHtmlFiles(BASE_DIR);
  } catch (err) {
    console.error('[Contact Sync] Error reading directories:', err.message);
    return;
  }

  for (const filePath of files) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;

      // 1. Update phone tel: links href
      if (cleanPhone) {
        const phoneHrefRegex = /href="tel:[^"]*"/gi;
        if (phoneHrefRegex.test(content)) {
          content = content.replace(phoneHrefRegex, `href="${telHref}"`);
          changed = true;
        }
      }

      // 2. Update email mailto: links href
      if (newEmail) {
        const emailHrefRegex = /href="mailto:[^"]*"/gi;
        if (emailHrefRegex.test(content)) {
          content = content.replace(emailHrefRegex, `href="mailto:${newEmail}"`);
          changed = true;
        }
      }

      // 3. Update known visible phone text patterns
      if (newPhone) {
        // Pattern A: <small>Share your idea?</small>...
        content = content.replace(/(<small>[^<]*<\/small>)\s*([\d\s()+-]{7,25})/gi, (match, p1) => {
          changed = true;
          return `${p1} ${newPhone}`;
        });

        // Pattern B: <i class="fa fa-phone"[^>]*></i>\s*...
        content = content.replace(/(<i class="fa fa-phone"[^>]*><\/i>)\s*([\d\s()+-]{7,25})/gi, (match, p1) => {
          changed = true;
          return `${p1} ${newPhone}`;
        });

        // Pattern C: <a class="...btn-black-custom...">\s*phone\s*</a>
        content = content.replace(/(<a[^>]*class="[^"]*btn-black-custom[^"]*"[^>]*>)\s*([\d\s()+-]{7,25})\s*(<\/a>)/gi, (match, p1, p2, p3) => {
          changed = true;
          return `${p1}${newPhone}${p3}`;
        });

        // Pattern D: class="call_wrap" with inner icon span and text span
        content = content.replace(/(class="call_wrap"[^>]*>[\s\S]*?<span[^>]*class="icoo"[^>]*>[\s\S]*?<\/span>\s*<span>)[^<]*(<\/span>)/gi, (match, p1, p2) => {
          changed = true;
          return `${p1}${newPhone}${p2}`;
        });

        // Pattern D2: simple class="call_wrap"[^>]*><span>phone</span>
        content = content.replace(/(class="call_wrap"[^>]*>\s*<span>)\s*([\d\s()+-]{7,25})\s*(<\/span>)/gi, (match, p1, p2, p3) => {
          changed = true;
          return `${p1}${newPhone}${p3}`;
        });

        // Pattern E: or Call Now <b>phone</b>
        content = content.replace(/(or Call Now\s*<b>)\s*([\d\s()+-]{7,25})\s*(<\/b>)/gi, (match, p1, p2, p3) => {
          changed = true;
          return `${p1}${newPhone}${p3}`;
        });

        // Pattern F: <a href="tel:[^"]*">\s*phone\s*</a>
        content = content.replace(/(<a\s+href="tel:[^"]*">\s*)([\d\s()+-]{7,25})(\s*<\/a>)/gi, (match, p1, p2, p3) => {
          changed = true;
          return `${p1}${newPhone}${p3}`;
        });

        // Pattern G: class="chatcta"
        content = content.replace(/(<a[^>]*class="[^"]*chatcta[^"]*"[^>]*>)\s*([\d\s()+-]{7,25})\s*(<\/a>)/gi, (match, p1, p2, p3) => {
          changed = true;
          return `${p1}${newPhone}${p3}`;
        });

        // Pattern H: Give us a Call
        content = content.replace(/(Give us a Call\s+)([\d\s()+-]{7,25})/gi, (match, p1) => {
          changed = true;
          return `${p1}${newPhone} `;
        });

        // Pattern I: Call us now to get started
        content = content.replace(/(Call us now to get started\s*<\/span>\s*)([\d\s()+-]{7,25})/gi, (match, p1) => {
          changed = true;
          return `${p1}${newPhone} `;
        });

        // Pattern J: Direct regex replacement for known legacy numbers
        const previousPhoneRegex = /\+?92\s*306\s*1284045|\+?923061284045|0306[\s-]?1284045|\+1\s*\(555\)\s*019-2834|\+1\s*\(213\)\s*221-2842/g;
        if (previousPhoneRegex.test(content)) {
          content = content.replace(previousPhoneRegex, newPhone);
          changed = true;
        }
      }

      // 4. Update known visible email text patterns
      if (newEmail) {
        content = content.replace(/(href="mailto:[^"]*">\s*)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\s*<\/a>)/gi, (match, p1, p2, p3) => {
          changed = true;
          return `${p1}${newEmail}${p3}`;
        });
      }

      // 5. Update currency
      if (currency) {
        const currPrefix = currency.length === 1 ? currency : (currency + " ");
        content = content.replace(/(<span>Starting at\s*<\/span>\s*)([^\d<]+)(\d[\d,]*)/gi, (m, p1, oldCur, p3) => {
          changed = true;
          return `${p1}${currPrefix}${p3}`;
        });
      }

      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    } catch (err) {
      console.error(`[Contact Sync] Error processing ${filePath}:`, err.message);
    }
  }
}

module.exports = { syncStaticHTMLPricingAndBanners, syncStaticHTMLContactSettings };
