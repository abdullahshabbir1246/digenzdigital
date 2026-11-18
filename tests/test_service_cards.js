const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repoDir = 'C:\\Downloaded Web Sitesss\\pk.web-desires.com';

console.log('--- RUNNING TEST: Service Cards & Responsiveness Verification ---');

// 1. Verify assets/css/style.css
const cssPath = path.join(repoDir, 'assets/css/style.css');
const css = fs.readFileSync(cssPath, 'utf8');

assert.ok(css.includes('align-items: flex-start !important'), 'style.css must have align-items: flex-start for .slick-track');
assert.ok(!css.includes('.packfeatures {\n        height: auto !important;\n        min-height: 120px !important;\n        max-height: none !important;\n        flex: 1 1 auto !important;'), 'style.css must not have flex: 1 1 auto or min-height: 120px on packfeatures on mobile');
assert.ok(css.includes('flex: 0 0 auto !important'), 'style.css must have flex: 0 0 auto on packfeatures on mobile');
assert.ok(!css.includes('margin-top: auto !important'), 'style.css must not have margin-top: auto on extrainfo');
assert.ok(css.includes('margin-top: 14px !important'), 'style.css must have margin-top: 14px on extrainfo');

// 2. Verify assets/js/functions.js
const jsPath = path.join(repoDir, 'assets/js/functions.js');
const js = fs.readFileSync(jsPath, 'utf8');

assert.ok(js.includes('adaptiveHeight: true'), 'functions.js must have adaptiveHeight: true');
assert.ok(!js.includes('adaptiveHeight: false'), 'functions.js must not have adaptiveHeight: false');

// 3. Verify assets/js/digenz-live.js
const liveJsPath = path.join(repoDir, 'assets/js/digenz-live.js');
const liveJs = fs.readFileSync(liveJsPath, 'utf8');

assert.ok(liveJs.includes('digenzServiceCardStyle'), 'digenz-live.js must define digenzServiceCardStyle');
assert.ok(liveJs.includes('ensureServiceCards()'), 'digenz-live.js must invoke ensureServiceCards()');

console.log('✅ ALL LOCAL TESTS PASSED SUCCESSFULLY!');
