/**
 * main.js — Shared utilities, navigation, and init for Rice Inventory System
 */

// ─── Currency Formatter ───────────────────────────────────────────────────────
function formatCurrency(amount) {
  const settings = Storage.getSettings();
  const currency = settings.currency || '₱';
  return `${currency}${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }); }

// ─── Active Nav Link ─────────────────────────────────────────────────────────
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    link.classList.toggle('nav__link--active', href === page);
  });
}

// ─── Mobile Sidebar Toggle ────────────────────────────────────────────────────
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar--open');
    overlay && overlay.classList.toggle('overlay--visible');
  });
  overlay && overlay.addEventListener('click', () => {
    sidebar.classList.remove('sidebar--open');
    overlay.classList.remove('overlay--visible');
  });
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function initNotifBell() {
  const bell = document.getElementById('notif-bell');
  const panel = document.getElementById('notif-panel');
  if (!bell || !panel) return;
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('notif-panel--open');
    if (panel.classList.contains('notif-panel--open')) {
      renderNotifPanel();
      Notifications.markAllRead();
    }
  });
  document.addEventListener('click', () => panel.classList.remove('notif-panel--open'));
}

function renderNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const notifications = Storage.getNotifications();
  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>`;
    return;
  }
  list.innerHTML = notifications.slice(0, 20).map(n => `
    <div class="notif-item notif-item--${n.type} ${n.read ? '' : 'notif-item--unread'}">
      <i class="fas fa-${n.type === 'error' ? 'exclamation-circle' : n.type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
      <div>
        <p>${n.message}</p>
        <span>${n.date} ${n.time}</span>
      </div>
    </div>
  `).join('');
}

// ─── Store Name in Header ─────────────────────────────────────────────────────
function renderStoreName() {
  const el = document.getElementById('store-name');
  if (el) el.textContent = Storage.getSettings().storeName || 'RiceMart';
}

// ─── Page Init ────────────────────────────────────────────────────────────────
async function initPage() {
  await Storage.initializeData();
  setActiveNav();
  initSidebar();
  initNotifBell();
  renderStoreName();
  Notifications.init();
}

document.addEventListener('DOMContentLoaded', initPage);