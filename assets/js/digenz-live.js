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
      const addressToSync = settings.businessAddress || settings.address;
      if (addressToSync) {
        syncAddressDOM(addressToSync);
      }

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
    const rawWA = settings.whatsappNumber || settings.whatsapp;
    const waGreeting = settings.whatsappGreeting || 'Hi DIGENZ, I am interested in your services. Please share more information.';
    if (rawWA) {
      const waDigits = normalizeWhatsApp(rawWA);
      if (waDigits) {
        applyWhatsAppUrl(`https://wa.me/${waDigits}?text=${encodeURIComponent(waGreeting)}`);
      }
    }

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
    if (c.image && (c.image.includes('.svg') || c.image.includes('.png') || c.image.includes('.webp'))) {
      return c.image;
    }
    const slug = (c.slug || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    if (slug.includes('logo') || name.includes('logo')) return 'assets/images/service-icons/business-branding.svg';
    if (slug.includes('wordpress') || name.includes('wordpress')) return 'assets/images/service-icons/wordpress.svg';
    if (slug.includes('ecom') || name.includes('ecom')) return 'assets/images/service-icons/ecommerce.svg';
    if (slug.includes('custom-web') || name.includes('web design')) return 'assets/images/service-icons/custom-website.svg';
    if (slug.includes('web-app') || name.includes('web app')) return 'assets/images/service-icons/web-app.svg';
    if (slug.includes('backend') || name.includes('backend')) return 'assets/images/service-icons/backend.svg';
    if (slug.includes('mobile') || name.includes('mobile')) return 'assets/images/service-icons/mobile-app.svg';
    if (slug.includes('maint') || name.includes('maint')) return 'assets/images/service-icons/website-maintenance.svg';
    if (slug.includes('domain') || slug.includes('host') || name.includes('host')) return 'assets/images/service-icons/domain-hosting.svg';
    if (slug.includes('brand') || name.includes('brand')) return 'assets/images/service-icons/business-branding.svg';
    if (slug.includes('anim') || slug.includes('video') || name.includes('video')) return 'assets/images/service-icons/video-animation.svg';
    if (slug.includes('seo') || name.includes('seo') || name.includes('search engine')) return 'assets/images/service-icons/seo.svg';
    if (slug.includes('combo') || name.includes('combo')) return 'assets/images/service-icons/custom-website.svg';
    return 'assets/images/service-icons/custom-website.svg';
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
      const newIconsHtml = homeCats.map(c => {
        const url = resolveCategoryUrl(c);
        const icon = resolveCategoryIcon(c);
        const formattedTitle = escapeHtml(c.name).replace(/\s+(development|branding|animation|optimization|solutions|packages)/i, ' <br> $1');
        return `          <li>
            <a href="${url}">
              <figure class="develp">
                <img src="${icon}" alt="${escapeHtml(c.name)}" class="service-icon-svg" width="48" height="48" loading="lazy">
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
  let currentWaLink = 'https://wa.me/923190039048?text=Hi%20DIGENZ%2C%20I%20am%20interested%20in%20your%20services.%20Please%20share%20more%20information.';

  function normalizeWhatsApp(phone) {
    if (!phone || typeof phone !== 'string') return '';
    let digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    if (/^03\d{9}$/.test(digits)) {
      digits = '92' + digits.substring(1);
    } else if (/^920\d+/.test(digits)) {
      digits = digits.replace(/^920+/, '92');
    } else if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
      digits = '92' + digits.replace(/^0+/, '');
    }
    return digits;
  }

  function applyWhatsAppUrl(url) {
    if (!url) return;
    currentWaLink = url;
    const btn = document.getElementById('digenzWhatsappBtn');
    if (btn) btn.href = url;
    document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
      a.href = url;
    });
  }

  window.setButtonURL = function() {
    window.open(currentWaLink, '_blank');
  };

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
        .logo-area .logo .blacklogo {
          max-height: 36px !important;
          height: 36px !important;
          width: auto !important;
          display: block !important;
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

  ensureMobileHeader();
  ensureServiceCards();

  async function init() {
    ensureMobileHeader();
    ensureServiceCards();
    ensureWhatsAppButton();
    initHeroBannerAnimation();
    initInteractiveImageAnimations();
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
