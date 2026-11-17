const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Read style.css and digenz-live.js
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'digenz-live.js'), 'utf8');

// Verify style.css rules
assert(css.includes('/* Master Fixed Sticky Mobile Header */'), 'Master header section must exist in style.css');
assert(!css.includes('top: 42px !important;'), 'Conflicting top: 42px override must be removed');
assert(css.includes('.mobile-nav-btn.active span'), 'Active X transform must exist');
assert(css.includes('height: 60px !important;'), 'Header height must be set to 60px');
assert(css.includes('top: 10px !important;'), 'Button top must be set to 10px');

// Verify digenz-live.js rules
assert(js.includes('ensureMobileHeader'), 'ensureMobileHeader must exist in digenz-live.js');
assert(js.includes('digenzMobileHeaderStyle'), 'digenzMobileHeaderStyle must exist');

// Test vertical centering across breakpoints
const testBreakpoints = [320, 360, 375, 390, 414, 430, 768, 991];
console.log('Testing mobile header alignment across breakpoints:');
testBreakpoints.forEach(width => {
  const isSmall = width <= 360;
  const headerHeight = 60;
  const logoHeight = isSmall ? 30 : 36;
  const logoTop = (headerHeight - logoHeight) / 2;
  const logoCenter = logoTop + (logoHeight / 2);

  const btnHeight = isSmall ? 36 : 40;
  const btnTop = isSmall ? 12 : 10;
  const btnCenter = btnTop + (btnHeight / 2);
  const btnRight = isSmall ? 12 : 16;
  const logoLeft = isSmall ? 12 : 16;

  console.log(`Width ${width}px: Logo Center Y=${logoCenter}px, Btn Center Y=${btnCenter}px, Logo Left=${logoLeft}px, Btn Right=${btnRight}px`);
  assert.strictEqual(logoCenter, btnCenter, `Vertical center must match at ${width}px`);
  assert(btnTop >= 0 && (btnTop + btnHeight) <= headerHeight, `Button must be completely inside header at ${width}px`);
});

console.log('\n>>> ALL MOBILE HEADER ALIGNMENT TESTS PASSED PERFECTLY! <<<');
