/**
 * analytics.js — Data computation for Rice Inventory System
 * Aggregates sales/inventory data for charts and reports
 */

const Analytics = (() => {

  function getTodaySales() {
    const today = new Date().toISOString().slice(0, 10);
    return Storage.getSales().filter(s => s.date === today);
  }

  function getSalesByRange(startDate, endDate) {
    return Storage.getSales().filter(s => s.date >= startDate && s.date <= endDate);
  }

  function getDailySales(daysBack = 7) {
    const result = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const sales = Storage.getSales().filter(s => s.date === dateStr);
      result.push({
        date: dateStr,
        label: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        revenue: sales.reduce((sum, s) => sum + s.totalRevenue, 0),
        profit: sales.reduce((sum, s) => sum + s.totalProfit, 0),
        units: sales.reduce((sum, s) => sum + s.quantity, 0),
      });
    }
    return result;
  }

  function getWeeklySales(weeksBack = 8) {
    const result = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      const sales = getSalesByRange(startStr, endStr);
      result.push({
        label: `Wk ${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
        revenue: sales.reduce((sum, s) => sum + s.totalRevenue, 0),
        profit: sales.reduce((sum, s) => sum + s.totalProfit, 0),
        units: sales.reduce((sum, s) => sum + s.quantity, 0),
      });
    }
    return result;
  }

  function getMonthlySales(year = new Date().getFullYear()) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months.map((label, i) => {
      const mo = String(i + 1).padStart(2, '0');
      const sales = Storage.getSales().filter(s => s.date.startsWith(`${year}-${mo}`));
      return {
        label,
        revenue: sales.reduce((sum, s) => sum + s.totalRevenue, 0),
        profit: sales.reduce((sum, s) => sum + s.totalProfit, 0),
        units: sales.reduce((sum, s) => sum + s.quantity, 0),
      };
    });
  }

  function getTopProducts(limit = 5) {
    const salesMap = {};
    Storage.getSales().forEach(s => {
      if (!salesMap[s.productId]) salesMap[s.productId] = { name: s.productName, units: 0, revenue: 0, profit: 0 };
      salesMap[s.productId].units += s.quantity;
      salesMap[s.productId].revenue += s.totalRevenue;
      salesMap[s.productId].profit += s.totalProfit;
    });
    return Object.entries(salesMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  function getSummary() {
    const sales = Storage.getSales();
    const products = Storage.getProducts();
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.totalProfit, 0);
    const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)).length;
    const soldOut = products.filter(p => p.stock === 0).length;
    return { totalRevenue, totalProfit, totalUnits, totalStock, lowStock, soldOut, productCount: products.length };
  }

  function getProductSalesMap() {
    const map = {};
    Storage.getSales().forEach(s => {
      if (!map[s.productId]) map[s.productId] = { units: 0, revenue: 0 };
      map[s.productId].units += s.quantity;
      map[s.productId].revenue += s.totalRevenue;
    });
    return map;
  }

  return { getTodaySales, getSalesByRange, getDailySales, getWeeklySales, getMonthlySales, getTopProducts, getSummary, getProductSalesMap };
})();