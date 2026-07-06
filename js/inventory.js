/**
 * inventory.js — Product CRUD, card rendering, modals
 */

let currentEditId = null;
let currentStockId = null;
let currentPriceId = null;
let currentDeleteId = null;
let currentImageData = null;
let isGridView = true;

// ─── Status Helper ────────────────────────────────────────────────────────────
function getProductStatus(product) {
  if (product.stock === 0) return { label: 'Sold Out', cls: 'badge--danger', fillCls: 'product-card__stock-fill--out' };
  const threshold = product.lowStockThreshold || Storage.getSettings().lowStockDefault || 10;
  if (product.stock <= threshold) return { label: 'Low Stock', cls: 'badge--warning', fillCls: 'product-card__stock-fill--low' };
  return { label: 'In Stock', cls: 'badge--success', fillCls: '' };
}

function getStockPercent(product) {
  // Show percentage relative to a "full" of max(stock, threshold*3, 50)
  const maxRef = Math.max(product.stock, (product.lowStockThreshold || 10) * 3, 50);
  return Math.min(100, Math.round((product.stock / maxRef) * 100));
}

// ─── Product Image HTML ───────────────────────────────────────────────────────
function productImgHtml(product) {
  if (product.image) {
    return `<img class="product-card__img" src="${product.image}" alt="${product.name}" loading="lazy">`;
  }
  const icons = { Jasmine: 'fa-bowl-rice', Sinandomeng: 'fa-seedling', Dinorado: 'fa-leaf', 'Brown Rice': 'fa-wheat-awn', Milagrosa: 'fa-star', NFA: 'fa-boxes-stacked' };
  const icon = icons[product.type] || 'fa-bag-shopping';
  return `<div class="product-card__img-placeholder"><i class="fas ${icon}"></i><span>${product.type}</span></div>`;
}

