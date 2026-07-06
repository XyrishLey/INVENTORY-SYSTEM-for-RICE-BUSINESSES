/**
 * sales.js — Sale recording, history rendering, and sales UI
 */

let selectedProductId = null;
let deleteSaleId = null;

// ─── Quick Stats ──────────────────────────────────────────────────────────────
function renderSalesQuickStats() {
  const container = document.getElementById('sales-quick-stats');
  if (!container) return;

  const allSales = Storage.getSales();
  const todayStr = today();
  const todaySales = allSales.filter(s => s.date === todayStr);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const todayProfit  = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);
  const todayUnits   = todaySales.reduce((sum, s) => sum + s.quantity, 0);

  container.innerHTML = `
    <div class="quick-stat">
      <div class="quick-stat__label">Today's Revenue</div>
      <div class="quick-stat__value">${formatCurrency(todayRevenue)}</div>
    </div>
    <div class="quick-stat">
      <div class="quick-stat__label">Today's Profit</div>
      <div class="quick-stat__value" style="color:var(--green-600);">${formatCurrency(todayProfit)}</div>
    </div>
    <div class="quick-stat">
      <div class="quick-stat__label">Sacks Sold Today</div>
      <div class="quick-stat__value">${todayUnits} sacks</div>
    </div>
  `;
}

// ─── Product Selector ─────────────────────────────────────────────────────────
function renderProductSelector() {
  const container = document.getElementById('sale-product-selector');
  if (!container) return;

  const products = Storage.getProducts();
  if (products.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">
        <i class="fas fa-box-open" style="font-size:24px;margin-bottom:8px;opacity:.4;display:block;"></i>
        No products in inventory.<br>
        <a href="inventory.html" style="color:var(--accent);font-weight:600;">Add products first →</a>
      </div>`;
    return;
  }

  container.innerHTML = products.map(p => {
    const isSoldOut = p.stock === 0;
    const isSelected = p.id === selectedProductId;
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;margin-bottom:6px;">`
      : `<div class="product-option__icon"><i class="fas fa-seedling"></i></div>`;

    return `
      <div
        class="product-option ${isSelected ? 'product-option--selected' : ''} ${isSoldOut ? 'product-option--soldout' : ''}"
        data-id="${p.id}"
        onclick="${isSoldOut ? '' : `selectProduct('${p.id}')`}"
        title="${isSoldOut ? 'Sold Out' : p.name}"
      >
        ${imgHtml}
        <div class="product-option__name">${p.name}</div>
        <div class="product-option__price">${formatCurrency(p.price)}</div>
        <div class="product-option__stock">${isSoldOut ? '<span style="color:var(--danger);">Sold Out</span>' : p.stock + ' sacks'}</div>
      </div>`;
  }).join('');
}

// ─── Select a Product ─────────────────────────────────────────────────────────
function selectProduct(id) {
  selectedProductId = id;

  // Update selector highlight
  document.querySelectorAll('.product-option').forEach(el => {
    el.classList.toggle('product-option--selected', el.dataset.id === id);
  });

  updateSalePreview();
}

// ─── Sale Preview ─────────────────────────────────────────────────────────────
function updateSalePreview() {
  const preview = document.getElementById('sale-preview');
  if (!preview) return;

  if (!selectedProductId) {
    preview.style.display = 'none';
    return;
  }

  const product = Storage.getProducts().find(p => p.id === selectedProductId);
  if (!product) return;

  const qty = Math.max(1, parseInt(document.getElementById('sale-qty')?.value, 10) || 1);
  const overridePrice = parseFloat(document.getElementById('sale-price-override')?.value);
  const unitPrice = (!isNaN(overridePrice) && overridePrice > 0) ? overridePrice : product.price;
  const totalRevenue = unitPrice * qty;
  const totalCost = product.costPrice * qty;
  const totalProfit = totalRevenue - totalCost;

  document.getElementById('prev-product').textContent  = product.name;
  document.getElementById('prev-qty').textContent      = `${qty} sack${qty > 1 ? 's' : ''}`;
  document.getElementById('prev-price').textContent    = formatCurrency(unitPrice) + '/sack';
  document.getElementById('prev-cost').textContent     = formatCurrency(totalCost);
  document.getElementById('prev-revenue').textContent  = formatCurrency(totalRevenue);
  document.getElementById('prev-profit').textContent   = formatCurrency(totalProfit);

  preview.style.display = 'block';
}

