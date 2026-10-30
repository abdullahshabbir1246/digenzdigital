const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
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
function sendJSON(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  });
  res.end(json);
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
      db.save();
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
    const apiPath = pathname.substring(5); // strip '/api/'

    // --- 1. AUTHENTICATION ---
    if (apiPath === 'auth/login' && method === 'POST') {
      try {
        const { email, password } = await parseBody(req);
        if (!email || !password) {
          return sendJSON(res, 400, { error: 'Email and password are required.' });
        }
        const admin = db.data.admins.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
        if (!admin || !verifyPassword(password, admin.passwordHash, admin.salt)) {
          db.logAudit(email, 'LOGIN_FAILED', 'Auth', 'Failed login attempt with invalid credentials', clientIp);
          return sendJSON(res, 401, { error: 'Invalid admin credentials.' });
        }

        admin.lastLogin = new Date().toISOString();
        const session = db.createSession(admin);
        db.save();
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

    if (apiPath === 'auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/, '') || req.headers['x-admin-token'];
      if (token) db.destroySession(token);
      return sendJSON(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (apiPath === 'auth/me' && method === 'GET') {
      const session = requireAuth(req, res);
      if (!session) return;
      const admin = db.data.admins.find(a => a.id === session.adminId);
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

      db.save();
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
      db.save();
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

      db.save();
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
      db.save();
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
      db.save();
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

      db.save();
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
      db.save();
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
      db.save();
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

      db.save();
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
      db.save();
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
      db.save();
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
      db.save();
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
      db.save();
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
      db.save();
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
      db.save();
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

      db.save();
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
      db.save();
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

      db.save();
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
      db.save();
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
        fs.writeFileSync(targetPath, buffer);

        const urlPath = `/assets/images/uploads/${safeName}`;
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
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        db.logAudit(session.email, 'DELETE_MEDIA', 'Media Library', `Deleted media file ${cleanPath}`, clientIp);
        return sendJSON(res, 200, { success: true, message: 'File deleted.' });
      } else {
        return sendJSON(res, 404, { error: 'File not found on disk.' });
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

      db.save();
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
      db.save();
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

      Object.assign(db.data.settings, data);
      db.save();
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

    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' || ext === '.htm' ? 'no-cache' : 'public, max-age=3600'
    });
    return res.end(content);
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
    console.log(`  Default Admin: admin@digenz.com / Admin@Digenz2026!`);
    console.log(`=======================================================`);
  });
}

module.exports = server;
