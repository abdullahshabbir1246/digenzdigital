const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const CANONICAL_FAVICON_BLOCK = `<!-- DIGENZ Official Brand Favicons -->
<link rel="icon" type="image/x-icon" href="https://www.digendigital.com/favicon.ico">
<link rel="icon" type="image/svg+xml" href="https://www.digendigital.com/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="https://www.digendigital.com/favicon-48x48.png">
<link rel="icon" type="image/png" sizes="32x32" href="https://www.digendigital.com/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="https://www.digendigital.com/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="https://www.digendigital.com/apple-touch-icon.png">
<link rel="manifest" href="https://www.digendigital.com/site.webmanifest">
<meta name="theme-color" content="#101827">`;

function walkHtml(dir) {
  let files = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walkHtml(full));
    } else if (entry.endsWith('.html') || entry.endsWith('.htm')) {
      files.push(full);
    }
  }
  return files;
}

function updateFavicons() {
  const htmlFiles = walkHtml(rootDir);
  console.log('Found', htmlFiles.length, 'HTML files to check.');

  let updatedCount = 0;
  for (const filePath of htmlFiles) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Match <head> section
    const headMatch = content.match(/<head[\s\S]*?<\/head>/i);
    if (!headMatch) {
      console.warn('No <head> in', filePath);
      continue;
    }

    let headContent = headMatch[0];
    const originalHead = headContent;

    // Pattern matching all variations of icon and manifest links
    const iconRegex = /\s*<link[^>]+rel=["'](?:alternate\s+icon|icon|apple-touch-icon|shortcut\s+icon|manifest)["'][^>]*>/gi;
    const themeColorRegex = /\s*<meta[^>]+name=["']theme-color["'][^>]*>/gi;

    // Remove existing theme-color if present
    headContent = headContent.replace(themeColorRegex, '');

    // Check if there are icon links
    const matches = headContent.match(iconRegex);
    if (matches && matches.length > 0) {
      // Replace the first match with CANONICAL_FAVICON_BLOCK
      let firstReplaced = false;
      headContent = headContent.replace(iconRegex, () => {
        if (!firstReplaced) {
          firstReplaced = true;
          return '\n' + CANONICAL_FAVICON_BLOCK;
        }
        return ''; // Remove remaining icon links
      });
    } else {
      // If no icon tag was present, insert before </head> or after <meta viewport...>
      if (headContent.includes('</head>')) {
        headContent = headContent.replace('</head>', '\n' + CANONICAL_FAVICON_BLOCK + '\n</head>');
      }
    }

    if (headContent !== originalHead) {
      content = content.replace(originalHead, headContent);
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
    }
  }

  console.log(`Successfully updated favicon tags in ${updatedCount} HTML files!`);
}

updateFavicons();
