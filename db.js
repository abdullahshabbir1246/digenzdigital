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
  const defaultAdmin = hashPassword('Admin@Digenz2026!');

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

  const products = [
    {
      id: 'prod-startup-logo',
      name: 'Startup Logo Package',
      slug: 'startup-logo-package',
      sku: 'PKG-LOGO-001',
      categoryId: 'cat-logo',
      subcategoryId: null,
      price: 149,
      salePrice: 49,
      stockQuantity: 999,
      availability: 'in_stock',
      description: 'Suitable for potential super-startups and brand revamps for early-stage companies.',
      features: [
        '3 Logo Concepts',
        '3 Revisions',
        'By 2 Dedicated Designers',
        '24 - 48 Hours Turn Around Time',
        'All Final Files Format (PNG, JPG, Vector SVG)',
        '100% Ownership Rights',
        '100% Satisfaction Guarantee',
        '100% Unique Design Guarantee',
        '100% Money Back Guarantee'
      ],
      images: ['/assets/images/serviceportfolio/branding/branding-new/brand/1.png', '/assets/images/serviceportfolio/branding/branding-new/brand/2.png'],
      primaryImage: '/assets/images/serviceportfolio/branding/branding-new/brand/1.png',
      videoUrl: '',
      variants: [
        { name: 'Turnaround', options: ['Standard (48 hrs)', 'Rush 24 hrs (+$25)'] }
      ],
      isFeatured: true,
      badge: 'Popular',
      seoTitle: 'Startup Logo Package | DIGENZ',
      seoDescription: 'Custom 3-concept startup logo design with complete vector source files.',
      status: 'published',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'prod-prof-logo',
      name: 'Professional Logo Package',
      slug: 'professional-logo-package',
      sku: 'PKG-LOGO-002',
      categoryId: 'cat-logo',
      subcategoryId: null,
      price: 249,
      salePrice: 99,
      stockQuantity: 999,
      availability: 'in_stock',
      description: 'Comprehensive brand identity for established businesses looking for high distinctiveness.',
      features: [
        '5 Unique Logo Concepts',
        'Unlimited Revisions',
        'By 4 Dedicated Designers',
        '24 - 48 Hours Turn Around Time',
        'Free Icon Design & Favicon',
        'Formats: AI, EPS, SVG, PNG, JPG, PDF',
        'Full Copyright Ownership',
        '100% Satisfaction Guarantee'
      ],
      images: ['/assets/images/serviceportfolio/branding/branding-new/brand/3.png', '/assets/images/serviceportfolio/branding/branding-new/brand/4.png'],
      primaryImage: '/assets/images/serviceportfolio/branding/branding-new/brand/3.png',
      videoUrl: '',
      variants: [],
      isFeatured: true,
      badge: 'Best Seller',
      seoTitle: 'Professional Logo Design Package | DIGENZ',
      seoDescription: '5 concepts with unlimited revisions and complete copyright ownership.',
      status: 'published',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'prod-startup-web',
      name: 'Startup Website Package',
      slug: 'startup-website-package',
      sku: 'PKG-WEB-001',
      categoryId: 'cat-webdesign',
      subcategoryId: null,
      price: 499,
      salePrice: 199,
      stockQuantity: 999,
      availability: 'in_stock',
      description: 'Clean, modern 5-page responsive website designed to build credibility and convert leads.',
      features: [
        '5 Custom Website Pages',
        'Mobile Responsive & Cross-Browser Layout',
        'Contact / Lead Capture Form',
        'Hero Slider & Call to Action Banners',
        'Complete W3C Certified Code',
        'SEO Friendly URLs & Basic Optimization',
        'Free 1-Month Technical Support',
        '100% Ownership of Source Code'
      ],
      images: ['/assets/images/serviceportfolio/webapp/thumbnail/t-1.jpg', '/assets/images/serviceportfolio/webapp/thumbnail/t-2.jpg'],
      primaryImage: '/assets/images/serviceportfolio/webapp/thumbnail/t-1.jpg',
      videoUrl: '',
      variants: [
        { name: 'Hosting', options: ['Include 1 Yr Domain & Cloud Hosting (+$50)', 'Own Hosting'] }
      ],
      isFeatured: true,
      badge: 'Most Popular',
      seoTitle: 'Startup Website Development Package | DIGENZ',
      seoDescription: '5-page responsive corporate website with lead forms and fast hosting setup.',
      status: 'published',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'prod-prof-web',
      name: 'Professional Website Package',
      slug: 'professional-website-package',
      sku: 'PKG-WEB-002',
      categoryId: 'cat-webdesign',
      subcategoryId: null,
      price: 899,
      salePrice: 399,
      stockQuantity: 999,
      availability: 'in_stock',
      description: 'Up to 10 custom pages with dynamic CMS, interactive modules, and speed optimization.',
      features: [
        'Up to 10 Unique Pages',
        'Custom CMS (WordPress / Node Engine)',
        'Interactive Galleries & Services Catalog',
        'Speed Optimization (< 1.5s load time)',
        'Social Media Integration & Newsletter Form',
        'On-Page SEO Optimization',
        'Google Analytics & Search Console Setup',
        'Free 3 Months Support & Maintenance'
      ],
      images: ['/assets/images/serviceportfolio/webapp/thumbnail/t-3.jpg', '/assets/images/serviceportfolio/webapp/thumbnail/t-4.jpg'],
      primaryImage: '/assets/images/serviceportfolio/webapp/thumbnail/t-3.jpg',
      videoUrl: '',
      variants: [],
      isFeatured: true,
      badge: 'Hot',
      seoTitle: 'Professional Business Website Package | DIGENZ',
      seoDescription: '10 custom pages, CMS management, speed optimization, and full on-page SEO.',
      status: 'published',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'prod-ecom-store',
      name: 'Beginner Ecommerce Package',
      slug: 'beginners-e-commerce-package',
      sku: 'PKG-ECOM-001',
      categoryId: 'cat-ecommerce',
      subcategoryId: null,
      price: 999,
      salePrice: 449,
      stockQuantity: 999,
      availability: 'in_stock',
      description: 'Turnkey online store with secure checkout, product catalog, and payment integration.',
      features: [
        'Custom Ecommerce Storefront',
        'Up to 50 Products Catalog Setup',
        'Payment Gateway (Stripe, PayPal, COD)',
        'Shopping Cart & One-Page Checkout',
        'Order & Inventory Management System',
        'Automated Email Receipts & Invoices',
        'Discount & Coupon Code Engine',
        'Mobile Optimized Shopping Experience'
      ],
      images: ['/assets/images/serviceportfolio/ecommerce/thumbnail/t-1.jpg', '/assets/images/serviceportfolio/ecommerce/thumbnail/t-2.jpg'],
      primaryImage: '/assets/images/serviceportfolio/ecommerce/thumbnail/t-1.jpg',
      videoUrl: '',
      variants: [],
      isFeatured: true,
      badge: 'Trending',
      seoTitle: 'Beginner Ecommerce Store Package | DIGENZ',
      seoDescription: 'Complete ecommerce website with Stripe/PayPal payments and coupon engine.',
      status: 'published',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'prod-corp-combo',
      name: 'Corporate Combo Package',
      slug: 'corporate-combo-package',
      sku: 'PKG-CMB-001',
      categoryId: 'cat-combo',
      subcategoryId: null,
      price: 1999,
      salePrice: 899,
      stockQuantity: 999,
      availability: 'in_stock',
      description: 'The complete enterprise launch kit: Unlimited Logo Design, Custom Website, Stationery, and SEO.',
      features: [
        'Unlimited Logo Concepts & Revisions',
        'Complete Stationery Design (Business Card, Letterhead, Envelope)',
        'Up to 15 Pages Custom Web Portal',
        'CMS & Content Architecture',
        'Mobile Responsive & PWA Ready',
        '6 Months Free SEO & Technical Maintenance',
        'Free 1-Year Domain & Cloud Server',
        'Dedicated Project Manager & 24/7 Priority Support'
      ],
      images: ['/assets/images/serviceportfolio/branding/branding-new/brand/5.png', '/assets/images/banners/branding.png'],
      primaryImage: '/assets/images/serviceportfolio/branding/branding-new/brand/5.png',
      videoUrl: '',
      variants: [],
      isFeatured: true,
      badge: '75% OFF',
      seoTitle: 'Corporate Combo Package | DIGENZ Digital Agency',
      seoDescription: 'Full brand identity, custom website portal, and 6 months of ongoing growth SEO.',
      status: 'published',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z'
    }
  ];

  const banners = [
    {
      id: 'ban-hero-1',
      title: 'DIGITAL INNOVATION MEETS CREATIVE EXPERTISE',
      subtitle: 'Award-winning web development, software engineering, and corporate branding solutions.',
      buttonText: 'EXPLORE PACKAGES',
      buttonLink: '/packages/',
      desktopImage: '/assets/images/banners/digenz-home-hero.png',
      mobileImage: '/assets/images/popup-inner.png',
      displayOrder: 1,
      isActive: true,
      scheduleStart: '2026-01-01',
      scheduleEnd: '2026-12-31',
      createdAt: '2026-01-15T00:00:00.000Z'
    },
    {
      id: 'ban-promo-75',
      title: 'LIMITED TIME: 75% OFF ALL DIGITAL SERVICES',
      subtitle: 'Use coupon code DIGENZ10 at checkout for an additional 10% instant discount.',
      buttonText: 'GET INSTANT QUOTE',
      buttonLink: '/get-a-quote/',
      desktopImage: '/assets/images/banners/technology-banner.png',
      mobileImage: '/assets/images/popup-inner.png',
      displayOrder: 2,
      isActive: true,
      scheduleStart: '2026-01-01',
      scheduleEnd: '2026-12-31',
      createdAt: '2026-01-15T00:00:00.000Z'
    }
  ];

  const coupons = [
    {
      id: 'coup-digenz10',
      code: 'DIGENZ10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 50,
      maxUses: 1000,
      usedCount: 0,
      expiryDate: '2026-12-31',
      isActive: true,
      eligibleCategories: ['cat-logo', 'cat-webdesign', 'cat-ecommerce', 'cat-combo'],
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'coup-welcome75',
      code: 'WELCOME75',
      discountType: 'percentage',
      discountValue: 75,
      minOrderValue: 100,
      maxUses: 500,
      usedCount: 0,
      expiryDate: '2026-12-31',
      isActive: true,
      eligibleCategories: [],
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'coup-vip50',
      code: 'VIP50',
      discountType: 'fixed',
      discountValue: 50,
      minOrderValue: 200,
      maxUses: 200,
      usedCount: 0,
      expiryDate: '2026-12-31',
      isActive: true,
      eligibleCategories: ['cat-webdesign', 'cat-combo'],
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ];

  const customers = [];

  const orders = [];

  const content = {
    about: {
      heroHeading: 'Innovating Through Digital Mastery',
      heroSubheading: 'We engineer bespoke websites, software architectures, and creative brand identities for global leaders.',
      story: 'DIGENZ was founded on a simple premise: delivering uncompromising digital excellence with rapid turnarounds and dedicated engineering expertise. We partner with fast-growing startups and established corporations to deliver measurable growth.',
      mission: 'To empower brands worldwide through digital innovation, creative artistry, and cutting-edge web technology.',
      vision: 'Becoming the world’s most trusted full-service digital and freelancing agency.'
    },
    contact: {
      email: 'contact@digenz.com',
      salesEmail: 'sales@digenz.com',
      phone: '+1 (213) 221-2842',
      alternatePhone: '+92 306 1284045',
      address: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ',
      businessHours: 'Mon - Fri: 9:00 AM - 6:00 PM EST | 24/7 Priority Emergency Support',
      liveChatStatus: 'online'
    },
    faqs: [
      {
        id: 'faq-1',
        category: 'Services',
        question: 'What is included in the DIGENZ web development packages?',
        answer: 'All our web packages include custom responsive frontend design, modern mobile-first styling, lead generation forms, clean semantic code, basic on-page SEO, source code ownership, and 30-90 days of technical support.'
      },
      {
        id: 'faq-2',
        category: 'Ordering',
        question: 'How fast can DIGENZ deliver a new project?',
        answer: 'Logo packages are delivered within 24 to 48 hours. Standard 5-page websites take 3 to 7 business days, while enterprise web applications and custom ecommerce portals take 2 to 4 weeks depending on specifications.'
      },
      {
        id: 'faq-3',
        category: 'Copyright',
        question: 'Do I own 100% of the rights to the designs and source code?',
        answer: 'Yes! Upon final approval and project completion, 100% full commercial copyright, source code, and design assets belong entirely to you with no hidden licensing fees.'
      },
      {
        id: 'faq-4',
        category: 'Refunds',
        question: 'What is the DIGENZ refund policy?',
        answer: 'We offer a 100% satisfaction guarantee. If initial concepts do not align with your design brief before subsequent revision cycles, you are eligible for a prompt refund per our Refund Policy.'
      }
    ],
    privacy: {
      lastUpdated: 'January 2026',
      summary: 'DIGENZ respects your personal privacy. We do not sell, rent, or trade your personal or financial information to third parties. All client communications and project files are encrypted and confidential.'
    },
    terms: {
      lastUpdated: 'January 2026',
      summary: 'By engaging DIGENZ services, clients agree to accurate project briefs, prompt milestone feedback, and adherence to service payment schedules. All delivered custom assets become client property upon final payment settlement.'
    },
    refund: {
      lastUpdated: 'January 2026',
      summary: 'Clients may request revisions or a refund prior to approving final project deliverables. Once source files are delivered or deployed to live production servers, project milestones are considered accepted.'
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
    canonicalUrl: 'https://www.digenzstore.com/',
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
    supportPhone: '+1 (213) 221-2842',
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
    products,
    banners,
    coupons,
    customers,
    orders,
    content,
    navigation,
    seo,
    settings,
    auditLogs
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
    // Read-only filesystem (e.g. Vercel Lambda / Serverless)
    const tmpDbPath = path.join(os.tmpdir(), 'digenz_db.json');
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, tmpDbPath);
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

class Database {
  constructor() {
    this.data = null;
    this.sessions = new Map(); // token -> { adminId, email, expiresAt }
    this.init();
  }

  init() {
    const targetFile = resolveDbPath();
    if (!fs.existsSync(targetFile)) {
      console.log('[DB] Seeding database at', targetFile);
      this.data = getInitialSeed();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        this.data = JSON.parse(raw);
        console.log('[DB] Database loaded successfully from', targetFile);
      } catch (err) {
        console.error('[DB] Error loading database file, re-initializing from seed:', err.message);
        this.data = getInitialSeed();
        this.save();
      }
    }
  }

  save() {
    const targetFile = resolveDbPath();
    try {
      const tmpFile = targetFile + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpFile, targetFile);
      if (targetFile !== DB_FILE) {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (e) {}
      }
      return true;
    } catch (err) {
      console.error('[DB] Save error:', err.message);
      return false;
    }
  }

  // Session handling (Stateless HMAC Cryptographic Token - Cross-Lambda Compatible)
  createSession(admin) {
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30-day session
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
    // 1. Fast cache check
    const cached = this.sessions.get(token);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        this.sessions.delete(token);
        return null;
      }
      return cached;
    }
    // 2. Stateless HMAC cryptographic verification (cross-lambda serverless support)
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

  // Audit Log helper
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
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) this.data.auditLogs.pop();
    this.save();
    return log;
  }
}

module.exports = {
  db: new Database(),
  hashPassword,
  verifyPassword
};
