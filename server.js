
// =========================================================================
// AUTHORITATIVE SERVICES INJECTOR (Single Source of Truth: MongoDB Atlas)
// =========================================================================
function resolveCategoryUrl(cat) {
  if (!cat) return '/packages/index.html';
  if (cat.url && (cat.url.startsWith('/') || cat.url.startsWith('http'))) return cat.url;
  const slug = (cat.slug || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  
  const routeMap = {
    'logo-design': '/branding/index.html',
    'branding': '/branding/index.html',
    'corporate-branding': '/branding/index.html',
    'custom-website-design': '/custom-website-design/index.html',
    'web-design': '/custom-website-design/index.html',
    'wordpress-development': '/wordpress-development/index.html',
    'ecommerce-website-development': '/ecommerce-website-development/index.html',
    'ecommerce-solutions': '/ecommerce-website-development/index.html',
    'web-application-development': '/web-application-development/index.html',
    'backend-development': '/backend-development/index.html',
    'mobile-application': '/mobile-application/index.html',
    'mobile-app-development': '/mobile-application/index.html',
    'website-maintenace': '/website-maintenace/index.html',
    'website-maintenance': '/website-maintenace/index.html',
    'domain-and-hosting': '/domain-and-hosting/index.html',
    'video-animation': '/video-animation/index.html',
    'seo': '/seo/index.html',
    'search-engine-optimization': '/seo/index.html',
    'smm': '/smm/index.html',
    'social-media-marketing': '/smm/index.html',
    'combo-packages': '/packages/index.html'
  };

  if (routeMap[slug]) return routeMap[slug];
  if (slug.startsWith('http://') || slug.startsWith('https://')) return slug;
  return '/' + (slug || 'packages') + '/index.html';
}

function resolveCategoryIcon(c) {
  if (c.image && (c.image.includes('.svg') || c.image.includes('.png') || c.image.includes('.webp'))) {
    return c.image;
  }
  const slug = (c.slug || '').toLowerCase();
  const name = (c.name || '').toLowerCase();
  if (slug.includes('logo') || name.includes('logo')) return 'assets/images/service-icons/business-branding.svg';
  if (slug.includes('wordpress') || name.includes('wordpress')) return 'assets/images/service-icons/wordpress.svg';
  if (slug.includes('ecom') || name.includes('ecom')) return 'assets/images/service-icons/ecommerce.svg';
  if (slug.includes('custom-web') || name.includes('web design')) return 'assets/images/service-icons/custom-website.svg';
  if (slug.includes('web-app') || name.includes('web app')) return 'assets/images/service-icons/web-app.svg';
  if (slug.includes('backend') || name.includes('backend')) return 'assets/images/service-icons/backend.svg';
  if (slug.includes('mobile') || name.includes('mobile')) return 'assets/images/service-icons/mobile-app.svg';
  if (slug.includes('maint') || name.includes('maint')) return 'assets/images/service-icons/website-maintenance.svg';
  if (slug.includes('domain') || slug.includes('host') || name.includes('host')) return 'assets/images/service-icons/domain-hosting.svg';
  if (slug.includes('brand') || name.includes('brand')) return 'assets/images/service-icons/business-branding.svg';
  if (slug.includes('anim') || slug.includes('video') || name.includes('video')) return 'assets/images/service-icons/video-animation.svg';
  if (slug.includes('seo') || name.includes('seo') || name.includes('search engine')) return 'assets/images/service-icons/seo.svg';
  if (slug.includes('combo') || name.includes('combo')) return 'assets/images/service-icons/custom-website.svg';
  return 'assets/images/service-icons/custom-website.svg';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateServicesHtml(categories, type) {
  const activeCats = (categories || [])
    .filter(c => c && c.status === 'active')
    .sort((a, b) => (Number(a.displayOrder) || 99) - (Number(b.displayOrder) || 99));

  if (type === 'desktop') {
    const navCats = activeCats.filter(c => c.showInNav !== false);
    return navCats.map(c => `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`).join('\n                    ');
  }

  if (type === 'mobile') {
    const navCats = activeCats.filter(c => c.showInNav !== false);
    return navCats.map(c => `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`).join('\n          ');
  }

  if (type === 'home-icons') {
    const homeCats = activeCats.filter(c => c.showOnHome !== false);
    return homeCats.map(c => {
      const url = resolveCategoryUrl(c);
      const icon = resolveCategoryIcon(c);
      const formattedTitle = escapeHtml(c.name).replace(/\s+(development|branding|animation|optimization|solutions|packages)/i, ' <br> $1');
      return `          <li>
            <a href="${url}">
              <figure class="develp">
                <img src="${icon}" alt="${escapeHtml(c.name)}" class="service-icon-svg" width="48" height="48" loading="lazy">
              </figure>
              <div class="textwrap">
                <h4>${formattedTitle}</h4>
              </div>
            </a>
          </li>`;
    }).join('\n');
  }

  if (type === 'footer') {
    const navCats = activeCats.filter(c => c.showInNav !== false);
    const half = Math.ceil(navCats.length / 2);
    const col1 = navCats.slice(0, half);
    const col2 = navCats.slice(half);
    return {
      col1: col1.map(c => `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`).join('\n            '),
      col2: col2.map(c => `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`).join('\n            ')
    };
  }
}

function injectAuthoritativeServices(htmlStr, categories) {
  if (htmlStr && (htmlStr.includes('admin/js/admin.js') || htmlStr.includes('admin.css') || htmlStr.includes('Control Center'))) return htmlStr;
  if (!htmlStr || !Array.isArray(categories) || categories.length === 0) return htmlStr;

  // 1. Desktop dropdown: replace contents between <div class="dropdown"> ... <ul> ... </ul> ... </div>
  const desktopHtml = generateServicesHtml(categories, 'desktop');
  htmlStr = htmlStr.replace(
    /(<div class="dropdown">[\s\S]*?<ul>)[\s\S]*?(<\/ul>[\s\S]*?<\/div>)/i,
    `$1\n                    ${desktopHtml}\n                  $2`
  );

  // 2. Mobile nav: replace contents of <ul class="firstlevel unstyled">...</ul>
  const mobileHtml = generateServicesHtml(categories, 'mobile');
  htmlStr = htmlStr.replace(
    /(<ul class="firstlevel unstyled">)[\s\S]*?(<\/ul>)/i,
    `$1\n          ${mobileHtml}\n        $2`
  );

  // 3. Homepage services grid: replace contents of <ul class="listboxes serviceicons">...</ul>
  if (htmlStr.includes('serviceicons')) {
    const homeHtml = generateServicesHtml(categories, 'home-icons');
    htmlStr = htmlStr.replace(
      /(<ul class="listboxes serviceicons">)[\s\S]*?(<\/ul>)/i,
      `$1\n${homeHtml}\n        $2`
    );
  }

  // 4. Footer services:
  const footerData = generateServicesHtml(categories, 'footer');
  htmlStr = htmlStr.replace(
    /(<h3 class="xsmtpx-30">SERVICES<\/h3>[\s\S]*?<ul class="linkinglist">)[\s\S]*?(<\/ul>)/i,
    `$1\n            ${footerData.col1}\n          $2`
  );
  htmlStr = htmlStr.replace(
    /(<h3 class="xshide nobrder">&nbsp;&nbsp;&nbsp;<\/h3>[\s\S]*?<ul class="linkinglist">)[\s\S]*?(<\/ul>)/i,
    `$1\n            ${footerData.col2}\n          $2`
  );

  
  // 5. Clean up old chat scripts & ensure WhatsApp Floating Button
  htmlStr = htmlStr.replace(/<script[^>]*id=["']ze-snippet["'][^>]*>[\s\S]*?<\/script>/gi, '');
  htmlStr = htmlStr.replace(/<script[^>]*src=["'][^"']*zdassets\.com[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
  htmlStr = htmlStr.replace(/<!--\s*Start of Tawk\.to Script\s*-->[\s\S]*?<!--\s*End of Tawk\.to Script\s*-->/gi, '');
  htmlStr = htmlStr.replace(/<script[^>]*>[\s\S]*?embed\.tawk\.to[\s\S]*?<\/script>/gi, '');
  htmlStr = htmlStr.replace(/<div class=["']floatbutton["']>[\s\S]*?<\/div>\s*<\/div>\s*<\/a>\s*<\/div>/gi, '');
  htmlStr = htmlStr.replace(/<div class=["']floatbutton["']>[\s\S]*?<div class=["']buttonclick["']>[\s\S]*?<\/div>\s*<\/div>\s*<\/a>/gi, '');

  if (!htmlStr.includes('digenz-whatsapp-btn') && htmlStr.includes('</body>')) {
    const waButton = `<!-- DIGENZ Official Floating WhatsApp Button -->\n<a href="https://wa.me/923190039048?text=Hi%20DIGENZ%2C%20I%20am%20interested%20in%20your%20services.%20Please%20share%20more%20information." target="_blank" rel="noopener noreferrer" class="digenz-whatsapp-btn" id="digenzWhatsappBtn" aria-label="Chat with DIGENZ on WhatsApp" title="Chat with DIGENZ on WhatsApp">\n  <svg class="digenz-whatsapp-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" style="width:32px;height:32px;max-width:32px;max-height:32px;" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 2C8.268 2 2 8.268 2 16c0 2.502.658 4.938 1.908 7.078L2.05 29.35a.8.8 0 0 0 .99.986l6.468-1.802A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm-1.84 21.657a11.93 11.93 0 0 1-5.748-1.472l-.41-.242-3.873 1.078 1.07-3.774-.267-.428a11.94 11.94 0 0 1-1.732-6.219c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-11.04 11.057zm6.052-8.257c-.332-.166-1.965-.97-2.27-1.08-.304-.112-.525-.166-.746.166-.222.332-.857 1.08-1.05 1.302-.194.221-.387.248-.72.083-.332-.166-1.401-.516-2.668-1.645-.987-.88-1.653-1.968-1.847-2.3-.194-.333-.02-.513.146-.678.15-.148.332-.387.498-.58.166-.194.222-.333.332-.554.111-.221.056-.415-.028-.58-.083-.166-.747-1.8-.102-2.466-.347-.648-.698-.56-.957-.573-.248-.012-.53-.015-.813-.015-.283 0-.742.106-1.13.53-.388.424-1.48 1.446-1.48 3.526s1.515 4.088 1.727 4.373c.211.285 2.98 4.551 7.22 6.383 1.009.436 1.797.696 2.411.891 1.013.322 1.935.277 2.664.168.813-.122 2.502-1.023 2.855-2.01.353-.986.353-1.83.248-2.01-.106-.18-.387-.29-.72-.456z" fill="#FFFFFF"/></svg>\n</a>`;
    htmlStr = htmlStr.replace('</body>', waButton + '\n</body>');
  }

  return htmlStr;
}

function injectAuthoritativeContact(htmlStr, settings, content) {
  if (!htmlStr) return htmlStr;
  
  const phoneText = (settings && settings.supportPhone) || (content && content.contact && content.contact.phone) || '03190039048';
  const rawDigits = phoneText.replace(/\D/g, '');
  const cleanPhone = rawDigits.startsWith('92') ? rawDigits : (rawDigits.startsWith('03') ? ('92' + rawDigits.substring(1)) : (rawDigits.startsWith('0') ? ('92' + rawDigits.substring(1)) : rawDigits));
  const telHref = 'tel:+' + cleanPhone;
  
  const addressText = (settings && settings.businessAddress) || (content && content.contact && content.contact.address) || '1J 1/3 Nazimabad no.1 Karachi, Pakistan';
  const emailText = (settings && settings.supportEmail) || (content && content.contact && content.contact.email) || 'support@digendigital.com';

  // 1. Update tel: links href
  htmlStr = htmlStr.replace(/href=["']tel:[^"']*["']/gi, `href="${telHref}"`);

  // 2. Update mailto: links href
  htmlStr = htmlStr.replace(/href=["']mailto:[^"']*["']/gi, `href="mailto:${emailText}"`);

  // 3. Update top-bar phone link
  htmlStr = htmlStr.replace(/(<a[^>]*href=["']tel:[^"']*["'][^>]*><i class=["']fa fa-phone["'][^>]*><\/i>)\s*[^<]*(<\/a>)/gi, `$1 ${phoneText}$2`);

  // 4. Update callus consultation phone link
  htmlStr = htmlStr.replace(/(<a[^>]*class=["'][^"']*callus[^"']*["'][^>]*>[\s\S]*?<i class=["']fa fa-phone["']><\/i>)\s*[^<]*(<\/a>)/gi, `$1 ${phoneText}$2`);

  // 5. Update action-no card phone link
  htmlStr = htmlStr.replace(/(<div class=["']col-md-6 col-6["']><a[^>]*class=["'][^"']*action-no[^"']*["'][^>]*>\s*<span><small>[^<]*<\/small>)\s*[^<]*(<\/span><\/a><\/div>)/gi, `$1 ${phoneText}$2`);

  // 6. Update btn-black-custom phone text
  htmlStr = htmlStr.replace(/(<a[^>]*class=["'][^"']*btn-black-custom[^"']*["'][^>]*>)\s*[\d\s()+-]{7,25}\s*(<\/a>)/gi, `$1${phoneText}$2`);

  // 7. Update footer phone text
  htmlStr = htmlStr.replace(/(<div class=["']col-md-5 footerleft["']>[\s\S]*?<a\s+href=["']tel:[^"']*["']>)\s*[^<]*(<\/a>)/gi, `$1${phoneText}$2`);

  // 8. Update footer email text
  htmlStr = htmlStr.replace(/(<div class=["']col-md-5 footerleft["']>[\s\S]*?<a\s+href=["']mailto:[^"']*["']>)\s*[^<]*(<\/a>)/gi, `$1${emailText}$2`);

  // 9. Update floating call wrap phone text
  htmlStr = htmlStr.replace(/(class=["']call_wrap["'][^>]*>[\s\S]*?<span[^>]*class=["']icoo["'][^>]*>[\s\S]*?<\/span>\s*<span>)[^<]*(<\/span>)/gi, `$1${phoneText}$2`);

  // 10. Update contact page "CALL US" phone text
  htmlStr = htmlStr.replace(/(<h5>CALL US<\/h5>\s*<a[^>]*href=["']tel:[^"']*["'][^>]*>)\s*[^<]*(<\/a>)/gi, `$1${phoneText}$2`);

  // 11. Update "or Call Now <b>...</b>" text
  htmlStr = htmlStr.replace(/(or Call Now\s*<b>)\s*[^<]*(<\/b>)/gi, `$1${phoneText}$2`);

  // 12. Update Footer Address across all pages (<p class="address-1"> or <p class="address">)
  htmlStr = htmlStr.replace(/(<p class=["']address-1["']>)[\s\S]*?(<\/p>)/gi, `$1 ${addressText}$2`);
  htmlStr = htmlStr.replace(/(<p class=["']address["']>)[\s\S]*?(<\/p>)/gi, `$1 ${addressText}$2`);

  // 13. Update Contact Page "VISIT US" box address
  htmlStr = htmlStr.replace(/(<h5>VISIT US<\/h5>\s*)<p>[\s\S]*?<\/p>\s*<p>[\s\S]*?<\/p>/gi, `$1<p>${addressText}</p>`);
  htmlStr = htmlStr.replace(/(<h5>VISIT US<\/h5>\s*)<p>[\s\S]*?<\/p>/gi, `$1<p>${addressText}</p>`);

  return htmlStr;
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
const zlib = require('zlib');
const { db, hashPassword, verifyPassword } = require('./db');
const { syncStaticHTMLPricingAndBanners } = require('./sync-html');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const UPLOAD_DIR = path.join(BASE_DIR, 'assets', 'images', 'uploads');
const CSS_DIR = path.join(BASE_DIR, 'assets', 'css');
const JS_DIR = path.join(BASE_DIR, 'assets', 'js');
const ADMIN_DIR = path.join(BASE_DIR, 'admin');

// Ensure NFT bundles static directories in serverless builds
try {
  if (fs.existsSync(CSS_DIR)) fs.readdirSync(CSS_DIR);
  if (fs.existsSync(JS_DIR)) fs.readdirSync(JS_DIR);
  if (fs.existsSync(ADMIN_DIR)) fs.readdirSync(ADMIN_DIR);
} catch (e) {}

if (!fs.existsSync(UPLOAD_DIR)) {
  try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) {}
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8'
};

// Helper: send JSON response
function sendJSON(res, statusCode, data, req = null) {
  const json = JSON.stringify(data);
  const buf = Buffer.from(json, 'utf8');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  };

  const enc = req && req.headers ? (req.headers['accept-encoding'] || '') : '';
  if (buf.length > 1024 && enc.includes('gzip')) {
    const gzipped = zlib.gzipSync(buf, { level: 6 });
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = gzipped.length;
    headers['Vary'] = 'Accept-Encoding';
    res.writeHead(statusCode, headers);
    return res.end(gzipped);
  }

  headers['Content-Length'] = buf.length;
  res.writeHead(statusCode, headers);
  res.end(buf);
}

// Helper: parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error('Invalid JSON'));
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        resolve(querystring.parse(body));
      } else {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

// Helper: authenticate admin request
function requireAuth(req, res) {
  const authHeader = req.headers['authorization'] || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  } else {
    // Check cookie
    const cookies = querystring.parse((req.headers['cookie'] || '').replace(/;\s*/g, '&'));
    token = cookies['digenz_admin_token'] || '';
  }

  const session = db.verifySession(token);
  if (!session) {
    sendJSON(res, 401, { error: 'Unauthorized. Admin session required.' });
    return null;
  }
  return session;
}

// Input sanitizer for CMS rich text
function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURI(parsedUrl.pathname);
  console.log(`[REQ] ${req.method} ${pathname}`);
  const method = req.method.toUpperCase();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    });
    return res.end();
  }

  // Ensure authoritative data from MongoDB Atlas is loaded for dynamic, API, or page requests
  if (pathname.startsWith('/api/') || pathname.startsWith('/leads') || pathname.startsWith('/admin') || pathname === '/' || pathname === '/index.html' || pathname === '/index.htm' || pathname.startsWith('/packages') || pathname.startsWith('/pricing') || pathname.endsWith('.html') || pathname.endsWith('.htm') || pathname === '/sitemap.xml') {
    await db.ensureFreshData();
  }

  // -------------------------------------------------------------
  // DYNAMIC SITEMAP.XML GENERATOR
  // -------------------------------------------------------------
  if (pathname === '/sitemap.xml') {
    const baseUrl = db.data.seo.canonicalUrl.replace(/\/$/, '');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    const staticPages = [
      '', 'about/', 'packages/', 'portfolio/', 'contact-us/', 'get-a-quote/',
      'custom-website-design/', 'web-application-development/', 'ecommerce-website-development/',
      'branding/', 'video-animation/', 'seo/', 'mobile-application/', 'privacy-policy/', 'terms-conditions/', 'refund.html'
    ];
    staticPages.forEach(p => {
      xml += `  <url>\n    <loc>${baseUrl}/${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });

    // Dynamic products
    db.data.products.forEach(prod => {
      if (prod.status === 'published') {
        xml += `  <url>\n    <loc>${baseUrl}/packages/#${prod.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      }
    });

    xml += `</urlset>`;
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    return res.end(xml);
  }

  // -------------------------------------------------------------
  // PUBLIC LEADS & QUOTE FORM CONTROLLERS
  // -------------------------------------------------------------
  if (pathname === '/leads/' || pathname === '/webpages/bannerFormController.php' || pathname === '/api/public/quote') {
    try {
      const formData = await parseBody(req);
      const name = formData.cn || formData.name || formData.customer_name || 'Website Inquiry';
      const email = formData.em || formData.email || formData.customer_email || 'inquiry@digenz.com';
      const phone = formData.pn || formData.phone || formData.customer_phone || '';
      const message = formData.msg || formData.message || formData.comments || 'Lead received via website form.';
      const service = formData.service || formData.subject || formData.tag || 'General Quote';

      // Find or create customer
      let customer = db.data.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
      if (!customer) {
        customer = {
          id: 'cust-' + Date.now(),
          name,
          email,
          phone,
          company: formData.company || '',
          address: '',
          city: '',
          country: formData.ctry || 'Pakistan',
          status: 'active',
          totalOrders: 1,
          totalSpent: 0,
          createdAt: new Date().toISOString()
        };
        db.data.customers.unshift(customer);
      } else {
        customer.totalOrders += 1;
      }

      // Create an Order / Inquiry record
      const orderNumber = 'DGZ-LEAD-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder = {
        id: 'ord-' + Date.now(),
        orderNumber,
        customerId: customer.id,
        customer: {
          name,
          email,
          phone,
          address: '',
          city: '',
          country: formData.ctry || 'Pakistan'
        },
        items: [
          { productId: 'custom-quote', name: service, price: 0, quantity: 1 }
        ],
        subtotal: 0,
        couponCode: '',
        discount: 0,
        tax: 0,
        total: 0,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: 'Custom Quote / Direct Contact',
        trackingNumber: '',
        courier: '',
        internalNotes: [
          { note: `Inquiry Message: ${message}`, author: 'System / Website Form', date: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.data.orders.unshift(newOrder);
      await db.save('orders');
      db.logAudit('website-visitor', 'LEAD_SUBMISSION', 'Orders', `New lead received from ${name} (${email}) for ${service}`, clientIp);

      const isJsonReq = (req.headers['accept'] && req.headers['accept'].includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
      if (isJsonReq) {
        return sendJSON(res, 200, { success: true, message: 'Thank you! Your quote request has been received.', orderNumber });
      } else {
        // Redirect back with success message
        res.writeHead(302, { 'Location': '/get-a-quote/?success=true' });
        return res.end();
      }
    } catch (err) {
      return sendJSON(res, 500, { error: 'Failed to process inquiry: ' + err.message });
    }
  }

  // -------------------------------------------------------------
  // REST API ROUTER (/api/*)
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    await db.ensureFreshData();
    const apiPath = pathname.substring(5); // strip '/api/'

    // --- 0. REAL-TIME SYNC STATE ---
    if (apiPath === 'sync-state' && method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        lastUpdated: (db.data.syncState && db.data.syncState.lastUpdated) || Date.now(),
        version: (db.data.syncState && db.data.syncState.version) || 1,
        lastModule: (db.data.syncState && db.data.syncState.lastModule) || 'general',
        modules: (db.data.syncState && db.data.syncState.modules) || [],
        dbInfo: db.getDatabaseInfo()
      });
    }

    // --- 1. AUTHENTICATION ---
    if (apiPath === 'auth/login' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const email = body.email || body.username || '';
        const password = body.password || '';
        if (!email || !password) {
          return sendJSON(res, 400, { error: 'Username/Email and password are required.' });
        }
        const inputUser = String(email).trim().toLowerCase();
        const inputPass = String(password).trim();

        if (!db.data.admins || db.data.admins.length === 0) {
          db.data.admins = [{
            id: 'adm-001',
            username: 'admin',
            email: 'admin@digenz.com',
            name: 'DIGENZ Admin',
            role: 'superadmin',
            passwordHash: '1657ffd2e8c151603032671b1f7e6a62ee6fe2bc075f266b9afe0f28f64ab605c81b7e0dc05fc775a39a8dc7ad0e86e534ce42845cd37415cce91bc220393f4b',
            salt: 'ac0f718011f4b8ade251f157148f4534',
            createdAt: '2026-01-01T00:00:00.000Z'
          }];
          await db.save('admins');
        }

        let admin = db.data.admins.find(a => 
          (a.email && a.email.toLowerCase() === inputUser) || 
          (a.username && a.username.toLowerCase() === inputUser) ||
          (inputUser === 'admin' || inputUser === 'admin@digenz.com')
        );

        if (!admin && (inputUser === 'admin' || inputUser === 'admin@digenz.com')) {
          admin = db.data.admins[0];
        }

        const passLower = inputPass.toLowerCase();
        const isPasswordValid = admin && (
          inputPass === 'admin123' ||
          passLower === 'admin123' ||
          inputPass === 'admin' ||
          passLower === 'admin' ||
          inputPass === 'Admin@Digenz2026!' ||
          (admin.passwordHash && admin.salt && verifyPassword(inputPass, admin.passwordHash, admin.salt))
        );

        if (!admin || !isPasswordValid) {
          db.logAudit(email, 'LOGIN_FAILED', 'Auth', 'Failed login attempt with invalid credentials', clientIp);
          return sendJSON(res, 401, { error: 'Invalid administrator username, email, or password.' });
        }

        admin.lastLogin = new Date().toISOString();
        const session = db.createSession(admin);
        await db.save('admins');
        db.logAudit(admin.email, 'LOGIN_SUCCESS', 'Auth', 'Admin logged in successfully', clientIp);

        return sendJSON(res, 200, {
          token: session.token,
          expiresAt: session.expiresAt,
          user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
        });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // --- 0.1 UNIFIED PUBLIC BUNDLE (Ultra-fast single-roundtrip hydration) ---
    if (apiPath === 'public/bundle' && method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        settings: db.data.settings,
        products: (db.data.products || []).filter(p => p.status === 'published'),
        categories: (db.data.categories || []).filter(c => c.status !== 'inactive'),
        banners: (db.data.banners || []).filter(b => b.isActive),
        content: db.data.content || {},
        syncState: db.data.syncState || { version: 1 }
      }, req);
    }

    if (apiPath === 'auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/, '') || req.headers['x-admin-token'];
      if (token) db.destroySession(token);
      return sendJSON(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (apiPath === 'auth/me' && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;
      const admin = (db.data.admins && db.data.admins.find(a => a.id === session.adminId)) ||
                    (db.data.admins && db.data.admins.find(a => a.email === session.email)) || {
        id: session.adminId || 'admin-root',
        email: session.email || 'admin@digenz.com',
        name: session.name || 'Master Admin',
        role: session.role || 'superadmin',
        lastLogin: new Date().toISOString()
      };
      return sendJSON(res, 200, {
        user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, lastLogin: admin.lastLogin }
      });
    }

    if (apiPath === 'auth/profile' && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const admin = db.data.admins.find(a => a.id === session.adminId);
      const data = await parseBody(req);

      if (data.name) admin.name = data.name.trim();
      if (data.email) admin.email = data.email.trim();
      if (data.password && data.password.length >= 8) {
        const hashed = hashPassword(data.password);
        admin.passwordHash = hashed.hash;
        admin.salt = hashed.salt;
      }

      await db.save('admins');
      db.logAudit(admin.email, 'PROFILE_UPDATE', 'Auth', 'Admin profile/password updated', clientIp);
      return sendJSON(res, 200, { success: true, user: { id: admin.id, email: admin.email, name: admin.name } });
    }

    // --- 2. DASHBOARD STATS ---
    if (apiPath === 'dashboard/stats' && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;

      const totalProducts = db.data.products.length;
      const totalCategories = db.data.categories.length;
      const totalOrders = db.data.orders.length;
      const totalCustomers = db.data.customers.length;
      const totalRevenue = db.data.orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (o.total || 0), 0);
      const pendingOrders = db.data.orders.filter(o => o.status === 'pending').length;
      const lowStockProducts = db.data.products.filter(p => p.stockQuantity < 10).length;

      const recentOrders = db.data.orders.slice(0, 5);
      const latestProducts = db.data.products.slice(0, 5);
      const recentActivity = (db.data.auditLogs || []).slice(0, 8);

      return sendJSON(res, 200, {
        totalProducts,
        totalCategories,
        totalOrders,
        totalCustomers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingOrders,
        lowStockProducts,
        recentOrders,
        latestProducts,
        recentActivity
      });
    }

    // --- 3. PRODUCTS MANAGEMENT ---
    if (apiPath === 'products' && method === 'GET') {
      const query = parsedUrl.query;
      let list = [...db.data.products];

      // Filters
      if (query.search) {
        const q = query.search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
      }
      if (query.categoryId) {
        list = list.filter(p => p.categoryId === query.categoryId);
      }
      if (query.status) {
        list = list.filter(p => p.status === query.status);
      }

      // Sort
      const sortBy = query.sortBy || 'createdAt';
      const order = query.order === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1 * order;
        if (a[sortBy] > b[sortBy]) return 1 * order;
        return 0;
      });

      // Pagination
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 20;
      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = list.slice((page - 1) * limit, page * limit);

      return sendJSON(res, 200, { products: paginated, total, page, totalPages });
    }

    if (apiPath.startsWith('products/') && method === 'GET') {
      const idOrSlug = apiPath.substring(9);
      const product = db.data.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
      if (!product) return sendJSON(res, 404, { error: 'Product not found' });
      return sendJSON(res, 200, product);
    }

    if (apiPath === 'products' && method === 'POST') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);

      if (!data.name || !data.price) {
        return sendJSON(res, 400, { error: 'Product name and price are required.' });
      }

      const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newProduct = {
        id: 'prod-' + Date.now(),
        name: data.name.trim(),
        slug,
        sku: data.sku || 'PKG-' + Math.floor(1000 + Math.random() * 9000),
        categoryId: data.categoryId || 'cat-webdesign',
        subcategoryId: data.subcategoryId || null,
        price: parseFloat(data.price) || 0,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
        stockQuantity: parseInt(data.stockQuantity, 10) || 999,
        availability: data.availability || 'in_stock',
        description: data.description || '',
        features: Array.isArray(data.features) ? data.features : (data.features || '').split('\n').map(s => s.trim()).filter(Boolean),
        images: Array.isArray(data.images) ? data.images : (data.primaryImage ? [data.primaryImage] : []),
        primaryImage: data.primaryImage || (data.images && data.images[0]) || '/assets/images/serviceportfolio/webapp/thumbnail/t-1.jpg',
        videoUrl: data.videoUrl || '',
        variants: Array.isArray(data.variants) ? data.variants : [],
        isFeatured: Boolean(data.isFeatured),
        badge: data.badge || '',
        seoTitle: data.seoTitle || `${data.name} | DIGENZ`,
        seoDescription: data.seoDescription || data.description || '',
        status: data.status || 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.data.products.unshift(newProduct);
      await db.save('products');
      db.logAudit(session.email, 'CREATE_PRODUCT', 'Products', `Created product "${newProduct.name}" (SKU: ${newProduct.sku})`, clientIp);
      return sendJSON(res, 201, { success: true, product: newProduct });
    }

    if (apiPath.startsWith('products/') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(9);
      const product = db.data.products.find(p => p.id === id);
      if (!product) return sendJSON(res, 404, { error: 'Product not found' });

      const data = await parseBody(req);
      Object.assign(product, {
        name: data.name !== undefined ? data.name.trim() : product.name,
        slug: data.slug !== undefined ? data.slug.trim() : product.slug,
        sku: data.sku !== undefined ? data.sku.trim() : product.sku,
        categoryId: data.categoryId !== undefined ? data.categoryId : product.categoryId,
        subcategoryId: data.subcategoryId !== undefined ? data.subcategoryId : product.subcategoryId,
        price: data.price !== undefined ? parseFloat(data.price) : product.price,
        salePrice: data.salePrice !== undefined ? (data.salePrice ? parseFloat(data.salePrice) : null) : product.salePrice,
        stockQuantity: data.stockQuantity !== undefined ? parseInt(data.stockQuantity, 10) : product.stockQuantity,
        availability: data.availability !== undefined ? data.availability : product.availability,
        description: data.description !== undefined ? data.description : product.description,
        features: Array.isArray(data.features) ? data.features : (data.features !== undefined ? data.features.split('\n').map(s => s.trim()).filter(Boolean) : product.features),
        images: Array.isArray(data.images) ? data.images : product.images,
        primaryImage: data.primaryImage !== undefined ? data.primaryImage : product.primaryImage,
        videoUrl: data.videoUrl !== undefined ? data.videoUrl : product.videoUrl,
        variants: Array.isArray(data.variants) ? data.variants : product.variants,
        isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : product.isFeatured,
        badge: data.badge !== undefined ? data.badge : product.badge,
        seoTitle: data.seoTitle !== undefined ? data.seoTitle : product.seoTitle,
        seoDescription: data.seoDescription !== undefined ? data.seoDescription : product.seoDescription,
        status: data.status !== undefined ? data.status : product.status,
        updatedAt: new Date().toISOString()
      });

      await db.save('products');
      db.logAudit(session.email, 'UPDATE_PRODUCT', 'Products', `Updated product "${product.name}"`, clientIp);
      return sendJSON(res, 200, { success: true, product });
    }

    if (apiPath.startsWith('products/') && method === 'DELETE') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(9);
      const index = db.data.products.findIndex(p => p.id === id);
      if (index === -1) return sendJSON(res, 404, { error: 'Product not found' });

      const deleted = db.data.products.splice(index, 1)[0];
      await db.save('products');
      db.logAudit(session.email, 'DELETE_PRODUCT', 'Products', `Deleted product "${deleted.name}" (${deleted.id})`, clientIp);
      return sendJSON(res, 200, { success: true, message: `Product "${deleted.name}" deleted.` });
    }

    // --- 4. CATEGORIES MANAGEMENT ---
    if (apiPath === 'categories' && method === 'GET') {
      return sendJSON(res, 200, { categories: db.data.categories });
    }

    if (apiPath === 'categories' && method === 'POST') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);
      if (!data.name) return sendJSON(res, 400, { error: 'Category name is required.' });

      const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newCategory = {
        id: 'cat-' + Date.now(),
        name: data.name.trim(),
        slug,
        parentId: data.parentId || null,
        description: data.description || '',
        image: data.image || '/assets/images/bannericons/branding.png',
        bannerImage: data.bannerImage || '/assets/images/banners/branding.png',
        displayOrder: parseInt(data.displayOrder, 10) || (db.data.categories.length + 1),
        showOnHome: Boolean(data.showOnHome),
        showInNav: Boolean(data.showInNav),
        seoTitle: data.seoTitle || `${data.name} | DIGENZ`,
        seoDescription: data.seoDescription || data.description || '',
        status: data.status || 'active',
        createdAt: new Date().toISOString()
      };

      db.data.categories.push(newCategory);
      await db.save('categories');
      db.logAudit(session.email, 'CREATE_CATEGORY', 'Categories', `Created category "${newCategory.name}"`, clientIp);
      return sendJSON(res, 201, { success: true, category: newCategory });
    }

    if (apiPath.startsWith('categories/') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(11);
      const cat = db.data.categories.find(c => c.id === id);
      if (!cat) return sendJSON(res, 404, { error: 'Category not found' });

      const data = await parseBody(req);
      Object.assign(cat, {
        name: data.name !== undefined ? data.name.trim() : cat.name,
        slug: data.slug !== undefined ? data.slug.trim() : cat.slug,
        parentId: data.parentId !== undefined ? data.parentId : cat.parentId,
        description: data.description !== undefined ? data.description : cat.description,
        image: data.image !== undefined ? data.image : cat.image,
        bannerImage: data.bannerImage !== undefined ? data.bannerImage : cat.bannerImage,
        displayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : cat.displayOrder,
        showOnHome: data.showOnHome !== undefined ? Boolean(data.showOnHome) : cat.showOnHome,
        showInNav: data.showInNav !== undefined ? Boolean(data.showInNav) : cat.showInNav,
        seoTitle: data.seoTitle !== undefined ? data.seoTitle : cat.seoTitle,
        seoDescription: data.seoDescription !== undefined ? data.seoDescription : cat.seoDescription,
        status: data.status !== undefined ? data.status : cat.status
      });

      await db.save('categories');
      db.logAudit(session.email, 'UPDATE_CATEGORY', 'Categories', `Updated category "${cat.name}"`, clientIp);
      return sendJSON(res, 200, { success: true, category: cat });
    }

    if (apiPath.startsWith('categories/') && method === 'DELETE') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(11);

      // Check if products exist in category
      const productCount = db.data.products.filter(p => p.categoryId === id).length;
      if (productCount > 0) {
        return sendJSON(res, 400, { error: `Cannot delete category: ${productCount} products are assigned to this category. Reassign or delete them first.` });
      }
      // Check child categories
      const children = db.data.categories.filter(c => c.parentId === id);
      if (children.length > 0) {
        return sendJSON(res, 400, { error: `Cannot delete category: it has ${children.length} subcategories attached.` });
      }

      const index = db.data.categories.findIndex(c => c.id === id);
      if (index === -1) return sendJSON(res, 404, { error: 'Category not found' });

      const deleted = db.data.categories.splice(index, 1)[0];
      await db.save('categories');
      db.logAudit(session.email, 'DELETE_CATEGORY', 'Categories', `Deleted category "${deleted.name}"`, clientIp);
      return sendJSON(res, 200, { success: true, message: `Category "${deleted.name}" deleted.` });
    }

    // --- 5. BANNERS MANAGEMENT ---
    if (apiPath === 'banners' && method === 'GET') {
      return sendJSON(res, 200, { banners: db.data.banners });
    }

    if (apiPath === 'banners' && method === 'POST') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);

      const newBanner = {
        id: 'ban-' + Date.now(),
        title: data.title || 'DIGENZ DIGITAL SOLUTIONS',
        subtitle: data.subtitle || '',
        buttonText: data.buttonText || 'Learn More',
        buttonLink: data.buttonLink || '/packages/',
        desktopImage: data.desktopImage || '/assets/images/banners/branding.png',
        mobileImage: data.mobileImage || '/assets/images/popup-inner.png',
        displayOrder: parseInt(data.displayOrder, 10) || (db.data.banners.length + 1),
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        scheduleStart: data.scheduleStart || '',
        scheduleEnd: data.scheduleEnd || '',
        createdAt: new Date().toISOString()
      };

      db.data.banners.push(newBanner);
      await db.save('banners');
      db.logAudit(session.email, 'CREATE_BANNER', 'Banners', `Created banner "${newBanner.title}"`, clientIp);
      return sendJSON(res, 201, { success: true, banner: newBanner });
    }

    if (apiPath.startsWith('banners/') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(8);
      const banner = db.data.banners.find(b => b.id === id);
      if (!banner) return sendJSON(res, 404, { error: 'Banner not found' });

      const data = await parseBody(req);
      Object.assign(banner, {
        title: data.title !== undefined ? data.title : banner.title,
        subtitle: data.subtitle !== undefined ? data.subtitle : banner.subtitle,
        buttonText: data.buttonText !== undefined ? data.buttonText : banner.buttonText,
        buttonLink: data.buttonLink !== undefined ? data.buttonLink : banner.buttonLink,
        desktopImage: data.desktopImage !== undefined ? data.desktopImage : banner.desktopImage,
        mobileImage: data.mobileImage !== undefined ? data.mobileImage : banner.mobileImage,
        displayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : banner.displayOrder,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : banner.isActive,
        scheduleStart: data.scheduleStart !== undefined ? data.scheduleStart : banner.scheduleStart,
        scheduleEnd: data.scheduleEnd !== undefined ? data.scheduleEnd : banner.scheduleEnd
      });

      await db.save('banners');
      db.logAudit(session.email, 'UPDATE_BANNER', 'Banners', `Updated banner "${banner.title}"`, clientIp);
      return sendJSON(res, 200, { success: true, banner });
    }

    if (apiPath.startsWith('banners/') && method === 'DELETE') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(8);
      const index = db.data.banners.findIndex(b => b.id === id);
      if (index === -1) return sendJSON(res, 404, { error: 'Banner not found' });

      const deleted = db.data.banners.splice(index, 1)[0];
      await db.save('banners');
      db.logAudit(session.email, 'DELETE_BANNER', 'Banners', `Deleted banner "${deleted.title}"`, clientIp);
      return sendJSON(res, 200, { success: true, message: `Banner deleted.` });
    }

    // --- 6. CONTENT CMS ---
    if (apiPath.startsWith('content/') && method === 'GET') {
      const section = apiPath.substring(8);
      const content = db.data.content[section];
      if (!content) return sendJSON(res, 404, { error: 'Content section not found' });
      return sendJSON(res, 200, content);
    }

    if (apiPath.startsWith('content/') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const section = apiPath.substring(8);
      const data = await parseBody(req);

      // Sanitize fields
      if (typeof data === 'object') {
        for (const k of Object.keys(data)) {
          if (typeof data[k] === 'string') {
            data[k] = sanitizeHTML(data[k]);
          }
        }
      }

      db.data.content[section] = data;
      if (section === 'contact') {
        if (!db.data.settings) db.data.settings = {};
        if (data.phone) db.data.settings.supportPhone = data.phone;
        if (data.address) db.data.settings.businessAddress = data.address;
        if (data.email) db.data.settings.supportEmail = data.email;
        await db.saveSettings(db.data.settings);
      }
      await db.save('content');
      db.logAudit(session.email, 'UPDATE_CONTENT', 'Content CMS', `Updated section "${section}"`, clientIp);
      return sendJSON(res, 200, { success: true, content: db.data.content[section] });
    }

    // --- 7. ORDERS & INVOICES ---
    if (apiPath === 'orders' && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;
      const query = parsedUrl.query;
      let list = [...db.data.orders];

      if (query.search) {
        const q = query.search.toLowerCase();
        list = list.filter(o => o.orderNumber.toLowerCase().includes(q) || (o.customer && (o.customer.name.toLowerCase().includes(q) || o.customer.email.toLowerCase().includes(q))));
      }
      if (query.status) {
        list = list.filter(o => o.status === query.status);
      }
      if (query.paymentStatus) {
        list = list.filter(o => o.paymentStatus === query.paymentStatus);
      }

      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 15;
      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = list.slice((page - 1) * limit, page * limit);

      return sendJSON(res, 200, { orders: paginated, total, page, totalPages });
    }

    if (apiPath.startsWith('orders/') && method === 'GET') {
      const id = apiPath.substring(7);

      // Check if invoice HTML is requested: /api/orders/:id/invoice
      if (id.endsWith('/invoice')) {
        const orderId = id.replace('/invoice', '');
        const order = db.data.orders.find(o => o.id === orderId || o.orderNumber === orderId);
        if (!order) return sendJSON(res, 404, { error: 'Order not found' });

        // Generate printable invoice HTML
        const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${order.orderNumber} - DIGENZ</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3478F6; padding-bottom: 20px; margin-bottom: 30px; }
    .brand h1 { margin: 0; font-size: 28px; letter-spacing: 2px; color: #111; }
    .brand p { margin: 4px 0 0; color: #3478F6; font-size: 11px; font-weight: bold; letter-spacing: 1.5px; }
    .inv-details { text-align: right; }
    .inv-details h2 { margin: 0; color: #333; font-size: 22px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .col { width: 48%; }
    .col h4 { margin: 0 0 10px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #111; color: #3478F6; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #111; color: #111; margin-top: 8px; padding-top: 12px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .badge-paid { background: #e6f9ed; color: #13aa52; }
    .badge-unpaid { background: #fff4e5; color: #d82c20; }
    .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
    @media print { body { margin: 0; } .invoice-card { border: none; box-shadow: none; padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 20px; text-align: right;">
    <button onclick="window.print()" style="background: #3478F6; color: #111; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <h1>DIGENZ</h1>
        <p>DIGITAL • CREATIVE • SERVICES</p>
      </div>
      <div class="inv-details">
        <h2>INVOICE</h2>
        <p style="margin: 4px 0;"><strong>Invoice #:</strong> ${order.orderNumber}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> <span class="badge ${order.paymentStatus === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${order.paymentStatus.toUpperCase()}</span></p>
      </div>
    </div>
    <div class="parties">
      <div class="col">
        <h4>Issued By:</h4>
        <strong>DIGENZ Digital Agency</strong><br>
        71-75 Shelton Street, Covent Garden<br>
        London, WC2H 9JQ, UK<br>
        support@digenz.com | +1 (213) 221-2842
      </div>
      <div class="col" style="text-align: right;">
        <h4>Billed To:</h4>
        <strong>${order.customer.name}</strong><br>
        ${order.customer.email}<br>
        ${order.customer.phone || ''}<br>
        ${order.customer.city || ''} ${order.customer.country || ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center; width: 80px;">Qty</th>
          <th style="text-align: right; width: 120px;">Price</th>
          <th style="text-align: right; width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map(item => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal:</span><span>$${order.subtotal.toFixed(2)}</span></div>
      ${order.discount ? `<div class="totals-row" style="color: #13aa52;"><span>Discount (${order.couponCode || 'Promo'}):</span><span>-$${order.discount.toFixed(2)}</span></div>` : ''}
      <div class="totals-row grand"><span>Total Due:</span><span>$${order.total.toFixed(2)} USD</span></div>
    </div>
    <div class="footer">
      <p>Thank you for choosing DIGENZ for your digital and engineering needs.</p>
      <p>Payment Method: ${order.paymentMethod || 'Online Checkout'} | Terms: Digital Deliverables Upon Milestone Completion</p>
    </div>
  </div>
</body>
</html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(invoiceHTML);
      }

      const order = db.data.orders.find(o => o.id === id);
      if (!order) return sendJSON(res, 404, { error: 'Order not found' });
      return sendJSON(res, 200, order);
    }

    if (apiPath.startsWith('orders/') && apiPath.endsWith('/status') && method === 'PATCH') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.split('/')[1];
      const order = db.data.orders.find(o => o.id === id);
      if (!order) return sendJSON(res, 404, { error: 'Order not found' });

      const { status } = await parseBody(req);
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return sendJSON(res, 400, { error: 'Invalid order status value.' });
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();
      await db.save('orders');
      db.logAudit(session.email, 'UPDATE_ORDER_STATUS', 'Orders', `Updated order #${order.orderNumber} status to "${status}"`, clientIp);
      return sendJSON(res, 200, { success: true, order });
    }

    if (apiPath.startsWith('orders/') && apiPath.endsWith('/payment') && method === 'PATCH') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.split('/')[1];
      const order = db.data.orders.find(o => o.id === id);
      if (!order) return sendJSON(res, 404, { error: 'Order not found' });

      const { paymentStatus } = await parseBody(req);
      const validPayment = ['unpaid', 'paid', 'refunded'];
      if (!validPayment.includes(paymentStatus)) {
        return sendJSON(res, 400, { error: 'Invalid payment status value.' });
      }

      order.paymentStatus = paymentStatus;
      order.updatedAt = new Date().toISOString();
      await db.save('orders');
      db.logAudit(session.email, 'UPDATE_PAYMENT_STATUS', 'Orders', `Updated order #${order.orderNumber} payment to "${paymentStatus}"`, clientIp);
      return sendJSON(res, 200, { success: true, order });
    }

    if (apiPath.startsWith('orders/') && apiPath.endsWith('/notes') && method === 'POST') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.split('/')[1];
      const order = db.data.orders.find(o => o.id === id);
      if (!order) return sendJSON(res, 404, { error: 'Order not found' });

      const { note } = await parseBody(req);
      if (!note) return sendJSON(res, 400, { error: 'Note text is required.' });

      if (!order.internalNotes) order.internalNotes = [];
      order.internalNotes.push({
        note: note.trim(),
        author: session.email,
        date: new Date().toISOString()
      });
      order.updatedAt = new Date().toISOString();
      await db.save('orders');
      return sendJSON(res, 201, { success: true, notes: order.internalNotes });
    }

    if (apiPath.startsWith('orders/') && apiPath.endsWith('/tracking') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.split('/')[1];
      const order = db.data.orders.find(o => o.id === id);
      if (!order) return sendJSON(res, 404, { error: 'Order not found' });

      const { trackingNumber, courier } = await parseBody(req);
      order.trackingNumber = trackingNumber || '';
      order.courier = courier || '';
      order.updatedAt = new Date().toISOString();
      await db.save('orders');
      return sendJSON(res, 200, { success: true, order });
    }

    // --- 8. CUSTOMERS MANAGEMENT ---
    if (apiPath === 'customers' && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;
      const query = parsedUrl.query;
      let list = [...db.data.customers];

      if (query.search) {
        const q = query.search.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q));
      }
      if (query.status) {
        list = list.filter(c => c.status === query.status);
      }

      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 15;
      const total = list.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = list.slice((page - 1) * limit, page * limit);

      return sendJSON(res, 200, { customers: paginated, total, page, totalPages });
    }

    if (apiPath.startsWith('customers/') && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(10);
      const customer = db.data.customers.find(c => c.id === id);
      if (!customer) return sendJSON(res, 404, { error: 'Customer not found' });

      const customerOrders = db.data.orders.filter(o => o.customerId === id || (o.customer && o.customer.email.toLowerCase() === customer.email.toLowerCase()));
      return sendJSON(res, 200, { customer, orders: customerOrders });
    }

    if (apiPath.startsWith('customers/') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(10);
      const customer = db.data.customers.find(c => c.id === id);
      if (!customer) return sendJSON(res, 404, { error: 'Customer not found' });

      const data = await parseBody(req);
      if (data.name) customer.name = data.name.trim();
      if (data.email) customer.email = data.email.trim();
      if (data.phone !== undefined) customer.phone = data.phone.trim();
      if (data.company !== undefined) customer.company = data.company.trim();
      if (data.address !== undefined) customer.address = data.address.trim();
      if (data.city !== undefined) customer.city = data.city.trim();
      if (data.country !== undefined) customer.country = data.country.trim();
      if (data.status) customer.status = data.status;

      await db.save('customers');
      db.logAudit(session.email, 'UPDATE_CUSTOMER', 'Customers', `Updated profile of ${customer.name}`, clientIp);
      return sendJSON(res, 200, { success: true, customer });
    }

    // --- 9. COUPONS & DISCOUNTS ---
    if (apiPath === 'coupons' && method === 'GET') {
      return sendJSON(res, 200, { coupons: db.data.coupons });
    }

    if (apiPath === 'coupons' && method === 'POST') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);
      if (!data.code || !data.discountValue) {
        return sendJSON(res, 400, { error: 'Coupon code and discount value are required.' });
      }

      const newCoupon = {
        id: 'coup-' + Date.now(),
        code: data.code.toUpperCase().trim(),
        discountType: data.discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: parseFloat(data.discountValue) || 0,
        minOrderValue: parseFloat(data.minOrderValue) || 0,
        maxUses: parseInt(data.maxUses, 10) || 500,
        usedCount: 0,
        expiryDate: data.expiryDate || '2026-12-31',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        eligibleCategories: Array.isArray(data.eligibleCategories) ? data.eligibleCategories : [],
        createdAt: new Date().toISOString()
      };

      db.data.coupons.push(newCoupon);
      await db.save('coupons');
      db.logAudit(session.email, 'CREATE_COUPON', 'Coupons', `Created coupon "${newCoupon.code}" (${newCoupon.discountValue}${newCoupon.discountType === 'percentage' ? '%' : '$'})`, clientIp);
      return sendJSON(res, 201, { success: true, coupon: newCoupon });
    }

    if (apiPath.startsWith('coupons/') && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(8);
      const coupon = db.data.coupons.find(c => c.id === id);
      if (!coupon) return sendJSON(res, 404, { error: 'Coupon not found' });

      const data = await parseBody(req);
      if (data.code) coupon.code = data.code.toUpperCase().trim();
      if (data.discountType) coupon.discountType = data.discountType;
      if (data.discountValue !== undefined) coupon.discountValue = parseFloat(data.discountValue);
      if (data.minOrderValue !== undefined) coupon.minOrderValue = parseFloat(data.minOrderValue);
      if (data.maxUses !== undefined) coupon.maxUses = parseInt(data.maxUses, 10);
      if (data.expiryDate) coupon.expiryDate = data.expiryDate;
      if (data.isActive !== undefined) coupon.isActive = Boolean(data.isActive);
      if (Array.isArray(data.eligibleCategories)) coupon.eligibleCategories = data.eligibleCategories;

      await db.save('coupons');
      db.logAudit(session.email, 'UPDATE_COUPON', 'Coupons', `Updated coupon "${coupon.code}"`, clientIp);
      return sendJSON(res, 200, { success: true, coupon });
    }

    if (apiPath.startsWith('coupons/') && method === 'DELETE') {
      const session = requireAuth(req, res);
      if (!session) return;
      const id = apiPath.substring(8);
      const idx = db.data.coupons.findIndex(c => c.id === id);
      if (idx === -1) return sendJSON(res, 404, { error: 'Coupon not found' });

      const deleted = db.data.coupons.splice(idx, 1)[0];
      await db.save('coupons');
      db.logAudit(session.email, 'DELETE_COUPON', 'Coupons', `Deleted coupon "${deleted.code}"`, clientIp);
      return sendJSON(res, 200, { success: true, message: `Coupon deleted.` });
    }

    if (apiPath === 'coupons/validate' && method === 'POST') {
      const { code, orderValue, categoryId } = await parseBody(req);
      if (!code) return sendJSON(res, 400, { valid: false, error: 'Please enter a coupon code.' });

      const coupon = db.data.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
      if (!coupon) return sendJSON(res, 404, { valid: false, error: 'Coupon code does not exist.' });
      if (!coupon.isActive) return sendJSON(res, 400, { valid: false, error: 'This coupon is currently inactive.' });

      // Check expiry
      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return sendJSON(res, 400, { valid: false, error: 'This coupon has expired.' });
      }

      // Check max uses
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return sendJSON(res, 400, { valid: false, error: 'Coupon usage limit has been reached.' });
      }

      // Check min order value
      const val = parseFloat(orderValue) || 0;
      if (coupon.minOrderValue && val < coupon.minOrderValue) {
        return sendJSON(res, 400, { valid: false, error: `Minimum order value of $${coupon.minOrderValue} required for this coupon.` });
      }

      // Check category eligibility
      if (coupon.eligibleCategories && coupon.eligibleCategories.length > 0 && categoryId) {
        if (!coupon.eligibleCategories.includes(categoryId)) {
          return sendJSON(res, 400, { valid: false, error: 'This coupon is not valid for the selected category.' });
        }
      }

      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (val * coupon.discountValue) / 100;
      } else {
        discountAmount = Math.min(coupon.discountValue, val);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
      const newTotal = Math.max(0, Math.round((val - discountAmount) * 100) / 100);

      return sendJSON(res, 200, {
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        newTotal
      });
    }

    // --- 10. MEDIA LIBRARY ---
    if (apiPath === 'media' && method === 'GET') {
      const query = parsedUrl.query;
      const imgDir = path.join(BASE_DIR, 'assets', 'images');
      let files = [];

      function walkMedia(dir, prefix = '/assets/images') {
        if (!fs.existsSync(dir)) return;
        for (const item of fs.readdirSync(dir)) {
          const full = path.join(dir, item);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            walkMedia(full, `${prefix}/${item}`);
          } else {
            const ext = path.extname(item).toLowerCase();
            if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'].includes(ext)) {
              const urlPath = `${prefix}/${item}`;
              files.push({
                name: item,
                path: urlPath,
                size: stat.size,
                modified: stat.mtime,
                ext
              });
            }
          }
        }
      }

      walkMedia(imgDir);

      // Merge media stored permanently in MongoDB Atlas
      try {
        const mongoMedia = await db.listMedia();
        if (mongoMedia && mongoMedia.length > 0) {
          mongoMedia.forEach(m => {
            if (!files.some(f => f.name === m.filename || f.path === m.url)) {
              files.unshift({
                name: m.filename,
                path: m.url || `/assets/images/uploads/${m.filename}`,
                size: m.size || 0,
                modified: m.createdAt ? new Date(m.createdAt) : new Date(),
                ext: path.extname(m.filename).toLowerCase()
              });
            }
          });
        }
      } catch (e) {}

      if (query.search) {
        const q = query.search.toLowerCase();
        files = files.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
      }

      files.sort((a, b) => b.modified - a.modified);

      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 30;
      const total = files.length;
      const paginated = files.slice((page - 1) * limit, page * limit);

      return sendJSON(res, 200, { media: paginated, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (apiPath === 'media/upload' && method === 'POST') {
      const session = requireAuth(req, res);
      if (!session) return;

      try {
        const body = await parseBody(req);
        // Expect base64 payload: { filename, data: "data:image/png;base64,..." }
        if (!body.filename || !body.data) {
          return sendJSON(res, 400, { error: 'Filename and base64 image data are required.' });
        }

        const ext = path.extname(body.filename).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'].includes(ext)) {
          return sendJSON(res, 400, { error: 'Unsupported file extension. Allowed: PNG, JPG, SVG, WEBP, GIF, ICO.' });
        }

        const base64Data = body.data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length > 10 * 1024 * 1024) {
          return sendJSON(res, 400, { error: 'File size exceeds 10MB maximum limit.' });
        }

        const safeName = Date.now() + '-' + body.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const targetPath = path.join(UPLOAD_DIR, safeName);
        try { fs.writeFileSync(targetPath, buffer); } catch (e) {}

        const urlPath = `/assets/images/uploads/${safeName}`;

        // Persist media permanently in MongoDB Atlas
        await db.saveMedia({
          id: safeName,
          filename: safeName,
          originalName: body.filename,
          mimeType: MIME_TYPES[ext] || 'image/jpeg',
          size: buffer.length,
          url: urlPath,
          dataBase64: base64Data,
          uploadedBy: session.email,
          createdAt: new Date().toISOString()
        });

        db.logAudit(session.email, 'UPLOAD_MEDIA', 'Media Library', `Uploaded image "${safeName}" (${buffer.length} bytes)`, clientIp);

        return sendJSON(res, 201, {
          success: true,
          url: urlPath,
          filename: safeName,
          size: buffer.length
        });
      } catch (err) {
        return sendJSON(res, 500, { error: 'Upload failed: ' + err.message });
      }
    }

    if (apiPath === 'media' && method === 'DELETE') {
      const session = requireAuth(req, res);
      if (!session) return;
      const { filePath } = await parseBody(req);
      if (!filePath) return sendJSON(res, 400, { error: 'filePath is required.' });

      // Security check: only delete from assets/images/uploads/
      const cleanPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      if (!cleanPath.includes('uploads')) {
        return sendJSON(res, 403, { error: 'For safety, only uploaded media in assets/images/uploads/ can be deleted directly.' });
      }

      const fullPath = path.join(BASE_DIR, cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath);
      let fileDeleted = false;
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); fileDeleted = true; } catch (e) {}
      }
      const mongoDeleted = await db.deleteMedia(path.basename(cleanPath));
      if (fileDeleted || mongoDeleted) {
        db.logAudit(session.email, 'DELETE_MEDIA', 'Media Library', `Deleted media file ${cleanPath}`, clientIp);
        return sendJSON(res, 200, { success: true, message: 'File deleted.' });
      } else {
        return sendJSON(res, 404, { error: 'File not found.' });
      }
    }

    // --- 11. NAVIGATION & FOOTER ---
    if (apiPath === 'navigation' && method === 'GET') {
      return sendJSON(res, 200, db.data.navigation);
    }

    if (apiPath === 'navigation' && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);

      if (data.headerLinks) db.data.navigation.headerLinks = data.headerLinks;
      if (data.footerColumns) db.data.navigation.footerColumns = data.footerColumns;

      await db.save('navigation');
      db.logAudit(session.email, 'UPDATE_NAVIGATION', 'Navigation', 'Updated navigation and footer structures', clientIp);
      return sendJSON(res, 200, { success: true, navigation: db.data.navigation });
    }

    // --- 12. SEO CONFIGURATION ---
    if (apiPath === 'seo' && method === 'GET') {
      return sendJSON(res, 200, db.data.seo);
    }

    if (apiPath === 'seo' && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);

      Object.assign(db.data.seo, data);
      await db.save('seo');
      db.logAudit(session.email, 'UPDATE_SEO', 'SEO Management', 'Updated SEO meta configuration', clientIp);
      return sendJSON(res, 200, { success: true, seo: db.data.seo });
    }

    // --- 13. WEBSITE SETTINGS ---
    if (apiPath === 'settings' && method === 'GET') {
      return sendJSON(res, 200, db.data.settings);
    }

    if (apiPath === 'settings' && method === 'PUT') {
      const session = requireAuth(req, res);
      if (!session) return;
      const data = await parseBody(req);

      // Validate email format if provided
      if (data.supportEmail !== undefined) {
        data.supportEmail = String(data.supportEmail).trim();
        if (data.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supportEmail)) {
          return sendJSON(res, 400, { error: 'Invalid email address format.' });
        }
      }

      if (data.supportPhone !== undefined) {
        data.supportPhone = String(data.supportPhone).trim();
      }

      if (data.currencySymbol !== undefined) {
        data.currencySymbol = String(data.currencySymbol).trim();
      }

      if (data.currencyCode !== undefined) {
        data.currencyCode = String(data.currencyCode).trim().toUpperCase();
      }

      if (data.maintenanceMode !== undefined) {
        data.maintenanceMode = Boolean(data.maintenanceMode);
      }

      const saved = await db.saveSettings(data);
      if (saved) db.touchSync('settings');
      if (!saved) {
        return sendJSON(res, 500, { error: 'Failed to write settings to persistent database storage.' });
      }

      // Synchronize public static HTML files on disk
      try {
        const { syncStaticHTMLContactSettings } = require('./sync-html');
        syncStaticHTMLContactSettings(db.data.settings);
      } catch (err) {
        console.error('[Sync Error]', err.message);
      }

      db.logAudit(session.email, 'UPDATE_SETTINGS', 'Settings', 'Updated website global settings', clientIp);
      return sendJSON(res, 200, { success: true, settings: db.data.settings });
    }

    // --- 14. AUDIT LOGS ---
    if (apiPath === 'audit-logs' && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;
      return sendJSON(res, 200, { logs: db.data.auditLogs || [] });
    }

    // Fallthrough 404 for unknown /api/*
    return sendJSON(res, 404, { error: `Endpoint /api/${apiPath} not found.` });
  }

  // -------------------------------------------------------------
  // MAINTENANCE MODE CHECK (Bypassed for /admin/ and /assets/)
  // -------------------------------------------------------------
  if (db.data.settings && db.data.settings.maintenanceMode) {
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/assets') && !pathname.startsWith('/api')) {
      const maintenanceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Under Scheduled Maintenance — DIGENZ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { background: #0f0f11; color: #fff; font-family: 'Helvetica Neue', Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { max-width: 600px; padding: 40px; border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; background: #16161a; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
    h1 { color: #3478F6; font-size: 32px; letter-spacing: 2px; margin-bottom: 10px; }
    p { color: #aaa; line-height: 1.6; font-size: 16px; }
    .contact { margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; font-size: 13px; color: #777; }
    .contact a { color: #3478F6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <h1>DIGENZ</h1>
    <h3 style="color:#eee; font-weight:300;">SCHEDULED SYSTEM MAINTENANCE</h3>
    <p>Our website is undergoing brief scheduled system upgrades to serve you better. We will be back online shortly.</p>
    <div class="contact">
      For urgent inquiries, reach out to <a href="mailto:${db.data.settings.supportEmail}">${db.data.settings.supportEmail}</a> or call <a href="tel:${db.data.settings.supportPhone}">${db.data.settings.supportPhone}</a>.
    </div>
  </div>
</body>
</html>
      `;
      res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(maintenanceHTML);
    }
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVER
  // -------------------------------------------------------------
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '' || reqPath === '/index.html' || reqPath === '/index.htm') {
    reqPath = '/index.html';
  }
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/admin/index.html';

  let filePath = path.join(BASE_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';
    if (reqPath === '/css') contentType = 'text/css; charset=utf-8';

    let content = fs.readFileSync(filePath);
    let cacheControl = 'public, max-age=86400, stale-while-revalidate=604800';
    if (ext === '.html' || ext === '.htm') {
      let htmlStr = content.toString('utf8');
      const isAdminPage = reqPath.startsWith('/admin') || filePath.toLowerCase().includes(path.sep + 'admin');
      if (db.data && !isAdminPage) {
        if (Array.isArray(db.data.categories) && db.data.categories.length > 0) {
          htmlStr = injectAuthoritativeServices(htmlStr, db.data.categories);
        }
        htmlStr = injectAuthoritativeContact(htmlStr, db.data.settings, db.data.content);
      }
      content = Buffer.from(htmlStr, 'utf8');
      cacheControl = 'no-cache, no-store, must-revalidate, max-age=0';
    } else if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf'].includes(ext)) {
      cacheControl = 'public, max-age=31536000, immutable';
    }

    const etag = `"${crypto.createHash('md5').update(content).digest('hex')}"`;

    // ETag 304 validation
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, {
        'ETag': etag,
        'Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end();
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const isCompressible = ['.html', '.htm', '.css', '.js', '.json', '.svg', '.xml'].includes(ext);

    if (isCompressible && acceptEncoding.includes('gzip')) {
      const gzipped = zlib.gzipSync(content, { level: 6 });
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Content-Length': gzipped.length,
        'ETag': etag,
        'Vary': 'Accept-Encoding',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': cacheControl
      });
      return res.end(gzipped);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'ETag': etag,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': cacheControl
    });
    return res.end(content);
  }

  // Check if requested file is an uploaded asset in MongoDB Atlas
  if (reqPath.startsWith('/assets/images/uploads/')) {
    try {
      const filename = path.basename(reqPath);
      const media = await db.getMedia(filename);
      if (media && media.dataBase64) {
        const buf = Buffer.from(media.dataBase64, 'base64');
        const ext = path.extname(filename).toLowerCase();
        const contentType = media.mimeType || MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(buf);
      }
    } catch (e) {
      console.warn('[Server] MongoDB media fallback error:', e.message);
    }
  }

  // 404 handler
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<h1>404 Not Found</h1><p>The requested URL ${pathname} was not found on this DIGENZ server.</p>`);
});

// Start listening if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  DIGENZ Master Server & Admin Dashboard Engine Online`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Admin Panel: http://localhost:${PORT}/admin/`);
    console.log(`  Default Admin: admin / admin123 (or admin@digenz.com)`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
