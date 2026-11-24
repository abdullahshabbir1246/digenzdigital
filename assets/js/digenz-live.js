/**
 * DIGENZ Live Website Dynamic Synchronization Engine
 * Automatically binds public website pages with the real-time DIGENZ database:
 * - Dynamic Pricing & Package Cards Sync (name, price, sale price, features, badges, status)
 * - Dynamic Banner Content Sync (headline, subtitle, button text & link)
 * - Dynamic Category & Contact Info Sync
 * - Production Lead Capture Pipeline (creates real database orders & customers)
 */

(function() {
  'use strict';

  const CACHE_BUST = Date.now();

  // Eager background settings fetch to hydrate WhatsApp and Address immediately
  fetchJSON('/api/settings').then(s => {
    if (s) {
      const rawWA = s.whatsappNumber || s.whatsapp;
      const waGreeting = s.whatsappGreeting || 'Hi DIGENZ, I am interested in your services. Please share more information.';
      if (rawWA) {
        const waDigits = normalizeWhatsApp(rawWA);
        if (waDigits) {
          applyWhatsAppUrl(`https://wa.me/${waDigits}?text=${encodeURIComponent(waGreeting)}`);
        }
      }
      if (s.businessAddress || s.address) {
        syncAddressDOM(s.businessAddress || s.address);
      }
    }
  }).catch(() => {});

  async function fetchJSON(url) {
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // Helper: Normalize strings for matching
  function norm(str) {
    return (str || '').toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]/g, '');
  }

  // =========================================================================
  // 1. DYNAMIC PRODUCTS & PRICING SYNCHRONIZER
  // =========================================================================
  function syncProducts(products, settings) {
    const phoneText = (settings && settings.supportPhone) ? settings.supportPhone.trim() : '03190039048';
    const rawDigits = phoneText.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('92') ? rawDigits : (rawDigits.startsWith('03') ? ('92' + rawDigits.substring(1)) : (rawDigits.startsWith('0') ? ('92' + rawDigits.substring(1)) : rawDigits));
    const telHref = 'tel:+' + cleanPhone;
    if (!Array.isArray(products) || products.length === 0) return;
    const currency = (settings && settings.currencySymbol) || '$';

    const categoryTabMap = {
      'cat-logo': ['.tabs-logo', '.tabs-logodesign'],
      'cat-webdesign': ['.tabs-webdesign', '.tabs-customwebsite', '.tabs-web'],
      'cat-ecommerce': ['.tabs-ecommerce', '.tabs-ecom'],
      'cat-branding': ['.tabs-branding', '.tabs-corporatebranding'],
      'cat-animation': ['.tabs-animation', '.tabs-videoanimation'],
      'cat-seo': ['.tabs-seo'],
      'cat-smm': ['.tabs-smm'],
      'cat-combo': ['.tabs-combo', '.tabs-packages']
    };

    // A. Update Existing Cards on Homepage & Packages Page
    const cards = document.querySelectorAll('.packwrap');
    const matchedProductIds = new Set();

    cards.forEach(card => {
      const h3 = card.querySelector('h3');
      if (!h3) return;
      const cardTitleNorm = norm(h3.innerText || h3.textContent);

      // Find matching product by name or slug
      const prod = products.find(p => norm(p.name) === cardTitleNorm || norm(p.slug) === cardTitleNorm);
      if (!prod) return;

      matchedProductIds.add(prod.id);
      card.setAttribute('data-product-id', prod.id);

      // If product is draft or inactive, hide card
      const parentLi = card.closest('li');
      if (prod.status !== 'published') {
        if (parentLi) parentLi.style.display = 'none';
        return;
      } else {
        if (parentLi) parentLi.style.display = '';
      }

      // 1. Update Title
      if (prod.name) {
        // Keep clean formatted text
        h3.innerHTML = prod.name.replace(/ Package/i, ' <br> Package');
      }

      // 2. Update Pricing (h4)
      const h4 = card.querySelector('h4');
      if (h4) {
        if (prod.salePrice && prod.salePrice < prod.price) {
          const currPrefix = currency.trim().length === 1 ? currency.trim() : (currency.trim() + " ");
          h4.innerHTML = `<span>Starting at </span> ${currPrefix}${Number(prod.salePrice).toLocaleString()} <small style="text-decoration: line-through; opacity: 0.6; font-size: 0.68em; margin-left: 6px; font-weight: normal; color: #8892b0;">${currPrefix}${Number(prod.price).toLocaleString()}</small>`;
        } else {
          const currPrefix = currency.trim().length === 1 ? currency.trim() : (currency.trim() + " ");
          h4.innerHTML = `<span>Starting at </span> ${currPrefix}${Number(prod.price).toLocaleString()}`;
        }
      }

      // 3. Update Subtitle / Description (h5 or h2)
      const descEl = card.querySelector('h5, h2');
      if (descEl && prod.description) {
        descEl.textContent = prod.description;
      }

      // 4. Update Features List (Strict Vertical Layout with Fixed Icon & Flexible Text)
      const featuresUl = card.querySelector('ul.packfeatures, ul.listpacks');
      if (featuresUl) {
        featuresUl.classList.remove('list-scroll');
        if (window.jQuery && $(featuresUl).hasClass('mCustomScrollbar')) {
          try { $(featuresUl).mCustomScrollbar('destroy'); } catch(e) {}
        }
      }
      if (featuresUl && Array.isArray(prod.features) && prod.features.length > 0) {
        const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3478F6" width="18" height="18" aria-hidden="true"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.74-5.25z" clip-rule="evenodd"/></svg>';
        featuresUl.innerHTML = prod.features.map(f => `
          <li class="feature-item">
            <span class="feature-icon">${iconSvg}</span>
            <span class="feature-text">${f}</span>
          </li>
        `).join('');
      }

      // 5. Update Badge (Popular / Best Seller / Discount)
      let badgeEl = card.querySelector('.digenz-badge');
      if (prod.badge) {
        if (!badgeEl) {
          badgeEl = document.createElement('span');
          badgeEl.className = 'digenz-badge';
          badgeEl.style.cssText = 'background: #3478F6; color: #101827; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;';
          card.insertBefore(badgeEl, card.firstChild);
        }
        badgeEl.textContent = prod.badge;
      } else if (badgeEl) {
        badgeEl.remove();
      }

      // 6. Update CTA button link with product context
      const btn = card.querySelector('.btn-pack');
      if (btn) {
        btn.setAttribute('data-pkg-name', prod.name);
        btn.setAttribute('data-pkg-price', prod.salePrice || prod.price);
      }

      // 7. Ensure VIEW DETAILS button is present and points to proper detail page
      let vdLink = card.querySelector('.viewdetails');
      if (!vdLink) {
        vdLink = document.createElement('a');
        vdLink.className = 'viewdetails';
        card.appendChild(vdLink);
      }
      vdLink.textContent = 'VIEW DETAILS';
      if (prod.slug) {
        const isSubdir = window.location.pathname.includes('/pricing/') || 
                         window.location.pathname.includes('/packages/') || 
                         window.location.pathname.includes('/custom-') || 
                         window.location.pathname.includes('/branding') || 
                         window.location.pathname.includes('/seo') || 
                         window.location.pathname.includes('/video-') || 
                         window.location.pathname.includes('/web-') || 
                         window.location.pathname.includes('/wordpress-') || 
                         window.location.pathname.includes('/ecommerce-');
        vdLink.href = (isSubdir ? '../' : '') + 'pricing/' + prod.slug + '/index.html';
      }
    });

    // B. Detail / Pricing Individual Pages (e.g. /pricing/startup-website-package/)
    const subsPac = document.querySelector('.subs-pac');
    if (subsPac) {
      const pageTitleEl = document.querySelector('.myheading') || subsPac.querySelector('h3');
      const pageTitleNorm = pageTitleEl ? norm(pageTitleEl.innerText || pageTitleEl.textContent) : '';
      const prod = products.find(p => norm(p.name) === pageTitleNorm || norm(p.slug) === pageTitleNorm || window.location.pathname.includes(p.slug));
      if (prod && prod.status === 'published') {
        const h3 = subsPac.querySelector('h3');
        if (h3) h3.innerHTML = prod.name.replace(/ Package/i, ' <br> Package');

        const h6 = subsPac.querySelector('h6');
        if (h6) {
          if (prod.salePrice && prod.salePrice < prod.price) {
            h6.innerHTML = `<span class="old">${currency}${Number(prod.price).toLocaleString()}</span> ${currency}${Number(prod.salePrice).toLocaleString()} <span><b class="monthss"></b>${prod.description || ''}</span>`;
          } else {
            h6.innerHTML = `${currency}${Number(prod.price).toLocaleString()} <span><b class="monthss"></b>${prod.description || ''}</span>`;
          }
        }

        const subList = document.querySelector('.subscription-list');
        if (subList && Array.isArray(prod.features) && prod.features.length > 0) {
          subList.innerHTML = prod.features.map(f => `
            <li>
              <h6>${f}</h6>
              <span class="tick"></span>
            </li>
          `).join('');
        }

        const numberBtn = subsPac.querySelector('a.numberbtn');
        if (numberBtn) {
          numberBtn.href = telHref;
          numberBtn.innerHTML = '<i class="fa fa-phone-square"></i> ' + phoneText;
        }

        const gvePlns = document.querySelector('.gveplns p');
        if (gvePlns && gvePlns.innerText.includes('Give us a Call')) {
          gvePlns.innerHTML = 'Give us a Call <a href="' + telHref + '" style="color: #3478F6;">' + phoneText + '</a> and we can set you up, or <a href="../../packages/index.html">check our pricing plans</a>';
        }
      }
    }

    // C. Dynamic Insertion of Newly Created Admin Products
    Object.entries(categoryTabMap).forEach(([catId, selectors]) => {
      const catProducts = products.filter(p => p.categoryId === catId && p.status === 'published');
      selectors.forEach(sel => {
        const tabContainer = document.querySelector(sel);
        if (!tabContainer) return;
        const sliderUl = tabContainer.querySelector('ul.pckkslider');
        if (!sliderUl) return;

        catProducts.forEach(prod => {
          if (!matchedProductIds.has(prod.id)) {
            // Check if card with this title already exists in this tab
            const exists = Array.from(sliderUl.querySelectorAll('.packwrap h3')).some(h => norm(h.textContent) === norm(prod.name));
            if (!exists) {
              const newLi = document.createElement('li');
              const currPrefix = currency.trim().length === 1 ? currency.trim() : (currency.trim() + " ");
              const priceDisplay = prod.salePrice && prod.salePrice < prod.price
                ? `<span>Starting at </span> ${currPrefix}${Number(prod.salePrice).toLocaleString()} <small style="text-decoration: line-through; opacity: 0.6; font-size: 0.68em; margin-left: 6px; font-weight: normal; color: #8892b0;">${currPrefix}${Number(prod.price).toLocaleString()}</small>`
                : `<span>Starting at </span> ${currPrefix}${Number(prod.price).toLocaleString()}`;

              const badgeHtml = prod.badge
                ? `<span class="digenz-badge" style="background: #3478F6; color:#101827; padding:3px 10px; border-radius:3px; font-size:11px; font-weight:700; display:inline-block; margin-bottom:8px; text-transform:uppercase;">${prod.badge}</span>`
                : '';

              const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3478F6" width="18" height="18" aria-hidden="true"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.74-5.25z" clip-rule="evenodd"/></svg>';
              const featuresHtml = (prod.features || []).map(f => `
                <li class="feature-item">
                  <span class="feature-icon">${iconSvg}</span>
                  <span class="feature-text">${f}</span>
                </li>
              `).join('');

              newLi.innerHTML = `
                <div class="packwrap" data-product-id="${prod.id}">
                  ${badgeHtml}
                  <h3>${prod.name.replace(/ Package/i, ' <br> Package')}</h3>
                  <h4>${priceDisplay}</h4>
                  <h5>${prod.description || ''}</h5>
                  <ul class="packfeatures">
                    ${featuresHtml}
                  </ul>
                  <a href="/pricing/${prod.slug}/index.html" class="viewdetails">VIEW DETAILS</a>
                  <a href="/get-a-quote/index.html?pkg=${encodeURIComponent(prod.name)}" class="btn-pack">Start</a>
                  <div class="actions row web">
                    <div class="col-md-6 col-6"><a href="${telHref}" class="action-no clearfix pull-right sea"><span><small>Share your idea?</small> ${phoneText}</span></a></div>
                    <div class="col-md-6 col-6"><a href="javascript:;" onclick="setButtonURL();" class="action-chat clearfix pull-right sea"><span><small>Want to discuss?</small> Live Chat Now</span></a></div>
                  </div>
                </div>
              `;
              sliderUl.appendChild(newLi);
            }
          }
        });
      });
    });
  }

  // =========================================================================
  // 2. DYNAMIC BANNERS SYNCHRONIZER
  // =========================================================================
  function syncBanners(banners) {
    if (!Array.isArray(banners) || banners.length === 0) return;
    const activeBanner = banners.find(b => b.isActive) || banners[0];
    if (!activeBanner) return;

    // Homepage Hero Headline
    const heroTitle = document.querySelector('.tophd-ind');
    if (heroTitle && activeBanner.title) {
      heroTitle.textContent = activeBanner.title;
    }

    // Hero Subtitle / Supporting text
    if (activeBanner.subtitle) {
      const heroSub = document.querySelector('.tophd-ind + .row p, .ban-text p, .offset-md-1 p');
      if (heroSub && !heroSub.closest('.footer-top')) {
        heroSub.textContent = activeBanner.subtitle;
      }
    }

    // CTA Button
    if (activeBanner.buttonText) {
      const heroBtn = document.querySelector('.ban-form input[type="submit"], .ban-text a.btn-red, .btn-red');
      if (heroBtn) {
        if (heroBtn.tagName === 'INPUT') heroBtn.value = activeBanner.buttonText;
        else heroBtn.textContent = activeBanner.buttonText;
        if (activeBanner.buttonLink && heroBtn.tagName === 'A') {
          heroBtn.setAttribute('href', activeBanner.buttonLink);
        }
      }
    }
  }

  // =========================================================================
  // 3. CONTACT & SETTINGS SYNCHRONIZER
  // =========================================================================
  function syncSettings(settings) {
    if (!settings) return;

    // A. Maintenance Mode Check
    if (settings.maintenanceMode && !window.location.pathname.startsWith('/admin')) {
      document.body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#101827; color:#F5F7FA; font-family:sans-serif; text-align:center; padding:20px;">
          <div>
            <h1 style="color: #3478F6; font-size:36px; margin-bottom:15px; font-weight:700;">System Scheduled Maintenance</h1>
            <p style="font-size:18px; max-width:600px; line-height:1.6; color:#a0aec0; margin: 0 auto 20px;">We are currently upgrading the DIGENZ platform with high-performance enhancements. We will be back online shortly.</p>
            ${settings.supportEmail ? `<p style="margin: 8px 0; color:#80B5FF; font-size:15px;">Email Support: <a href="mailto:${settings.supportEmail}" style="color:#FFFFFF; text-decoration:underline;">${settings.supportEmail}</a></p>` : ''}
            ${settings.supportPhone ? `<p style="margin: 8px 0; color:#80B5FF; font-size:15px;">Phone Support: <a href="tel:${settings.supportPhone.replace(/[\s()-]/g, '')}" style="color:#FFFFFF; text-decoration:underline;">${settings.supportPhone}</a></p>` : ''}
          </div>
        </div>
      `;
      return;
    }

        // B. Support Phone Dynamic Update Across Entire Page
    if (settings.supportPhone) {
      const phoneText = settings.supportPhone.trim();
      const rawDigits = phoneText.replace(/\D/g, '');
      const cleanPhone = rawDigits.startsWith('92') ? rawDigits : (rawDigits.startsWith('03') ? ('92' + rawDigits.substring(1)) : (rawDigits.startsWith('0') ? ('92' + rawDigits.substring(1)) : rawDigits));
      const telHref = 'tel:+' + cleanPhone;

      // 1. Process all tel: anchor links with precision
      document.querySelectorAll('a[href^="tel:"]').forEach(a => {
        a.setAttribute('href', telHref);

        // A. Floating call widget (.call_wrap) - preserve icon in span.icoo, only update text span
        if (a.classList.contains('call_wrap')) {
          const textSpan = a.querySelector('span:not(.icoo)');
          if (textSpan) {
            textSpan.textContent = phoneText;
          }
          const icooSpan = a.querySelector('span.icoo');
          if (icooSpan && !icooSpan.querySelector('i')) {
            icooSpan.innerHTML = '<i class="icon-phone2"></i>';
          }
          return;
        }

        // B. Icon-only buttons (.callusnow) - never insert text
        if (a.classList.contains('callusnow')) {
          return;
        }

        // C. Fixed-label action buttons - preserve label
        if (a.classList.contains('viewdetails') || a.classList.contains('btn-black')) {
          return;
        }

        // D. Card action link (.action-no)
        if (a.classList.contains('action-no')) {
          const span = a.querySelector('span');
          if (span) {
            const small = span.querySelector('small');
            span.innerHTML = (small ? small.outerHTML : '') + ' ' + phoneText;
          } else {
            a.textContent = phoneText;
          }
          return;
        }

        // E. Header phone link with icon (e.g. <li><a ...><i class="fa fa-phone"></i> phone</a></li>)
        const icon = a.querySelector('i, svg');
        if (icon && !a.classList.contains('callus')) {
          let updatedText = false;
          a.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && /[\d()+-]{6,}/.test(node.nodeValue)) {
              node.nodeValue = ' ' + phoneText;
              updatedText = true;
            }
          });
          if (!updatedText) {
            a.innerHTML = icon.outerHTML + ' ' + phoneText;
          }
          return;
        }

        // F. Callus banner ("Free writing consultation <i class="fa fa-phone"></i> phone")
        if (a.classList.contains('callus')) {
          const iconEl = a.querySelector('i, svg');
          if (iconEl) {
            let replaced = false;
            a.childNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && /[\d()+-]{6,}/.test(node.nodeValue)) {
                node.nodeValue = ' ' + phoneText;
                replaced = true;
              }
            });
            if (!replaced) {
              a.innerHTML = 'Free writing consultation ' + iconEl.outerHTML + ' ' + phoneText;
            }
          }
          return;
        }

        // G. Links containing span:not(.icoo)
        const innerSpan = a.querySelector('span:not(.icoo)');
        if (innerSpan) {
          const small = innerSpan.querySelector('small');
          if (small) {
            innerSpan.innerHTML = small.outerHTML + ' ' + phoneText;
          } else {
            innerSpan.textContent = phoneText;
          }
          return;
        }

        // H. Plain text phone link
        const currentText = a.textContent.trim();
        if (/^[\d\s()+-]{7,}$/.test(currentText)) {
          a.textContent = phoneText;
        }
      });

      // 2. Floating Call Widget (.call_wrap) - explicit clean check
      document.querySelectorAll('.call_wrap').forEach(wrap => {
        wrap.setAttribute('href', telHref);
        const textSpan = wrap.querySelector('span:not(.icoo)');
        if (textSpan) {
          textSpan.textContent = phoneText;
        }
        const icooSpan = wrap.querySelector('span.icoo');
        if (icooSpan && !icooSpan.querySelector('i')) {
          icooSpan.innerHTML = '<i class="icon-phone2"></i>';
        }
      });

      // 3. Action buttons (.btn-black-custom, a.chatcta) - update phone buttons only, NEVER touch chat buttons
      document.querySelectorAll('.btn-black-custom').forEach(el => {
        const text = (el.textContent || '').trim();
        const href = el.getAttribute('href') || '';
        // Only update if it is an actual phone element, NEVER "Chat With Us" or chat buttons
        if (href.startsWith('tel:') || (/[\d\s()+-]{7,}/.test(text) && !/chat/i.test(text))) {
          if (el.tagName === 'A') el.setAttribute('href', telHref);
          el.textContent = phoneText;
        }
      });

      document.querySelectorAll('a.chatcta').forEach(a => {
        const text = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        if (href.startsWith('tel:') || (/[\d\s()+-]{7,}/.test(text) && !/chat/i.test(text))) {
          a.setAttribute('href', telHref);
          a.textContent = phoneText;
        }
      });

      // 4. 'or Call Now <b>...</b>' in banners and contact sections
      document.querySelectorAll('p b, div b, span b, .slash b').forEach(b => {
        if (/^[\d\s()+-]{7,}$/.test(b.textContent.trim())) {
          b.textContent = phoneText;
        }
      });

      // 5. Global Deep Text-Node Replacement across all text nodes in DOM (excluding icons and scripts)
      const oldPhonePatterns = [
        /\+?92\s*306\s*1284045/g,
        /\+?923061284045/g,
        /0306[\s-]?1284045/g,
        /\+1\s*\(555\)\s*019-2834/g,
        /\+1\s*\(213\)\s*221-2842/g
      ];

      try {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node) {
              if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
              const parent = node.parentElement;
              if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'TEXTAREA' || parent.tagName === 'INPUT' || parent.classList.contains('icoo'))) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          },
          false
        );

        let currentNode;
        while ((currentNode = walker.nextNode())) {
          let text = currentNode.nodeValue;
          let changed = false;
          oldPhonePatterns.forEach(pat => {
            if (pat.test(text)) {
              text = text.replace(pat, phoneText);
              changed = true;
            }
          });
          if (changed) {
            currentNode.nodeValue = text;
          }
        }
      } catch (e) {}

      // 5B. Synchronize Address if in settings
      try { const addressToSync = settings.businessAddress || settings.address; if (addressToSync) { syncAddressDOM(addressToSync); } } catch (e) { console.warn("[Sync] Address sync:", e.message); }

      // 6. Update Slick carousel cloned slides
      function updateSlickClones() {
        document.querySelectorAll('.slick-cloned a[href^="tel:"]').forEach(a => {
          a.setAttribute('href', telHref);
          const span = a.querySelector('span');
          if (span) {
            const small = span.querySelector('small');
            span.innerHTML = (small ? small.outerHTML : '') + ' ' + phoneText;
          }
        });
      }
      updateSlickClones();
      setTimeout(updateSlickClones, 300);
      setTimeout(updateSlickClones, 1000);
      setTimeout(updateSlickClones, 2500);
    }

    // C. Support Email Dynamic Update Across Entire Page
    if (settings.supportEmail) {
      const email = settings.supportEmail.trim();

      // 1. All mailto: anchors
      document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        a.setAttribute('href', 'mailto:' + email);
        if (a.textContent.includes('@')) {
          a.textContent = email;
        }
      });

      // 2. Explicit email class containers
      document.querySelectorAll('.support-email, .contact-email, .footer-email').forEach(el => {
        el.textContent = email;
      });
    }

    // E. Dynamic WhatsApp Business Number & Greeting Update
    try { const rawWA = settings.whatsappNumber || settings.whatsapp; const waGreeting = settings.whatsappGreeting || "Hi DIGENZ, I am interested in your services. Please share more information."; if (rawWA) { const waDigits = normalizeWhatsApp(rawWA); if (waDigits) { applyWhatsAppUrl(`https://wa.me/${waDigits}?text=${encodeURIComponent(waGreeting)}`); } } } catch (e) { console.warn("[Sync] WhatsApp sync:", e.message); }

    // D. Dynamic Currency Symbol & Add-On Update on Pricing Cards
    if (settings.currencySymbol) {
      const currency = settings.currencySymbol.trim();
      const currPrefix = currency.length === 1 ? currency : (currency + " ");
      document.querySelectorAll('.packwrap h4, .subs-pac h6').forEach(el => {
        const html = el.innerHTML;
        const updatedHtml = html.replace(/(<span>Starting at\s*<\/span>\s*)([^\d<]+)(\d[\d,]*)/i, (m, p1, oldCur, p3) => {
          return `${p1}${currPrefix}${p3}`;
        });
        if (updatedHtml !== html) {
          el.innerHTML = updatedHtml;
        }
      });

      // Dynamic conversion of any legacy add-on notes
      document.querySelectorAll('.extrainfo').forEach(el => {
        if (el.textContent.includes('PKR')) {
          el.textContent = el.textContent.replace(/PKR\s*3,?000/g, '$50')
                                         .replace(/PKR\s*5,?000/g, '$50')
                                         .replace(/PKR\s*9,?999/g, '$100')
                                         .replace(/PKR\s*\d[\d,]*/g, '$50');
        }
      });
    }
  }

    // Helper: Escape HTML characters safely
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Resolve proper URL for category
  function resolveCategoryUrl(cat) {
    if (!cat) return '/packages/index.html';
    if (cat.url && (cat.url.startsWith('/') || cat.url.startsWith('http'))) return cat.url;
    const slug = (cat.slug || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    const routeMap = {
      'logo-design': '/branding/index.html',
      'branding': '/branding/index.html',
      'corporate-branding': '/branding/index.html',
      'custom-website-design': '/custom-website-design/index.html',
      'web-design': '/custom-website-design/index.html',
      'wordpress-development': '/wordpress-development/index.html',
      'ecommerce-website-development': '/ecommerce-website-development/index.html',
      'ecommerce-solutions': '/ecommerce-website-development/index.html',
      'web-application-development': '/web-application-development/index.html',
      'backend-development': '/backend-development/index.html',
      'mobile-application': '/mobile-application/index.html',
      'mobile-app-development': '/mobile-application/index.html',
      'website-maintenace': '/website-maintenace/index.html',
      'website-maintenance': '/website-maintenace/index.html',
      'domain-and-hosting': '/domain-and-hosting/index.html',
      'video-animation': '/video-animation/index.html',
      'seo': '/seo/index.html',
      'search-engine-optimization': '/seo/index.html',
      'smm': '/smm/index.html',
      'social-media-marketing': '/smm/index.html',
      'combo-packages': '/packages/index.html'
    };
    if (routeMap[slug]) return routeMap[slug];
    if (slug.startsWith('http://') || slug.startsWith('https://')) return slug;
    return '/' + (slug || 'packages') + '/index.html';
  }

  // Helper: Resolve service icon for category
  function resolveCategoryIcon(c) {
    const slug = (c.slug || c.id || '').toLowerCase();
    const name = (c.name || '').toLowerCase();

    // 1. Direct mapping for the 8 core services (highest priority 3D icons)
    if (slug.includes('logo') || name.includes('logo')) return '/assets/images/services-3d/logo-design.png';
    if (slug.includes('custom-web') || slug.includes('webdesign') || name.includes('web design') || slug.includes('wordpress')) return '/assets/images/services-3d/web-design.png';
    if (slug.includes('ecom') || name.includes('ecom')) return '/assets/images/services-3d/ecommerce.png';
    if (slug.includes('brand') || name.includes('brand')) return '/assets/images/services-3d/corporate-branding.png';
    if (slug.includes('anim') || slug.includes('video') || name.includes('video')) return '/assets/images/services-3d/video-animation.png';
    if (slug.includes('seo') || name.includes('seo') || name.includes('search engine')) return '/assets/images/services-3d/seo.png';
    if (slug.includes('mobile') || name.includes('mobile') || name.includes('app')) return '/assets/images/services-3d/mobile-app.png';
    if (slug.includes('combo') || slug.includes('package') || name.includes('combo') || name.includes('stack') || slug.includes('backend')) return '/assets/images/services-3d/combo-packages.png';

    // 2. Custom category image if valid and not legacy bannericon / generic
    if (c.image && !c.image.includes('bannericons') && !c.image.includes('digenz-icon.svg') && (c.image.includes('.svg') || c.image.includes('.png') || c.image.includes('.webp'))) {
      return c.image;
    }
    return '/assets/images/services-3d/web-design.png';
  }

  // =========================================================================
  // 3B. DYNAMIC CATEGORIES & SERVICES SYNCHRONIZER (Atlas Single Source of Truth)
  // =========================================================================
  function syncCategories(categories) {
    if (!Array.isArray(categories) || categories.length === 0) return;
    const activeCats = categories
      .filter(c => c && c.status === 'active')
      .sort((a, b) => (Number(a.displayOrder) || 99) - (Number(b.displayOrder) || 99));

    // A. Desktop Navigation Dropdown
    const servicesDropdown = document.querySelector('.main-menu .dropdown ul, [data-services-container="desktop"]');
    if (servicesDropdown) {
      const navCats = activeCats.filter(c => c.showInNav !== false);
      const newHtml = navCats.map(c => 
        `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`
      ).join('\n                    ');
      if (servicesDropdown.innerHTML.trim() !== newHtml.trim()) {
        servicesDropdown.innerHTML = newHtml;
      }
    }

    // B. Mobile Navigation Dropdown
    const mobileDropdown = document.querySelector('.mobile-nav .firstlevel, [data-services-container="mobile"]');
    if (mobileDropdown) {
      const navCats = activeCats.filter(c => c.showInNav !== false);
      const newMobileHtml = navCats.map(c => 
        `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`
      ).join('\n          ');
      if (mobileDropdown.innerHTML.trim() !== newMobileHtml.trim()) {
        mobileDropdown.innerHTML = newMobileHtml;
      }
    }

    // C. Homepage Services Icons Grid
    const homeIcons = document.querySelector('ul.listboxes.serviceicons, [data-services-container="home-icons"]');
    if (homeIcons) {
      const homeCats = activeCats.filter(c => c.showOnHome !== false);
      const isSlick = typeof jQuery !== 'undefined' && jQuery(homeIcons).hasClass('slick-initialized');

      const iconRules = [
        { regex: /logo/i, icon: '/assets/images/services-3d/logo-design.png' },
        { regex: /(web design|website design|custom-web|wordpress)/i, icon: '/assets/images/services-3d/web-design.png' },
        { regex: /ecom/i, icon: '/assets/images/services-3d/ecommerce.png' },
        { regex: /brand/i, icon: '/assets/images/services-3d/corporate-branding.png' },
        { regex: /(video|anim)/i, icon: '/assets/images/services-3d/video-animation.png' },
        { regex: /(seo|search engine)/i, icon: '/assets/images/services-3d/seo.png' },
        { regex: /(mobile|app)/i, icon: '/assets/images/services-3d/mobile-app.png' },
        { regex: /(combo|package|stack)/i, icon: '/assets/images/services-3d/combo-packages.png' }
      ];

      function updateSlideImages() {
        const slides = homeIcons.querySelectorAll('li, .slick-slide');
        slides.forEach(slide => {
          const text = (slide.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const img = slide.querySelector('img');
          if (img && text) {
            for (const rule of iconRules) {
              if (rule.regex.test(text)) {
                if (img.getAttribute('src') !== rule.icon) {
                  img.setAttribute('src', rule.icon);
                }
                img.classList.add('service-3d-icon');
                img.setAttribute('width', '68');
                img.setAttribute('height', '68');
                break;
              }
            }
          }
        });
      }

      updateSlideImages();

      if (!isSlick) {
        const newIconsHtml = homeCats.map(c => {
          const url = resolveCategoryUrl(c);
          const icon = resolveCategoryIcon(c);
          const formattedTitle = escapeHtml(c.name).replace(/\s+(development|branding|animation|optimization|solutions|packages)/i, ' <br> $1');
          return `          <li>
            <a href="${url}">
              <figure class="develp">
                <img src="${icon}" alt="${escapeHtml(c.name)}" class="service-icon-svg service-3d-icon" width="68" height="68" loading="lazy">
              </figure>
              <div class="textwrap">
                <h4>${formattedTitle}</h4>
              </div>
            </a>
          </li>`;
        }).join('\n');
        if (homeIcons.innerHTML.trim() !== newIconsHtml.trim()) {
          homeIcons.innerHTML = newIconsHtml;
        }
      }
    }

    // D. Footer Services Columns
    const footerHeaders = document.querySelectorAll('h3');
    let serviceHeader = null;
    footerHeaders.forEach(h => {
      if (h.textContent.trim().toUpperCase() === 'SERVICES') serviceHeader = h;
    });
    if (serviceHeader) {
      const col1Parent = serviceHeader.closest('.col-md-2, .offset-md-1');
      const col1Ul = col1Parent ? col1Parent.querySelector('ul.linkinglist') : null;
      const col2Parent = col1Parent ? col1Parent.nextElementSibling : null;
      const col2Ul = col2Parent ? col2Parent.querySelector('ul.linkinglist') : null;
      const navCats = activeCats.filter(c => c.showInNav !== false);
      const half = Math.ceil(navCats.length / 2);
      const col1Cats = navCats.slice(0, half);
      const col2Cats = navCats.slice(half);

      if (col1Ul) {
        const newCol1 = col1Cats.map(c => `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`).join('\n            ');
        if (col1Ul.innerHTML.trim() !== newCol1.trim()) col1Ul.innerHTML = newCol1;
      }
      if (col2Ul) {
        const newCol2 = col2Cats.map(c => `<li><a href="${resolveCategoryUrl(c)}">${escapeHtml(c.name)}</a></li>`).join('\n            ');
        if (col2Ul.innerHTML.trim() !== newCol2.trim()) col2Ul.innerHTML = newCol2;
      }
    }
  }
  function __skipClosedBrace() { if (false) { if (false) { if (false) {
      }
    }
  }
  }

  // =========================================================================
  // 3C. DYNAMIC CMS CONTENT SYNCHRONIZER (About Us, Contact, Footer)
  // =========================================================================
  function syncContent(content) {
    if (!content || typeof content !== 'object') return;

    // A. About Us Content
    if (content.about) {
      const ab = content.about;
      if (window.location.pathname.includes('/about')) {
        const h2 = document.querySelector('.about-banner h2, .inerservice .myheading');
        if (h2 && ab.heroHeading) h2.textContent = ab.heroHeading;
        const p = document.querySelector('.about-banner p, .inerservice .mytext');
        if (p && ab.heroSubheading) p.textContent = ab.heroSubheading;
      }
    }

    // B. Contact Us Content
    if (content.contact) {
      const ct = content.contact;
      if (ct.email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
          a.href = 'mailto:' + ct.email;
          if (a.textContent.includes('@')) a.textContent = ct.email;
        });
      }
      const rawWA = ct.whatsapp || ct.whatsappNumber;
      const waGreeting = ct.whatsappGreeting || 'Hi DIGENZ, I am interested in your services. Please share more information.';
      if (rawWA) {
        const waDigits = normalizeWhatsApp(rawWA);
        if (waDigits) {
          applyWhatsAppUrl(`https://wa.me/${waDigits}?text=${encodeURIComponent(waGreeting)}`);
        }
      }
      if (ct.address) {
        document.querySelectorAll('.address, .contact-address, .footer-address').forEach(el => {
          el.textContent = ct.address;
        });
      }
    }

    // C. Footer Content
    if (content.footer) {
      const ft = content.footer;
      if (ft.copyright) {
        document.querySelectorAll('.copyright, .footer-copyright p, footer p.copy').forEach(el => {
          el.textContent = ft.copyright;
        });
      }
      if (ft.tagline) {
        document.querySelectorAll('.footer-tagline, .footer-desc').forEach(el => {
          el.textContent = ft.tagline;
        });
      }
      if (ft.socialLinks && typeof ft.socialLinks === 'object') {
        const s = ft.socialLinks;
        if (s.facebook) document.querySelectorAll('a[href*="facebook.com"]').forEach(a => a.href = s.facebook);
        if (s.twitter) document.querySelectorAll('a[href*="twitter.com"]').forEach(a => a.href = s.twitter);
        if (s.linkedin) document.querySelectorAll('a[href*="linkedin.com"]').forEach(a => a.href = s.linkedin);
        if (s.instagram) document.querySelectorAll('a[href*="instagram.com"]').forEach(a => a.href = s.instagram);
      }
    }
  }

  // =========================================================================
  // 4. PRODUCTION LEAD CAPTURE & ORDER PIPELINE
  // =========================================================================
  function initLeadCapture() {
    document.querySelectorAll('form').forEach(form => {
      const action = form.getAttribute('action') || '';
      if (
        action.includes('bannerFormController') ||
        action.includes('/leads') ||
        action.includes('floatingFormController') ||
        form.id === 'contactForm' ||
        form.id === 'popupfrm'
      ) {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], .btn-submit, .submit, .newbtn');
          const originalText = submitBtn ? (submitBtn.innerText || submitBtn.value) : '';
          if (submitBtn) {
            if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Submitting...';
            else submitBtn.innerText = 'Submitting...';
            submitBtn.disabled = true;
          }

          const formData = new FormData(form);
          const data = {};
          formData.forEach((val, key) => { data[key] = val; });

          // Extract selected package if present in URL
          const urlParams = new URLSearchParams(window.location.search);
          const pkgFromUrl = urlParams.get('pkg') || urlParams.get('package');
          if (pkgFromUrl && !data.package) data.package = pkgFromUrl;

          try {
            const postRes = await fetch('/leads/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(data)
            });

            const result = await postRes.json();
            if (postRes.ok) {
              form.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; color: #F5F7FA; padding: 22px; border-radius: 8px; text-align: center; margin: 15px 0;">
                  <h4 style="margin: 0 0 10px; color: #10b981; font-size: 19px; font-weight: 700;">Inquiry Registered Successfully!</h4>
                  <p style="margin: 0 0 8px; font-size: 14px; color: #e2e8f0;">Thank you for contacting DIGENZ. Your request reference number is <strong style="color: #3478F6;">#${result.orderNumber || 'DGZ-REF'}</strong>.</p>
                  <p style="margin: 0; font-size: 13px; color: #94a3b8;">Our senior digital consultant will contact you within 24 hours.</p>
                </div>
              `;
            } else {
              alert('Submission failed: ' + (result.error || 'Please check your inputs and try again.'));
              if (submitBtn) {
                if (submitBtn.tagName === 'INPUT') submitBtn.value = originalText;
                else submitBtn.innerText = originalText;
                submitBtn.disabled = false;
              }
            }
          } catch (err) {
            // Fallback submit
            form.submit();
          }
        });
      }
    });
  }

  // =========================================================================
  // 5. REAL-TIME LIVE SYNCHRONIZATION ENGINE (Instant Broadcast + Polling)
  // =========================================================================
  let clientLastSync = 0;
  let cachedSettings = null;
  let isSyncing = false;

  async function refreshLiveContent(targetModule = 'all') {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const mod = String(targetModule || 'all').toLowerCase();
      const syncAll = mod === 'all' || mod === 'general' || mod === 'init';

      if (syncAll) {
        // 1 single unified request replaces 7 separate HTTP calls!
        const bundle = await fetchJSON('/api/public/bundle');
        if (bundle) {
          if (bundle.settings) {
            cachedSettings = bundle.settings;
            syncSettings(bundle.settings);
          }
          if (bundle.products) {
            syncProducts(bundle.products, cachedSettings || bundle.settings);
          }
          if (bundle.banners) {
            syncBanners(bundle.banners);
          }
          if (bundle.categories) {
            syncCategories(bundle.categories);
          }
          if (bundle.content) {
            syncContent(bundle.content);
          }
          if (bundle.syncState && bundle.syncState.lastUpdated) {
            clientLastSync = bundle.syncState.lastUpdated;
          }
        }
      } else {
        // Targeted single-module fetch
        if (mod.includes('setting') || mod.includes('contact')) {
          const s = await fetchJSON('/api/settings');
          if (s) { cachedSettings = s; syncSettings(s); }
        }
        if (mod.includes('product')) {
          const p = await fetchJSON('/api/products');
          if (p && p.products) syncProducts(p.products, cachedSettings);
        }
        if (mod.includes('banner')) {
          const b = await fetchJSON('/api/banners');
          if (b && b.banners) syncBanners(b.banners);
        }
        if (mod.includes('categor')) {
          const c = await fetchJSON('/api/categories');
          if (c && c.categories) syncCategories(c.categories);
        }
      }
      clientLastSync = Date.now();
    } catch (e) {
      console.warn('[DIGENZ Live Sync] Warning:', e);
    } finally {
      isSyncing = false;
    }
  }

  // Tier 1: Instant 0ms Cross-Tab BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const liveChan = new BroadcastChannel('digenz_live_sync');
      liveChan.onmessage = function(ev) {
        const m = ev.data;
        refreshLiveContent(m && m.module ? m.module : 'all');
      };
    } catch (e) {}
  }

  // Tier 2: Storage Event Cross-Tab Fallback
  window.addEventListener('storage', function(e) {
    if (e.key && e.key.startsWith('digenz_')) {
      refreshLiveContent('all');
    }
  });

  // Tier 3: Adaptive Sync-State Polling (Stops/reduces when tab is inactive)
  let pollTimeoutId = null;
  const ACTIVE_POLL_MS = 5000;
  const INACTIVE_POLL_MS = 45000; // 45s fallback when inactive

  async function checkLiveSyncState() {
    try {
      const state = await fetchJSON('/api/sync-state');
      if (state && state.lastUpdated && state.lastUpdated > clientLastSync) {
        clientLastSync = state.lastUpdated;
        refreshLiveContent(state.lastModule || 'all');
      }
    } catch (e) {}
  }

  function schedulePolling() {
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    const interval = document.hidden ? INACTIVE_POLL_MS : ACTIVE_POLL_MS;
    pollTimeoutId = setTimeout(async () => {
      // Only execute active network poll if tab is not hidden
      if (!document.hidden) {
        await checkLiveSyncState();
      }
      schedulePolling();
    }, interval);
  }

  // Tier 4: Tab Switch / Visibility Change Sync (Instant sync on wakeup)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      // User returned to tab: immediately sync fresh data and resume 2.5s polling
      checkLiveSyncState();
      schedulePolling();
    } else {
      // Tab is in background: throttle/stop active polling to conserve resources
      schedulePolling();
    }
  });

  schedulePolling();

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  
  // Global WhatsApp Business Integration & Handler
  let currentWaLink = 'https://wa.me/12089057548?text=Hi%20DIGENZ%2C%20I%20am%20interested%20in%20your%20services.%20Please%20share%20more%20information.';

  // Dynamic Business Address Hydration
  function syncAddressDOM(address) {
    if (!address || typeof address !== 'string') return;
    const cleanAddr = address.trim();
    if (!cleanAddr) return;
    try {
      document.querySelectorAll('.address, .address-1, .footer-address, .contact-address, .business-address').forEach(el => {
        el.textContent = cleanAddr;
      });
      document.querySelectorAll('h5, h6, h4').forEach(h => {
        if (h.textContent.includes('VISIT US')) {
          const nextP = h.nextElementSibling;
          if (nextP && nextP.tagName === 'P') {
            nextP.textContent = cleanAddr;
          }
        }
      });
    } catch (e) {}
  }

  function normalizeWhatsApp(phone) {
    if (!phone) return '';
    let raw = String(phone).trim();
    if (raw.startsWith('00')) raw = '+' + raw.slice(2);
    let digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (/^03\d{9}$/.test(digits)) {
      digits = '92' + digits.substring(1);
    } else if (/^920\d+/.test(digits)) {
      digits = digits.replace(/^920+/, '92');
    } else if (digits.startsWith("0") && digits.length === 11) {
      digits = '92' + digits.replace(/^0+/, '');
    }
    return digits;
  }

  function applyWhatsAppUrl(url) {
    if (!url) return;
    currentWaLink = url;
    try {
      const btn = document.getElementById('digenzWhatsappBtn');
      if (btn) {
        btn.href = url;
        btn.setAttribute('href', url);
      }
      document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
        a.href = url;
        a.setAttribute('href', url);
      });
    } catch (e) {}
    window.setButtonURL = function() {
      window.open(currentWaLink, '_blank');
    };
  }

  window.setButtonURL = function() {
    window.open(currentWaLink, '_blank');
  };

  // Global click interceptor ensuring WhatsApp clicks always use currentWaLink
  try {
    document.addEventListener('click', function(e) {
      const waTarget = e.target.closest('#digenzWhatsappBtn, a[href*="wa.me"]');
      if (waTarget && currentWaLink) {
        waTarget.href = currentWaLink;
        waTarget.setAttribute('href', currentWaLink);
      }
    }, true);
  } catch (e) {}

  function purgeLegacyChat() {
    const selList = [
      '.floatbutton', '.buttonclick', '.crossplus', '.floating_wrap', '.floatingform-sec',
      '.overlayfloatingform', '.callusnow', '#tawk-bubble-container', '#tawk-tooltip-container',
      '.tawk-min-container', '[id*="tawk"]', '[class*="tawk"]', 'iframe[src*="tawk"]',
      'iframe[title*="chat" i]', '#chat-widget-container', '[id*="chat-widget"]', '[class*="chat-widget"]'
    ];
    selList.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.id !== 'digenzWhatsappBtn' && !el.classList.contains('digenz-whatsapp-btn') && !el.classList.contains('digenz-whatsapp-icon')) {
            el.remove();
          }
        });
      } catch (e) {}
    });
  }

  function ensureWhatsAppButton() {
    purgeLegacyChat();

    // Ensure WhatsApp button exists with strict inline sizing safeguards
    let btn = document.getElementById('digenzWhatsappBtn');
    if (!btn) {
      btn = document.createElement('a');
      btn.id = 'digenzWhatsappBtn';
      btn.className = 'digenz-whatsapp-btn';
      btn.href = currentWaLink;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.setAttribute('aria-label', 'Chat with DIGENZ on WhatsApp');
      btn.title = 'Chat with DIGENZ on WhatsApp';
      btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;max-width:56px;max-height:56px;border-radius:50%;background-color:#25D366;display:flex;align-items:center;justify-content:center;z-index:999999;box-shadow:0 4px 20px rgba(37,211,102,0.45);cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent;';
      btn.innerHTML = '<svg class="digenz-whatsapp-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" style="width:32px;height:32px;max-width:32px;max-height:32px;display:block;fill:#FFFFFF;pointer-events:none;" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 2C8.268 2 2 8.268 2 16c0 2.502.658 4.938 1.908 7.078L2.05 29.35a.8.8 0 0 0 .99.986l6.468-1.802A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm-1.84 21.657a11.93 11.93 0 0 1-5.748-1.472l-.41-.242-3.873 1.078 1.07-3.774-.267-.428a11.94 11.94 0 0 1-1.732-6.219c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-11.04 11.057zm6.052-8.257c-.332-.166-1.965-.97-2.27-1.08-.304-.112-.525-.166-.746.166-.222.332-.857 1.08-1.05 1.302-.194.221-.387.248-.72.083-.332-.166-1.401-.516-2.668-1.645-.987-.88-1.653-1.968-1.847-2.3-.194-.333-.02-.513.146-.678.15-.148.332-.387.498-.58.166-.194.222-.333.332-.554.111-.221.056-.415-.028-.58-.083-.166-.747-1.8-.102-2.466-.347-.648-.698-.56-.957-.573-.248-.012-.53-.015-.813-.015-.283 0-.742.106-1.13.53-.388.424-1.48 1.446-1.48 3.526s1.515 4.088 1.727 4.373c.211.285 2.98 4.551 7.22 6.383 1.009.436 1.797.696 2.411.891 1.013.322 1.935.277 2.664.168.813-.122 2.502-1.023 2.855-2.01.353-.986.353-1.83.248-2.01-.106-.18-.387-.29-.72-.456z" fill="#FFFFFF"/></svg>';
      document.body.appendChild(btn);
    } else {
      btn.href = currentWaLink;
      btn.style.width = '56px';
      btn.style.height = '56px';
      btn.style.maxWidth = '56px';
      btn.style.maxHeight = '56px';
    }
  }

  // Active continuous suppression of any legacy chat widget injection
  try {
    const chatObserver = new MutationObserver(() => purgeLegacyChat());
    chatObserver.observe(document.documentElement, { childList: true, subtree: true });
    let purgeTick = 0;
    const purgeTimer = setInterval(() => {
      purgeLegacyChat();
      purgeTick++;
      if (purgeTick > 25) clearInterval(purgeTimer);
    }, 400);
  } catch (e) {}

  function ensureMobileHeader() {
    if (document.getElementById('digenzMobileHeaderStyle')) return;
    const style = document.createElement('style');
    style.id = 'digenzMobileHeaderStyle';
    style.textContent = `
      @media only screen and (max-width: 991px) {
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          width: 0px !important;
          height: 0px !important;
          display: none !important;
        }
        html, body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .header-main {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          width: 100vw !important;
          max-width: 100vw !important;
          height: 60px !important;
          min-height: 60px !important;
          max-height: 60px !important;
          z-index: 99999 !important;
          background: #101827 !important;
          box-shadow: 0 2px 14px rgba(0, 0, 0, 0.5) !important;
          border-bottom: 1px solid #1e293b !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
        }
        .top-bar {
          display: none !important;
        }
        .nav-area-full {
          background: transparent !important;
          border-bottom: none !important;
          box-shadow: none !important;
          padding: 0 16px !important;
          padding-left: max(16px, env(safe-area-inset-left)) !important;
          padding-right: max(16px, env(safe-area-inset-right)) !important;
          height: 60px !important;
          min-height: 60px !important;
          max-height: 60px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          margin: 0 !important;
          width: 100% !important;
        }
        .nav-area-full .row {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .logo-area {
          width: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: center !important;
          height: 60px !important;
        }
        .logo-area .logo .whitelogo {
          display: none !important;
        }
        .logo-area .logo a.digenz-animating-logo .blacklogo,
        .logo-area .logo a.digenz-animating-logo .whitelogo {
          display: none !important;
        }
        .logo-area .logo .blacklogo {
          max-height: 42px !important;
          height: 42px !important;
          width: auto !important;
          display: block !important;
        }
        .logo-area .logo .digenz-logo-anim-wrap {
          height: 42px !important;
          max-height: 42px !important;
          display: inline-flex !important;
          align-items: center !important;
        }
        .logo-area .logo .digenz-logo-anim-svg {
          height: 42px !important;
          max-height: 42px !important;
          width: auto !important;
        }
        .mobile-nav-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: fixed !important;
          top: 10px !important;
          top: max(10px, env(safe-area-inset-top)) !important;
          right: 16px !important;
          right: max(16px, env(safe-area-inset-right)) !important;
          width: 40px !important;
          height: 40px !important;
          background: #1e293b !important;
          border: 1px solid #3478F6 !important;
          border-radius: 8px !important;
          z-index: 100001 !important;
          cursor: pointer !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4) !important;
          padding: 0 !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          transition: background 0.25s ease, border-color 0.25s ease !important;
        }
        .mobile-nav-btn.active {
          position: fixed !important;
          top: 10px !important;
          top: max(10px, env(safe-area-inset-top)) !important;
          right: 16px !important;
          right: max(16px, env(safe-area-inset-right)) !important;
          background: #1e293b !important;
          border-color: #3478F6 !important;
          z-index: 100005 !important;
        }
        .mobile-nav-btn span,
        .mobile-nav-btn span:before,
        .mobile-nav-btn span:after {
          background-color: #3478F6 !important;
          width: 22px !important;
          height: 2.5px !important;
          display: block !important;
          border-radius: 2px !important;
          transition: transform 0.25s ease, top 0.25s ease, background-color 0.25s ease !important;
        }
        .mobile-nav-btn span {
          position: relative !important;
          top: 0 !important;
          margin: 0 auto !important;
        }
        .mobile-nav-btn span:before {
          content: '' !important;
          position: absolute !important;
          top: -7px !important;
          left: 0 !important;
        }
        .mobile-nav-btn span:after {
          content: '' !important;
          position: absolute !important;
          top: 7px !important;
          left: 0 !important;
        }
        .mobile-nav-btn.active span {
          background-color: transparent !important;
        }
        .mobile-nav-btn.active span:before {
          top: 0 !important;
          transform: rotate(45deg) !important;
        }
        .mobile-nav-btn.active span:after {
          top: 0 !important;
          transform: rotate(-45deg) !important;
        }
        .mobile-nav {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          transform: translateX(105%) !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.35s !important;
          visibility: hidden !important;
          pointer-events: none !important;
          width: 300px !important;
          max-width: 85vw !important;
          height: 100vh !important;
          background: #101827 !important;
          border-left: 1px solid #263449 !important;
          z-index: 100000 !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.85) !important;
          padding: 70px 0 40px !important;
        }
        .mobile-nav.active {
          transform: translateX(0) !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
        .app-container.active {
          left: 0 !important;
          transform: none !important;
        }
      }
      @media only screen and (max-width: 360px) {
        .logo-area .logo .whitelogo {
          display: none !important;
        }
        .logo-area .logo .blacklogo {
          max-height: 30px !important;
          height: 30px !important;
          width: auto !important;
          display: block !important;
        }
        .mobile-nav-btn {
          width: 36px !important;
          height: 36px !important;
          top: 12px !important;
          right: 12px !important;
        }
      }
    `;
    if (document.head) document.head.appendChild(style);
    else document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  }

  function ensureServiceCards() {
    if (document.getElementById('digenzServiceCardStyle')) return;
    const style = document.createElement('style');
    style.id = 'digenzServiceCardStyle';
    style.textContent = `
      .pckkslider .slick-track {
        display: flex !important;
        align-items: stretch !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      .pckkslider .slick-slide {
        height: auto !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 0 12px !important;
        box-sizing: border-box !important;
        float: none !important;
      }
      .pckkslider .slick-slide > div {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
        width: 100% !important;
      }
      .pckkslider .slick-slide > div > li,
      .ourpackages .tab-custom .tabs ul.pckkslider > li {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        list-style: none !important;
      }
      .packwrap,
      .ourpackages .tab-custom .tabs ul li .packwrap,
      .cstmwebdesgn .ourpackages .tab-custom .tabs ul li .packwrap {
        height: 100% !important;
        min-height: 520px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        justify-content: flex-start !important;
        background: #4A4A4A !important;
        background-color: #4A4A4A !important;
        border-radius: 12px !important;
        padding: 30px 22px 24px !important;
        box-sizing: border-box !important;
        position: relative !important;
        text-align: center !important;
        overflow: hidden !important;
      }
      .packwrap h3,
      .ourpackages .tab-custom .tabs ul li .packwrap h3 {
        order: 1 !important;
        font-size: 20px !important;
        line-height: 1.25 !important;
        font-weight: 700 !important;
        color: #FFFFFF !important;
        text-align: center !important;
        margin: 0 0 10px 0 !important;
        padding: 0 !important;
        white-space: normal !important;
        word-break: break-word !important;
        font-family: var(--heading-font-family) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 54px !important;
        max-height: 54px !important;
        flex: 0 0 54px !important;
        overflow: hidden !important;
      }
      .packwrap h4,
      .ourpackages .tab-custom .tabs ul li .packwrap h4 {
        order: 2 !important;
        font-size: 34px !important;
        line-height: 1.15 !important;
        font-weight: 800 !important;
        color: #FFFFFF !important;
        text-align: center !important;
        margin: 0 0 10px 0 !important;
        padding: 0 !important;
        font-family: var(--heading-font-family) !important;
        letter-spacing: -0.5px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 72px !important;
        flex: 0 0 72px !important;
      }
      .packwrap h5,
      .packwrap h2,
      .ourpackages .tab-custom .tabs ul li .packwrap h5 {
        order: 3 !important;
        font-size: 12.5px !important;
        line-height: 1.4 !important;
        color: #d1d5db !important;
        text-align: center !important;
        font-weight: 400 !important;
        margin: 0 0 14px 0 !important;
        padding: 0 4px !important;
        min-height: 44px !important;
        max-height: 44px !important;
        flex: 0 0 44px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: normal !important;
        word-break: break-word !important;
        font-family: var(--secondary-font-family) !important;
        overflow: hidden !important;
      }
      .packwrap .packfeatures,
      .packfeatures,
      .packwrap .list-scroll {
        order: 4 !important;
        width: 100% !important;
        height: 220px !important;
        max-height: 220px !important;
        min-height: 220px !important;
        flex: 1 1 220px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        align-items: stretch !important;
        gap: 12px !important;
        padding: 0 8px 12px 0 !important;
        margin: 0 0 12px 0 !important;
        list-style: none !important;
        box-sizing: border-box !important;
        scrollbar-width: thin !important;
        scrollbar-color: #3478F6 #1e293b !important;
        text-align: left !important;
      }
      .packwrap .packfeatures::-webkit-scrollbar,
      .packfeatures::-webkit-scrollbar {
        width: 5px !important;
      }
      .packwrap .packfeatures::-webkit-scrollbar-track,
      .packfeatures::-webkit-scrollbar-track {
        background: #1e293b !important;
        border-radius: 4px !important;
      }
      .packwrap .packfeatures::-webkit-scrollbar-thumb,
      .packfeatures::-webkit-scrollbar-thumb {
        background: #3478F6 !important;
        border-radius: 4px !important;
      }
      .packwrap .packfeatures::-webkit-scrollbar-thumb:hover,
      .packfeatures::-webkit-scrollbar-thumb:hover {
        background: #5b96f8 !important;
      }
      .packwrap .extrainfo,
      p.extrainfo,
      .ourpackages .tab-custom .tabs ul li p.extrainfo {
        order: 5 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        color: #a6b0ba !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin-top: auto !important;
        margin-bottom: 0 !important;
        min-height: 22px !important;
        max-height: 22px !important;
        flex: 0 0 22px !important;
        text-align: center !important;
        font-size: 12px !important;
        font-weight: 400 !important;
        line-height: 1.3 !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        font-family: var(--secondary-font-family) !important;
        overflow: hidden !important;
      }
      .packwrap .viewdetails,
      .ourpackages .tab-custom .tabs ul li .packwrap .viewdetails,
      .cstmwebdesgn .ourpackages .tab-custom .tabs ul li .packwrap .viewdetails {
        order: 6 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: calc(100% + 44px) !important;
        margin: 14px -22px -24px -22px !important;
        padding: 13px 20px !important;
        min-height: 46px !important;
        max-height: 46px !important;
        flex: 0 0 46px !important;
        background: #383838 !important;
        color: #FFFFFF !important;
        font-family: var(--primary-font-family), 'Bai Jamjuree', sans-serif !important;
        font-size: 13.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.6px !important;
        text-transform: uppercase !important;
        text-decoration: none !important;
        border-radius: 0 0 12px 12px !important;
        box-sizing: border-box !important;
        transition: background 0.25s ease, color 0.25s ease, transform 0.2s ease !important;
        cursor: pointer !important;
        z-index: 2 !important;
        line-height: 1.2 !important;
      }
      .packwrap:not(:has(.extrainfo)) .viewdetails,
      .ourpackages .tab-custom .tabs ul li .packwrap:not(:has(.extrainfo)) .viewdetails {
        margin-top: auto !important;
      }
      @media only screen and (max-width: 991px) {
        .pckkslider .slick-slide {
          padding: 0 8px !important;
        }
        .packwrap,
        .ourpackages .tab-custom .tabs ul li .packwrap,
        .cstmwebdesgn .ourpackages .tab-custom .tabs ul li .packwrap {
          padding: 26px 18px 22px !important;
          height: 100% !important;
          min-height: 500px !important;
          max-width: 380px !important;
          margin: 0 auto !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
        }
        .packwrap h3,
        .ourpackages .tab-custom .tabs ul li .packwrap h3 {
          font-size: 20px !important;
          min-height: 50px !important;
          max-height: 50px !important;
          flex: 0 0 50px !important;
          margin-bottom: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .packwrap h4,
        .ourpackages .tab-custom .tabs ul li .packwrap h4 {
          font-size: 30px !important;
          min-height: 68px !important;
          flex: 0 0 68px !important;
          margin-bottom: 8px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .packwrap h5,
        .packwrap h2,
        .ourpackages .tab-custom .tabs ul li .packwrap h5 {
          font-size: 12.5px !important;
          min-height: 40px !important;
          max-height: 40px !important;
          flex: 0 0 40px !important;
          margin-bottom: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .packwrap .packfeatures,
        .packfeatures,
        .packwrap .list-scroll {
          order: 4 !important;
          width: 100% !important;
          height: 200px !important;
          min-height: 200px !important;
          max-height: 200px !important;
          flex: 1 1 200px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          padding: 0 6px 10px 0 !important;
          margin-bottom: 10px !important;
          gap: 10px !important;
          scrollbar-width: thin !important;
          scrollbar-color: #3478F6 #1e293b !important;
        }
        .packwrap .extrainfo,
        p.extrainfo,
        .ourpackages .tab-custom .tabs ul li p.extrainfo {
          order: 5 !important;
          margin-top: auto !important;
          margin-bottom: 0 !important;
          min-height: 20px !important;
          max-height: 20px !important;
          flex: 0 0 20px !important;
          padding: 0 !important;
        }
        .packwrap .viewdetails,
        .ourpackages .tab-custom .tabs ul li .packwrap .viewdetails,
        .cstmwebdesgn .ourpackages .tab-custom .tabs ul li .packwrap .viewdetails {
          order: 6 !important;
          margin-top: 12px !important;
          margin-left: -18px !important;
          margin-right: -18px !important;
          margin-bottom: -22px !important;
          width: calc(100% + 36px) !important;
          min-height: 44px !important;
          max-height: 44px !important;
          flex: 0 0 44px !important;
          font-size: 13.5px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .packwrap:not(:has(.extrainfo)) .viewdetails,
        .ourpackages .tab-custom .tabs ul li .packwrap:not(:has(.extrainfo)) .viewdetails {
          margin-top: auto !important;
        }
        .inerservice .subs-pac,
        .subs-pac {
          height: auto !important;
          min-height: auto !important;
          padding: 24px 18px !important;
        }
        .inerservice .table-packages {
          height: auto !important;
          min-height: auto !important;
        }
        .inerservice .table-packages .body .subscription-list {
          height: auto !important;
          max-height: none !important;
        }
      }
      @media only screen and (max-width: 480px) {
        .packwrap,
        .ourpackages .tab-custom .tabs ul li .packwrap,
        .cstmwebdesgn .ourpackages .tab-custom .tabs ul li .packwrap {
          max-width: 100% !important;
          padding: 22px 14px 18px !important;
          height: 100% !important;
          min-height: 480px !important;
        }
        .packwrap .viewdetails,
        .ourpackages .tab-custom .tabs ul li .packwrap .viewdetails,
        .cstmwebdesgn .ourpackages .tab-custom .tabs ul li .packwrap .viewdetails {
          margin-top: 12px !important;
          margin-left: -14px !important;
          margin-right: -14px !important;
          margin-bottom: -18px !important;
          width: calc(100% + 28px) !important;
        }
      }
    `;
    if (document.head) document.head.appendChild(style);
    else document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  }

  // =========================================================================
  // HERO BANNER CURSOR INTERACTIVE ANIMATION
  // =========================================================================
  function initHeroBannerAnimation() {
    var banner = document.querySelector('.home-banner');
    if (!banner) return;

    var bgArt = banner.querySelector('.hero-bg-art');
    if (!bgArt) return;
    var spotlight = banner.querySelector('.hero-cursor-spotlight');

    var targetTiltX = 0;
    var targetTiltY = 0;
    var currentTiltX = 0;
    var currentTiltY = 0;
    var targetScale = 1;
    var currentScale = 1;
    var mouseX = 50;
    var mouseY = 50;
    var curMouseX = 50;
    var curMouseY = 50;
    var rafId = null;
    var isHovered = false;

    function render() {
      // Smooth lerp (0.09) for fluid, premium motion
      currentTiltX += (targetTiltX - currentTiltX) * 0.09;
      currentTiltY += (targetTiltY - currentTiltY) * 0.09;
      currentScale += (targetScale - currentScale) * 0.09;
      curMouseX += (mouseX - curMouseX) * 0.12;
      curMouseY += (mouseY - curMouseY) * 0.12;

      // Direct inline transform on background art for instant 60fps responsiveness
      bgArt.style.transform = 'perspective(1200px) rotateX(' + currentTiltX.toFixed(3) + 'deg) rotateY(' + currentTiltY.toFixed(3) + 'deg) scale(' + currentScale.toFixed(4) + ')';
      
      if (spotlight) {
        spotlight.style.background = 'radial-gradient(550px circle at ' + curMouseX.toFixed(2) + '% ' + curMouseY.toFixed(2) + '%, rgba(52, 120, 246, 0.22), transparent 75%)';
      }

      banner.style.setProperty('--hero-tilt-x', currentTiltX.toFixed(3) + 'deg');
      banner.style.setProperty('--hero-tilt-y', currentTiltY.toFixed(3) + 'deg');
      banner.style.setProperty('--hero-scale', currentScale.toFixed(4));
      banner.style.setProperty('--mouse-x', curMouseX.toFixed(2) + '%');
      banner.style.setProperty('--mouse-y', curMouseY.toFixed(2) + '%');

      var diff = Math.abs(targetTiltX - currentTiltX) +
                 Math.abs(targetTiltY - currentTiltY) +
                 Math.abs(targetScale - currentScale);

      if (isHovered || diff > 0.005) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    }

    banner.addEventListener('mouseenter', function() {
      if (window.innerWidth < 992) return;
      isHovered = true;
      targetScale = 1.025;
      if (spotlight) spotlight.style.opacity = '1';
      if (!rafId) rafId = requestAnimationFrame(render);
    });

    banner.addEventListener('mousemove', function(e) {
      if (window.innerWidth < 992) return;
      isHovered = true;
      var rect = banner.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width;
      var relY = (e.clientY - rect.top) / rect.height;

      // Clamp between 0 and 1
      relX = Math.max(0, Math.min(1, relX));
      relY = Math.max(0, Math.min(1, relY));

      // 3D tilt angles: noticeable, sleek perspective tilt
      targetTiltY = (relX - 0.5) * 8.0;
      targetTiltX = -(relY - 0.5) * 5.5;
      targetScale = 1.025;

      mouseX = relX * 100;
      mouseY = relY * 100;

      if (spotlight) spotlight.style.opacity = '1';
      if (!rafId) rafId = requestAnimationFrame(render);
    }, { passive: true });

    banner.addEventListener('mouseleave', function() {
      isHovered = false;
      targetTiltX = 0;
      targetTiltY = 0;
      targetScale = 1;
      if (spotlight) spotlight.style.opacity = '0';
      if (!rafId) rafId = requestAnimationFrame(render);
    });
  }

  // =========================================================================
  // INTERACTIVE CURSOR 3D TILT & HOVER ANIMATION FOR SHOWCASE IMAGES & CARDS
  // =========================================================================
  function initInteractiveImageAnimations() {
    if (typeof window === 'undefined') return;

    var selector = [
      'img[src*="trust.png"]',
      'img[src*="VerifiedAgencyv1.svg"]',
      'img[src*="time-and-material"]',
      'img[src*="fixed-price"]',
      'img[src*="dedicated-team"]',
      '.portfoliogridlist li',
      '.wbport li',
      '.build-to-win .to-win-box',
      '.helpsec .imgplace'
    ].join(', ');

    var elements = document.querySelectorAll(selector);
    elements.forEach(function(el) {
      if (el.dataset.tiltInitialized) return;
      el.dataset.tiltInitialized = 'true';

      var targetTiltX = 0;
      var targetTiltY = 0;
      var currentTiltX = 0;
      var currentTiltY = 0;
      var targetScale = 1;
      var currentScale = 1;
      var rafId = null;
      var isHovered = false;

      function render() {
        currentTiltX += (targetTiltX - currentTiltX) * 0.12;
        currentTiltY += (targetTiltY - currentTiltY) * 0.12;
        currentScale += (targetScale - currentScale) * 0.12;

        el.style.transform = 'perspective(800px) rotateX(' + currentTiltX.toFixed(2) + 'deg) rotateY(' + currentTiltY.toFixed(2) + 'deg) scale(' + currentScale.toFixed(3) + ')';

        var diff = Math.abs(targetTiltX - currentTiltX) +
                   Math.abs(targetTiltY - currentTiltY) +
                   Math.abs(targetScale - currentScale);

        if (isHovered || diff > 0.01) {
          rafId = requestAnimationFrame(render);
        } else {
          el.style.transform = '';
          rafId = null;
        }
      }

      el.addEventListener('mouseenter', function() {
        if (window.innerWidth < 992) return;
        isHovered = true;
        targetScale = 1.03;
        if (!rafId) rafId = requestAnimationFrame(render);
      });

      el.addEventListener('mousemove', function(e) {
        if (window.innerWidth < 992) return;
        isHovered = true;
        var rect = el.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width;
        var relY = (e.clientY - rect.top) / rect.height;

        relX = Math.max(0, Math.min(1, relX));
        relY = Math.max(0, Math.min(1, relY));

        targetTiltY = (relX - 0.5) * 10;
        targetTiltX = -(relY - 0.5) * 8;
        targetScale = 1.03;

        if (!rafId) rafId = requestAnimationFrame(render);
      }, { passive: true });

      el.addEventListener('mouseleave', function() {
        isHovered = false;
        targetTiltX = 0;
        targetTiltY = 0;
        targetScale = 1;
        if (!rafId) rafId = requestAnimationFrame(render);
      });
    });
  }

  // =========================================================================
  // ANIMATED HEADER LOGO REVEAL (IN-HEADER ONLY, NO FULL-SCREEN INTRO)
  // =========================================================================
  function initHeaderLogoAnimation() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    var logoContainers = document.querySelectorAll('.logo-area .logo a, .mobile-nav .logo-main, .logo a');
    if (!logoContainers || logoContainers.length === 0) return;

    logoContainers.forEach(function(container) {
      if (container.dataset.logoAnimInitialized) return;
      container.dataset.logoAnimInitialized = 'true';

      var svgMarkup = '<div class="digenz-logo-anim-wrap">' +
        '<svg class="digenz-logo-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 92">' +
          '<defs>' +
            '<linearGradient id="ani_blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#80B5FF" />' +
              '<stop offset="30%" stop-color="#3478F6" />' +
              '<stop offset="70%" stop-color="#1e5dd6" />' +
              '<stop offset="100%" stop-color="#103c8c" />' +
            '</linearGradient>' +
            '<linearGradient id="ani_blueLight" x1="0%" y1="100%" x2="100%" y2="0%">' +
              '<stop offset="0%" stop-color="#3478F6" />' +
              '<stop offset="50%" stop-color="#80B5FF" />' +
              '<stop offset="100%" stop-color="#FFFFFF" />' +
            '</linearGradient>' +
            '<linearGradient id="ani_blueDark" x1="0%" y1="0%" x2="0%" y2="100%">' +
              '<stop offset="0%" stop-color="#1e5dd6" />' +
              '<stop offset="100%" stop-color="#0f2b66" />' +
            '</linearGradient>' +
            '<linearGradient id="ani_energyGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
              '<stop offset="0%" stop-color="#3478F6" stop-opacity="0" />' +
              '<stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" />' +
              '<stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" />' +
              '<stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" />' +
              '<stop offset="100%" stop-color="#3478F6" stop-opacity="0" />' +
            '</linearGradient>' +
          '</defs>' +
          '<g id="d_animatedStreaks" transform="translate(42, 46) scale(1.50) translate(-45, -46)">' +
            '<path class="d-streak streak-pillar" d="M 18,27 L 26,19 L 32,19 L 32,73 L 26,73 L 18,65 Z" />' +
            '<path class="d-streak streak-arc-top" d="M 80,8 C 65,12 50,16 38,19 L 56,19" />' +
            '<path class="d-streak streak-loop" d="M 38,19 L 56,19 L 72,35 L 72,57 L 56,73 L 38,73 L 38,65 L 48,65 L 60,57 L 60,35 L 48,27 L 38,27 Z" />' +
            '<path class="d-streak streak-arc-bottom" d="M 84,80 C 74,78 62,75 56,73 L 38,73" />' +
            '<path class="d-streak streak-arrow" d="M 41,36 L 51,46 L 41,56 L 46,56 L 56,46 L 46,36 Z" />' +
          '</g>' +
          '<g id="d_techD" transform="translate(42, 46) scale(1.50) translate(-45, -46)">' +
            '<polygon class="d-facet" points="18,27 26,19 32,19 32,44 18,44" fill="url(#ani_blueLight)" />' +
            '<polygon class="d-facet" points="18,48 32,48 32,73 26,73 18,65" fill="url(#ani_blueDark)" />' +
            '<polygon class="d-facet" points="28,43 36,43 36,49 28,49" fill="url(#ani_blueGrad)" />' +
            '<polygon class="d-facet" points="38,19 56,19 72,35 60,35 48,27 38,27" fill="url(#ani_blueLight)" />' +
            '<polygon class="d-facet" points="72,35 72,57 60,57 60,35" fill="url(#ani_blueGrad)" />' +
            '<polygon class="d-facet" points="72,57 56,73 38,73 38,65 48,65 60,57" fill="url(#ani_blueDark)" />' +
            '<polygon class="d-arrow" points="41,36 51,46 41,56 46,56 56,46 46,36" fill="url(#ani_blueLight)" />' +
            '<circle class="d-node" cx="26" cy="19" r="2.2" fill="#FFFFFF" />' +
            '<circle class="d-node" cx="56" cy="19" r="2.2" fill="#FFFFFF" />' +
          '</g>' +
          '<rect class="d-energy-beam" x="60" y="16" width="35" height="62" fill="url(#ani_energyGrad)" transform="skewX(-20)" />' +
          '<g id="d_wordmark">' +
            '<g fill="#FFFFFF">' +
              '<path class="wm-letter wm-d" d="M 92,23 L 110,23 C 121,23 127.5,29.5 127.5,41 C 127.5,52.5 121,59 110,59 L 92,59 Z M 98,28.5 L 98,53.5 L 109.5,53.5 C 116.5,53.5 121,49 121,41 C 121,33 116.5,28.5 109.5,28.5 Z" />' +
              '<path class="wm-letter wm-i" d="M 137,23 L 143,23 L 143,59 L 137,59 Z" />' +
              '<path class="wm-letter wm-g" d="M 189,32 L 183.8,35.5 C 181,31.2 176.5,29 171.5,29 C 161.8,29 155.5,35.5 155.5,41 C 155.5,46.5 161.8,53 172,53 C 179.2,53 183.5,49.2 183.5,44.2 L 172,44.2 L 172,39.5 L 189.5,39.5 L 189.5,48.5 C 185.8,54.8 179.2,58.5 171.5,58.5 C 158.5,58.5 149.5,51 149.5,41 C 149.5,31 158.8,23.5 171.5,23.5 C 179.5,23.5 185.5,27 189,32 Z" />' +
              '<path class="wm-letter wm-e" d="M 202,23 L 228.5,23 L 228.5,28.5 L 208,28.5 L 208,37.8 L 225.5,37.8 L 225.5,43.2 L 208,43.2 L 208,53.5 L 229,53.5 L 229,59 L 202,59 Z" />' +
              '<path class="wm-letter wm-n" d="M 240,23 L 246,23 L 268.5,51.5 L 268.5,23 L 274.5,23 L 274.5,59 L 268.5,59 L 246,30.5 L 246,59 L 240,59 Z" />' +
              '<path class="wm-letter wm-z" d="M 286,23 L 319.5,23 L 319.5,28.5 L 295.5,53.5 L 320,53.5 L 320,59 L 285.5,59 L 285.5,53.5 L 310,28.5 L 286,28.5 Z" />' +
            '</g>' +
            '<text class="wm-tagline" x="93" y="74" font-family="\'Century Gothic\', \'Montserrat\', -apple-system, sans-serif" font-size="6.8" font-weight="600" letter-spacing="3.8" fill="#80B5FF">DIGITAL • CREATIVE • SERVICES</text>' +
          '</g>' +
        '</svg>' +
      '</div>';

      container.classList.add('digenz-animating-logo');
      container.insertAdjacentHTML('afterbegin', svgMarkup);

      setTimeout(function() {
        var wrap = container.querySelector('.digenz-logo-anim-wrap');
        if (wrap) wrap.classList.add('digenz-logo-revealed');
      }, 1800);
    });
  }

  // =========================================================================
  // ANIMATED 3D SERVICE ICONS REVEAL (MATCHING HEADER LOGO REVEAL STYLE)
  // Step 1: Testing & Perfecting Logo Design First (Strict User Directive)
  // =========================================================================
  function initServiceIconsAnimation() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    var sections = document.querySelectorAll('.boxesinfo');
    if (!sections || sections.length === 0) return;

    var templates = {
      logo: '<svg class="logo-service-anim-svg service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="nib_blueGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="nib_blueLight" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="nib_blueDark" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="nib_whiteFacet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="nib_energyGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-arc" d="M 31,72 C 31,34 50,24 76,24 C 102,24 121,34 121,72" />' +
          '<path class="l-streak l-streak-handle" d="M 31,72 L 35,34 M 121,72 L 117,34" />' +
          '<path class="l-streak l-streak-nib l-streak-primary" d="M 76,112 L 51,82 L 61,58 L 91,58 L 101,82 Z" />' +
          '<path class="l-streak l-streak-slit" d="M 76,82 L 76,112" />' +
          '<path class="l-streak l-streak-base" d="M 59,118 L 93,118 L 93,126 L 59,126 Z" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<polygon class="l-facet" points="76,112 51,82 61,58 76,58 76,82" fill="url(#nib_whiteFacet)" />' +
          '<polygon class="l-facet" points="76,112 76,82 76,58 91,58 101,82" fill="url(#nib_blueDark)" />' +
          '<polygon class="l-facet" points="59,54 93,54 93,58 59,58" fill="url(#nib_blueGrad)" />' +
          '<rect class="l-facet" x="59" y="118" width="34" height="8" rx="2" fill="url(#nib_blueLight)" />' +
          '<circle class="l-facet" cx="76" cy="82" r="4.2" fill="#101827" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="31" cy="72" r="4" />' +
          '<circle class="l-node" cx="35" cy="34" r="3.5" />' +
          '<circle class="l-node" cx="76" cy="24" r="4.5" />' +
          '<circle class="l-node" cx="117" cy="34" r="3.5" />' +
          '<circle class="l-node" cx="121" cy="72" r="4" />' +
          '<circle class="l-node" cx="76" cy="82" r="3" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="30" y="20" width="35" height="110" fill="url(#nib_energyGrad)" transform="skewX(-20)" />' +
      '</svg>',

      web: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-primary" d="M 28,32 L 124,32 C 128,32 130,34 130,38 L 130,122 C 130,126 128,128 124,128 L 28,128 C 24,128 22,126 22,122 L 22,38 C 22,34 24,32 28,32 Z" />' +
          '<path class="l-streak l-streak-secondary" d="M 22,48 L 130,48" />' +
          '<path class="l-streak l-streak-accent" d="M 54,72 L 42,85 L 54,98" />' +
          '<path class="l-streak l-streak-accent" d="M 76,68 L 64,102" />' +
          '<path class="l-streak l-streak-accent" d="M 86,72 L 98,85 L 86,98" />' +
          '<path class="l-streak l-streak-primary" d="M 118,90 L 122,90 L 123,94 L 127,95 L 130,92 L 133,95 L 130,98 L 131,102 L 135,103 L 135,107 L 131,108 L 130,112 L 133,115 L 130,118 L 127,115 L 123,116 L 122,120 L 118,120 L 117,116 L 113,115 L 110,118 L 107,115 L 110,112 L 109,108 L 105,107 L 105,103 L 109,102 L 110,98 L 107,95 L 110,92 L 113,95 L 117,94 Z" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<path class="l-facet" d="M 22,38 C 22,34 24,32 28,32 L 124,32 C 128,32 130,34 130,38 L 130,48 L 22,48 Z" fill="url(#ani_blueGrad_2)" />' +
          '<polygon class="l-facet" points="54,72 42,85 54,98" fill="none" stroke="url(#ani_whiteFacet_2)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />' +
          '<polygon class="l-facet" points="86,72 98,85 86,98" fill="none" stroke="url(#ani_whiteFacet_2)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />' +
          '<line class="l-facet" x1="76" y1="68" x2="64" y2="102" stroke="url(#ani_whiteFacet_2)" stroke-width="4" stroke-linecap="round" />' +
          '<circle class="l-facet" cx="120" cy="105" r="14" fill="url(#ani_blueLight_2)" />' +
          '<circle class="l-facet" cx="120" cy="105" r="5" fill="#101827" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="34" cy="40" r="3.5" />' +
          '<circle class="l-node" cx="46" cy="40" r="3.5" />' +
          '<circle class="l-node" cx="58" cy="40" r="3.5" />' +
          '<circle class="l-node" cx="42" cy="85" r="3.5" />' +
          '<circle class="l-node" cx="70" cy="85" r="3" />' +
          '<circle class="l-node" cx="98" cy="85" r="3.5" />' +
          '<circle class="l-node" cx="120" cy="105" r="3.5" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="20" y="25" width="35" height="110" fill="url(#ani_energyGrad_2)" transform="skewX(-20)" />' +
      '</svg>',

      ecom: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-secondary" d="M 15,62 L 35,62 M 10,76 L 38,76 M 18,90 L 32,90" />' +
          '<path class="l-streak l-streak-primary" d="M 32,32 L 48,54 L 128,54 L 116,94 L 58,94 L 48,54" />' +
          '<path class="l-streak l-streak-accent" d="M 52,66 L 124,66 M 55,78 L 120,78 M 76,54 L 74,94 M 98,54 L 94,94" />' +
          '<path class="l-streak l-streak-base" d="M 62,94 L 68,110 M 110,94 L 108,110" />' +
          '<circle class="l-streak l-streak-primary" cx="68" cy="114" r="8" />' +
          '<circle class="l-streak l-streak-primary" cx="108" cy="114" r="8" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<polygon class="l-facet" points="48,54 128,54 116,94 58,94" fill="url(#ani_blueDark_3)" opacity="0.85" />' +
          '<rect class="l-facet" x="28" y="28" width="12" height="8" rx="2" fill="url(#ani_whiteFacet_3)" />' +
          '<circle class="l-facet" cx="68" cy="114" r="7" fill="url(#ani_blueLight_3)" />' +
          '<circle class="l-facet" cx="108" cy="114" r="7" fill="url(#ani_blueLight_3)" />' +
          '<circle class="l-facet" cx="68" cy="114" r="3" fill="#101827" />' +
          '<circle class="l-facet" cx="108" cy="114" r="3" fill="#101827" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="35" cy="62" r="2.5" />' +
          '<circle class="l-node" cx="38" cy="76" r="2.5" />' +
          '<circle class="l-node" cx="32" cy="90" r="2.5" />' +
          '<circle class="l-node" cx="32" cy="32" r="3.5" />' +
          '<circle class="l-node" cx="48" cy="54" r="3.5" />' +
          '<circle class="l-node" cx="128" cy="54" r="4" />' +
          '<circle class="l-node" cx="116" cy="94" r="3.5" />' +
          '<circle class="l-node" cx="58" cy="94" r="3.5" />' +
          '<circle class="l-node" cx="68" cy="114" r="3" />' +
          '<circle class="l-node" cx="108" cy="114" r="3" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="25" y="25" width="35" height="105" fill="url(#ani_energyGrad_3)" transform="skewX(-20)" />' +
      '</svg>',

      brand: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_4" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-primary" d="M 36,24 L 94,24 L 102,34 L 102,118 C 102,122 100,124 96,124 L 36,124 C 32,124 30,122 30,118 L 30,30 C 30,26 32,24 36,24 Z" />' +
          '<path class="l-streak l-streak-accent" d="M 94,24 L 94,34 L 102,34" />' +
          '<path class="l-streak l-streak-secondary" d="M 46,44 L 46,96 M 46,44 L 68,44 C 78,44 80,50 80,57 C 80,64 76,68 68,68 L 46,68 M 46,68 L 72,68 C 82,68 84,74 84,82 C 84,96 78,96 68,96 L 46,96" />' +
          '<path class="l-streak l-streak-primary" d="M 134,36 L 140,42 L 106,78 L 100,72 Z" />' +
          '<path class="l-streak l-streak-slit" d="M 100,72 L 106,78 L 92,94 Z" />' +
          '<path class="l-streak l-streak-base" d="M 98,108 L 134,108 L 134,124 L 98,124 Z" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<polygon class="l-facet" points="30,30 94,24 102,34 102,118 30,118" fill="url(#ani_whiteFacet_4)" opacity="0.9" />' +
          '<path class="l-facet" d="M 46,44 L 46,96 M 46,44 L 68,44 C 78,44 80,50 80,57 C 80,64 76,68 68,68 L 46,68 M 46,68 L 72,68 C 82,68 84,74 84,82 C 84,96 78,96 68,96 L 46,96" stroke="url(#ani_blueDark_4)" stroke-width="6" fill="none" stroke-linecap="round" />' +
          '<polygon class="l-facet" points="134,36 140,42 106,78 100,72" fill="url(#ani_blueLight_4)" />' +
          '<polygon class="l-facet" points="100,72 106,78 92,94" fill="url(#ani_blueGrad_4)" />' +
          '<rect class="l-facet" x="98" y="108" width="36" height="16" rx="2" fill="url(#ani_whiteFacet_4)" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="36" cy="24" r="3.5" />' +
          '<circle class="l-node" cx="102" cy="34" r="3.5" />' +
          '<circle class="l-node" cx="96" cy="124" r="3.5" />' +
          '<circle class="l-node" cx="36" cy="124" r="3.5" />' +
          '<circle class="l-node" cx="80" cy="57" r="3" />' +
          '<circle class="l-node" cx="84" cy="82" r="3" />' +
          '<circle class="l-node" cx="92" cy="94" r="3.5" />' +
          '<circle class="l-node" cx="137" cy="39" r="3" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="25" y="20" width="35" height="115" fill="url(#ani_energyGrad_4)" transform="skewX(-20)" />' +
      '</svg>',

      anim: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_5" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_5" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_5" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-primary" d="M 26,52 L 124,52 C 128,52 130,54 130,58 L 130,124 C 130,128 128,130 124,130 L 26,130 C 22,130 20,128 20,124 L 20,58 C 20,54 22,52 26,52 Z" />' +
          '<path class="l-streak l-streak-primary" d="M 22,50 L 120,24 C 124,23 127,25 128,29 L 128,38 L 22,50 Z" />' +
          '<path class="l-streak l-streak-accent" d="M 42,45 L 50,42 M 62,39 L 70,36 M 82,34 L 90,31 M 102,28 L 110,25" />' +
          '<path class="l-streak l-streak-secondary" d="M 20,64 L 130,64" />' +
          '<path class="l-streak l-streak-accent" d="M 68,82 L 96,98 L 68,114 Z" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<polygon class="l-facet" points="20,58 130,58 130,124 20,124" fill="url(#ani_blueDark_5)" />' +
          '<polygon class="l-facet" points="22,50 120,24 128,29 128,38 22,50" fill="url(#ani_blueGrad_5)" />' +
          '<polygon class="l-facet" points="68,82 96,98 68,114" fill="url(#ani_blueLight_5)" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="22" cy="50" r="4.5" />' +
          '<circle class="l-node" cx="124" cy="26" r="3.5" />' +
          '<circle class="l-node" cx="130" cy="58" r="3" />' +
          '<circle class="l-node" cx="124" cy="130" r="3" />' +
          '<circle class="l-node" cx="20" cy="124" r="3" />' +
          '<circle class="l-node" cx="68" cy="82" r="3.5" />' +
          '<circle class="l-node" cx="96" cy="98" r="4.5" />' +
          '<circle class="l-node" cx="68" cy="114" r="3.5" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="20" y="20" width="35" height="115" fill="url(#ani_energyGrad_5)" transform="skewX(-20)" />' +
      '</svg>',

      seo: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_6" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_6" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_6" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-primary" d="M 72,28 C 94,28 112,46 112,68 C 112,90 94,108 72,108 C 50,108 32,90 32,68 C 32,46 50,28 72,28 Z" />' +
          '<path class="l-streak l-streak-secondary" d="M 72,36 C 90,36 104,50 104,68 C 104,86 90,100 72,100 C 54,100 40,86 40,68 C 40,50 54,36 72,36 Z" />' +
          '<path class="l-streak l-streak-primary" d="M 100,96 L 126,122 C 128,124 130,124 132,122 L 136,118 C 138,116 138,114 136,112 L 110,86 Z" />' +
          '<path class="l-streak l-streak-secondary" d="M 56,92 L 56,84 M 68,92 L 68,76 M 80,92 L 80,66 M 92,92 L 92,54" />' +
          '<path class="l-streak l-streak-accent" d="M 50,84 Q 72,66 98,42" />' +
          '<path class="l-streak l-streak-accent" d="M 88,40 L 102,40 L 102,54" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<circle class="l-facet" cx="72" cy="68" r="32" fill="url(#ani_blueDark_6)" opacity="0.85" />' +
          '<rect class="l-facet" x="52" y="84" width="8" height="8" rx="1" fill="url(#ani_blueLight_6)" />' +
          '<rect class="l-facet" x="64" y="76" width="8" height="16" rx="1" fill="url(#ani_blueLight_6)" />' +
          '<rect class="l-facet" x="76" y="66" width="8" height="26" rx="1" fill="url(#ani_blueLight_6)" />' +
          '<rect class="l-facet" x="88" y="54" width="8" height="38" rx="1" fill="url(#ani_blueLight_6)" />' +
          '<polygon class="l-facet" points="100,96 126,122 136,118 110,86" fill="url(#ani_whiteFacet_6)" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="72" cy="28" r="3.5" />' +
          '<circle class="l-node" cx="112" cy="68" r="3.5" />' +
          '<circle class="l-node" cx="72" cy="108" r="3.5" />' +
          '<circle class="l-node" cx="32" cy="68" r="3.5" />' +
          '<circle class="l-node" cx="134" cy="120" r="4" />' +
          '<circle class="l-node" cx="102" cy="40" r="4.5" />' +
          '<circle class="l-node" cx="56" cy="84" r="2.5" />' +
          '<circle class="l-node" cx="68" cy="76" r="2.5" />' +
          '<circle class="l-node" cx="80" cy="66" r="2.5" />' +
          '<circle class="l-node" cx="92" cy="54" r="2.5" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="25" y="25" width="35" height="105" fill="url(#ani_energyGrad_6)" transform="skewX(-20)" />' +
      '</svg>',

      mobile: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_7" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_7" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_7" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-primary" d="M 46,20 L 98,20 C 104,20 108,24 108,30 L 108,120 C 108,126 104,130 98,130 L 46,130 C 40,130 36,126 36,120 L 36,30 C 36,24 40,20 46,20 Z" />' +
          '<path class="l-streak l-streak-secondary" d="M 42,32 L 102,32 L 102,118 L 42,118 Z" />' +
          '<path class="l-streak l-streak-accent" d="M 60,62 L 50,72 L 60,82" />' +
          '<path class="l-streak l-streak-accent" d="M 76,58 L 66,86" />' +
          '<path class="l-streak l-streak-accent" d="M 82,62 L 92,72 L 82,82" />' +
          '<path class="l-streak l-streak-primary" d="M 114,88 L 117,88 L 118,92 L 122,93 L 125,90 L 128,93 L 125,96 L 126,100 L 130,101 L 130,105 L 126,106 L 125,110 L 128,113 L 125,116 L 122,113 L 118,114 L 117,118 L 114,118 L 113,114 L 109,113 L 106,116 L 103,113 L 106,110 L 105,106 L 101,105 L 101,101 L 105,100 L 106,96 L 103,93 L 106,90 L 109,93 L 113,92 Z" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<rect class="l-facet" x="42" y="32" width="60" height="86" rx="2" fill="url(#ani_blueDark_7)" />' +
          '<polygon class="l-facet" points="60,62 50,72 60,82" fill="none" stroke="url(#ani_whiteFacet_7)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />' +
          '<polygon class="l-facet" points="82,62 92,72 82,82" fill="none" stroke="url(#ani_whiteFacet_7)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />' +
          '<line class="l-facet" x1="76" y1="58" x2="66" y2="86" stroke="url(#ani_whiteFacet_7)" stroke-width="4" stroke-linecap="round" />' +
          '<circle class="l-facet" cx="114" cy="102" r="14" fill="url(#ani_blueLight_7)" />' +
          '<circle class="l-facet" cx="114" cy="102" r="5" fill="#101827" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="46" cy="20" r="3" />' +
          '<circle class="l-node" cx="98" cy="20" r="3" />' +
          '<circle class="l-node" cx="98" cy="130" r="3" />' +
          '<circle class="l-node" cx="46" cy="130" r="3" />' +
          '<circle class="l-node" cx="50" cy="72" r="3.5" />' +
          '<circle class="l-node" cx="71" cy="72" r="3" />' +
          '<circle class="l-node" cx="92" cy="72" r="3.5" />' +
          '<circle class="l-node" cx="114" cy="102" r="3.5" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="25" y="15" width="35" height="120" fill="url(#ani_energyGrad_7)" transform="skewX(-20)" />' +
      '</svg>',

      combo: '<svg class="service-anim-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 152">' +
        '<defs>' +
          '<linearGradient id="ani_blueGrad_8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80B5FF" /><stop offset="30%" stop-color="#3478F6" /><stop offset="70%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#103c8c" /></linearGradient>' +
          '<linearGradient id="ani_blueLight_8" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" /><stop offset="45%" stop-color="#80B5FF" /><stop offset="100%" stop-color="#FFFFFF" /></linearGradient>' +
          '<linearGradient id="ani_blueDark_8" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e5dd6" /><stop offset="100%" stop-color="#0f2b66" /></linearGradient>' +
          '<linearGradient id="ani_whiteFacet_8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="60%" stop-color="#D4E4FC" /><stop offset="100%" stop-color="#80B5FF" /></linearGradient>' +
          '<linearGradient id="ani_energyGrad_8" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3478F6" stop-opacity="0" /><stop offset="45%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" /><stop offset="55%" stop-color="#80B5FF" stop-opacity="0.6" /><stop offset="100%" stop-color="#3478F6" stop-opacity="0" /></linearGradient>' +
        '</defs>' +
        '<g class="s-streaks">' +
          '<path class="l-streak l-streak-primary" d="M 78,34 L 124,56 L 78,78 L 32,56 Z" />' +
          '<path class="l-streak l-streak-secondary" d="M 32,74 L 78,96 L 124,74 L 124,80 L 78,102 L 32,80 Z" />' +
          '<path class="l-streak l-streak-primary" d="M 32,98 L 78,120 L 124,98 L 124,104 L 78,126 L 32,104 Z" />' +
          '<path class="l-streak l-streak-accent" d="M 66,54 L 58,58 L 66,62 M 78,50 L 76,66 M 88,54 L 96,58 L 88,62" />' +
          '<path class="l-streak l-streak-arc" d="M 18,114 C 18,80 32,45 68,36 C 104,27 132,42 136,75" />' +
        '</g>' +
        '<g class="s-facets">' +
          '<polygon class="l-facet" points="78,34 124,56 78,78 32,56" fill="url(#ani_blueLight_8)" />' +
          '<polygon class="l-facet" points="32,56 78,78 124,56 124,62 78,84 32,62" fill="url(#ani_blueDark_8)" />' +
          '<polygon class="l-facet" points="32,74 78,96 124,74 124,80 78,102 32,80" fill="url(#ani_whiteFacet_8)" />' +
          '<polygon class="l-facet" points="32,98 78,120 124,98 L 124,104 L 78,126 L 32,104 Z" fill="url(#ani_blueGrad_8)" />' +
        '</g>' +
        '<g class="s-nodes">' +
          '<circle class="l-node" cx="78" cy="34" r="4" />' +
          '<circle class="l-node" cx="124" cy="56" r="3.5" />' +
          '<circle class="l-node" cx="78" cy="78" r="4" />' +
          '<circle class="l-node" cx="32" cy="56" r="3.5" />' +
          '<circle class="l-node" cx="78" cy="96" r="3.5" />' +
          '<circle class="l-node" cx="78" cy="120" r="3.5" />' +
          '<circle class="l-node" cx="68" cy="36" r="3" />' +
          '<circle class="l-node" cx="18" cy="114" r="3" />' +
        '</g>' +
        '<rect class="l-energy-beam" x="20" y="25" width="35" height="110" fill="url(#ani_energyGrad_8)" transform="skewX(-20)" />' +
      '</svg>'
    };

    function getServiceType(el) {
      var img = el.querySelector('img.service-3d-icon, img');
      var src = img ? (img.getAttribute('src') || '') : '';
      var alt = img ? (img.getAttribute('alt') || '') : '';
      var text = (el.textContent || '') + ' ' + src + ' ' + alt;
      text = text.toLowerCase();

      if (text.includes('logo-design') || text.includes('logo design') || (text.includes('logo') && !text.includes('web'))) {
        return 'logo';
      }
      if (text.includes('web-design') || text.includes('web design') || (text.includes('development') && !text.includes('mobile'))) {
        return 'web';
      }
      if (text.includes('ecommerce') || text.includes('e-commerce') || text.includes('shop')) {
        return 'ecom';
      }
      if (text.includes('corporate') || text.includes('branding')) {
        return 'brand';
      }
      if (text.includes('video') || text.includes('animation')) {
        return 'anim';
      }
      if (text.includes('seo') || text.includes('search engine') || text.includes('optimization')) {
        return 'seo';
      }
      if (text.includes('mobile') || text.includes('app')) {
        return 'mobile';
      }
      if (text.includes('combo') || text.includes('package') || text.includes('full-stack') || text.includes('stack')) {
        return 'combo';
      }
      return null;
    }

    sections.forEach(function(section) {
      if (section.dataset.iconsAnimInitialized) return;
      section.dataset.iconsAnimInitialized = 'true';

      var items = section.querySelectorAll('.listboxes > li, .slick-slide');
      var staggerIndex = 0;
      var staggerResetTimer = null;

      function revealItem(item) {
        if (!item || item.dataset.serviceRevealed || item.dataset.serviceAnimating) return;
        item.dataset.serviceAnimating = 'true';

        var type = getServiceType(item);
        if (!type || !templates[type]) return;

        var fig = item.querySelector('figure') || item;
        if (fig.querySelector('.service-anim-svg, .logo-service-anim-svg')) return;

        // Visual formation classes
        fig.classList.add('service-figure-animating');
        item.classList.add('service-item-animating');
        if (type === 'logo') {
          fig.classList.add('logo-service-figure');
        }

        fig.insertAdjacentHTML('beforeend', templates[type]);

        setTimeout(function() {
          fig.classList.remove('service-figure-animating');
          item.classList.remove('service-item-animating');
          fig.classList.add('service-figure-revealed');
          item.classList.add('service-item-revealed');
          item.dataset.serviceRevealed = 'true';
          delete item.dataset.serviceAnimating;

          setTimeout(function() {
            var svg = fig.querySelector('.service-anim-svg, .logo-service-anim-svg');
            if (svg) svg.remove();
          }, 400);
        }, 1800);
      }

      function scheduleReveal(item) {
        if (!item || item.dataset.serviceRevealed || item.dataset.serviceAnimating) return;

        var delay = staggerIndex * 110;
        staggerIndex++;
        clearTimeout(staggerResetTimer);
        staggerResetTimer = setTimeout(function() {
          staggerIndex = 0;
        }, 400);

        setTimeout(function() {
          revealItem(item);
        }, delay);
      }

      // 1. Independent IntersectionObserver for each item / slide
      if ('IntersectionObserver' in window) {
        var itemObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
              scheduleReveal(entry.target);
              itemObserver.unobserve(entry.target);
            }
          });
        }, {
          threshold: [0.15, 0.4],
          rootMargin: '0px 0px -30px 0px'
        });

        items.forEach(function(it) {
          itemObserver.observe(it);
        });
      } else {
        items.forEach(function(it) {
          scheduleReveal(it);
        });
      }

      // 2. Slick Carousel support (for mobile/tablet carousel transitions)
      if (typeof jQuery !== 'undefined') {
        var $slider = jQuery(section).find('.serviceicons');
        $slider.on('afterChange', function(event, slick, currentSlide) {
          var activeSlides = section.querySelectorAll('.slick-active');
          activeSlides.forEach(function(slide) {
            scheduleReveal(slide);
          });
        });
      }
    });
  }

  ensureMobileHeader();
  ensureServiceCards();
  initHeaderLogoAnimation();
  initServiceIconsAnimation();

  async function init() {
    ensureMobileHeader();
    ensureServiceCards();
    ensureWhatsAppButton();
    initHeroBannerAnimation();
    initInteractiveImageAnimations();
    initHeaderLogoAnimation();
    initServiceIconsAnimation();
    window.initDigenzLive = init;
    const oldBar = document.getElementById('digenzAnnouncementBar');
    if (oldBar) oldBar.remove();

    initLeadCapture();
    await refreshLiveContent('all');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
