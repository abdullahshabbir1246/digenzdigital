/**
 * DIGENZ Live Public Integration & Client Synchronization
 * Injects real-time announcement bar, updates contact info, and connects lead capture to backend
 */

(function() {
  'use strict';

  async function initDigenzLive() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const settings = await res.json();

      // 1. Maintenance Mode Check
      if (settings.maintenanceMode && !window.location.pathname.startsWith('/admin')) {
        window.location.reload();
        return;
      }

      // 2. Announcement bar removed
      const existingBar = document.getElementById('digenzAnnouncementBar');
      if (existingBar) existingBar.remove();

      // 3. Form submission AJAX enhancement
      document.querySelectorAll('form').forEach(form => {
        const action = form.getAttribute('action') || '';
        if (action.includes('bannerFormController') || action.includes('/leads') || action.includes('floatingFormController')) {
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], .btn-submit, .submit');
            const originalText = submitBtn ? (submitBtn.innerText || submitBtn.value) : '';
            if (submitBtn) {
              if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Submitting...';
              else submitBtn.innerText = 'Submitting...';
              submitBtn.disabled = true;
            }

            const formData = new FormData(form);
            const data = {};
            formData.forEach((val, key) => { data[key] = val; });

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
                // Show clean success notice
                form.innerHTML = `
                  <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 20px; border-radius: 8px; text-align: center; margin: 15px 0;">
                    <h4 style="margin: 0 0 8px; color: #10b981; font-size: 18px;">Quote Request Received!</h4>
                    <p style="margin: 0; font-size: 13px; color: #eee;">Thank you for contacting DIGENZ. Your request #${result.orderNumber || ''} has been registered and a specialist will contact you shortly.</p>
                  </div>
                `;
              } else {
                alert('Submission failed: ' + (result.error || 'Please try again.'));
                if (submitBtn) {
                  if (submitBtn.tagName === 'INPUT') submitBtn.value = originalText;
                  else submitBtn.innerText = originalText;
                  submitBtn.disabled = false;
                }
              }
            } catch (err) {
              // Fallback to standard form submit
              form.submit();
            }
          });
        }
      });

    } catch (err) {
      console.log('[DIGENZ Live] Offline mode.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDigenzLive);
  } else {
    initDigenzLive();
  }
})();
