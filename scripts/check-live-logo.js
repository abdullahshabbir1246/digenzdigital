const https = require('https');

https.get('https://www.digendigital.com/pricing/startup-logo-package/?t=' + Date.now(), (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const h6Match = body.match(/<h6>[\s\S]*?<\/h6>/i);
    console.log('Live <h6> in HTML:');
    console.log(h6Match ? h6Match[0] : 'not found');
  });
});
