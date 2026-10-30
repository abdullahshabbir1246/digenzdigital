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
          h4.innerHTML = `<span>Starting at </span> ${currency}${Number(prod.salePrice).toLocaleString()} <small style="text-decoration: line-through; opacity: 0.6; font-size: 0.68em; margin-left: 6px; font-weight: normal; color: #8892b0;">${currency}${Number(prod.price).toLocaleString()}</small>`;
        } else {
          h4.innerHTML = `<span>Starting at </span> ${currency}${Number(prod.price).toLocaleString()}`;
        }
      }

      // 3. Update Subtitle / Description (h5 or h2)
      const descEl = card.querySelector('h5, h2');
      if (descEl && prod.description) {
        descEl.textContent = prod.description;
      }

      // 4. Update Features List
      const featuresUl = card.querySelector('ul.packfeatures, ul.listpacks');
      if (featuresUl && Array.isArray(prod.features) && prod.features.length > 0) {
        featuresUl.innerHTML = prod.features.map(f => `<li>${f}</li>`).join('');
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
              const priceDisplay = prod.salePrice && prod.salePrice < prod.price
                ? `<span>Starting at </span> ${currency}${Number(prod.salePrice).toLocaleString()} <small style="text-decoration: line-through; opacity: 0.6; font-size: 0.68em; margin-left: 6px; font-weight: normal; color: #8892b0;">${currency}${Number(prod.price).toLocaleString()}</small>`
                : `<span>Starting at </span> ${currency}${Number(prod.price).toLocaleString()}`;

              const badgeHtml = prod.badge
                ? `<span class="digenz-badge" style="background: #3478F6; color:#101827; padding:3px 10px; border-radius:3px; font-size:11px; font-weight:700; display:inline-block; margin-bottom:8px; text-transform:uppercase;">${prod.badge}</span>`
                : '';

              const featuresHtml = (prod.features || []).map(f => `<li>${f}</li>`).join('');

              newLi.innerHTML = `
                <div class="packwrap" data-product-id="${prod.id}">
                  ${badgeHtml}
                  <h3>${prod.name.replace(/ Package/i, ' <br> Package')}</h3>
                  <h4>${priceDisplay}</h4>
                  <h5>${prod.description || ''}</h5>
                  <ul class="packfeatures list-scroll">
                    ${featuresHtml}
                  </ul>
                  <a href="/get-a-quote/index.html?pkg=${encodeURIComponent(prod.name)}" class="btn-pack">Start</a>
                  <div class="actions row web">
                    <div class="col-md-6 col-6"><a href="tel:+92 306 1284045" class="action-no clearfix pull-right sea"><span><small>Share your idea?</small>+92 306 1284045</span></a></div>
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
      const cleanPhone = phoneText.replace(/[\s()-]/g, '');

      // 1. Process all tel: anchor links
      document.querySelectorAll('a[href^="tel:"]').forEach(a => {
        a.setAttribute('href', 'tel:' + cleanPhone);

        // Subcase 1: Link contains a span (e.g. action-no with <small>Share your idea?</small>)
        const span = a.querySelector('span');
        if (span) {
          const small = span.querySelector('small');
          if (small) {
            span.innerHTML = small.outerHTML + ' ' + phoneText;
          } else {
            span.textContent = phoneText;
          }
          return;
        }

        // Subcase 2: Link contains an icon (e.g. <i class="fa fa-phone"></i> +92...)
        const icon = a.querySelector('i');
        if (icon) {
          let updatedTextNode = false;
          a.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && /\d{4,}/.test(node.nodeValue)) {
              node.nodeValue = ' ' + phoneText;
              updatedTextNode = true;
            }
          });
          if (!updatedTextNode) {
            a.innerHTML = icon.outerHTML + ' ' + phoneText;
          }
          return;
        }

        // Subcase 3: Plain text phone link
        const currentText = a.textContent.trim();
        if (/^\+?[\d\s-]{8,}$/.test(currentText)) {
          a.textContent = phoneText;
        }
      });

      // 2. Non-anchor phone text elements
      document.querySelectorAll('.call_wrap span, .callusnow span').forEach(el => {
        el.textContent = phoneText;
      });

      document.querySelectorAll('.btn-black-custom').forEach(el => {
        if (/^\+?[\d\s-]{8,}$/.test(el.textContent.trim())) {
          el.textContent = phoneText;
        }
      });

      // 3. "or Call Now <b>...</b>" in banners and contact sections
      document.querySelectorAll('p b, div b').forEach(b => {
        if (/^\+?[\d\s-]{8,}$/.test(b.textContent.trim())) {
          b.textContent = phoneText;
        }
      });
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

    // D. Dynamic Currency Symbol Update on Pricing Cards
    if (settings.currencySymbol) {
      const currency = settings.currencySymbol.trim();
      document.querySelectorAll('.packwrap h4, .subs-pac h6').forEach(el => {
        const html = el.innerHTML;
        const updatedHtml = html.replace(/(<span>Starting at\s*<\/span>\s*)([^\d<]+)(\d[\d,]*)/i, (m, p1, oldCur, p3) => {
          return `${p1}${currency} ${p3}`;
        });
        if (updatedHtml !== html) {
          el.innerHTML = updatedHtml;
        }
      });
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
  // INITIALIZATION
  // =========================================================================
  async function init() {
    const oldBar = document.getElementById('digenzAnnouncementBar');
    if (oldBar) oldBar.remove();

    initLeadCapture();

    // Fetch live data concurrently
    const [settings, productsRes, bannersRes] = await Promise.all([
      fetchJSON('/api/settings'),
      fetchJSON('/api/products'),
      fetchJSON('/api/banners')
    ]);

    if (settings) syncSettings(settings);
    if (productsRes && productsRes.products) syncProducts(productsRes.products, settings);
    if (bannersRes && bannersRes.banners) syncBanners(bannersRes.banners);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