// ─── Record Sale ──────────────────────────────────────────────────────────────
function recordSale() {
  if (!selectedProductId) {
    Notifications.toast('Please select a product first.', 'warning');
    return;
  }

  const products = Storage.getProducts();
  const productIdx = products.findIndex(p => p.id === selectedProductId);
  if (productIdx === -1) {
    Notifications.toast('Product not found.', 'error');
    return;
  }

  const product = products[productIdx];
  const qty = parseInt(document.getElementById('sale-qty')?.value, 10);
  if (isNaN(qty) || qty < 1) {
    Notifications.toast('Enter a valid quantity (at least 1).', 'warning');
    return;
  }

  if (qty > product.stock) {
    Notifications.toast(`Not enough stock. Only ${product.stock} sacks available.`, 'error');
    return;
  }

  const overridePrice = parseFloat(document.getElementById('sale-price-override')?.value);
  const unitPrice  = (!isNaN(overridePrice) && overridePrice > 0) ? overridePrice : product.price;
  const totalRevenue = unitPrice * qty;
  const totalCost    = product.costPrice * qty;
  const totalProfit  = totalRevenue - totalCost;

  const saleDateInput = document.getElementById('sale-date')?.value;
  const saleDate = saleDateInput || today();
  const saleTime = now();
  const notes    = document.getElementById('sale-notes')?.value.trim() || '';

  // Build sale record
  const sale = {
    id: Storage.generateId('s'),
    productId: product.id,
    productName: product.name,
    quantity: qty,
    pricePerUnit: unitPrice,
    costPerUnit: product.costPrice,
    totalRevenue,
    totalCost,
    totalProfit,
    date: saleDate,
    time: saleTime,
    notes,
  };

  // Save sale
  const sales = Storage.getSales();
  sales.push(sale);
  Storage.saveSales(sales);

  // Deduct stock
  products[productIdx].stock -= qty;
  Storage.saveProducts(products);

  // Notifications
  const settings = Storage.getSettings();
  Notifications.addNotification(
    `Sold ${qty} sack${qty > 1 ? 's' : ''} of ${product.name} — Revenue: ${formatCurrency(totalRevenue)}, Profit: ${formatCurrency(totalProfit)}`,
    'success'
  );

  const newStock = products[productIdx].stock;
  const threshold = product.lowStockThreshold || settings.lowStockDefault || 10;
  if (newStock === 0) {
    Notifications.addNotification(`${product.name} is now SOLD OUT.`, 'error');
  } else if (newStock <= threshold) {
    Notifications.addNotification(`Low stock alert: ${product.name} has only ${newStock} sacks left.`, 'warning');
  }

  // Reset form
  resetSaleForm();

  // Re-render
  renderSalesQuickStats();
  renderProductSelector();
  renderSalesHistory();
}

// ─── Reset Form ───────────────────────────────────────────────────────────────
function resetSaleForm() {
  selectedProductId = null;
  const qtyEl     = document.getElementById('sale-qty');
  const priceEl   = document.getElementById('sale-price-override');
  const notesEl   = document.getElementById('sale-notes');
  if (qtyEl)   qtyEl.value   = '1';
  if (priceEl) priceEl.value = '';
  if (notesEl) notesEl.value = '';

  // Reset date to today
  const dateEl = document.getElementById('sale-date');
  if (dateEl) dateEl.value = today();

  document.getElementById('sale-preview').style.display = 'none';
}

