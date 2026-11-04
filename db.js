const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Password hashing helpers using native crypto PBKDF2
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const result = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return result === hash;
}

// Generate random tokens
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Initial seed data generator
function getInitialSeed() {
  const defaultAdmin = hashPassword('admin123');

  const categories = [
    {
      id: 'cat-logo',
      name: 'Logo Design',
      slug: 'logo-design',
      parentId: null,
      description: 'Custom corporate, 3D, and minimalist branding logos.',
      image: '/assets/images/bannericons/branding.png',
      bannerImage: '/assets/images/banners/branding.png',
      displayOrder: 1,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Custom Logo Design & Brand Monograms | DIGENZ',
      seoDescription: 'Professional corporate and digital monogram logo design services.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-webdesign',
      name: 'Web Design & Development',
      slug: 'custom-website-design',
      parentId: null,
      description: 'Modern, high-conversion responsive websites with modern architecture.',
      image: '/assets/images/bannericons/web-application-development.png',
      bannerImage: '/assets/images/banners/backend-development.png',
      displayOrder: 2,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Custom Web Design & Frontend Engineering | DIGENZ',
      seoDescription: 'High performance, SEO-ready web applications and portals.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-ecommerce',
      name: 'Ecommerce Solutions',
      slug: 'ecommerce-website-development',
      parentId: null,
      description: 'Scalable online stores built on Shopify, WooCommerce, and custom engines.',
      image: '/assets/images/bannericons/ecommerce-website-development.png',
      bannerImage: '/assets/images/banners/ecommerce.png',
      displayOrder: 3,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Ecommerce Web Development & Checkout Portals | DIGENZ',
      seoDescription: 'Complete ecommerce stores with payment gateways and order management.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-branding',
      name: 'Corporate Branding',
      slug: 'branding',
      parentId: null,
      description: 'Brand identity packages, style guides, stationery, and marketing collateral.',
      image: '/assets/images/bannericons/branding.png',
      bannerImage: '/assets/images/banners/branding.png',
      displayOrder: 4,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Corporate Identity & Brand Strategy | DIGENZ',
      seoDescription: 'Holistic brand strategy, typography guidelines, and design collateral.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-animation',
      name: 'Video Animation',
      slug: 'video-animation',
      parentId: null,
      description: '2D/3D explainer videos, promo animations, and motion graphic teasers.',
      image: '/assets/images/bannericons/animation.png',
      bannerImage: '/assets/images/banners/animation.png',
      displayOrder: 5,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Motion Graphics & 2D/3D Explainer Video Animation | DIGENZ',
      seoDescription: 'Dynamic animated video commercials and product walkthroughs.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-seo',
      name: 'Search Engine Optimization',
      slug: 'seo',
      parentId: null,
      description: 'Data-driven on-page, off-page, technical SEO and high-intent keyword ranking.',
      image: '/assets/images/bannericons/seo.png',
      bannerImage: '/assets/images/banners/seo.png',
      displayOrder: 6,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Organic SEO & Technical Growth Optimization | DIGENZ',
      seoDescription: 'Proven search ranking optimization to maximize organic conversions.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-mobile',
      name: 'Mobile App Development',
      slug: 'mobile-application',
      parentId: null,
      description: 'Native iOS, Android, and cross-platform Flutter/React Native mobile applications.',
      image: '/assets/images/bannericons/mobile-development.png',
      bannerImage: '/assets/images/banners/technology-banner.png',
      displayOrder: 7,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'Mobile App Development for iOS & Android | DIGENZ',
      seoDescription: 'High performance mobile apps tailored to modern enterprise workflows.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'cat-combo',
      name: 'Combo & Full-Stack Packages',
      slug: 'combo-packages',
      parentId: null,
      description: 'All-in-one digital agency packages covering branding, web, mobile, and marketing.',
      image: '/assets/images/digenz-icon.svg',
      bannerImage: '/assets/images/banners/packages-banner.png',
      displayOrder: 8,
      showOnHome: true,
      showInNav: true,
      seoTitle: 'All-in-One Digital Agency Combo Packages | DIGENZ',
      seoDescription: 'Complete full-suite digital solutions for startups and enterprises.',
      status: 'active',
      createdAt: '2026-01-15T00:00:00.000Z'
    }
  ];

  const content = {
    about: {
      heroHeading: 'Innovating Through Digital Mastery',
      heroSubheading: 'We engineer bespoke websites, software architectures, and creative brand identities for global leaders.',
      story: 'DIGENZ was founded on a simple premise: delivering uncompromising digital excellence with rapid turnarounds and dedicated engineering expertise. We partner with fast-growing startups and established corporations to deliver measurable growth.',
      mission: 'To empower brands worldwide through digital innovation, creative artistry, and cutting-edge web technology.',
      vision: 'Becoming the world’s most trusted full-service digital and freelancing agency.'
    },
    contact: {
      email: 'support@digenz.com',
      salesEmail: 'support@digenz.com',
      phone: '03190039048',
      alternatePhone: '03190039048',
      address: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ',
      businessHours: 'Mon - Fri: 9:00 AM - 6:00 PM EST | 24/7 Priority Emergency Support',
      liveChatStatus: 'online'
    },
    footer: {
      tagline: 'DIGENZ is an elite digital creative agency delivering premier web development, corporate branding, mobile applications, and strategic search optimization.',
      copyright: 'Copyright © 2026 DIGENZ. All Rights Reserved.',
      socialLinks: {
        facebook: 'https://facebook.com/digenz',
        twitter: 'https://twitter.com/digenz',
        linkedin: 'https://linkedin.com/company/digenz',
        instagram: 'https://instagram.com/digenz.agency',
        github: 'https://github.com/digenz'
      }
    }
  };

  const navigation = {
    headerLinks: [
      { id: 'nav-home', label: 'Home', url: '/', order: 1, isVisible: true },
      { id: 'nav-about', label: 'About Us', url: '/about/', order: 2, isVisible: true },
      {
        id: 'nav-services',
        label: 'Services',
        url: '/custom-website-design/',
        order: 3,
        isVisible: true,
        children: [
          { label: 'Custom Website Design', url: '/custom-website-design/' },
          { label: 'Web Application Development', url: '/web-application-development/' },
          { label: 'Ecommerce Development', url: '/ecommerce-website-development/' },
          { label: 'Corporate Branding', url: '/branding/' },
          { label: 'Video Animation', url: '/video-animation/' },
          { label: 'SEO Optimization', url: '/seo/' },
          { label: 'Mobile Application', url: '/mobile-application/' }
        ]
      },
      { id: 'nav-packages', label: 'Packages', url: '/packages/', order: 4, isVisible: true },
      { id: 'nav-portfolio', label: 'Portfolio', url: '/portfolio/', order: 5, isVisible: true },
      { id: 'nav-quote', label: 'Get a Quote', url: '/get-a-quote/', order: 6, isVisible: true },
      { id: 'nav-contact', label: 'Contact Us', url: '/contact-us/', order: 7, isVisible: true }
    ],
    footerColumns: [
      {
        id: 'col-services',
        title: 'Core Services',
        links: [
          { label: 'Website Design', url: '/custom-website-design/' },
          { label: 'Web Applications', url: '/web-application-development/' },
          { label: 'Ecommerce Stores', url: '/ecommerce-website-development/' },
          { label: 'Branding & Monograms', url: '/branding/' },
          { label: 'Video Animation', url: '/video-animation/' },
          { label: 'SEO Marketing', url: '/seo/' }
        ]
      },
      {
        id: 'col-company',
        title: 'Company',
        links: [
          { label: 'About DIGENZ', url: '/about/' },
          { label: 'Packages & Pricing', url: '/packages/' },
          { label: 'Client Portfolio', url: '/portfolio/' },
          { label: 'Contact Us', url: '/contact-us/' },
          { label: 'Get a Quote', url: '/get-a-quote/' }
        ]
      },
      {
        id: 'col-legal',
        title: 'Legal & Policy',
        links: [
          { label: 'Privacy Policy', url: '/privacy-policy/' },
          { label: 'Terms & Conditions', url: '/terms-conditions/' },
          { label: 'Refund Policy', url: '/refund.html' }
        ]
      }
    ]
  };

  const seo = {
    homeTitle: 'DIGENZ — Digital • Creative • Services | Web Development & Branding Agency',
    homeDescription: 'DIGENZ is a premier freelancing and digital agency specializing in custom web design, software development, corporate branding, and creative solutions.',
    ogTitle: 'DIGENZ — Digital • Creative • Services',
    ogDescription: 'Top-tier web engineering, corporate identity design, and digital marketing services for forward-thinking brands.',
    ogImage: '/assets/images/digenz-logo-dark.png',
    canonicalUrl: 'https://digenzdigital.vercel.app/',
    keywords: 'DIGENZ, web development, custom software, digital agency, corporate branding, logo design, ecommerce, SEO',
    sitemapEnabled: true
  };

  const settings = {
    siteName: 'DIGENZ',
    siteTagline: 'DIGITAL • CREATIVE • SERVICES',
    logoDark: '/assets/images/digenz-logo-dark.svg',
    logoLight: '/assets/images/digenz-logo-light.svg',
    favicon: '/favicon.svg',
    currencySymbol: '$',
    currencyCode: 'USD',
    taxRate: 0,
    announcementBar: {
      isEnabled: false,
      text: '',
      buttonText: '',
      buttonLink: ''
    },
    maintenanceMode: false,
    supportEmail: 'support@digenz.com',
    supportPhone: '03190039048',
    enablePublicQuotes: true
  };

  const auditLogs = [
    {
      id: 'log-1',
      adminEmail: 'system@digenz.com',
      action: 'SYSTEM_INIT',
      module: 'System',
      details: 'DIGENZ Database and Admin Engine initialized successfully.',
      ip: '127.0.0.1',
      timestamp: '2026-01-01T00:00:00.000Z'
    }
  ];

  return {
    admins: [
      {
        id: 'adm-001',
        username: 'admin',
        email: 'admin@digenz.com',
        passwordHash: defaultAdmin.hash,
        salt: defaultAdmin.salt,
        name: 'DIGENZ Master Admin',
        role: 'superadmin',
        lastLogin: '2026-10-28T15:30:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    categories,
    products: [],
    banners: [],
    coupons: [],
    customers: [],
    orders: [],
    content,
    navigation,
    seo,
    settings,
    auditLogs,
    syncState: {
      version: 1,
      lastUpdated: Date.now(),
      lastModule: 'init',
      modules: ['init']
    }
  };
}

// Resolve writable database file path (supports serverless read-only filesystems)
function resolveDbPath() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const testFile = path.join(DATA_DIR, '.write_test_' + Date.now());
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return DB_FILE;
  } catch (err) {
    const tmpDbPath = path.join(os.tmpdir(), 'digenz_db.json');
    if (fs.existsSync(DB_FILE)) {
      try {
        const shouldCopy = !fs.existsSync(tmpDbPath) || (fs.statSync(DB_FILE).mtimeMs > fs.statSync(tmpDbPath).mtimeMs);
        if (shouldCopy) {
          fs.copyFileSync(DB_FILE, tmpDbPath);
        }
      } catch (e) {}
    }
    return tmpDbPath;
  }
}

