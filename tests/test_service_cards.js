const fs = require('fs');
const assert = require('assert');
const path = require('path');

const repoDir = 'C:\\Downloaded Web Sitesss\\pk.web-desires.com';

console.log('--- RUNNING TEST: Equal Height Pricing Cards & Internal Scrollbar ---');

// 1. Verify assets/css/style.css
const cssPath = path.join(repoDir, 'assets/css/style.css');
const css = fs.readFileSync(cssPath, 'utf8');

assert.ok(css.includes('align-items: stretch !important'), 'style.css must have align-items: stretch for equal height');
assert.ok(css.includes('height: 220px !important'), 'style.css must have height: 220px for packfeatures');
assert.ok(css.includes('max-height: 220px !important'), 'style.css must have max-height: 220px for packfeatures');
assert.ok(css.includes('overflow-y: auto !important'), 'style.css must have overflow-y: auto for packfeatures internal scrolling');
assert.ok(css.includes('scrollbar-color: #3478F6 #1e293b !important'), 'style.css must have DIGENZ blue scrollbar');
assert.ok(css.includes('margin-top: auto !important'), 'style.css must have margin-top: auto on extrainfo/viewdetails');

// 2. Verify assets/js/functions.js
const jsPath = path.join(repoDir, 'assets/js/functions.js');
const js = fs.readFileSync(jsPath, 'utf8');

assert.ok(js.includes('adaptiveHeight: false'), 'functions.js must have adaptiveHeight: false for equal height consistency');

// 3. Verify assets/js/digenz-live.js
const liveJsPath = path.join(repoDir, 'assets/js/digenz-live.js');
const liveJs = fs.readFileSync(liveJsPath, 'utf8');

assert.ok(liveJs.includes('digenzServiceCardStyle'), 'digenz-live.js must define digenzServiceCardStyle');
assert.ok(liveJs.includes('height: 220px !important'), 'digenz-live.js must have height: 220px for packfeatures');
assert.ok(liveJs.includes('scrollbar-color: #3478F6'), 'digenz-live.js must have DIGENZ blue scrollbar');

console.log('✅ ALL LOCAL TESTS PASSED SUCCESSFULLY!');