// ─── Sales History ────────────────────────────────────────────────────────────
function renderSalesHistory(filterText = '', filterDate = '') {
  const tbody = document.getElementById('sales-table-body');
  if (!tbody) return;

  let sales = Storage.getSales().slice().reverse(); // newest first

  if (filterText) {
    const q = filterText.toLowerCase();
    sales = sales.filter(s =>
      s.productName.toLowerCase().includes(q) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  }
  if (filterDate) {
    sales = sales.filter(s => s.date === filterDate);
  }

  if (sales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="table-empty">
            <i class="fas fa-receipt"></i>
            <p>No sales records found.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = sales.map(s => `
    <tr id="sale-row-${s.id}">
      <td>
        <div style="font-weight:600;font-size:13px;">${s.date}</div>
        <div style="font-size:11px;color:var(--text-muted);">${s.time}</div>
      </td>
      <td>
        <div style="font-weight:600;">${s.productName}</div>
        ${s.notes ? `<div style="font-size:11px;color:var(--text-muted);">${s.notes}</div>` : ''}
      </td>
      <td class="font-bold">${s.quantity} sacks</td>
      <td>${formatCurrency(s.pricePerUnit)}</td>
      <td class="font-bold text-success">${formatCurrency(s.totalRevenue)}</td>
      <td style="color:var(--green-600);font-weight:700;">${formatCurrency(s.totalProfit)}</td>
      <td>
        <button class="btn btn--danger btn--xs" onclick="openDeleteSaleModal('${s.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ─── Delete Sale Modal ────────────────────────────────────────────────────────
function openDeleteSaleModal(id) {
  deleteSaleId = id;
  openModal('modal-delete-sale');
}

function deleteSale() {
  if (!deleteSaleId) return;
  const sales = Storage.getSales().filter(s => s.id !== deleteSaleId);
  Storage.saveSales(sales);
  Notifications.toast('Sale record deleted.', 'info');
  closeModal('modal-delete-sale');
  deleteSaleId = null;
  renderSalesHistory(
    document.getElementById('sales-search')?.value || '',
    document.getElementById('sales-date-filter')?.value || ''
  );
  renderSalesQuickStats();
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('modal-overlay--open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('modal-overlay--open'); }

function initModals() {
  document.getElementById('modal-delete-sale-close')?.addEventListener('click', () => closeModal('modal-delete-sale'));
  document.getElementById('modal-delete-sale-cancel')?.addEventListener('click', () => closeModal('modal-delete-sale'));
  document.getElementById('modal-delete-sale-confirm')?.addEventListener('click', deleteSale);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('modal-overlay--open');
    });
  });
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function initFilters() {
  const searchEl = document.getElementById('sales-search');
  const dateEl   = document.getElementById('sales-date-filter');
  const clearEl  = document.getElementById('btn-clear-filter');

  searchEl?.addEventListener('input', () => {
    renderSalesHistory(searchEl.value, dateEl?.value || '');
  });

  dateEl?.addEventListener('change', () => {
    renderSalesHistory(searchEl?.value || '', dateEl.value);
  });

  clearEl?.addEventListener('click', () => {
    if (searchEl) searchEl.value = '';
    if (dateEl) dateEl.value = '';
    renderSalesHistory();
  });
}

// ─── Page Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Storage.initializeData();

  // Set default sale date to today
  const dateEl = document.getElementById('sale-date');
  if (dateEl) dateEl.value = today();

  renderSalesQuickStats();
  renderProductSelector();
  renderSalesHistory();
  initModals();
  initFilters();

  // Record sale button
  document.getElementById('btn-record-sale')?.addEventListener('click', recordSale);

  // Live preview updates
  document.getElementById('sale-qty')?.addEventListener('input', updateSalePreview);
  document.getElementById('sale-price-override')?.addEventListener('input', updateSalePreview);
});