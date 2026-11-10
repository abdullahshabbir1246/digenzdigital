const { db } = require('../db');
const { syncStaticHTMLPricingAndBanners } = require('../sync-html');

async function syncAll() {
  console.log('=== SYNCHRONIZING ALL PRICING DATA TO DISK ===\n');
  db.initSync();
  await db.ensureFreshData();
  const products = db.data.products || [];
  const banners = db.data.banners || [];
  const settings = db.data.settings || {};

  console.log(`Loaded ${products.length} products from database.`);
  syncStaticHTMLPricingAndBanners(products, banners, settings);
  console.log('Synchronization complete!\n');

  process.exit(0);
}

syncAll().catch(err => {
  console.error(err);
  process.exit(1);
});
