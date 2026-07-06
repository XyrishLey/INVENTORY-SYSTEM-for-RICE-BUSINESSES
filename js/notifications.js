/**
 * notifications.js — Alert system for Rice Inventory System
 * Handles in-app toasts, notification bell, and persistent alerts
 */

const Notifications = (() => {
  let toastContainer = null;

  function init() {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    renderBadge();
  }

  /** Show a toast notification */
  function toast(message, type = 'info', duration = 4000) {
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    const iconMap = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    t.innerHTML = `<i class="fas fa-${iconMap[type] || 'info-circle'}"></i><span>${message}</span><button class="toast__close"><i class="fas fa-times"></i></button>`;
    t.querySelector('.toast__close').addEventListener('click', () => dismissToast(t));
    toastContainer.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--visible'));
    if (duration > 0) setTimeout(() => dismissToast(t), duration);
  }

  function dismissToast(t) {
    t.classList.remove('toast--visible');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }

  /** Add a persistent notification */
  function addNotification(message, type = 'info', productId = null) {
    const notifications = Storage.getNotifications();
    const n = {
      id: Storage.generateId('n'),
      message,
      type,
      productId,
      date: new Date().toLocaleDateString('en-PH'),
      time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    notifications.unshift(n);
    // Keep max 50
    if (notifications.length > 50) notifications.splice(50);
    Storage.saveNotifications(notifications);
    renderBadge();
    toast(message, type);
  }

  function markAllRead() {
    const notifications = Storage.getNotifications().map(n => ({ ...n, read: true }));
    Storage.saveNotifications(notifications);
    renderBadge();
  }

  function renderBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = Storage.getNotifications().filter(n => !n.read).length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  /** Check all products for stock alerts */
  function checkStockAlerts(products) {
    const settings = Storage.getSettings();
    products.forEach(p => {
      if (p.stock === 0) {
        addNotification(`${p.name} is now SOLD OUT.`, 'error', p.id);
      } else if (p.stock <= (p.lowStockThreshold || settings.lowStockDefault || 10)) {
        addNotification(`Low stock alert: ${p.name} has only ${p.stock} sacks left.`, 'warning', p.id);
      }
    });
  }

  return { init, toast, addNotification, markAllRead, renderBadge, checkStockAlerts };
})();