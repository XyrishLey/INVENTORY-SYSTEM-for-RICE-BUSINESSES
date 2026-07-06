/**
 * dashboard.js — Dashboard rendering, charts, and live stats
 */

let revenueChart = null;
let stockChart = null;

// ─── Render Stats Cards ──────────────────────────────────────────────────────
function renderStats() {
  const summary = Analytics.getSummary();
  const todaySales = Analytics.getTodaySales();
  const todayRevenue = todaySales.reduce((s, x) => s + x.totalRevenue, 0);
  const todayProfit = todaySales.reduce((s, x) => s + x.totalProfit, 0);

  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__icon stat-card__icon--green"><i class="fas fa-money-bill-wave"></i></div>
      <div class="stat-card__info">
        <div class="stat-card__label">Total Revenue</div>
        <div class="stat-card__value">${formatCurrency(summary.totalRevenue)}</div>
        <div class="stat-card__sub">Today: ${formatCurrency(todayRevenue)}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon stat-card__icon--yellow"><i class="fas fa-chart-line"></i></div>
      <div class="stat-card__info">
        <div class="stat-card__label">Total Profit</div>
        <div class="stat-card__value">${formatCurrency(summary.totalProfit)}</div>
        <div class="stat-card__sub">Today: ${formatCurrency(todayProfit)}</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon stat-card__icon--blue"><i class="fas fa-shopping-cart"></i></div>
      <div class="stat-card__info">
        <div class="stat-card__label">Sacks Sold</div>
        <div class="stat-card__value">${summary.totalUnits.toLocaleString()}</div>
        <div class="stat-card__sub">${todaySales.reduce((s,x)=>s+x.quantity,0)} sold today</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card__icon stat-card__icon--teal"><i class="fas fa-warehouse"></i></div>
      <div class="stat-card__info">
        <div class="stat-card__label">Stock Remaining</div>
        <div class="stat-card__value">${summary.totalStock.toLocaleString()}</div>
        <div class="stat-card__sub">${summary.productCount} products</div>
      </div>
    </div>
  `;
}

// ─── Render Alerts ────────────────────────────────────────────────────────────
function renderAlerts() {
  const summary = Analytics.getSummary();
  const container = document.getElementById('dashboard-alerts');
  if (!container) return;
  container.innerHTML = '';

  if (summary.soldOut > 0) {
    const b = document.createElement('div');
    b.className = 'alert-banner alert-banner--danger';
    b.innerHTML = `<i class="fas fa-exclamation-circle"></i><div class="alert-banner__text"><strong>${summary.soldOut} product${summary.soldOut > 1 ? 's' : ''} sold out.</strong> Restock immediately to avoid lost sales.</div><a href="inventory.html" class="btn btn--sm btn--danger">Restock Now</a>`;
    container.appendChild(b);
  }
  if (summary.lowStock > 0) {
    const b = document.createElement('div');
    b.className = 'alert-banner alert-banner--warning';
    b.innerHTML = `<i class="fas fa-exclamation-triangle"></i><div class="alert-banner__text"><strong>${summary.lowStock} product${summary.lowStock > 1 ? 's are' : ' is'} running low.</strong> Consider restocking soon.</div><a href="inventory.html" class="btn btn--sm btn--warning">View Inventory</a>`;
    container.appendChild(b);
  }
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────
function renderRevenueChart(days = 7) {
  const data = Analytics.getDailySales(days);
  const ctx = document.getElementById('chart-revenue');
  if (!ctx) return;

  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Revenue',
          data: data.map(d => d.revenue),
          backgroundColor: 'rgba(46,128,80,.18)',
          borderColor: '#2e8050',
          borderWidth: 2,
          borderRadius: 6,
          type: 'bar',
        },
        {
          label: 'Profit',
          data: data.map(d => d.profit),
          borderColor: '#f5c842',
          backgroundColor: 'rgba(245,200,66,.1)',
          borderWidth: 2.5,
          type: 'line',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#f5c842',
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ₱${ctx.raw.toLocaleString('en-PH', {minimumFractionDigits:2})}`
          }
        }
      },
      scales: {
        y: { ticks: { callback: v => '₱' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// ─── Stock Donut Chart ────────────────────────────────────────────────────────
function renderStockChart() {
  const products = Storage.getProducts();
  const ctx = document.getElementById('chart-stock');
  if (!ctx || products.length === 0) return;

  const colors = ['#2e8050','#5dbb80','#f5c842','#8fd4a5','#fae498','#dd6b20','#1a3a2a','#3a9e63'];

  if (stockChart) stockChart.destroy();
  stockChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: products.map(p => p.name),
      datasets: [{
        data: products.map(p => p.stock),
        backgroundColor: colors.slice(0, products.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} sacks` } }
      }
    }
  });
}

// ─── Top Products ─────────────────────────────────────────────────────────────
function renderTopProducts() {
  const container = document.getElementById('top-products-list');
  if (!container) return;
  const top = Analytics.getTopProducts(5);

  if (top.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:32px 0;"><i class="fas fa-chart-bar"></i><p>No sales data yet</p></div>`;
    return;
  }

  container.innerHTML = top.map((p, i) => `
    <div class="top-product-item">
      <div class="top-product-rank top-product-rank--${i+1}">${i+1}</div>
      <div class="top-product-info">
        <div class="top-product-name">${p.name}</div>
        <div class="top-product-units">${p.units} sacks sold</div>
      </div>
      <div class="top-product-revenue">${formatCurrency(p.revenue)}</div>
    </div>
  `).join('');
}

// ─── Recent Sales ─────────────────────────────────────────────────────────────
function renderRecentSales() {
  const container = document.getElementById('recent-sales-list');
  if (!container) return;
  const recent = Storage.getSales().slice(-8).reverse();

  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:32px 0;"><i class="fas fa-receipt"></i><p>No sales recorded yet</p></div>`;
    return;
  }

  container.innerHTML = recent.map(s => `
    <div class="recent-sale-item">
      <div class="recent-sale-dot"></div>
      <div class="recent-sale-info">
        <div class="recent-sale-name">${s.productName}</div>
        <div class="recent-sale-detail">${s.quantity} sacks · ${s.date}</div>
      </div>
      <div class="recent-sale-amount">${formatCurrency(s.totalRevenue)}</div>
    </div>
  `).join('');
}

// ─── Topbar Date ──────────────────────────────────────────────────────────────
function renderTopbarDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Chart Range Tabs ─────────────────────────────────────────────────────────
function initChartTabs() {
  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-range]').forEach(b => b.classList.remove('tab--active'));
      btn.classList.add('tab--active');
      renderRevenueChart(Number(btn.dataset.range));
    });
  });
}

// ─── Dashboard Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Storage.initializeData();
  renderTopbarDate();
  renderAlerts();
  renderStats();
  renderRevenueChart(7);
  renderStockChart();
  renderTopProducts();
  renderRecentSales();
  initChartTabs();
});