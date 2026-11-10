const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/sharp');

const rootDir = path.resolve(__dirname, '..');

// Master SVG: 512x512 with official DIGENZ Monogram on Midnight Navy #101827
const masterSvg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg"
     width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="d_blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#80B5FF" />
      <stop offset="30%" stop-color="#3478F6" />
      <stop offset="70%" stop-color="#1e5dd6" />
      <stop offset="100%" stop-color="#103c8c" />
    </linearGradient>
    <linearGradient id="d_blueLight" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3478F6" />
      <stop offset="50%" stop-color="#80B5FF" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>
    <linearGradient id="d_blueDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e5dd6" />
      <stop offset="100%" stop-color="#0f2b66" />
    </linearGradient>
  </defs>

  <!-- Midnight Navy Canvas Background -->
  <rect width="512" height="512" rx="96" fill="#101827" />

  <!-- Official DIGENZ Geometric Monogram -->
  <g id="d_techD" transform="translate(256, 256) scale(7) translate(-45, -45.5)">
    <!-- Left Tech Pillar (Foundation & Backend Architecture) -->
    <polygon points="18,27 26,19 32,19 32,44 18,44" fill="url(#d_blueLight)" />
    <polygon points="18,48 32,48 32,73 26,73 18,65" fill="url(#d_blueDark)" />

    <!-- Center Bridge Node -->
    <polygon points="28,43 36,43 36,49 28,49" fill="url(#d_blueGrad)" />

    <!-- Right Dynamic 'D' Loop (Frontend & Innovation) -->
    <polygon points="38,19 56,19 72,35 60,35 48,27 38,27" fill="url(#d_blueLight)" />
    <polygon points="72,35 72,57 60,57 60,35" fill="url(#d_blueGrad)" />
    <polygon points="72,57 56,73 38,73 38,65 48,65 60,57" fill="url(#d_blueDark)" />

    <!-- Forward Arrow Core -->
    <polygon points="41,36 51,46 41,56 46,56 56,46 46,36" fill="url(#d_blueLight)" opacity="0.95" />

    <!-- Tech Nodes at Apex -->
    <circle cx="26" cy="19" r="2.2" fill="#FFFFFF" />
    <circle cx="56" cy="19" r="2.2" fill="#FFFFFF" />
  </g>
</svg>`;

// Also SVG for apple-touch-icon without rounded corners (full square #101827)
const appleSvg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg"
     width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="d_blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#80B5FF" />
      <stop offset="30%" stop-color="#3478F6" />
      <stop offset="70%" stop-color="#1e5dd6" />
      <stop offset="100%" stop-color="#103c8c" />
    </linearGradient>
    <linearGradient id="d_blueLight" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3478F6" />
      <stop offset="50%" stop-color="#80B5FF" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>
    <linearGradient id="d_blueDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e5dd6" />
      <stop offset="100%" stop-color="#0f2b66" />
    </linearGradient>
  </defs>

  <!-- Solid Midnight Navy for iOS Apple Touch Icon (iOS applies its own squircle mask) -->
  <rect width="512" height="512" fill="#101827" />

  <!-- Official DIGENZ Geometric Monogram -->
  <g id="d_techD" transform="translate(256, 256) scale(7) translate(-45, -45.5)">
    <polygon points="18,27 26,19 32,19 32,44 18,44" fill="url(#d_blueLight)" />
    <polygon points="18,48 32,48 32,73 26,73 18,65" fill="url(#d_blueDark)" />
    <polygon points="28,43 36,43 36,49 28,49" fill="url(#d_blueGrad)" />
    <polygon points="38,19 56,19 72,35 60,35 48,27 38,27" fill="url(#d_blueLight)" />
    <polygon points="72,35 72,57 60,57 60,35" fill="url(#d_blueGrad)" />
    <polygon points="72,57 56,73 38,73 38,65 48,65 60,57" fill="url(#d_blueDark)" />
    <polygon points="41,36 51,46 41,56 46,56 56,46 46,36" fill="url(#d_blueLight)" opacity="0.95" />
    <circle cx="26" cy="19" r="2.2" fill="#FFFFFF" />
    <circle cx="56" cy="19" r="2.2" fill="#FFFFFF" />
  </g>
</svg>`;

// Pack multiple PNG buffers into an ICO container
function createIco(images) {
  // images = [{ width, height, buffer }]
  const count = images.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // image count

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(img => img.buffer)]);
}

async function run() {
  console.log('--- Generating Official DIGENZ Favicon Assets ---');

  // 1. Write favicon.svg
  fs.writeFileSync(path.join(rootDir, 'favicon.svg'), masterSvg, 'utf8');
  console.log('✓ Wrote favicon.svg');

  // 2. Generate PNG sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 }, // Google Search Favicon recommended size
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
  ];

  const pngBuffers = {};
  for (const item of sizes) {
    const buf = await sharp(Buffer.from(masterSvg))
      .resize(item.size, item.size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(rootDir, item.name), buf);
    pngBuffers[item.size] = buf;
    console.log(`✓ Wrote ${item.name} (${buf.length} bytes)`);
  }

  // 3. Apple Touch Icon (180x180, solid square #101827)
  const appleTouchBuf = await sharp(Buffer.from(appleSvg))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(rootDir, 'apple-touch-icon.png'), appleTouchBuf);
  console.log(`✓ Wrote apple-touch-icon.png (${appleTouchBuf.length} bytes)`);

  // 4. Multi-resolution favicon.ico (16x16, 32x32, 48x48)
  const icoImages = [
    { width: 16, height: 16, buffer: pngBuffers[16] },
    { width: 32, height: 32, buffer: pngBuffers[32] },
    { width: 48, height: 48, buffer: pngBuffers[48] }
  ];
  const icoBuffer = createIco(icoImages);
  fs.writeFileSync(path.join(rootDir, 'favicon.ico'), icoBuffer);
  console.log(`✓ Wrote favicon.ico (${icoBuffer.length} bytes, multi-res: 16, 32, 48)`);

  // 5. site.webmanifest
  const manifest = {
    name: "DIGENZ — Digital • Creative • Enterprise Solutions",
    short_name: "DIGENZ",
    description: "Enterprise web development, custom software architectures, and global branding.",
    icons: [
      {
        src: "https://www.digendigital.com/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png"
      },
      {
        src: "https://www.digendigital.com/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png"
      },
      {
        src: "https://www.digendigital.com/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png"
      },
      {
        src: "https://www.digendigital.com/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "https://www.digendigital.com/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
    theme_color: "#101827",
    background_color: "#101827",
    display: "standalone",
    start_url: "https://www.digendigital.com/"
  };
  fs.writeFileSync(path.join(rootDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('✓ Wrote site.webmanifest');

  console.log('Favicon generation completed successfully!');
}

run().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
