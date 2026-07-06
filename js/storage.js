/**
 * storage.js — localStorage wrapper for Rice Inventory System
 * Handles all data persistence and initialization
 */

const Storage = (() => {
  const KEYS = {
    PRODUCTS: 'ris_products',
    SALES: 'ris_sales',
    NOTIFICATIONS: 'ris_notifications',
    SETTINGS: 'ris_settings',
    INITIALIZED: 'ris_initialized',
  };

  /** Load sample data from JSON and seed localStorage */
  async function initializeData() {
    if (localStorage.getItem(KEYS.INITIALIZED)) return;
    try {
      const res = await fetch('../data/sample-data.json');
      const data = await res.json();
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data.products));
      localStorage.setItem(KEYS.SALES, JSON.stringify(data.sales));
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
      localStorage.setItem(KEYS.INITIALIZED, 'true');
    } catch (e) {
      console.warn('Could not load sample-data.json, seeding defaults.', e);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
      localStorage.setItem(KEYS.SALES, JSON.stringify([]));
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify({
        storeName: 'RiceMart', ownerName: 'Owner', currency: '₱',
        lowStockDefault: 10, theme: 'light'
      }));
      localStorage.setItem(KEYS.INITIALIZED, 'true');
    }
  }

  function getProducts() {
    return JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
  }
  function saveProducts(products) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  }

  function getSales() {
    return JSON.parse(localStorage.getItem(KEYS.SALES) || '[]');
  }
  function saveSales(sales) {
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));
  }

  function getNotifications() {
    return JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
  }
  function saveNotifications(notifications) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }

  function getSettings() {
    return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
  }
  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  function generateId(prefix = 'id') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  return {
    initializeData, KEYS,
    getProducts, saveProducts,
    getSales, saveSales,
    getNotifications, saveNotifications,
    getSettings, saveSettings,
    generateId, clearAll
  };
})();