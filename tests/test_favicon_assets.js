const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('../node_modules/sharp');

const rootDir = path.resolve(__dirname, '..');

async function testFaviconAssets() {
  console.log('=== DIGENZ FAVICON ASSETS & INTEGRATION TEST ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check all required asset files exist
  const requiredFiles = [
    { file: 'favicon.ico', minSize: 1000 },
    { file: 'favicon.svg', minSize: 500 },
    { file: 'favicon-16x16.png', minSize: 200 },
    { file: 'favicon-32x32.png', minSize: 500 },
    { file: 'favicon-48x48.png', minSize: 1000 },
    { file: 'android-chrome-192x192.png', minSize: 5000 },
    { file: 'android-chrome-512x512.png', minSize: 10000 },
    { file: 'apple-touch-icon.png', minSize: 5000 },
    { file: 'site.webmanifest', minSize: 100 }
  ];

  for (const item of requiredFiles) {
    const fullPath = path.join(rootDir, item.file);
    const exists = fs.existsSync(fullPath);
    assert(exists, `File exists: ${item.file}`);
    if (exists) {
      const stat = fs.statSync(fullPath);
      assert(stat.size >= item.minSize, `File ${item.file} has valid size: ${stat.size} bytes (min: ${item.minSize})`);
    }
  }

  // 2. Validate ICO multi-resolution structure
  try {
    const icoBuf = fs.readFileSync(path.join(rootDir, 'favicon.ico'));
    const count = icoBuf.readUInt16LE(4);
    assert(count === 3, `favicon.ico contains exactly 3 resolutions (found: ${count})`);
    
    const expectedSizes = [16, 32, 48];
    for (let i = 0; i < count; i++) {
      const entryOffset = 6 + i * 16;
      const w = icoBuf.readUInt8(entryOffset) || 256;
      const h = icoBuf.readUInt8(entryOffset + 1) || 256;
      assert(w === expectedSizes[i] && h === expectedSizes[i], `ICO image ${i} is ${expectedSizes[i]}x${expectedSizes[i]} (found: ${w}x${h})`);
      
      const imgSize = icoBuf.readUInt32LE(entryOffset + 8);
      const dataOffset = icoBuf.readUInt32LE(entryOffset + 12);
      const imgBuf = icoBuf.slice(dataOffset, dataOffset + imgSize);
      // Check PNG signature: 89 50 4E 47
      assert(imgBuf[0] === 0x89 && imgBuf[1] === 0x50 && imgBuf[2] === 0x4e && imgBuf[3] === 0x47, `ICO image ${i} has valid PNG signature`);
    }
  } catch (e) {
    assert(false, `favicon.ico parsing failed: ${e.message}`);
  }

  // 3. Validate PNG image dimensions via Sharp
  const pngDimensions = [
    { file: 'favicon-16x16.png', w: 16, h: 16 },
    { file: 'favicon-32x32.png', w: 32, h: 32 },
    { file: 'favicon-48x48.png', w: 48, h: 48 },
    { file: 'android-chrome-192x192.png', w: 192, h: 192 },
    { file: 'android-chrome-512x512.png', w: 512, h: 512 },
    { file: 'apple-touch-icon.png', w: 180, h: 180 }
  ];

  for (const item of pngDimensions) {
    try {
      const meta = await sharp(path.join(rootDir, item.file)).metadata();
      assert(meta.width === item.w && meta.height === item.h, `${item.file} metadata dimensions: ${meta.width}x${meta.height} (expected ${item.w}x${item.h})`);
    } catch (e) {
      assert(false, `${item.file} sharp check failed: ${e.message}`);
    }
  }

  // 4. Validate site.webmanifest
  try {
    const raw = fs.readFileSync(path.join(rootDir, 'site.webmanifest'), 'utf8');
    const manifest = JSON.parse(raw);
    assert(manifest.name && manifest.name.includes('DIGENZ'), 'site.webmanifest has valid DIGENZ name');
    assert(manifest.short_name === 'DIGENZ', 'site.webmanifest has valid short_name DIGENZ');
    assert(manifest.theme_color === '#101827', 'site.webmanifest has theme_color #101827');
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 5, `site.webmanifest contains ${manifest.icons?.length} icons`);
    for (const icon of manifest.icons) {
      assert(icon.src.startsWith('https://www.digendigital.com/'), `Icon URL is absolute production URL: ${icon.src}`);
    }
  } catch (e) {
    assert(false, `site.webmanifest validation error: ${e.message}`);
  }

  // 5. Validate HTML files have proper canonical tags
  const samplePages = [
    'index.html',
    'index.htm',
    path.join('contact-us', 'index.html'),
    path.join('about', 'index.html'),
    path.join('pricing', 'index.html'),
    path.join('packages', 'index.html'),
    path.join('admin', 'index.html')
  ];

  for (const p of samplePages) {
    const fullPath = path.join(rootDir, p);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.includes('https://www.digendigital.com/favicon.ico'), `${p} links to canonical favicon.ico`);
    assert(content.includes('https://www.digendigital.com/favicon.svg'), `${p} links to canonical favicon.svg`);
    assert(content.includes('https://www.digendigital.com/favicon-48x48.png'), `${p} links to canonical favicon-48x48.png`);
    assert(content.includes('https://www.digendigital.com/apple-touch-icon.png'), `${p} links to canonical apple-touch-icon.png`);
    assert(content.includes('https://www.digendigital.com/site.webmanifest'), `${p} links to canonical site.webmanifest`);
    assert(!content.includes('href="favicon.ico"') && !content.includes('href="../favicon.ico"'), `${p} does NOT contain outdated relative favicon.ico link`);
  }

  // 6. Test server serving endpoints locally
  console.log('\n--- Testing Server Endpoints via Local Server ---');
  const server = require('../server.js');
  const PORT = 3899;
  
  await new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  const endpoints = [
    { url: '/favicon.ico', expectedType: 'image/x-icon' },
    { url: '/favicon.svg', expectedType: 'image/svg+xml' },
    { url: '/favicon-48x48.png', expectedType: 'image/png' },
    { url: '/favicon-32x32.png', expectedType: 'image/png' },
    { url: '/favicon-16x16.png', expectedType: 'image/png' },
    { url: '/apple-touch-icon.png', expectedType: 'image/png' },
    { url: '/site.webmanifest', expectedType: 'application/manifest+json' }
  ];

  for (const ep of endpoints) {
    await new Promise((resolve) => {
      http.get(`http://127.0.0.1:${PORT}${ep.url}`, (res) => {
        assert(res.statusCode === 200, `${ep.url} returned HTTP ${res.statusCode}`);
        const ctype = res.headers['content-type'] || '';
        assert(ctype.includes(ep.expectedType), `${ep.url} Content-Type is ${ctype} (expected ${ep.expectedType})`);
        let len = 0;
        res.on('data', chunk => len += chunk.length);
        res.on('end', () => {
          assert(len > 0, `${ep.url} returned body of ${len} bytes`);
          resolve();
        });
      }).on('error', (err) => {
        assert(false, `${ep.url} request failed: ${err.message}`);
        resolve();
      });
    });
  }

  server.close();

  console.log(`\n========================================`);
  console.log(`Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

testFaviconAssets().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