// ─── Render Product Grid ──────────────────────────────────────────────────────
function renderProductGrid(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:80px 20px;"><i class="fas fa-box-open"></i><h3>No products found</h3><p>Add your first rice product to get started.</p><button class="btn btn--primary mt-2" onclick="openAddModal()"><i class="fas fa-plus"></i> Add Product</button></div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const status = getProductStatus(p);
    const pct = getStockPercent(p);
    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card__img-wrap">
        ${productImgHtml(p)}
        <div class="product-card__status"><span class="badge ${status.cls}">${status.label}</span></div>
      </div>
      <div class="product-card__body">
        <div class="product-card__type">${p.type}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__meta">
          <div>
            <div class="product-card__price">${formatCurrency(p.price)}</div>
            <div class="product-card__price-label">per sack</div>
          </div>
          <div class="product-card__stock-info">
            <div class="product-card__stock-num">${p.stock}</div>
            <div class="product-card__stock-label">sacks left</div>
          </div>
        </div>
        <div class="product-card__stock-bar">
          <div class="product-card__stock-fill ${status.fillCls}" style="width:${pct}%"></div>
        </div>
        <div class="product-card__actions">
          <button class="btn btn--outline btn--xs" onclick="openEditModal('${p.id}')"><i class="fas fa-pen"></i> Edit</button>
          <button class="btn btn--primary btn--xs" onclick="openStockModal('${p.id}')"><i class="fas fa-boxes-stacked"></i> Stock</button>
          <button class="btn btn--warning btn--xs" onclick="openPriceModal('${p.id}')"><i class="fas fa-tag"></i> Price</button>
          <button class="btn btn--secondary btn--xs" onclick="openPhotoReplace('${p.id}')"><i class="fas fa-image"></i> Photo</button>
          <button class="btn btn--danger btn--xs product-card__actions--full" onclick="openDeleteModal('${p.id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Render Product Table (List View) ────────────────────────────────────────
function renderProductTable(products) {
  const tbody = document.getElementById('product-table-body');
  if (!tbody) return;
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty"><i class="fas fa-box-open"></i><p>No products found</p></td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => {
    const status = getProductStatus(p);
    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:40px;height:40px;border-radius:8px;background:var(--green-50);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
            ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-seedling" style="color:var(--green-300);"></i>'}
          </div>
          <span style="font-weight:600;">${p.name}</span>
        </div>
      </td>
      <td>${p.type}</td>
      <td class="font-bold">${formatCurrency(p.price)}</td>
      <td class="font-bold">${p.stock} sacks</td>
      <td><span class="badge ${status.cls}">${status.label}</span></td>
      <td>
        <div style="display:flex;gap:5px;">
          <button class="btn btn--outline btn--xs" onclick="openEditModal('${p.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn btn--primary btn--xs" onclick="openStockModal('${p.id}')"><i class="fas fa-boxes-stacked"></i></button>
          <button class="btn btn--warning btn--xs" onclick="openPriceModal('${p.id}')"><i class="fas fa-tag"></i></button>
          <button class="btn btn--danger btn--xs" onclick="openDeleteModal('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── Render Stats Row ─────────────────────────────────────────────────────────
function renderInventoryStats() {
  const products = Storage.getProducts();
  const settings = Storage.getSettings();
  const lowStockDefault = settings.lowStockDefault || 10;
  const total = products.length;
  const low = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || lowStockDefault)).length;
  const out = products.filter(p => p.stock === 0).length;
  const el = document.getElementById('inventory-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="inv-stat inv-stat--total"><i class="fas fa-boxes-stacked"></i><span><strong>${total}</strong> Products</span></div>
    <div class="inv-stat inv-stat--low"><i class="fas fa-exclamation-triangle"></i><span><strong>${low}</strong> Low Stock</span></div>
    <div class="inv-stat inv-stat--out"><i class="fas fa-times-circle"></i><span><strong>${out}</strong> Sold Out</span></div>
  `;
}

// ─── Populate Type Filter ─────────────────────────────────────────────────────
function populateTypeFilter() {
  const sel = document.getElementById('filter-type');
  if (!sel) return;
  const types = [...new Set(Storage.getProducts().map(p => p.type))];
  sel.innerHTML = '<option value="">All Types</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
}

// ─── Filtered Render ─────────────────────────────────────────────────────────
function renderFiltered() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('filter-type')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const settings = Storage.getSettings();
  const lowStockDefault = settings.lowStockDefault || 10;

  let products = Storage.getProducts();
  if (q) products = products.filter(p => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
  if (typeFilter) products = products.filter(p => p.type === typeFilter);
  if (statusFilter === 'instock') products = products.filter(p => p.stock > (p.lowStockThreshold || lowStockDefault));
  else if (statusFilter === 'low') products = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || lowStockDefault));
  else if (statusFilter === 'out') products = products.filter(p => p.stock === 0);

  renderProductGrid(products);
  renderProductTable(products);
}

// ─── View Toggle ─────────────────────────────────────────────────────────────
function initViewToggles() {
  document.getElementById('btn-grid-view')?.addEventListener('click', () => {
    isGridView = true;
    document.getElementById('product-grid').className = 'product-grid active';
    document.getElementById('product-list-view').className = 'product-list-view';
    document.getElementById('btn-grid-view').classList.add('view-toggle-btn--active');
    document.getElementById('btn-list-view').classList.remove('view-toggle-btn--active');
  });
  document.getElementById('btn-list-view')?.addEventListener('click', () => {
    isGridView = false;
    document.getElementById('product-grid').className = 'product-grid inactive';
    document.getElementById('product-list-view').className = 'product-list-view active';
    document.getElementById('btn-list-view').classList.add('view-toggle-btn--active');
    document.getElementById('btn-grid-view').classList.remove('view-toggle-btn--active');
    renderProductTable(Storage.getProducts());
  });
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function openAddModal() {
  currentEditId = null;
  currentImageData = null;
  document.getElementById('modal-product-title').textContent = 'Add New Product';
  ['prod-name','prod-type','prod-price','prod-cost','prod-stock','prod-threshold','prod-weight'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  resetImageUpload();
  openModal('modal-product');
}

function openEditModal(id) {
  const product = Storage.getProducts().find(p => p.id === id);
  if (!product) return;
  currentEditId = id;
  currentImageData = product.image || null;
  document.getElementById('modal-product-title').textContent = 'Edit Product';
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-type').value = product.type;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-cost').value = product.costPrice;
  document.getElementById('prod-stock').value = product.stock;
  document.getElementById('prod-threshold').value = product.lowStockThreshold || '';
  document.getElementById('prod-weight').value = product.weight || '';
  if (product.image) {
    document.getElementById('img-preview').src = product.image;
    document.getElementById('img-preview').style.display = 'block';
    document.getElementById('img-placeholder').style.display = 'none';
  } else {
    resetImageUpload();
  }
  openModal('modal-product');
}

function saveProduct() {
  const name = document.getElementById('prod-name').value.trim();
  const type = document.getElementById('prod-type').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const cost = parseFloat(document.getElementById('prod-cost').value);
  const stock = parseInt(document.getElementById('prod-stock').value, 10);
  const threshold = parseInt(document.getElementById('prod-threshold').value, 10) || 10;
  const weight = document.getElementById('prod-weight').value.trim();

  if (!name || !type || isNaN(price) || isNaN(cost) || isNaN(stock)) {
    Notifications.toast('Please fill in all required fields.', 'error'); return;
  }

  const products = Storage.getProducts();
  if (currentEditId) {
    const idx = products.findIndex(p => p.id === currentEditId);
    if (idx === -1) return;
    const oldStock = products[idx].stock;
    products[idx] = { ...products[idx], name, type, price, costPrice: cost, lowStockThreshold: threshold, weight, image: currentImageData };
    if (stock !== oldStock) products[idx].stock = stock;
    Storage.saveProducts(products);
    Notifications.addNotification(`${name} updated successfully.`, 'success');
  } else {
    const newProduct = {
      id: Storage.generateId('p'),
      name, type, price, costPrice: cost, stock,
      lowStockThreshold: threshold, weight,
      image: currentImageData,
      dateAdded: today()
    };
    products.push(newProduct);
    Storage.saveProducts(products);
    Notifications.addNotification(`${name} added to inventory.`, 'success');
  }

  closeModal('modal-product');
  renderInventoryStats();
  populateTypeFilter();
  renderFiltered();
}

// ─── Stock Modal ──────────────────────────────────────────────────────────────
function openStockModal(id) {
  const product = Storage.getProducts().find(p => p.id === id);
  if (!product) return;
  currentStockId = id;
  document.getElementById('stock-product-name').textContent = product.name;
  document.getElementById('stock-current-label').textContent = `Current stock: ${product.stock} sacks`;
  document.getElementById('stock-qty').value = '';
  document.getElementById('stock-action').value = 'add';
  openModal('modal-stock');
}

function saveStock() {
  const products = Storage.getProducts();
  const idx = products.findIndex(p => p.id === currentStockId);
  if (idx === -1) return;
  const action = document.getElementById('stock-action').value;
  const qty = parseInt(document.getElementById('stock-qty').value, 10);
  if (isNaN(qty) || qty < 0) { Notifications.toast('Enter a valid quantity.', 'error'); return; }

  const product = products[idx];
  let newStock = product.stock;
  if (action === 'add') newStock += qty;
  else if (action === 'remove') { newStock = Math.max(0, newStock - qty); }
  else newStock = qty;

  products[idx].stock = newStock;
  Storage.saveProducts(products);

  const settings = Storage.getSettings();
  if (action === 'add') Notifications.addNotification(`Restocked ${product.name}: +${qty} sacks (now ${newStock} sacks).`, 'success');
  if (newStock === 0) Notifications.addNotification(`${product.name} is now SOLD OUT.`, 'error');
  else if (newStock <= (product.lowStockThreshold || settings.lowStockDefault || 10)) {
    Notifications.addNotification(`Low stock: ${product.name} has ${newStock} sacks remaining.`, 'warning');
  }

  closeModal('modal-stock');
  renderInventoryStats();
  renderFiltered();
}

// ─── Price Modal ──────────────────────────────────────────────────────────────
function openPriceModal(id) {
  const product = Storage.getProducts().find(p => p.id === id);
  if (!product) return;
  currentPriceId = id;
  document.getElementById('price-product-name').textContent = product.name;
  document.getElementById('price-current-label').textContent = `Current: Sell ₱${product.price} / Cost ₱${product.costPrice}`;
  document.getElementById('price-new').value = product.price;
  document.getElementById('cost-new').value = product.costPrice;
  openModal('modal-price');
}

function savePrice() {
  const products = Storage.getProducts();
  const idx = products.findIndex(p => p.id === currentPriceId);
  if (idx === -1) return;
  const newPrice = parseFloat(document.getElementById('price-new').value);
  const newCost = parseFloat(document.getElementById('cost-new').value);
  if (isNaN(newPrice) || newPrice <= 0) { Notifications.toast('Enter a valid price.', 'error'); return; }
  products[idx].price = newPrice;
  if (!isNaN(newCost) && newCost > 0) products[idx].costPrice = newCost;
  Storage.saveProducts(products);
  Notifications.addNotification(`Price updated for ${products[idx].name}: now ₱${newPrice}/sack.`, 'info');
  closeModal('modal-price');
  renderFiltered();
}

// ─── Photo Replace ────────────────────────────────────────────────────────────
function openPhotoReplace(id) {
  currentEditId = id;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const products = Storage.getProducts();
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return;
      products[idx].image = ev.target.result;
      Storage.saveProducts(products);
      Notifications.toast('Product photo updated.', 'success');
      renderFiltered();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function openDeleteModal(id) {
  const product = Storage.getProducts().find(p => p.id === id);
  if (!product) return;
  currentDeleteId = id;
  document.getElementById('delete-product-name').textContent = product.name;
  openModal('modal-delete');
}

function deleteProduct() {
  const products = Storage.getProducts().filter(p => p.id !== currentDeleteId);
  Storage.saveProducts(products);
  Notifications.toast('Product deleted.', 'info');
  closeModal('modal-delete');
  renderInventoryStats();
  populateTypeFilter();
  renderFiltered();
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function initImageUpload() {
  const input = document.getElementById('img-input');
  const preview = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  if (!input) return;
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      currentImageData = ev.target.result;
      preview.src = currentImageData;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

function resetImageUpload() {
  const preview = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'block';
  currentImageData = null;
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('modal-overlay--open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('modal-overlay--open'); }

function initModals() {
  // Close buttons
  document.getElementById('modal-product-close')?.addEventListener('click', () => closeModal('modal-product'));
  document.getElementById('modal-product-cancel')?.addEventListener('click', () => closeModal('modal-product'));
  document.getElementById('modal-product-save')?.addEventListener('click', saveProduct);

  document.getElementById('modal-stock-close')?.addEventListener('click', () => closeModal('modal-stock'));
  document.getElementById('modal-stock-cancel')?.addEventListener('click', () => closeModal('modal-stock'));
  document.getElementById('modal-stock-save')?.addEventListener('click', saveStock);

  document.getElementById('modal-price-close')?.addEventListener('click', () => closeModal('modal-price'));
  document.getElementById('modal-price-cancel')?.addEventListener('click', () => closeModal('modal-price'));
  document.getElementById('modal-price-save')?.addEventListener('click', savePrice);

  document.getElementById('modal-delete-close')?.addEventListener('click', () => closeModal('modal-delete'));
  document.getElementById('modal-delete-cancel')?.addEventListener('click', () => closeModal('modal-delete'));
  document.getElementById('modal-delete-confirm')?.addEventListener('click', deleteProduct);

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('modal-overlay--open'); });
  });
}

// ─── Page Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Storage.initializeData();
  renderInventoryStats();
  populateTypeFilter();
  renderFiltered();
  initViewToggles();
  initModals();
  initImageUpload();

  document.getElementById('btn-add-product')?.addEventListener('click', openAddModal);
  document.getElementById('search-input')?.addEventListener('input', renderFiltered);
  document.getElementById('filter-type')?.addEventListener('change', renderFiltered);
  document.getElementById('filter-status')?.addEventListener('change', renderFiltered);
});