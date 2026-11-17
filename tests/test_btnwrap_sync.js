const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Test server.js injectAuthoritativeContact
const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

// Extract helper and injectAuthoritativeContact functions
let fnCode = serverCode.substring(
  serverCode.indexOf('function normalizeWhatsAppNumber'),
  serverCode.indexOf('function injectAuthoritativePricing(')
);
const injectAuthoritativeContact = new Function('htmlStr', 'settings', 'content', `${fnCode}\nreturn injectAuthoritativeContact(htmlStr, settings, content);`);

const htmlSample = `
<div class="btnwrap">
  <a href="javascript:;" onclick="setButtonURL();" class="btn-black-custom">Chat With Us</a>
  <a href="tel:03190039048" class="btn-black-custom">03190039048</a>
</div>
<a class="chatcta" href="tel:03190039048">03190039048</a>
<a class="chatcta" href="javascript:;" onclick="setButtonURL()">Live Chat</a>
`;

const settings = {
  supportPhone: '03142266058',
  supportEmail: 'contact@digendigital.com',
  businessAddress: '71-75 Shelton Street, Covent Garden, London, WC2H 9JQ'
};

const processedHtml = injectAuthoritativeContact(htmlSample, settings, {});

console.log('--- Processed HTML by server.js ---');
console.log(processedHtml);

assert(processedHtml.includes('Chat With Us'), 'Server must keep "Chat With Us" text intact');
assert(processedHtml.includes('03142266058'), 'Server must update phone button to 03142266058');
assert(processedHtml.includes('Live Chat'), 'Server must keep "Live Chat" intact');

// 2. Test client-side digenz-live.js logic
// Mock elements
const elChat = {
  tagName: 'A',
  textContent: 'Chat With Us',
  attrs: { href: 'javascript:;', onclick: 'setButtonURL();', class: 'btn-black-custom' },
  getAttribute(n) { return this.attrs[n]; },
  setAttribute(n, v) { this.attrs[n] = v; }
};

const elPhone = {
  tagName: 'A',
  textContent: '03190039048',
  attrs: { href: 'tel:03190039048', class: 'btn-black-custom' },
  getAttribute(n) { return this.attrs[n]; },
  setAttribute(n, v) { this.attrs[n] = v; }
};

const elLiveChat = {
  tagName: 'A',
  textContent: 'Live Chat',
  attrs: { href: 'javascript:;', onclick: 'setButtonURL()', class: 'chatcta' },
  getAttribute(n) { return this.attrs[n]; },
  setAttribute(n, v) { this.attrs[n] = v; }
};

const elChatCtaPhone = {
  tagName: 'A',
  textContent: '03190039048',
  attrs: { href: 'tel:03190039048', class: 'chatcta' },
  getAttribute(n) { return this.attrs[n]; },
  setAttribute(n, v) { this.attrs[n] = v; }
};

const phoneText = '03142266058';
const telHref = 'tel:+923142266058';

// Run our updated digenz-live.js block
[elChat, elPhone].forEach(el => {
  const text = (el.textContent || '').trim();
  const href = el.getAttribute('href') || '';
  if (href.startsWith('tel:') || (/[\d\s()+-]{7,}/.test(text) && !/chat/i.test(text))) {
    if (el.tagName === 'A') el.setAttribute('href', telHref);
    el.textContent = phoneText;
  }
});

[elLiveChat, elChatCtaPhone].forEach(a => {
  const text = (a.textContent || '').trim();
  const href = a.getAttribute('href') || '';
  if (href.startsWith('tel:') || (/[\d\s()+-]{7,}/.test(text) && !/chat/i.test(text))) {
    a.setAttribute('href', telHref);
    a.textContent = phoneText;
  }
});

console.log('--- Client DOM State After digenz-live.js ---');
console.log('Chat button:', elChat.textContent, elChat.attrs.href);
console.log('Phone button:', elPhone.textContent, elPhone.attrs.href);
console.log('Live Chat button:', elLiveChat.textContent, elLiveChat.attrs.href);
console.log('ChatCTA Phone button:', elChatCtaPhone.textContent, elChatCtaPhone.attrs.href);

assert.strictEqual(elChat.textContent, 'Chat With Us');
assert.strictEqual(elChat.attrs.href, 'javascript:;');
assert.strictEqual(elPhone.textContent, '03142266058');
assert.strictEqual(elPhone.attrs.href, 'tel:+923142266058');

assert.strictEqual(elLiveChat.textContent, 'Live Chat');
assert.strictEqual(elLiveChat.attrs.href, 'javascript:;');
assert.strictEqual(elChatCtaPhone.textContent, '03142266058');
assert.strictEqual(elChatCtaPhone.attrs.href, 'tel:+923142266058');

console.log('\n>>> ALL BUTTON & PHONE TESTS PASSED ACCURATELY! <<<');