// Stateless Cryptographic HMAC-SHA256 Token Engine (Cross-Lambda Compatible)
const SESSION_SECRET = process.env.SESSION_SECRET || 'digenz-session-master-secret-production-2026';

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataB64, sig] = parts;
  if (!dataB64 || !sig) return null;

  try {
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    if (!payload || !payload.expiresAt || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

// =========================================================================
// MONGODB ATLAS SINGLETON CONNECTION POOL & AUTHORITATIVE PERSISTENCE
// =========================================================================
let cachedMongoClient = null;
let cachedMongoDb = null;
let indexesInitialized = false;

async function getMongoDatabase() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!mongoUri) return null;

  // Verify cached connection is responsive with ping
  if (cachedMongoDb && cachedMongoClient) {
    try {
      await cachedMongoDb.command({ ping: 1 });
      return cachedMongoDb;
    } catch (e) {
      console.warn('[DB] Existing MongoDB connection stale, reconnecting pool...');
      cachedMongoClient = null;
      cachedMongoDb = null;
    }
  }

  let MongoClient;
  try {
    MongoClient = require('mongodb').MongoClient;
  } catch (e) {
    console.warn('[DB] mongodb driver not found:', e.message);
    return null;
  }

  try {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000
    });

    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'digenzstore';
    const db = client.db(dbName);
    cachedMongoClient = client;
    cachedMongoDb = db;
    console.log(`[DB] Connected to MongoDB Atlas cluster (Database: "${dbName}").`);
    return cachedMongoDb;
  } catch (err) {
    console.warn('[DB] MongoDB Atlas connection error (fallback active):', err.message);
    cachedMongoClient = null;
    cachedMongoDb = null;
    return null;
  }
}

