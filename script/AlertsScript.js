import { auth } from './auth/auth.js';
import { stockAPI, alertAPI } from './api/api.js';
import { chart } from './chart/chart.js';

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'PG', name: 'Procter & Gamble Company' },
  { symbol: 'MA', name: 'Mastercard Incorporated' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'MRK', name: 'Merck & Co., Inc.' },
  { symbol: 'HD', name: 'The Home Depot, Inc.' }
];

let chartVisible = false;
let currentSymbol = null;

const showLoading = (elementId, isLoading = true) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = isLoading ? 'block' : 'none';
  if (isLoading) el.innerHTML = '<div class="loading-spinner"></div>';
};

const showError = (message, elementId = 'stock-data') => {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `<p class="error">${message}</p>`;
  }
  console.error(message);
};

const displayStockData = (symbol, quote) => {
  const container = document.getElementById('stock-data');
  if (!container || !quote || !quote['05. price']) {
    showError('Osaketietoja ei saatavilla');
    return;
  }

  currentSymbol = symbol;
  const price = parseFloat(quote['05. price']);
  const change = parseFloat(quote['09. change']);
  const changePercent = quote['10. change percent'];
  const isNegative = change < 0;
  const stockInfo = POPULAR_STOCKS.find(s => s.symbol === symbol);
  const companyName = stockInfo ? stockInfo.name : '';

  container.innerHTML = `
    <div class="stock-card">
      <h3>${symbol}${companyName ? ` - ${companyName}` : ''}</h3>
      <p>Hinta: ${price.toFixed(2)} USD</p>
      <p class="${isNegative ? 'negative' : 'positive'}">
        Muutos: ${change.toFixed(2)} (${changePercent})
      </p>
      <button id="set-alert-btn" class="primary-button small">Aseta hälytys</button>
    </div>
  `;

  document.getElementById('set-alert-btn')?.addEventListener('click', () => {
    setAlertForStock(symbol, price);
  });
};

const setAlertForStock = async (symbol, currentPrice) => {
  const alertPrice = prompt(`Aseta hälytys hinta ${symbol}-osakkeelle (USD):`, currentPrice.toFixed(2));
  if (!alertPrice) return;
  const price = parseFloat(alertPrice);
  if (isNaN(price)) {
    showError('Virheellinen hinta');
    return;
  }

  try {
    showLoading('alert-spinner', true);
    await alertAPI.createAlert({ symbol, price, currentPrice });
    alert(`Hälytys asetettu onnistuneesti ${symbol} hinnalle ${price.toFixed(2)} USD`);
  } catch (err) {
    showError(`Hälytyksen asetus epäonnistui: ${err.message}`);
  } finally {
    showLoading('alert-spinner', false);
  }
};

const loadStockData = async (symbol) => {
  try {
    showLoading('stock-data', true);
    const quote = await stockAPI.getQuote(symbol);
    displayStockData(symbol, quote);
    chart.highlightBar(symbol);
  } catch (err) {
    showError(err.message || 'Tietojen haku epäonnistui');
  } finally {
    showLoading('stock-data', false);
  }
};

const getSymbolByName = (input) => {
  const lower = input.toLowerCase();
  const match = POPULAR_STOCKS.find(s =>
    s.symbol.toLowerCase() === lower || s.name.toLowerCase().includes(lower)
  );
  return match?.symbol || input.toUpperCase();
};

const createStockCard = (stock, price, change, changePercent) => {
  const isNegative = change < 0;
  const card = document.createElement('div');
  card.className = 'stock-card';
  card.dataset.symbol = stock.symbol;
  card.innerHTML = `
    <h3>${stock.symbol} - ${stock.name}</h3>
    <p>Hinta: ${price.toFixed(2)} USD</p>
    <p class="${isNegative ? 'negative' : 'positive'}">
      Muutos: ${change.toFixed(2)} (${changePercent})
    </p>
    <button class="set-alert-btn primary-button small">Aseta hälytys</button>
  `;

  card.addEventListener('click', (e) => {
    if (!e.target.classList.contains('set-alert-btn')) {
      loadStockData(stock.symbol);
    }
  });

  const alertBtn = card.querySelector('.set-alert-btn');
  alertBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await setAlertForStock(stock.symbol, price);
  });

  return card;
};

const displayPopularCards = async () => {
  const container = document.getElementById('stock-list');
  if (!container) return;

  container.innerHTML = '';
  showLoading('stocks-loading', true);

  try {
    for (const stock of POPULAR_STOCKS) {
      try {
        const quote = await stockAPI.getQuote(stock.symbol);
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = quote['10. change percent'];

        if (!isNaN(price)) {
          const card = createStockCard(stock, price, change, changePercent);
          container.appendChild(card);
        }
      } catch {
        const errorCard = document.createElement('div');
        errorCard.className = 'stock-card error-card';
        errorCard.innerHTML = `<h3>${stock.symbol}</h3><p>Tietoja ei saatavilla</p>`;
        container.appendChild(errorCard);
      }
    }
  } finally {
    showLoading('stocks-loading', false);
  }
};

const displayBarChart = async () => {
  try {
    showLoading('chart-loading', true);
    const stocks = await Promise.all(POPULAR_STOCKS.map(async stock => {
      const quote = await stockAPI.getQuote(stock.symbol);
      const price = parseFloat(quote['05. price']);
      return { symbol: stock.symbol, price };
    }));

    const sorted = stocks.filter(s => !isNaN(s.price)).sort((a, b) => b.price - a.price);
    const symbols = sorted.map(s => s.symbol);
    const prices = sorted.map(s => s.price);

    chart.updateBarChart(symbols, prices, (symbol) => {
      loadStockData(symbol);
    });
  } catch (err) {
    showError('Hintavertailu ei saatavilla: ' + err.message);
  } finally {
    showLoading('chart-loading', false);
  }
};

const toggleChart = async () => {
  const chartContainer = document.querySelector('.chart-container');
  const toggleButton = document.getElementById('load-popular-button');

  if (!chartVisible) {
    chartContainer.style.display = 'block';
    toggleButton.textContent = 'Piilota hintavertailu';
    await displayBarChart();
  } else {
    chartContainer.style.display = 'none';
    toggleButton.textContent = 'Näytä hintavertailu';
  }

  chartVisible = !chartVisible;
};

const initAlertsPage = async () => {
  if (!auth.check(true)) return;
  chart.init();
  await displayPopularCards();

  document.getElementById('search-button')?.addEventListener('click', async () => {
    const input = document.getElementById('stock-symbol').value.trim();
    if (input) {
      const symbol = getSymbolByName(input);
      await loadStockData(symbol);
    }
  });

  document.getElementById('stock-symbol')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const input = document.getElementById('stock-symbol').value.trim();
      if (input) {
        const symbol = getSymbolByName(input);
        await loadStockData(symbol);
      }
    }
  });

  document.getElementById('load-popular-button')?.addEventListener('click', toggleChart);
};

document.addEventListener('DOMContentLoaded', initAlertsPage);

window.addEventListener('stockSelected', async (e) => {
  const symbol = e.detail;
  document.getElementById('stock-symbol').value = symbol;
  await loadStockData(symbol);
});
