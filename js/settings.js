/**
 * settings.js — Settings page: load, save, data management
 */

// ─── Load Settings into Form ──────────────────────────────────────────────────
function loadSettings() {
  const s = Storage.getSettings();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  const chk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val !== false; };

  set('set-store-name',  s.storeName   || 'RiceMart');
  set('set-owner-name',  s.ownerName   || '');
  set('set-currency',    s.currency    || '₱');
  set('set-low-stock',   s.lowStockDefault || 10);

  chk('set-notif-lowstock', s.notifLowStock);
  chk('set-notif-soldout',  s.notifSoldOut);
  chk('set-notif-price',    s.notifPrice);
  chk('set-notif-restock',  s.notifRestock);
}

// ─── Save Settings ────────────────────────────────────────────────────────────
function saveSettings() {
  const get = id => document.getElementById(id)?.value.trim();
  const chk = id => document.getElementById(id)?.checked;

  const storeName = get('set-store-name');
  if (!storeName) { Notifications.toast('Store name cannot be empty.', 'error'); return; }

  const settings = {
    ...Storage.getSettings(),
    storeName,
    ownerName:        get('set-owner-name'),
    currency:         get('set-currency') || '₱',
    lowStockDefault:  parseInt(get('set-low-stock'), 10) || 10,
    notifLowStock:    chk('set-notif-lowstock'),
    notifSoldOut:     chk('set-notif-soldout'),
    notifPrice:       chk('set-notif-price'),
    notifRestock:     chk('set-notif-restock'),
  };

  Storage.saveSettings(settings);

  // Update sidebar store name live
  const nameEl = document.getElementById('store-name');
  if (nameEl) nameEl.textContent = storeName;

  Notifications.toast('Settings saved successfully.', 'success');
}

// ─── Export All Data ──────────────────────────────────────────────────────────
function exportData() {
  const data = {
    products:      Storage.getProducts(),
    sales:         Storage.getSales(),
    notifications: Storage.getNotifications(),
    settings:      Storage.getSettings(),
    exportedAt:    new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `ricemart-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Notifications.toast('Data exported as JSON backup.', 'success');
}

// ─── Clear Notifications ──────────────────────────────────────────────────────
function clearNotifications() {
  Storage.saveNotifications([]);
  Notifications.renderBadge();
  Notifications.toast('All notifications cleared.', 'info');
}

// ─── Clear Sales ──────────────────────────────────────────────────────────────
function clearSales() {
  if (!confirm('Clear all sales history? This cannot be undone.')) return;
  Storage.saveSales([]);
  Notifications.toast('Sales history cleared.', 'info');
}

// ─── Reset Modal ──────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('modal-overlay--open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('modal-overlay--open'); }

async function resetAllData() {
  Storage.clearAll();
  closeModal('modal-reset');
  Notifications.toast('All data reset. Reloading…', 'warning');
  setTimeout(() => location.reload(), 1200);
}

// ─── Page Init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Storage.initializeData();
  loadSettings();

  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
  document.getElementById('btn-export-data')?.addEventListener('click', exportData);
  document.getElementById('btn-clear-notifications')?.addEventListener('click', clearNotifications);
  document.getElementById('btn-clear-sales')?.addEventListener('click', clearSales);
  document.getElementById('btn-reset-data')?.addEventListener('click', () => openModal('modal-reset'));

  document.getElementById('modal-reset-close')?.addEventListener('click',  () => closeModal('modal-reset'));
  document.getElementById('modal-reset-cancel')?.addEventListener('click', () => closeModal('modal-reset'));
  document.getElementById('modal-reset-confirm')?.addEventListener('click', resetAllData);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('modal-overlay--open');
    });
  });
});