// Initialize Indexes on Collections
async function initMongoIndexes(mdb) {
  if (indexesInitialized || !mdb) return;
  try {
    await Promise.allSettled([
      mdb.collection('products').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('products').createIndex({ slug: 1 }),
      mdb.collection('products').createIndex({ categoryId: 1 }),
      mdb.collection('products').createIndex({ status: 1 }),
      mdb.collection('categories').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('categories').createIndex({ slug: 1 }),
      mdb.collection('categories').createIndex({ displayOrder: 1 }),
      mdb.collection('banners').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('banners').createIndex({ displayOrder: 1 }),
      mdb.collection('orders').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('orders').createIndex({ orderNumber: 1 }),
      mdb.collection('orders').createIndex({ customerId: 1 }),
      mdb.collection('orders').createIndex({ createdAt: -1 }),
      mdb.collection('customers').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('customers').createIndex({ email: 1 }),
      mdb.collection('coupons').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('coupons').createIndex({ code: 1 }),
      mdb.collection('admins').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('admins').createIndex({ email: 1 }),
      mdb.collection('auditLogs').createIndex({ timestamp: -1 }),
      mdb.collection('media').createIndex({ id: 1 }, { unique: true }),
      mdb.collection('media').createIndex({ filename: 1 })
    ]);
    indexesInitialized = true;
    console.log('[DB] MongoDB Atlas collection indexes verified.');
  } catch (e) {
    console.warn('[DB] Index creation warning:', e.message);
  }
}

