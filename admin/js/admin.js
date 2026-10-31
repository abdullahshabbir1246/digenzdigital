/**
 * DIGENZ Master Admin Dashboard Controller
 * Vanilla ES6 JavaScript application with reactive API bindings
 */

const Admin = (function() {
  const API_BASE = (typeof window !== 'undefined' && (window.location.protocol === 'file:' || !window.location.host))
    ? 'https://digenzdigital.vercel.app/api'
    : '/api';
  let authToken = localStorage.getItem('digenz_admin_token') || '';
  let currentUser = null;
  let categoriesCache = [];

  // =========================================================================
  // API REQUEST HELPER
  // =========================================================================
  async function api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['x-admin-token'] = authToken;
    }

    const method = (options.method || 'GET').toUpperCase();
    const sep = endpoint.includes('?') ? '&' : '?';
    const finalUrl = method === 'GET'
      ? `${API_BASE}${endpoint}${sep}_t=${Date.now()}`
      : `${API_BASE}${endpoint}`;

    try {
      const res = await fetch(finalUrl, {
        cache: 'no-store',
        ...options,
        headers
      });

      if (res.status === 401 && !endpoint.includes('auth/login')) {
        handleLogout(false);
        showToast('Session expired. Please sign in again.', 'error');
        throw new Error('Unauthorized');
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span><strong>${icon}</strong> ${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  
  // =========================================================================
  // REAL-TIME LIVE SYNCHRONIZATION BROADCASTER
  // =========================================================================
  let liveSyncChannel = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      liveSyncChannel = new BroadcastChannel('digenz_live_sync');
    }
  } catch (e) {}

  function broadcastLiveUpdate(module, action, data = {}) {
    const payload = {
      module,
      action,
      data,
      timestamp: Date.now()
    };

    // 1. Instant 0ms Cross-Tab Broadcast via BroadcastChannel
    if (liveSyncChannel) {
      try {
        liveSyncChannel.postMessage(payload);
      } catch (e) {}
    }

    // 2. Storage event fallback for older browsers / iframe boundaries
    try {
      localStorage.setItem('digenz_sync_ping', JSON.stringify(payload));
      localStorage.setItem('digenz_last_module', module);
      localStorage.setItem('digenz_settings_updated', Date.now().toString());
    } catch (e) {}
  }

  // =========================================================================
  // MODAL MEDIA UPLOAD HELPER
  // =========================================================================
  async function handleModalUpload(inputEl, targetInputId, previewContainerId) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        showToast('Uploading image to media system...', 'info');
        const res = await api('/media/upload', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, data: e.target.result })
        });

        document.getElementById(targetInputId).value = res.url;
        const previewEl = document.getElementById(previewContainerId);
        if (previewEl) {
          previewEl.innerHTML = `<img src="${res.url}" style="height: 48px; border-radius: 4px; border: 1px solid #3478F6; margin-top: 4px;">`;
        }
        showToast('Image uploaded successfully: ' + res.filename, 'success');
      } catch (err) {
        showToast('Upload error: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  // =========================================================================
  // MODAL HELPERS
  // =========================================================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
  }

  function confirmDialog(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmActionBtn');
    btn.onclick = () => {
      closeModal('confirmModal');
      onConfirm();
    };
    openModal('confirmModal');
  }

  // =========================================================================
  // AUTHENTICATION & SESSION
  // =========================================================================
  async function checkAuth() {
    if (!authToken) {
      showLogin();
      return;
    }

    try {
      const data = await api('/auth/me');
      currentUser = data.user;
      showApp();
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('appSection').classList.add('hidden');
  }

  function showApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    
    if (currentUser) {
      document.getElementById('sidebarUserName').textContent = currentUser.name || 'Admin';
      document.getElementById('sidebarUserRole').textContent = (currentUser.role || 'Superadmin').toUpperCase();
      document.getElementById('topbarUserName').textContent = currentUser.email || '';
      document.getElementById('sidebarAvatar').textContent = (currentUser.name || 'A')[0].toUpperCase();
    }

    handleRouting();
    loadCategoriesCache();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    btn.disabled = true;

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, username: email })
      });

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('digenz_admin_token', authToken);
      document.cookie = `digenz_admin_token=${authToken}; path=/; max-age=86400`;
      
      showToast('Authentication successful. Welcome, ' + currentUser.name, 'success');
      showApp();
    } catch (err) {
      console.error('Login error:', err);
      errorEl.textContent = err.message || 'Invalid administrator credentials. Use admin / admin123';
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  }

  async function handleLogout(callApi = true) {
    if (callApi && authToken) {
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch (e) {}
    }
    authToken = '';
    currentUser = null;
    localStorage.removeItem('digenz_admin_token');
    document.cookie = 'digenz_admin_token=; path=/; max-age=0';
    showLogin();
    showToast('Signed out successfully.', 'info');
  }

  // =========================================================================
  // ROUTING & NAVIGATION
  // =========================================================================
  function handleRouting() {
    const hash = window.location.hash.replace(/^#/, '') || 'dashboard';
    
    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === hash);
    });

    // Update active view pane
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${hash}`);
    });

    // Update Topbar Title
    const activeItem = document.querySelector(`.nav-item[data-view="${hash}"]`);
    const title = activeItem ? activeItem.querySelector('span').textContent : 'Dashboard';
    document.getElementById('currentViewTitle').textContent = title;

    // Load data for view
    switch (hash) {
      case 'dashboard': loadDashboard(); break;
      case 'products': loadProducts(); break;
      case 'categories': loadCategories(); break;
      case 'orders': loadOrders(); break;
      case 'customers': loadCustomers(); break;
      case 'coupons': loadCoupons(); break;
      case 'banners': loadBanners(); break;
      case 'content': loadCMS(); break;
      case 'media': loadMedia(); break;
      case 'navigation': loadNavigation(); break;
      case 'seo': loadSEO(); break;
      case 'settings': loadSettings(); break;
      case 'audit': loadAuditLogs(); break;
    }

    // Close mobile sidebar if open
    document.getElementById('adminSidebar').classList.remove('open');
  }

  // =========================================================================
  // 1. DASHBOARD OVERVIEW
  // =========================================================================
  async function loadDashboard() {
    try {
      const data = await api('/dashboard/stats');
      document.getElementById('statRevenue').textContent = `$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      document.getElementById('statOrders').textContent = data.totalOrders;
      document.getElementById('statPendingOrders').textContent = `${data.pendingOrders} pending fulfillment`;
      document.getElementById('statProducts').textContent = data.totalProducts;
      document.getElementById('statCategories').textContent = `Across ${data.totalCategories} categories`;
      document.getElementById('statCustomers').textContent = data.totalCustomers;
      document.getElementById('ordersPendingBadge').textContent = data.pendingOrders;

      // Render recent orders
      const tbody = document.getElementById('dashRecentOrdersTable');
      if (data.recentOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No orders yet.</td></tr>`;
      } else {
        tbody.innerHTML = data.recentOrders.map(o => `
          <tr>
            <td><strong>#${o.orderNumber}</strong></td>
            <td>${o.customer.name}<br><small class="text-muted">${o.customer.email}</small></td>
            <td>${o.items.map(i => i.name).join(', ')}</td>
            <td><strong>$${(o.total || 0).toFixed(2)}</strong></td>
            <td><span class="badge badge-${o.status}">${o.status}</span></td>
            <td><span class="badge badge-${o.paymentStatus}">${o.paymentStatus}</span></td>
            <td>
              <button class="btn btn-outline-gold btn-sm" onclick="Admin.viewOrderDetails('${o.id}')">View</button>
            </td>
          </tr>
        `).join('');
      }

      // Render activity stream
      const actList = document.getElementById('dashActivityList');
      if (data.recentActivity.length === 0) {
        actList.innerHTML = `<li class="timeline-empty">No activity recorded.</li>`;
      } else {
        actList.innerHTML = data.recentActivity.map(a => `
          <li class="timeline-item">
            <div class="timeline-header">
              <span class="timeline-actor">${a.action}</span>
              <span class="timeline-time">${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="timeline-desc">${a.details}</div>
          </li>
        `).join('');
      }
    } catch (err) {
      showToast('Error loading dashboard stats: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 2. PRODUCTS & PACKAGES
  // =========================================================================
  async function loadCategoriesCache() {
    try {
      const data = await api('/categories');
      categoriesCache = data.categories || [];
      
      // Populate category filters & selects
      const filterSelect = document.getElementById('productCategoryFilter');
      const modalSelect = document.getElementById('pmCategory');
      
      const optionsHtml = categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (filterSelect) filterSelect.innerHTML = `<option value="">All Categories</option>` + optionsHtml;
      if (modalSelect) modalSelect.innerHTML = optionsHtml;
    } catch (err) {}
  }

  async function loadProducts() {
    const search = document.getElementById('productSearchInput').value.trim();
    const categoryId = document.getElementById('productCategoryFilter').value;
    const status = document.getElementById('productStatusFilter').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (status) params.append('status', status);

    try {
      const data = await api(`/products?${params.toString()}`);
      const tbody = document.getElementById('productsTableBody');
      
      if (!data.products || data.products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No products or packages found.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.products.map(p => {
        const cat = categoriesCache.find(c => c.id === p.categoryId);
        const catName = cat ? cat.name : 'General';
        const img = p.primaryImage || (p.images && p.images[0]) || '/assets/images/serviceportfolio/webapp/thumbnail/t-1.jpg';

        return `
          <tr>
            <td><img src="${img}" class="thumb-preview" alt="${p.name}" onerror="this.src='/assets/images/serviceportfolio/webapp/thumbnail/t-1.jpg'"></td>
            <td>
              <strong>${p.name}</strong>
              ${p.isFeatured ? '<span class="promo-tag ml-2">Featured</span>' : ''}
              <div class="text-muted" style="font-size: 11px;">/${p.slug}</div>
            </td>
            <td><code>${p.sku || 'N/A'}</code></td>
            <td><span class="badge" style="background:#222; color:#3478F6; border:1px solid #444;">${catName}</span></td>
            <td>$${p.price.toFixed(2)}</td>
            <td>${p.salePrice ? `<strong class="text-success">$${p.salePrice.toFixed(2)}</strong>` : '<span class="text-muted">-</span>'}</td>
            <td>${p.badge ? `<span class="promo-tag">${p.badge}</span>` : '-'}</td>
            <td><span class="badge badge-${p.status}">${p.status}</span></td>
            <td>
              <div class="table-actions">
                <button class="btn-icon" title="Edit Product" onclick="Admin.openEditProductModal('${p.id}')">✎</button>
                <button class="btn-icon danger" title="Delete Product" onclick="Admin.deleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')">🗑</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      showToast('Error loading products: ' + err.message, 'error');
    }
  }

  function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Create New Service Package';
    document.getElementById('productForm').reset();
    document.getElementById('pmId').value = '';
    const prev = document.getElementById('pmImagePreview'); if (prev) prev.innerHTML = '';
    openModal('productModal');
  }

  async function openEditProductModal(id) {
    try {
      const p = await api(`/products/${id}`);
      document.getElementById('productModalTitle').textContent = 'Edit Package — ' + p.name;
      document.getElementById('pmId').value = p.id;
      document.getElementById('pmName').value = p.name || '';
      document.getElementById('pmSku').value = p.sku || '';
      document.getElementById('pmCategory').value = p.categoryId || '';
      document.getElementById('pmPrice').value = p.price || '';
      document.getElementById('pmSalePrice').value = p.salePrice || '';
      document.getElementById('pmBadge').value = p.badge || '';
      document.getElementById('pmStatus').value = p.status || 'published';
      document.getElementById('pmFeatured').checked = Boolean(p.isFeatured);
      document.getElementById('pmImage').value = p.primaryImage || '';
      document.getElementById('pmDesc').value = p.description || '';
      document.getElementById('pmFeatures').value = (p.features || []).join('\n');
      openModal('productModal');
    } catch (err) {
      showToast('Failed to load product details: ' + err.message, 'error');
    }
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Save';
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const id = document.getElementById('pmId').value;
    const payload = {
      name: document.getElementById('pmName').value.trim(),
      sku: document.getElementById('pmSku').value.trim(),
      categoryId: document.getElementById('pmCategory').value,
      price: parseFloat(document.getElementById('pmPrice').value),
      salePrice: document.getElementById('pmSalePrice').value ? parseFloat(document.getElementById('pmSalePrice').value) : null,
      badge: document.getElementById('pmBadge').value.trim(),
      status: document.getElementById('pmStatus').value,
      isFeatured: document.getElementById('pmFeatured').checked,
      primaryImage: document.getElementById('pmImage').value.trim(),
      description: document.getElementById('pmDesc').value.trim(),
      features: document.getElementById('pmFeatures').value.split('\n').map(s => s.trim()).filter(Boolean)
    };

    try {
      if (id) {
        await api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Package updated successfully in database.', 'success');
        broadcastLiveUpdate('products', 'update', { id, ...payload });
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Package created successfully in database.', 'success');
        broadcastLiveUpdate('products', 'create', payload);
      }
      closeModal('productModal');
      loadProducts();
    } catch (err) {
      showToast('Error saving package: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  }

  function deleteProduct(id, name) {
    confirmDialog(
      'Delete Product Package',
      `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`,
      async () => {
        try {
          await api(`/products/${id}`, { method: 'DELETE' });
          broadcastLiveUpdate('products', 'delete', { id, name });
          showToast(`Product "${name}" deleted.`, 'success');
          loadProducts();
        } catch (err) {
          showToast('Failed to delete product: ' + err.message, 'error');
        }
      }
    );
  }

  // =========================================================================
  // 3. CATEGORIES ARCHITECTURE
  // =========================================================================
  async function loadCategories() {
    try {
      const data = await api('/categories');
      categoriesCache = data.categories || [];
      const tbody = document.getElementById('categoriesTableBody');

      if (categoriesCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No categories configured.</td></tr>`;
        return;
      }

      tbody.innerHTML = categoriesCache.map(c => `
        <tr>
          <td><img src="${c.image || '/assets/images/bannericons/branding.png'}" class="thumb-preview" onerror="this.src='/assets/images/bannericons/branding.png'"></td>
          <td><strong>${c.name}</strong><br><small class="text-muted">${c.description || ''}</small></td>
          <td><code>/${c.slug}</code></td>
          <td>${c.displayOrder}</td>
          <td>${c.showOnHome ? '<span class="text-success">✓ Yes</span>' : '<span class="text-muted">✕ No</span>'}</td>
          <td>${c.showInNav ? '<span class="text-success">✓ Yes</span>' : '<span class="text-muted">✕ No</span>'}</td>
          <td><span class="badge badge-${c.status}">${c.status}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" title="Edit Category" onclick="Admin.openEditCategoryModal('${c.id}')">✎</button>
              <button class="btn-icon danger" title="Delete Category" onclick="Admin.deleteCategory('${c.id}', '${c.name.replace(/'/g, "\\'")}')">🗑</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading categories: ' + err.message, 'error');
    }
  }

  function openAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Create New Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('cmId').value = '';
    
    // Parent category dropdown
    const select = document.getElementById('cmParentId');
    select.innerHTML = '<option value="">None (Top Level Root)</option>' + categoriesCache.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    openModal('categoryModal');
  }

  async function openEditCategoryModal(id) {
    const c = categoriesCache.find(item => item.id === id);
    if (!c) return;

    document.getElementById('categoryModalTitle').textContent = 'Edit Category — ' + c.name;
    document.getElementById('cmId').value = c.id;
    document.getElementById('cmName').value = c.name;
    document.getElementById('cmSlug').value = c.slug;
    document.getElementById('cmOrder').value = c.displayOrder;
    document.getElementById('cmImage').value = c.image || '';
    document.getElementById('cmBanner').value = c.bannerImage || '';
    document.getElementById('cmDesc').value = c.description || '';
    document.getElementById('cmHome').checked = Boolean(c.showOnHome);
    document.getElementById('cmNav').checked = Boolean(c.showInNav);

    const select = document.getElementById('cmParentId');
    select.innerHTML = '<option value="">None (Top Level Root)</option>' + categoriesCache.filter(item => item.id !== id).map(item => `<option value="${item.id}" ${item.id === c.parentId ? 'selected' : ''}>${item.name}</option>`).join('');

    openModal('categoryModal');
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Save';
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const id = document.getElementById('cmId').value;
    const payload = {
      name: document.getElementById('cmName').value.trim(),
      slug: document.getElementById('cmSlug').value.trim(),
      parentId: document.getElementById('cmParentId').value || null,
      displayOrder: parseInt(document.getElementById('cmOrder').value, 10),
      image: document.getElementById('cmImage').value.trim(),
      bannerImage: document.getElementById('cmBanner').value.trim(),
      description: document.getElementById('cmDesc').value.trim(),
      showOnHome: document.getElementById('cmHome').checked,
      showInNav: document.getElementById('cmNav').checked
    };

    try {
      if (id) {
        await api(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Category updated successfully.', 'success');
        broadcastLiveUpdate('categories', 'update', { id, ...payload });
      } else {
        await api('/categories', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Category created successfully.', 'success');
        broadcastLiveUpdate('categories', 'create', payload);
      }
      closeModal('categoryModal');
      loadCategories();
      loadCategoriesCache();
    } catch (err) {
      showToast('Error saving category: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  }

  function deleteCategory(id, name) {
    confirmDialog(
      'Delete Category',
      `Delete "${name}"? Categories containing assigned products cannot be deleted.`,
      async () => {
        try {
          await api(`/categories/${id}`, { method: 'DELETE' });
          broadcastLiveUpdate('categories', 'delete', { id, name });
          showToast(`Category "${name}" deleted.`, 'success');
          loadCategories();
          loadCategoriesCache();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  }

  // =========================================================================
  // 4. ORDERS & INVOICES
  // =========================================================================
  async function loadOrders() {
    const search = document.getElementById('orderSearchInput').value.trim();
    const status = document.getElementById('orderStatusFilter').value;
    const paymentStatus = document.getElementById('orderPaymentFilter').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);

    try {
      const data = await api(`/orders?${params.toString()}`);
      const tbody = document.getElementById('ordersTableBody');

      if (!data.orders || data.orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No orders found matching filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.orders.map(o => `
        <tr>
          <td><strong>#${o.orderNumber}</strong></td>
          <td>${new Date(o.createdAt).toLocaleDateString()}<br><small class="text-muted">${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
          <td><strong>${o.customer.name}</strong><br><small class="text-muted">${o.customer.email}</small></td>
          <td>${o.items.length} package(s)</td>
          <td><strong>$${(o.total || 0).toFixed(2)}</strong></td>
          <td>
            <select class="form-select form-select-sm" style="padding: 4px 8px; font-size: 11px;" onchange="Admin.updateOrderStatus('${o.id}', this.value)">
              ${['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
            </select>
          </td>
          <td>
            <select class="form-select form-select-sm" style="padding: 4px 8px; font-size: 11px;" onchange="Admin.updatePaymentStatus('${o.id}', this.value)">
              ${['unpaid', 'paid', 'refunded'].map(p => `<option value="${p}" ${p === o.paymentStatus ? 'selected' : ''}>${p.toUpperCase()}</option>`).join('')}
            </select>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-outline-gold btn-sm" onclick="Admin.viewOrderDetails('${o.id}')">Details</button>
              <a href="/api/orders/${o.id}/invoice" target="_blank" class="btn btn-gold btn-sm" title="Print Invoice">🖨</a>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading orders: ' + err.message, 'error');
    }
  }

  async function updateOrderStatus(id, status) {
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast(`Order status updated to ${status}.`, 'success');
      loadDashboard();
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
      loadOrders();
    }
  }

  async function updatePaymentStatus(id, paymentStatus) {
    try {
      await api(`/orders/${id}/payment`, { method: 'PATCH', body: JSON.stringify({ paymentStatus }) });
      showToast(`Payment status updated to ${paymentStatus}.`, 'success');
      loadDashboard();
    } catch (err) {
      showToast('Failed to update payment status: ' + err.message, 'error');
      loadOrders();
    }
  }

  async function viewOrderDetails(id) {
    try {
      const o = await api(`/orders/${id}`);
      document.getElementById('omOrderNumber').textContent = `Order #${o.orderNumber}`;
      document.getElementById('omDate').textContent = `Placed on ${new Date(o.createdAt).toLocaleString()}`;
      document.getElementById('omInvoiceBtn').onclick = () => window.open(`/api/orders/${o.id}/invoice`, '_blank');

      const content = document.getElementById('omContent');
      content.innerHTML = `
        <div class="form-row mb-3">
          <div class="form-group col" style="background:#111; padding:12px; border-radius:6px; border:1px solid #333;">
            <strong style="color:#3478F6; font-size:12px; text-transform:uppercase;">Customer Profile</strong><br>
            <strong>${o.customer.name}</strong><br>
            <span>Email: ${o.customer.email}</span><br>
            <span>Phone: ${o.customer.phone || 'N/A'}</span><br>
            <span>Location: ${o.customer.city || ''} ${o.customer.country || ''}</span>
          </div>
          <div class="form-group col" style="background:#111; padding:12px; border-radius:6px; border:1px solid #333;">
            <strong style="color:#3478F6; font-size:12px; text-transform:uppercase;">Payment & Shipping</strong><br>
            <span>Method: <strong>${o.paymentMethod || 'Online'}</strong></span><br>
            <span>Payment Status: <strong class="text-success">${o.paymentStatus.toUpperCase()}</strong></span><br>
            <span>Fulfillment: <strong>${o.status.toUpperCase()}</strong></span><br>
            <span>Courier: ${o.courier || 'Digital Repository'} | Tracking: ${o.trackingNumber || 'N/A'}</span>
          </div>
        </div>

        <h4 style="font-size:14px; margin-bottom:8px; color:#fff;">Purchased Packages & Services</h4>
        <table class="data-table mb-3" style="border:1px solid #333;">
          <thead>
            <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th></tr>
          </thead>
          <tbody>
            ${o.items.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">$${item.price.toFixed(2)}</td>
                <td style="text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align:right; margin-bottom:20px; font-size:14px;">
          <div>Subtotal: <strong>$${o.subtotal.toFixed(2)}</strong></div>
          ${o.discount ? `<div class="text-success">Discount (${o.couponCode || 'Promo'}): <strong>-$${o.discount.toFixed(2)}</strong></div>` : ''}
          <div style="font-size:18px; color:#3478F6; margin-top:4px;">Grand Total: <strong>$${o.total.toFixed(2)} USD</strong></div>
        </div>

        <div class="form-group" style="border-top:1px solid #333; padding-top:16px;">
          <h4 style="font-size:14px; margin-bottom:8px; color:#fff;">Internal Administrative Notes</h4>
          <div id="orderNotesList" style="max-height:120px; overflow-y:auto; margin-bottom:8px; font-size:12px;">
            ${(o.internalNotes || []).map(n => `
              <div style="background:#111; padding:6px 10px; border-radius:4px; margin-bottom:4px;">
                <strong>${n.author}</strong> <span class="text-muted">(${new Date(n.date).toLocaleString()}):</span> ${n.note}
              </div>
            `).join('') || '<span class="text-muted">No notes added.</span>'}
          </div>
          <div class="d-flex gap-2">
            <input type="text" id="newOrderNoteInput" class="form-input" placeholder="Type internal operational note...">
            <button class="btn btn-gold btn-sm" onclick="Admin.submitOrderNote('${o.id}')">Add Note</button>
          </div>
        </div>
      `;
      openModal('orderModal');
    } catch (err) {
      showToast('Error loading order details: ' + err.message, 'error');
    }
  }

  async function submitOrderNote(id) {
    const input = document.getElementById('newOrderNoteInput');
    const note = input.value.trim();
    if (!note) return;

    try {
      await api(`/orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
      showToast('Note added.', 'success');
      viewOrderDetails(id);
    } catch (err) {
      showToast('Failed to add note: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 5. CUSTOMERS DIRECTORY
  // =========================================================================
  async function loadCustomers() {
    const search = document.getElementById('customerSearchInput').value.trim();
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    try {
      const data = await api(`/customers?${params.toString()}`);
      const tbody = document.getElementById('customersTableBody');

      if (!data.customers || data.customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No clients found.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.customers.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.email}</td>
          <td>${c.phone || '-'}</td>
          <td>${c.company || '-'}</td>
          <td>${c.city || ''} ${c.country || ''}</td>
          <td><strong>${c.totalOrders}</strong></td>
          <td><strong class="text-success">$${(c.totalSpent || 0).toFixed(2)}</strong></td>
          <td><span class="badge badge-${c.status}">${c.status}</span></td>
          <td>
            <button class="btn btn-outline-gold btn-sm" onclick="Admin.viewCustomerProfile('${c.id}')">Profile</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading customers: ' + err.message, 'error');
    }
  }

  async function viewCustomerProfile(id) {
    try {
      const { customer, orders } = await api(`/customers/${id}`);
      alert(`Customer: ${customer.name}\nEmail: ${customer.email}\nTotal Spent: $${customer.totalSpent}\nOrders Placed: ${orders.length}`);
    } catch (err) {
      showToast('Error fetching customer: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 6. COUPONS & DISCOUNTS
  // =========================================================================
  async function loadCoupons() {
    try {
      const data = await api('/coupons');
      const tbody = document.getElementById('couponsTableBody');

      if (!data.coupons || data.coupons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No coupons created.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.coupons.map(c => `
        <tr>
          <td><code style="font-size:14px; color:#3478F6; font-weight:bold;">${c.code}</code></td>
          <td><strong>${c.discountValue}${c.discountType === 'percentage' ? '%' : '$'} OFF</strong></td>
          <td>$${c.minOrderValue}</td>
          <td>${c.usedCount} / ${c.maxUses}</td>
          <td>${c.expiryDate || 'No Expiry'}</td>
          <td><span class="badge badge-${c.isActive ? 'active' : 'inactive'}">${c.isActive ? 'Active' : 'Disabled'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" title="Edit Coupon" onclick="Admin.openEditCouponModal('${c.id}')">✎</button>
              <button class="btn-icon danger" title="Delete Coupon" onclick="Admin.deleteCoupon('${c.id}', '${c.code}')">🗑</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading coupons: ' + err.message, 'error');
    }
  }

  function openAddCouponModal() {
    document.getElementById('couponModalTitle').textContent = 'Create New Coupon';
    document.getElementById('couponForm').reset();
    document.getElementById('cpmId').value = '';
    openModal('couponModal');
  }

  async function openEditCouponModal(id) {
    try {
      const data = await api('/coupons');
      const c = data.coupons.find(x => x.id === id);
      if (!c) return;

      document.getElementById('couponModalTitle').textContent = 'Edit Coupon — ' + c.code;
      document.getElementById('cpmId').value = c.id;
      document.getElementById('cpmCode').value = c.code;
      document.getElementById('cpmType').value = c.discountType;
      document.getElementById('cpmValue').value = c.discountValue;
      document.getElementById('cpmMin').value = c.minOrderValue;
      document.getElementById('cpmMax').value = c.maxUses;
      document.getElementById('cpmExpiry').value = c.expiryDate || '';
      document.getElementById('cpmActive').checked = Boolean(c.isActive);

      openModal('couponModal');
    } catch (err) {
      showToast('Error loading coupon: ' + err.message, 'error');
    }
  }

  async function handleCouponSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('cpmId').value;
    const payload = {
      code: document.getElementById('cpmCode').value.trim(),
      discountType: document.getElementById('cpmType').value,
      discountValue: parseFloat(document.getElementById('cpmValue').value),
      minOrderValue: parseFloat(document.getElementById('cpmMin').value) || 0,
      maxUses: parseInt(document.getElementById('cpmMax').value, 10) || 500,
      expiryDate: document.getElementById('cpmExpiry').value,
      isActive: document.getElementById('cpmActive').checked
    };

    try {
      if (id) {
        await api(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Coupon updated.', 'success');
      } else {
        await api('/coupons', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Coupon created.', 'success');
      }
      closeModal('couponModal');
      loadCoupons();
    } catch (err) {
      showToast('Failed to save coupon: ' + err.message, 'error');
    }
  }

  function deleteCoupon(id, code) {
    confirmDialog(
      'Delete Coupon',
      `Delete coupon code "${code}"? Customers will no longer be able to redeem it.`,
      async () => {
        try {
          await api(`/coupons/${id}`, { method: 'DELETE' });
          showToast(`Coupon "${code}" deleted.`, 'success');
          loadCoupons();
        } catch (err) {
          showToast('Failed to delete coupon: ' + err.message, 'error');
        }
      }
    );
  }

  // =========================================================================
  // 7. HOMEPAGE BANNERS
  // =========================================================================
  async function loadBanners() {
    try {
      const data = await api('/banners');
      const tbody = document.getElementById('bannersTableBody');

      if (!data.banners || data.banners.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No banners configured.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.banners.map(b => `
        <tr>
          <td><img src="${b.desktopImage || '/assets/images/banners/branding.png'}" class="thumb-preview" style="width:80px; height:45px;" onerror="this.src='/assets/images/banners/branding.png'"></td>
          <td><strong>${b.title}</strong><br><small class="text-muted">${b.subtitle || ''}</small></td>
          <td><a href="${b.buttonLink || '#'}" target="_blank" class="card-link">${b.buttonText || 'Link'} (${b.buttonLink || '/'})</a></td>
          <td>${b.displayOrder}</td>
          <td><span class="badge badge-${b.isActive ? 'active' : 'inactive'}">${b.isActive ? 'Active' : 'Hidden'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" title="Edit Banner" onclick="Admin.openEditBannerModal('${b.id}')">✎</button>
              <button class="btn-icon danger" title="Delete Banner" onclick="Admin.deleteBanner('${b.id}')">🗑</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading banners: ' + err.message, 'error');
    }
  }

  function openAddBannerModal() {
    document.getElementById('bannerModalTitle').textContent = 'Add Promotional Banner';
    document.getElementById('bannerForm').reset();
    document.getElementById('bmId').value = '';
    openModal('bannerModal');
  }

  async function openEditBannerModal(id) {
    try {
      const data = await api('/banners');
      const b = data.banners.find(x => x.id === id);
      if (!b) return;

      document.getElementById('bannerModalTitle').textContent = 'Edit Banner';
      document.getElementById('bmId').value = b.id;
      document.getElementById('bmTitle').value = b.title || '';
      document.getElementById('bmSubtitle').value = b.subtitle || '';
      document.getElementById('bmBtnText').value = b.buttonText || '';
      document.getElementById('bmBtnLink').value = b.buttonLink || '';
      document.getElementById('bmDesktop').value = b.desktopImage || '';
      document.getElementById('bmMobile').value = b.mobileImage || '';
      document.getElementById('bmOrder').value = b.displayOrder || 1;
      document.getElementById('bmActive').checked = Boolean(b.isActive);

      openModal('bannerModal');
    } catch (err) {
      showToast('Failed to load banner: ' + err.message, 'error');
    }
  }

  async function handleBannerSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Save';
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const id = document.getElementById('bmId').value;
    const payload = {
      title: document.getElementById('bmTitle').value.trim(),
      subtitle: document.getElementById('bmSubtitle').value.trim(),
      buttonText: document.getElementById('bmBtnText').value.trim(),
      buttonLink: document.getElementById('bmBtnLink').value.trim(),
      desktopImage: document.getElementById('bmDesktop').value.trim(),
      mobileImage: document.getElementById('bmMobile').value.trim(),
      displayOrder: parseInt(document.getElementById('bmOrder').value, 10),
      isActive: document.getElementById('bmActive').checked
    };

    try {
      if (id) {
        await api(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Banner updated successfully.', 'success');
        broadcastLiveUpdate('banners', 'update', { id, ...payload });
      } else {
        await api('/banners', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Banner created successfully.', 'success');
        broadcastLiveUpdate('banners', 'create', payload);
      }
      closeModal('bannerModal');
      loadBanners();
    } catch (err) {
      showToast('Error saving banner: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  }

  function deleteBanner(id) {
    confirmDialog(
      'Delete Banner',
      'Are you sure you want to delete this promotional banner?',
      async () => {
        try {
          await api(`/banners/${id}`, { method: 'DELETE' });
          broadcastLiveUpdate('banners', 'delete', { id });
          showToast('Banner deleted.', 'success');
          loadBanners();
        } catch (err) {
          showToast('Failed to delete banner: ' + err.message, 'error');
        }
      }
    );
  }

  // =========================================================================
  // 8. CONTENT CMS
  // =========================================================================
  let faqsListCache = [];

  async function loadCMS() {
    try {
      const [about, contact, faqs, privacy, terms, refund, footer] = await Promise.all([
        api('/content/about'),
        api('/content/contact'),
        api('/content/faqs'),
        api('/content/privacy'),
        api('/content/terms'),
        api('/content/refund'),
        api('/content/footer')
      ]);

      // About
      document.getElementById('cmsAboutHeading').value = about.heroHeading || '';
      document.getElementById('cmsAboutSubheading').value = about.heroSubheading || '';
      document.getElementById('cmsAboutStory').value = about.story || '';
      document.getElementById('cmsAboutMission').value = about.mission || '';
      document.getElementById('cmsAboutVision').value = about.vision || '';

      // Contact
      document.getElementById('cmsContactEmail').value = contact.email || '';
      document.getElementById('cmsContactSalesEmail').value = contact.salesEmail || '';
      document.getElementById('cmsContactPhone').value = contact.phone || '';
      document.getElementById('cmsContactAltPhone').value = contact.alternatePhone || '';
      document.getElementById('cmsContactAddress').value = contact.address || '';
      document.getElementById('cmsContactHours').value = contact.businessHours || '';

      // FAQs
      faqsListCache = Array.isArray(faqs) ? faqs : [];
      renderFAQsList();

      // Privacy
      document.getElementById('cmsPrivacyUpdated').value = privacy.lastUpdated || '';
      document.getElementById('cmsPrivacyBody').value = privacy.summary || '';

      // Terms
      document.getElementById('cmsTermsUpdated').value = terms.lastUpdated || '';
      document.getElementById('cmsTermsBody').value = terms.summary || '';

      // Refund
      document.getElementById('cmsRefundUpdated').value = refund.lastUpdated || '';
      document.getElementById('cmsRefundBody').value = refund.summary || '';

      // Footer
      document.getElementById('cmsFooterTagline').value = footer.tagline || '';
      document.getElementById('cmsFooterCopyright').value = footer.copyright || '';
      if (footer.socialLinks) {
        document.getElementById('cmsSocialFb').value = footer.socialLinks.facebook || '';
        document.getElementById('cmsSocialTw').value = footer.socialLinks.twitter || '';
        document.getElementById('cmsSocialIn').value = footer.socialLinks.linkedin || '';
        document.getElementById('cmsSocialIg').value = footer.socialLinks.instagram || '';
      }
    } catch (err) {
      showToast('Error loading CMS data: ' + err.message, 'error');
    }
  }

  function renderFAQsList() {
    const container = document.getElementById('faqItemsContainer');
    if (faqsListCache.length === 0) {
      container.innerHTML = '<div class="text-muted py-2">No FAQs defined yet. Click "+ Add FAQ" above.</div>';
      return;
    }

    container.innerHTML = faqsListCache.map((faq, index) => `
      <div class="faq-item-card">
        <button type="button" class="faq-delete-btn" title="Delete FAQ" onclick="Admin.removeFAQItem(${index})">✕</button>
        <div class="form-row">
          <div class="form-group col-2">
            <label>Question</label>
            <input type="text" class="form-input" value="${faq.question.replace(/"/g, '&quot;')}" onchange="Admin.updateFAQField(${index}, 'question', this.value)">
          </div>
          <div class="form-group col">
            <label>Category</label>
            <input type="text" class="form-input" value="${faq.category || 'General'}" onchange="Admin.updateFAQField(${index}, 'category', this.value)">
          </div>
        </div>
        <div class="form-group">
          <label>Answer Body</label>
          <textarea class="form-textarea" rows="2" onchange="Admin.updateFAQField(${index}, 'answer', this.value)">${faq.answer || ''}</textarea>
        </div>
      </div>
    `).join('');
  }

  function addFAQItem() {
    faqsListCache.push({ id: 'faq-' + Date.now(), category: 'General', question: 'New Question?', answer: 'Detailed answer here.' });
    renderFAQsList();
  }

  function removeFAQItem(index) {
    faqsListCache.splice(index, 1);
    renderFAQsList();
  }

  function updateFAQField(index, field, val) {
    if (faqsListCache[index]) {
      faqsListCache[index][field] = val;
    }
  }

  async function saveFAQS() {
    try {
      await api('/content/faqs', { method: 'PUT', body: JSON.stringify(faqsListCache) });
      showToast('All FAQs saved successfully.', 'success');
    } catch (err) {
      showToast('Failed to save FAQs: ' + err.message, 'error');
    }
  }

  async function saveCMSSection(section) {
    let payload = {};
    if (section === 'about') {
      payload = {
        heroHeading: document.getElementById('cmsAboutHeading').value.trim(),
        heroSubheading: document.getElementById('cmsAboutSubheading').value.trim(),
        story: document.getElementById('cmsAboutStory').value.trim(),
        mission: document.getElementById('cmsAboutMission').value.trim(),
        vision: document.getElementById('cmsAboutVision').value.trim()
      };
    } else if (section === 'contact') {
      payload = {
        email: document.getElementById('cmsContactEmail').value.trim(),
        salesEmail: document.getElementById('cmsContactSalesEmail').value.trim(),
        phone: document.getElementById('cmsContactPhone').value.trim(),
        alternatePhone: document.getElementById('cmsContactAltPhone').value.trim(),
        address: document.getElementById('cmsContactAddress').value.trim(),
        businessHours: document.getElementById('cmsContactHours').value.trim()
      };
    } else if (section === 'privacy') {
      payload = {
        lastUpdated: document.getElementById('cmsPrivacyUpdated').value.trim(),
        summary: document.getElementById('cmsPrivacyBody').value.trim()
      };
    } else if (section === 'terms') {
      payload = {
        lastUpdated: document.getElementById('cmsTermsUpdated').value.trim(),
        summary: document.getElementById('cmsTermsBody').value.trim()
      };
    } else if (section === 'refund') {
      payload = {
        lastUpdated: document.getElementById('cmsRefundUpdated').value.trim(),
        summary: document.getElementById('cmsRefundBody').value.trim()
      };
    } else if (section === 'footer') {
      payload = {
        tagline: document.getElementById('cmsFooterTagline').value.trim(),
        copyright: document.getElementById('cmsFooterCopyright').value.trim(),
        socialLinks: {
          facebook: document.getElementById('cmsSocialFb').value.trim(),
          twitter: document.getElementById('cmsSocialTw').value.trim(),
          linkedin: document.getElementById('cmsSocialIn').value.trim(),
          instagram: document.getElementById('cmsSocialIg').value.trim()
        }
      };
    }

    try {
      await api(`/content/${section}`, { method: 'PUT', body: JSON.stringify(payload) });
      broadcastLiveUpdate('content', 'update', { section, payload });
      showToast(`CMS section "${section}" saved successfully.`, 'success');
    } catch (err) {
      showToast('Error saving CMS: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 9. MEDIA LIBRARY
  // =========================================================================
  async function loadMedia() {
    const search = document.getElementById('mediaSearchInput').value.trim();
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    try {
      const data = await api(`/media?${params.toString()}`);
      const grid = document.getElementById('mediaGrid');

      if (!data.media || data.media.length === 0) {
        grid.innerHTML = '<div class="text-muted p-4 col-span-full">No media assets found.</div>';
        return;
      }

      grid.innerHTML = data.media.map(m => `
        <div class="media-card">
          <div class="media-preview-box">
            <img src="${m.path}" alt="${m.name}" loading="lazy" onerror="this.src='/assets/images/serviceportfolio/webapp/thumbnail/t-1.jpg'">
          </div>
          <div class="media-meta">
            <div class="media-name" title="${m.name}">${m.name}</div>
            <div class="media-size">${(m.size / 1024).toFixed(1)} KB</div>
            <div class="media-actions">
              <button class="btn btn-outline-gold btn-sm btn-block" onclick="Admin.copyMediaUrl('${m.path}')">Copy Link</button>
              ${m.path.includes('uploads') ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteMediaFile('${m.path}')">🗑</button>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      showToast('Error loading media: ' + err.message, 'error');
    }
  }

  function copyMediaUrl(path) {
    navigator.clipboard.writeText(path).then(() => {
      showToast('Path copied: ' + path, 'info');
    }).catch(() => {
      prompt('Copy asset URL:', path);
    });
  }

  async function handleMediaUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        showToast('Uploading asset to server...', 'info');
        const res = await api('/media/upload', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, data: e.target.result })
        });
        showToast('Image uploaded successfully: ' + res.url, 'success');
        input.value = '';
        loadMedia();
      } catch (err) {
        showToast('Upload error: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  function deleteMediaFile(filePath) {
    confirmDialog(
      'Delete Media File',
      `Delete file "${filePath}"? Ensure it is not used in active products.`,
      async () => {
        try {
          await api('/media', { method: 'DELETE', body: JSON.stringify({ filePath }) });
          showToast('Media file deleted.', 'success');
          loadMedia();
        } catch (err) {
          showToast('Failed to delete file: ' + err.message, 'error');
        }
      }
    );
  }

  // =========================================================================
  // 10. NAVIGATION & MENUS
  // =========================================================================
  let navConfigCache = { headerLinks: [], footerColumns: [] };

  async function loadNavigation() {
    try {
      navConfigCache = await api('/navigation');
      renderNavigationEditor();
    } catch (err) {
      showToast('Error loading menus: ' + err.message, 'error');
    }
  }

  function renderNavigationEditor() {
    const headerList = document.getElementById('navItemsList');
    headerList.innerHTML = navConfigCache.headerLinks.map((item, index) => `
      <div style="background:#111; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:8px; display:flex; align-items:center; gap:12px;">
        <span style="color:#3478F6; font-weight:bold;">${index + 1}.</span>
        <input type="text" class="form-input" style="flex:1;" value="${item.label}" onchange="Admin.updateNavItem(${index}, 'label', this.value)">
        <input type="text" class="form-input" style="flex:1;" value="${item.url}" onchange="Admin.updateNavItem(${index}, 'url', this.value)">
        <button class="btn-icon danger" onclick="Admin.removeNavItem(${index})">✕</button>
      </div>
    `).join('');

    const footerCols = document.getElementById('footerColsList');
    footerCols.innerHTML = navConfigCache.footerColumns.map((col, cIndex) => `
      <div style="background:#111; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:12px;">
        <strong style="color:#3478F6;">${col.title}</strong>
        <div style="margin-top:6px; font-size:12px; color:#aaa;">
          ${col.links.map(l => `<div>• ${l.label} (${l.url})</div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  function addNavItem() {
    navConfigCache.headerLinks.push({ id: 'nav-' + Date.now(), label: 'New Link', url: '/', order: navConfigCache.headerLinks.length + 1, isVisible: true });
    renderNavigationEditor();
  }

  function removeNavItem(index) {
    navConfigCache.headerLinks.splice(index, 1);
    renderNavigationEditor();
  }

  function updateNavItem(index, field, val) {
    if (navConfigCache.headerLinks[index]) {
      navConfigCache.headerLinks[index][field] = val;
    }
  }

  async function saveNavigation() {
    try {
      await api('/navigation', { method: 'PUT', body: JSON.stringify(navConfigCache) });
      broadcastLiveUpdate('navigation', 'update', navConfigCache);
      showToast('Navigation structure saved.', 'success');
    } catch (err) {
      showToast('Failed to save menus: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 11. SEO MANAGEMENT
  // =========================================================================
  async function loadSEO() {
    try {
      const seo = await api('/seo');
      document.getElementById('seoHomeTitle').value = seo.homeTitle || '';
      document.getElementById('seoHomeDesc').value = seo.homeDescription || '';
      document.getElementById('seoCanonicalUrl').value = seo.canonicalUrl || 'https://www.digenzstore.com/';
      document.getElementById('seoKeywords').value = seo.keywords || '';
      document.getElementById('seoOgTitle').value = seo.ogTitle || '';
      document.getElementById('seoOgImage').value = seo.ogImage || '';
      document.getElementById('seoOgDesc').value = seo.ogDescription || '';
    } catch (err) {
      showToast('Error loading SEO settings: ' + err.message, 'error');
    }
  }

  async function saveSEO() {
    const payload = {
      homeTitle: document.getElementById('seoHomeTitle').value.trim(),
      homeDescription: document.getElementById('seoHomeDesc').value.trim(),
      canonicalUrl: document.getElementById('seoCanonicalUrl').value.trim(),
      keywords: document.getElementById('seoKeywords').value.trim(),
      ogTitle: document.getElementById('seoOgTitle').value.trim(),
      ogImage: document.getElementById('seoOgImage').value.trim(),
      ogDescription: document.getElementById('seoOgDesc').value.trim()
    };

    try {
      await api('/seo', { method: 'PUT', body: JSON.stringify(payload) });
      showToast('SEO settings saved successfully.', 'success');
      broadcastLiveUpdate('seo', 'update', payload);
    } catch (err) {
      showToast('Error saving SEO: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // 12. STORE SETTINGS
  // =========================================================================
  async function loadSettings() {
    try {
      const s = await api('/settings');
      document.getElementById('setSiteName').value = s.siteName || 'DIGENZ';
      document.getElementById('setSiteTagline').value = s.siteTagline || 'DIGITAL • CREATIVE • SERVICES';
      document.getElementById('setLogoDark').value = s.logoDark || '';
      document.getElementById('setFavicon').value = s.favicon || '';
      document.getElementById('setCurrencySymbol').value = s.currencySymbol || '$';
      document.getElementById('setCurrencyCode').value = s.currencyCode || 'USD';
      document.getElementById('setSupportEmail').value = s.supportEmail || '';
      document.getElementById('setSupportPhone').value = s.supportPhone || '';
      document.getElementById('setMaintenanceMode').checked = Boolean(s.maintenanceMode);

      if (s.announcementBar) {
        document.getElementById('setAnnounceEnabled').checked = Boolean(s.announcementBar.isEnabled);
        document.getElementById('setAnnounceText').value = s.announcementBar.text || '';
        document.getElementById('setAnnounceBtn').value = s.announcementBar.buttonText || '';
        document.getElementById('setAnnounceLink').value = s.announcementBar.buttonLink || '';
      }
    } catch (err) {
      showToast('Error loading settings: ' + err.message, 'error');
    }
  }

  async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn') || document.querySelector('button[onclick="Admin.saveSettings()"]');
    const originalText = btn ? btn.textContent : 'Save All Settings';

    const supportEmail = document.getElementById('setSupportEmail').value.trim();
    if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      showToast('Please enter a valid support email address (e.g., support@digenz.com).', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving Settings...';
    }

    const payload = {
      siteName: document.getElementById('setSiteName').value.trim(),
      siteTagline: document.getElementById('setSiteTagline').value.trim(),
      logoDark: document.getElementById('setLogoDark').value.trim(),
      favicon: document.getElementById('setFavicon').value.trim(),
      currencySymbol: document.getElementById('setCurrencySymbol').value.trim(),
      currencyCode: document.getElementById('setCurrencyCode').value.trim(),
      supportEmail: supportEmail,
      supportPhone: document.getElementById('setSupportPhone').value.trim(),
      maintenanceMode: document.getElementById('setMaintenanceMode').checked,
      announcementBar: {
        isEnabled: document.getElementById('setAnnounceEnabled').checked,
        text: document.getElementById('setAnnounceText').value.trim(),
        buttonText: document.getElementById('setAnnounceBtn').value.trim(),
        buttonLink: document.getElementById('setAnnounceLink').value.trim()
      }
    };

    try {
      const res = await api('/settings', { method: 'PUT', body: JSON.stringify(payload) });
      if (res && res.success && res.settings) {
        const s = res.settings;
        document.getElementById('setSiteName').value = s.siteName || '';
        document.getElementById('setSiteTagline').value = s.siteTagline || '';
        document.getElementById('setLogoDark').value = s.logoDark || '';
        document.getElementById('setFavicon').value = s.favicon || '';
        document.getElementById('setCurrencySymbol').value = s.currencySymbol || '$';
        document.getElementById('setCurrencyCode').value = s.currencyCode || 'USD';
        document.getElementById('setSupportEmail').value = s.supportEmail || '';
        document.getElementById('setSupportPhone').value = s.supportPhone || '';
        document.getElementById('setMaintenanceMode').checked = Boolean(s.maintenanceMode);

        if (s.announcementBar) {
          document.getElementById('setAnnounceEnabled').checked = Boolean(s.announcementBar.isEnabled);
          document.getElementById('setAnnounceText').value = s.announcementBar.text || '';
          document.getElementById('setAnnounceBtn').value = s.announcementBar.buttonText || '';
          document.getElementById('setAnnounceLink').value = s.announcementBar.buttonLink || '';
        }
      }
      showToast('Settings saved successfully and published to live website.', 'success');
      broadcastLiveUpdate('settings', 'update', payload);
      try { localStorage.setItem('digenz_settings_updated', Date.now().toString()); } catch (e) {}
    } catch (err) {
      showToast('Error saving settings: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  }

  // =========================================================================
  // 13. AUDIT LOGS & ADMIN PROFILE
  // =========================================================================
  async function loadAuditLogs() {
    try {
      const data = await api('/audit-logs');
      const tbody = document.getElementById('auditTableBody');

      if (!data.logs || data.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No audit logs recorded.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.logs.map(log => `
        <tr>
          <td><small class="text-muted">${new Date(log.timestamp).toLocaleString()}</small></td>
          <td><strong>${log.adminEmail}</strong></td>
          <td><span class="badge" style="background:#111; color:#3478F6; border:1px solid #333;">${log.action}</span></td>
          <td>${log.module}</td>
          <td>${log.details}</td>
          <td><code>${log.ip}</code></td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading audit logs: ' + err.message, 'error');
    }
  }

  function openProfileModal() {
    if (currentUser) {
      document.getElementById('profName').value = currentUser.name || '';
      document.getElementById('profEmail').value = currentUser.email || '';
      document.getElementById('profPassword').value = '';
    }
    openModal('profileModal');
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('profName').value.trim(),
      email: document.getElementById('profEmail').value.trim(),
      password: document.getElementById('profPassword').value || undefined
    };

    try {
      const data = await api('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) });
      currentUser = { ...currentUser, ...data.user };
      document.getElementById('sidebarUserName').textContent = currentUser.name;
      document.getElementById('topbarUserName').textContent = currentUser.email;
      closeModal('profileModal');
      showToast('Administrator profile updated successfully.', 'success');
    } catch (err) {
      showToast('Failed to update profile: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // INITIALIZATION & EVENT LISTENERS
  // =========================================================================
  function init() {
    // Auth form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => handleLogout(true));

    // Sidebar toggles
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    // Topbar user menu
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    if (userDropdownBtn && userDropdownMenu) {
      userDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdownMenu.classList.toggle('hidden');
      });
      document.addEventListener('click', () => userDropdownMenu.classList.add('hidden'));
    }

    // CMS Tab switching
    document.querySelectorAll('.cms-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cms-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.cms-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`cms-tab-${btn.dataset.cmstab}`);
        if (target) target.classList.add('active');
      });
    });

    // Hash change router
    window.addEventListener('hashchange', handleRouting);

    // Initial check
    checkAuth();
  }

  // Public Interface
  return {
    init,
    closeModal,
    loadDashboard,
    loadProducts,
    openAddProductModal,
    openEditProductModal,
    handleProductSubmit,
    deleteProduct,
    loadCategories,
    openAddCategoryModal,
    openEditCategoryModal,
    handleCategorySubmit,
    deleteCategory,
    loadOrders,
    updateOrderStatus,
    updatePaymentStatus,
    viewOrderDetails,
    submitOrderNote,
    loadCustomers,
    viewCustomerProfile,
    loadCoupons,
    openAddCouponModal,
    openEditCouponModal,
    handleCouponSubmit,
    deleteCoupon,
    loadBanners,
    openAddBannerModal,
    openEditBannerModal,
    handleBannerSubmit,
    handleModalUpload,
    deleteBanner,
    loadCMS,
    saveCMSSection,
    addFAQItem,
    removeFAQItem,
    updateFAQField,
    saveFAQS,
    loadMedia,
    copyMediaUrl,
    handleMediaUpload,
    deleteMediaFile,
    loadNavigation,
    addNavItem,
    removeNavItem,
    updateNavItem,
    saveNavigation,
    loadSEO,
    saveSEO,
    loadSettings,
    saveSettings,
    loadAuditLogs,
    openProfileModal,
    handleProfileSubmit
  };
})();

document.addEventListener('DOMContentLoaded', Admin.init);
