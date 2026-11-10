const raw = '<h6><span class="old">$125</span> $50 <span><b class="monthss"></b>Old desc</span></h6>';
const detailPriceHtml = '<h6><span class="old">$125</span> $105 <span><b class="monthss"></b>New desc</span></h6>';

// Notice what happened with String.replace without a function:
const bad = raw.replace(/<h6>(?:<span class="old">[\s\S]*?<\/span>)?([\s\S]*?)<\/h6>/i, detailPriceHtml);
console.log('BAD (without function):\n', bad);

// With function replacer:
const good = raw.replace(/<h6>[\s\S]*?<\/h6>/i, () => detailPriceHtml);
console.log('\nGOOD (with function replacer):\n', good);