class Database {
  constructor() {
    this.data = null;
    this.sessions = new Map();
    this.lastLoadedMtime = 0;
    this.isMongoLoaded = false;
    this.initSync();
  }

  // Synchronous init for baseline local memory & file
  initSync() {
    const targetFile = resolveDbPath();
    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        this.data = JSON.parse(raw);
        const stat = fs.statSync(targetFile);
        this.lastLoadedMtime = stat.mtimeMs;
      } catch (err) {
        this.data = getInitialSeed();
      }
    } else if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        this.data = getInitialSeed();
      }
    } else {
      this.data = getInitialSeed();
    }

    if (!this.data.syncState) {
      this.touchSync('init');
    }
  }

  // Ensures the current process/lambda has authoritative, up-to-date data
  async ensureFreshData() {
    const mdb = await getMongoDatabase();
    if (mdb) {
      try {
        await initMongoIndexes(mdb);
        const syncDoc = await mdb.collection('syncState').findOne({ _id: 'global_sync' });
        const remoteVersion = (syncDoc && syncDoc.version) || 0;
        const localVersion = (this.data && this.data.syncState && this.data.syncState.version) || 0;

        if (!this.isMongoLoaded || remoteVersion > localVersion || !this.data) {
          await this.loadFromMongoDB();
        }
      } catch (err) {
        console.warn('[DB] ensureFreshData MongoDB check failed:', err.message);
      }
    } else {
      // Local file timestamp fallback
      try {
        const targetFile = resolveDbPath();
        if (fs.existsSync(targetFile)) {
          const stat = fs.statSync(targetFile);
          if (stat.mtimeMs > this.lastLoadedMtime) {
            const raw = fs.readFileSync(targetFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              this.data = parsed;
              this.lastLoadedMtime = stat.mtimeMs;
            }
          }
        }
      } catch (e) {}
    }
    return this.data;
  }

  touchSync(moduleName = 'general') {
    if (!this.data) this.initSync();
    if (!this.data.syncState) {
      this.data.syncState = { lastUpdated: Date.now(), version: 1, modules: [] };
    }
    this.data.syncState.lastUpdated = Date.now();
    this.data.syncState.version = (this.data.syncState.version || 0) + 1;
    this.data.syncState.lastModule = moduleName;
    if (!Array.isArray(this.data.syncState.modules)) this.data.syncState.modules = [];
    if (!this.data.syncState.modules.includes(moduleName)) {
      this.data.syncState.modules.push(moduleName);
    }
  }

  saveToLocalFile() {
    const targetFile = resolveDbPath();
    try {
      const tmpFile = targetFile + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpFile, targetFile);
      try {
        const stat = fs.statSync(targetFile);
        this.lastLoadedMtime = stat.mtimeMs;
      } catch (e) {}

      if (targetFile !== DB_FILE) {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (e) {}
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  // Load authoritative state from MongoDB Atlas
  async loadFromMongoDB() {
    const mdb = await getMongoDatabase();
    if (!mdb) return false;

    try {
      // Check if products collection is empty -> Auto-seed from local data
      const prodCount = await mdb.collection('products').countDocuments();
      if (prodCount === 0) {
        console.log('[DB] MongoDB database "digenzstore" is empty. Performing initial migration and seed...');
        await this.seedToMongoDB(mdb);
      }

      // Load collections in parallel
      const [
        productsDocs,
        categoriesDocs,
        bannersDocs,
        ordersDocs,
        customersDocs,
        couponsDocs,
        adminsDocs,
        auditLogsDocs,
        settingsDocs,
        contentDocs,
        navDoc,
        seoDoc,
        syncDoc
      ] = await Promise.all([
        mdb.collection('products').find({}).toArray(),
        mdb.collection('categories').find({}).sort({ displayOrder: 1 }).toArray(),
        mdb.collection('banners').find({}).sort({ displayOrder: 1 }).toArray(),
        mdb.collection('orders').find({}).sort({ createdAt: -1 }).toArray(),
        mdb.collection('customers').find({}).toArray(),
        mdb.collection('coupons').find({}).toArray(),
        mdb.collection('admins').find({}).toArray(),
        mdb.collection('auditLogs').find({}).sort({ timestamp: -1 }).limit(200).toArray(),
        mdb.collection('settings').find({}).toArray(),
        mdb.collection('content').find({}).toArray(),
        mdb.collection('navigation').findOne({ _id: 'global' }),
        mdb.collection('seo').findOne({ _id: 'meta' }),
        mdb.collection('syncState').findOne({ _id: 'global_sync' })
      ]);

      // Populate local memory
      if (!this.data) this.data = {};

      if (productsDocs.length > 0) {
        this.data.products = productsDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (categoriesDocs.length > 0) {
        this.data.categories = categoriesDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (bannersDocs.length > 0) {
        this.data.banners = bannersDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (ordersDocs.length > 0) {
        this.data.orders = ordersDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (customersDocs.length > 0) {
        this.data.customers = customersDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (couponsDocs.length > 0) {
        this.data.coupons = couponsDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (adminsDocs.length > 0) {
        this.data.admins = adminsDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      if (auditLogsDocs.length > 0) {
        this.data.auditLogs = auditLogsDocs.map(doc => {
          const { _id, ...rest } = doc;
          return { ...rest, id: rest.id || _id };
        });
      }

      // Reconstruct Settings object from documents
      if (settingsDocs.length > 0) {
        const settingsObj = {};
        settingsDocs.forEach(doc => {
          const { _id, updatedAt, ...rest } = doc;
          if (_id === 'general') Object.assign(settingsObj, rest);
          else if (_id === 'branding') Object.assign(settingsObj, rest);
          else if (_id === 'contact') {
            if (rest.phone) settingsObj.supportPhone = rest.phone;
            if (rest.email) settingsObj.supportEmail = rest.email;
          }
          else if (_id === 'announcement') settingsObj.announcementBar = rest;
          else Object.assign(settingsObj, rest);
        });
        this.data.settings = { ...this.data.settings, ...settingsObj };
      }

      // Reconstruct Content object
      if (contentDocs.length > 0) {
        const contentObj = {};
        contentDocs.forEach(doc => {
          const { _id, updatedAt, ...rest } = doc;
          contentObj[_id] = rest;
        });
        this.data.content = { ...this.data.content, ...contentObj };
      }

      if (navDoc) {
        const { _id, updatedAt, ...navData } = navDoc;
        this.data.navigation = navData;
      }

      if (seoDoc) {
        const { _id, updatedAt, ...seoData } = seoDoc;
        this.data.seo = seoData;
      }

      if (syncDoc) {
        this.data.syncState = {
          version: syncDoc.version || 1,
          lastUpdated: syncDoc.lastUpdated || Date.now(),
          lastModule: syncDoc.lastModule || 'init',
          modules: syncDoc.modules || []
        };
      }

      this.isMongoLoaded = true;
      this.saveToLocalFile();
      console.log(`[DB] Successfully synchronized ${this.data.products.length} products and website modules from MongoDB Atlas.`);
      return true;
    } catch (err) {
      console.warn('[DB] MongoDB load error:', err.message);
      return false;
    }
  }

  // Seed initial dataset into MongoDB Atlas collections
  async seedToMongoDB(mdb) {
    if (!this.data) this.initSync();
    try {
      const now = new Date();

      // 1. Products
      if (Array.isArray(this.data.products) && this.data.products.length > 0) {
        const ops = this.data.products.map(p => ({
          updateOne: {
            filter: { _id: p.id },
            update: { $set: { ...p, _id: p.id, updatedAt: p.updatedAt || now } },
            upsert: true
          }
        }));
        await mdb.collection('products').bulkWrite(ops);
      }

      // 2. Categories
      if (Array.isArray(this.data.categories) && this.data.categories.length > 0) {
        const ops = this.data.categories.map(c => ({
          updateOne: {
            filter: { _id: c.id },
            update: { $set: { ...c, _id: c.id, updatedAt: c.updatedAt || now } },
            upsert: true
          }
        }));
        await mdb.collection('categories').bulkWrite(ops);
      }

      // 3. Banners
      if (Array.isArray(this.data.banners) && this.data.banners.length > 0) {
        const ops = this.data.banners.map(b => ({
          updateOne: {
            filter: { _id: b.id },
            update: { $set: { ...b, _id: b.id, updatedAt: b.updatedAt || now } },
            upsert: true
          }
        }));
        await mdb.collection('banners').bulkWrite(ops);
      }

      // 4. Settings
      if (this.data.settings) {
        const s = this.data.settings;
        await mdb.collection('settings').updateOne(
          { _id: 'general' },
          { $set: { _id: 'general', siteName: s.siteName, siteTagline: s.siteTagline, currencySymbol: s.currencySymbol, currencyCode: s.currencyCode, taxRate: s.taxRate, maintenanceMode: s.maintenanceMode, enablePublicQuotes: s.enablePublicQuotes, updatedAt: now } },
          { upsert: true }
        );
        await mdb.collection('settings').updateOne(
          { _id: 'branding' },
          { $set: { _id: 'branding', logoDark: s.logoDark, logoLight: s.logoLight, favicon: s.favicon, updatedAt: now } },
          { upsert: true }
        );
        await mdb.collection('settings').updateOne(
          { _id: 'contact' },
          { $set: { _id: 'contact', phone: s.supportPhone || '03190039048', email: s.supportEmail || 'support@digenz.com', updatedAt: now } },
          { upsert: true }
        );
        if (s.announcementBar) {
          await mdb.collection('settings').updateOne(
            { _id: 'announcement' },
            { $set: { _id: 'announcement', ...s.announcementBar, updatedAt: now } },
            { upsert: true }
          );
        }
      }

      // 5. Content
      if (this.data.content) {
        for (const [secName, secData] of Object.entries(this.data.content)) {
          await mdb.collection('content').updateOne(
            { _id: secName },
            { $set: { _id: secName, ...secData, updatedAt: now } },
            { upsert: true }
          );
        }
      }

      // 6. Navigation
      if (this.data.navigation) {
        await mdb.collection('navigation').updateOne(
          { _id: 'global' },
          { $set: { _id: 'global', ...this.data.navigation, updatedAt: now } },
          { upsert: true }
        );
      }

      // 7. SEO
      if (this.data.seo) {
        await mdb.collection('seo').updateOne(
          { _id: 'meta' },
          { $set: { _id: 'meta', ...this.data.seo, updatedAt: now } },
          { upsert: true }
        );
      }

      // 8. Admins
      if (Array.isArray(this.data.admins) && this.data.admins.length > 0) {
        const ops = this.data.admins.map(a => ({
          updateOne: {
            filter: { _id: a.id },
            update: { $set: { ...a, _id: a.id } },
            upsert: true
          }
        }));
        await mdb.collection('admins').bulkWrite(ops);
      }

      // 9. SyncState
      await mdb.collection('syncState').updateOne(
        { _id: 'global_sync' },
        { $set: { _id: 'global_sync', version: 1, lastUpdated: Date.now(), lastModule: 'init', modules: ['init'], updatedAt: now } },
        { upsert: true }
      );

      console.log('[DB] Seeding completed successfully.');
      return true;
    } catch (err) {
      console.warn('[DB] Seeding error:', err.message);
      return false;
    }
  }

  // Persist modified module to MongoDB Atlas directly
  async syncToMongoDB(moduleName = null) {
    const mdb = await getMongoDatabase();
    if (!mdb) return false;

    try {
      const now = new Date();

      if (!moduleName || moduleName === 'products') {
        if (Array.isArray(this.data.products)) {
          const currentIds = this.data.products.map(p => p.id);
          if (this.data.products.length > 0) {
            const ops = this.data.products.map(p => ({
              updateOne: {
                filter: { _id: p.id },
                update: { $set: { ...p, _id: p.id, updatedAt: p.updatedAt || now } },
                upsert: true
              }
            }));
            await mdb.collection('products').bulkWrite(ops);
          }
          await mdb.collection('products').deleteMany({ _id: { $nin: currentIds } });
        }
      }

      if (!moduleName || moduleName === 'categories') {
        if (Array.isArray(this.data.categories)) {
          const currentIds = this.data.categories.map(c => c.id);
          if (this.data.categories.length > 0) {
            const ops = this.data.categories.map(c => ({
              updateOne: {
                filter: { _id: c.id },
                update: { $set: { ...c, _id: c.id, updatedAt: c.updatedAt || now } },
                upsert: true
              }
            }));
            await mdb.collection('categories').bulkWrite(ops);
          }
          await mdb.collection('categories').deleteMany({ _id: { $nin: currentIds } });
        }
      }

      if (!moduleName || moduleName === 'banners') {
        if (Array.isArray(this.data.banners)) {
          const currentIds = this.data.banners.map(b => b.id);
          if (this.data.banners.length > 0) {
            const ops = this.data.banners.map(b => ({
              updateOne: {
                filter: { _id: b.id },
                update: { $set: { ...b, _id: b.id, updatedAt: b.updatedAt || now } },
                upsert: true
              }
            }));
            await mdb.collection('banners').bulkWrite(ops);
          }
          await mdb.collection('banners').deleteMany({ _id: { $nin: currentIds } });
        }
      }

      if (!moduleName || moduleName === 'orders') {
        if (Array.isArray(this.data.orders) && this.data.orders.length > 0) {
          const ops = this.data.orders.map(o => ({
            updateOne: {
              filter: { _id: o.id },
              update: { $set: { ...o, _id: o.id, updatedAt: o.updatedAt || now } },
              upsert: true
            }
          }));
          await mdb.collection('orders').bulkWrite(ops);
        }
      }

      if (!moduleName || moduleName === 'customers') {
        if (Array.isArray(this.data.customers) && this.data.customers.length > 0) {
          const ops = this.data.customers.map(c => ({
            updateOne: {
              filter: { _id: c.id },
              update: { $set: { ...c, _id: c.id, updatedAt: c.updatedAt || now } },
              upsert: true
            }
          }));
          await mdb.collection('customers').bulkWrite(ops);
        }
      }

      if (!moduleName || moduleName === 'coupons') {
        if (Array.isArray(this.data.coupons)) {
          const currentIds = this.data.coupons.map(cp => cp.id);
          if (this.data.coupons.length > 0) {
            const ops = this.data.coupons.map(cp => ({
              updateOne: {
                filter: { _id: cp.id },
                update: { $set: { ...cp, _id: cp.id, updatedAt: cp.updatedAt || now } },
                upsert: true
              }
            }));
            await mdb.collection('coupons').bulkWrite(ops);
          }
          await mdb.collection('coupons').deleteMany({ _id: { $nin: currentIds } });
        }
      }

      if (!moduleName || moduleName === 'settings') {
        if (this.data.settings) {
          const s = this.data.settings;
          await mdb.collection('settings').updateOne(
            { _id: 'general' },
            { $set: { _id: 'general', siteName: s.siteName, siteTagline: s.siteTagline, currencySymbol: s.currencySymbol, currencyCode: s.currencyCode, taxRate: s.taxRate, maintenanceMode: s.maintenanceMode, enablePublicQuotes: s.enablePublicQuotes, updatedAt: now } },
            { upsert: true }
          );
          await mdb.collection('settings').updateOne(
            { _id: 'branding' },
            { $set: { _id: 'branding', logoDark: s.logoDark, logoLight: s.logoLight, favicon: s.favicon, updatedAt: now } },
            { upsert: true }
          );
          await mdb.collection('settings').updateOne(
            { _id: 'contact' },
            { $set: { _id: 'contact', phone: s.supportPhone || '03190039048', email: s.supportEmail || 'support@digenz.com', updatedAt: now } },
            { upsert: true }
          );
          if (s.announcementBar) {
            await mdb.collection('settings').updateOne(
              { _id: 'announcement' },
              { $set: { _id: 'announcement', ...s.announcementBar, updatedAt: now } },
              { upsert: true }
            );
          }
        }
      }

      if (!moduleName || moduleName === 'content') {
        if (this.data.content) {
          for (const [secName, secData] of Object.entries(this.data.content)) {
            await mdb.collection('content').updateOne(
              { _id: secName },
              { $set: { _id: secName, ...secData, updatedAt: now } },
              { upsert: true }
            );
          }
        }
      }

      if (!moduleName || moduleName === 'navigation') {
        if (this.data.navigation) {
          await mdb.collection('navigation').updateOne(
            { _id: 'global' },
            { $set: { _id: 'global', ...this.data.navigation, updatedAt: now } },
            { upsert: true }
          );
        }
      }

      if (!moduleName || moduleName === 'seo') {
        if (this.data.seo) {
          await mdb.collection('seo').updateOne(
            { _id: 'meta' },
            { $set: { _id: 'meta', ...this.data.seo, updatedAt: now } },
            { upsert: true }
          );
        }
      }

      if (!moduleName || moduleName === 'admins') {
        if (Array.isArray(this.data.admins) && this.data.admins.length > 0) {
          const ops = this.data.admins.map(a => ({
            updateOne: {
              filter: { _id: a.id },
              update: { $set: { ...a, _id: a.id } },
              upsert: true
            }
          }));
          await mdb.collection('admins').bulkWrite(ops);
        }
      }

      // Always update syncState
      await mdb.collection('syncState').updateOne(
        { _id: 'global_sync' },
        {
          $set: {
            _id: 'global_sync',
            lastUpdated: this.data.syncState.lastUpdated,
            lastModule: this.data.syncState.lastModule,
            modules: this.data.syncState.modules,
            updatedAt: now
          },
          $max: { version: this.data.syncState.version }
        },
        { upsert: true }
      );

      return true;
    } catch (err) {
      console.warn('[DB] MongoDB Atlas write warning (fallback kept):', err.message);
      return false;
    }
  }

  // Primary atomic save method - Awaits MongoDB confirmation
  async save(moduleName = null, touch = true) {
    if (touch) {
      this.touchSync(moduleName || 'general');
    }
    // 1. Write local JSON fallback
    this.saveToLocalFile();
    // 2. Await MongoDB Atlas write confirmation
    const mongoSuccess = await this.syncToMongoDB(moduleName);
    return true;
  }

  // Dedicated atomic Settings saver with partial field protection
  async saveSettings(updatedFields) {
    if (!this.data) this.initSync();
    if (!this.data.settings) this.data.settings = {};

    const clean = {};
    if (updatedFields.siteName !== undefined) clean.siteName = String(updatedFields.siteName).trim();
    if (updatedFields.siteTagline !== undefined) clean.siteTagline = String(updatedFields.siteTagline).trim();
    if (updatedFields.supportEmail !== undefined) clean.supportEmail = String(updatedFields.supportEmail).trim();
    if (updatedFields.supportPhone !== undefined) clean.supportPhone = String(updatedFields.supportPhone).trim();
    if (updatedFields.currencySymbol !== undefined) clean.currencySymbol = String(updatedFields.currencySymbol).trim();
    if (updatedFields.currencyCode !== undefined) clean.currencyCode = String(updatedFields.currencyCode).trim().toUpperCase();
    if (updatedFields.logoDark !== undefined) clean.logoDark = updatedFields.logoDark;
    if (updatedFields.logoLight !== undefined) clean.logoLight = updatedFields.logoLight;
    if (updatedFields.favicon !== undefined) clean.favicon = updatedFields.favicon;
    if (updatedFields.taxRate !== undefined) clean.taxRate = Number(updatedFields.taxRate) || 0;
    if (updatedFields.maintenanceMode !== undefined) clean.maintenanceMode = Boolean(updatedFields.maintenanceMode);
    if (updatedFields.enablePublicQuotes !== undefined) clean.enablePublicQuotes = Boolean(updatedFields.enablePublicQuotes);
    if (updatedFields.announcementBar !== undefined) clean.announcementBar = updatedFields.announcementBar;

    this.data.settings = { ...this.data.settings, ...clean };
    await this.save('settings', true);
    return this.data.settings;
  }

  // Save Media Reference permanently to MongoDB
  async saveMedia(mediaDoc) {
    const mdb = await getMongoDatabase();
    if (!mdb) return false;
    try {
      await mdb.collection('media').updateOne(
        { _id: mediaDoc.id },
        { $set: { ...mediaDoc, _id: mediaDoc.id, updatedAt: new Date() } },
        { upsert: true }
      );
      return true;
    } catch (e) {
      console.warn('[DB] saveMedia warning:', e.message);
      return false;
    }
  }

  // Fetch Media by Filename from MongoDB
  async getMedia(filename) {
    const mdb = await getMongoDatabase();
    if (!mdb) return null;
    try {
      return await mdb.collection('media').findOne({ filename });
    } catch (e) {
      return null;
    }
  }

  // List all media documents from MongoDB
  async listMedia() {
    const mdb = await getMongoDatabase();
    if (!mdb) return [];
    try {
      return await mdb.collection('media').find({}, { projection: { dataBase64: 0 } }).toArray();
    } catch (e) {
      return [];
    }
  }

  // Delete Media from MongoDB
  async deleteMedia(filename) {
    const mdb = await getMongoDatabase();
    if (!mdb) return false;
    try {
      await mdb.collection('media').deleteOne({ filename });
      return true;
    } catch (e) {
      return false;
    }
  }

  getDatabaseInfo() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    const dbName = process.env.MONGODB_DB_NAME || 'digenzstore';
    return {
      authoritativeSource: mongoUri ? `MongoDB Atlas (${dbName})` : 'Atomic JSON Engine (Local Persistent)',
      isMongoConfigured: Boolean(mongoUri),
      databaseName: dbName,
      connectionStatus: cachedMongoDb ? 'connected' : (mongoUri ? 'connecting_or_idle' : 'unconfigured'),
      activePath: resolveDbPath(),
      syncVersion: (this.data && this.data.syncState && this.data.syncState.version) || 1,
      lastUpdated: (this.data && this.data.syncState && this.data.syncState.lastUpdated) || Date.now(),
      lastModule: (this.data && this.data.syncState && this.data.syncState.lastModule) || 'init'
    };
  }

  createSession(admin) {
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    const payload = {
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      issuedAt: Date.now(),
      expiresAt
    };
    const token = signToken(payload);
    this.sessions.set(token, payload);
    return { token, expiresAt };
  }

  verifySession(token) {
    if (!token) return null;
    const cached = this.sessions.get(token);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        this.sessions.delete(token);
        return null;
      }
      return cached;
    }
    const verified = verifySignedToken(token);
    if (verified) {
      this.sessions.set(token, verified);
      return verified;
    }
    return null;
  }

  destroySession(token) {
    if (token) this.sessions.delete(token);
  }

  logAudit(adminEmail, action, module, details, ip = '127.0.0.1') {
    const log = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      adminEmail: adminEmail || 'admin@digenz.com',
      action,
      module,
      details,
      ip,
      timestamp: new Date().toISOString()
    };
    if (!this.data) this.initSync();
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) this.data.auditLogs.pop();
    this.save(null, false).catch(() => {});
    return log;
  }
}

module.exports = {
  db: new Database(),
  hashPassword,
  verifyPassword,
  getMongoDatabase
};
