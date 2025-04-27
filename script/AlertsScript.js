import { auth } from './auth/auth.js';
import { stockAPI, alertAPI } from './api/api.js';
import { chart } from './chart/chart.js';

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.' }
];

let chartVisible = false;

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
  if (!container || !quote) {
    showError('Osaketietoja ei saatavilla');
    return;
  }

  const price = parseFloat(quote['05. price']);
  const change = parseFloat(quote['09. change']);
  const changePercent = quote['10. change percent'];
  const isNegative = change < 0;

  if (isNaN(price) || isNaN(change)) {
    showError('Osaketietoja ei saatavilla');
    return;
  }

  container.innerHTML = `
    <div class="stock-info">
      <h3>${symbol}</h3>
      <p>Hinta: ${price.toFixed(2)} USD</p>
      <p class="${isNegative ? 'negative' : 'positive'}">
        Muutos: ${change.toFixed(2)} (${changePercent})
      </p>
      <button id="set-alert-btn" class="alert-button">Aseta hälytys</button>
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
  if (isNaN(price)) return showError('Virheellinen hinta');

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
    displayStockData(symbol, quote);  // EI enää tarkisteta quote['01. symbol']!
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

const displayPopularCards = async () => {
  const container = document.getElementById('stock-list');
  if (!container) return;

  container.innerHTML = '';
  for (const stock of POPULAR_STOCKS) {
    try {
      const quote = await stockAPI.getQuote(stock.symbol);
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = quote['10. change percent'];
      const isNegative = change < 0;

      const card = document.createElement('div');
      card.className = 'stock-card';
      card.dataset.symbol = stock.symbol;
      card.innerHTML = `
        <h3>${stock.symbol}</h3>
        <p>Hinta: ${price.toFixed(2)} USD</p>
        <p class="${isNegative ? 'negative' : 'positive'}">
          Muutos: ${change.toFixed(2)} (${changePercent})
        </p>
      `;

      card.addEventListener('click', () => loadStockData(stock.symbol));
      container.appendChild(card);
    } catch {
      const errorCard = document.createElement('div');
      errorCard.className = 'stock-card error-card';
      errorCard.innerHTML = `<h3>${stock.symbol}</h3><p>Tietoja ei saatavilla</p>`;
      container.appendChild(errorCard);
    }
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
      chart.highlightBar(symbol);
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
      chart.highlightBar(symbol);
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
