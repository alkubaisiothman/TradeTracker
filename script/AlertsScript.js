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

let popularVisible = true;

const showLoading = (elementId, isLoading = true) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (isLoading) {
    element.innerHTML = '<div class="loading-spinner"></div>';
    element.style.display = 'block';
  } else {
    element.style.display = 'none';
  }
};

const showError = (message, elementId = 'stock-data') => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<p class="error">${message}</p>`;
  }
  console.error(message);
};

const displayStockData = (symbol, quote) => {
  const container = document.getElementById('stock-data');
  if (!container || !quote || !quote['05. price']) {
    showError('Osaketietoja ei saatavilla');
    return;
  }

  const price = parseFloat(quote['05. price']).toFixed(2);
  const change = parseFloat(quote['09. change']).toFixed(2);
  const changePercent = quote['10. change percent'];
  const isNegative = parseFloat(change) < 0;

  container.innerHTML = `
    <div class="stock-info">
      <h3>${symbol}</h3>
      <p>Hinta: ${price} USD</p>
      <p class="${isNegative ? 'negative' : 'positive'}">
        Muutos: ${change} (${changePercent})
      </p>
      <button id="set-alert-btn" class="alert-button">Aseta hälytys</button>
    </div>
  `;

  document.getElementById('set-alert-btn')?.addEventListener('click', () => {
    setAlertForStock(symbol, parseFloat(price));
  });
};

const setAlertForStock = async (symbol, currentPrice) => {
  const alertPrice = prompt(`Aseta hälytys hinta ${symbol}-osakkeelle (USD):`, currentPrice.toFixed(2));
  if (!alertPrice) return;

  const priceValue = parseFloat(alertPrice);
  if (isNaN(priceValue)) {
    showError('Virheellinen hinta');
    return;
  }

  try {
    showLoading('alert-spinner', true);
    await alertAPI.createAlert({
      symbol,
      price: priceValue,
      currentPrice
    });
    alert(`Hälytys asetettu onnistuneesti ${symbol} hinnalle ${priceValue.toFixed(2)} USD`);
  } catch (error) {
    showError(`Hälytyksen asetus epäonnistui: ${error.message}`);
  } finally {
    showLoading('alert-spinner', false);
  }
};

const showStockPrice = async (symbol) => {
  try {
    const quote = await stockAPI.getQuote(symbol);
    if (quote?.['05. price']) {
      const price = parseFloat(quote['05. price']).toFixed(2);
      return `${symbol}: ${price} USD`;
    }
    return `${symbol}: Hinta ei saatavilla`;
  } catch (error) {
    console.error(`Osakkeen ${symbol} hinnan hakuvirhe:`, error);
    return `${symbol}: Hinnan haku epäonnistui`;
  }
};

const displayPopularStocks = async () => {
  try {
    showLoading('chart-loading', true);

    const stocks = await Promise.all(POPULAR_STOCKS.map(async stock => {
      const quote = await stockAPI.getQuote(stock.symbol);
      const price = parseFloat(quote['05. price']);
      return { symbol: stock.symbol, price };
    }));

    const sorted = stocks
      .filter(s => !isNaN(s.price))
      .sort((a, b) => b.price - a.price);

    const symbols = sorted.map(s => s.symbol);
    const prices = sorted.map(s => s.price);

    chart.updateBarChart(symbols, prices);
  } catch (err) {
    showError('Suositut osakkeet eivät latautuneet: ' + err.message);
  } finally {
    showLoading('chart-loading', false);
  }
};

const getSymbolByName = (input) => {
  const lower = input.toLowerCase();
  const match = POPULAR_STOCKS.find(
    s => s.symbol.toLowerCase() === lower || s.name.toLowerCase().includes(lower)
  );
  return match?.symbol || input.toUpperCase();
};

const loadStockData = async (symbol) => {
  try {
    console.log('Loading stock data for:', symbol);
    showLoading('stock-data', true);
    showLoading('chart-loading', true);

    if (!chart.getChartInstance()) {
      chart.init();
    }

    const quote = await stockAPI.getQuote(symbol);
    if (!quote || !quote['01. symbol']) {
      throw new Error('Osaketietoja ei saatu');
    }

    displayStockData(symbol, quote);

    window.history.pushState({}, '', `?symbol=${symbol}`);

  } catch (error) {
    console.error('Osaketietojen latausvirhe:', error);
    showError(error.message || 'Osaketietojen haku epäonnistui');
  } finally {
    showLoading('chart-loading', false);
  }
};

const initAlertsPage = async () => {
  try {
    if (!auth.check(true)) return;

    const chartInstance = chart.init();
    if (!chartInstance) {
      throw new Error('Kaavion alustus epäonnistui');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get('symbol') || 'AAPL';
    await loadStockData(symbol);

    await displayPopularStocks();

    document.getElementById('stock-list')?.addEventListener('click', async (e) => {
      const stockItem = e.target.closest('.stock-item');
      if (stockItem) {
        const symbol = stockItem.dataset.symbol;
        await loadStockData(symbol);
      }
    });

    document.getElementById('search-button')?.addEventListener('click', async () => {
      const input = document.getElementById('stock-symbol')?.value.trim();
      if (input) {
        const resolvedSymbol = getSymbolByName(input);
        await loadStockData(resolvedSymbol);
      }
    });

    document.getElementById('reset-zoom')?.addEventListener('click', () => {
      chartInstance?.resetZoom?.();
    });

    // Päivitetty toggle-nappi: piilottaa ja näyttää suositut osakkeet
    document.getElementById('load-popular-button')?.addEventListener('click', async () => {
      const chartContainer = document.querySelector('.chart-container');
      const chartMessage = document.getElementById('chart-message');

      if (popularVisible) {
        // Piilota suositut ja kaavio
        if (chartContainer) chartContainer.style.display = 'none';
        if (chartMessage) chartMessage.style.display = 'none';
        document.getElementById('load-popular-button').textContent = 'Näytä suositut';
      } else {
        // Näytä suositut ja kaavio
        if (chartContainer) chartContainer.style.display = 'block';
        if (chartMessage) chartMessage.style.display = 'none';
        await displayPopularStocks();
        document.getElementById('load-popular-button').textContent = 'Piilota suositut';
      }

      popularVisible = !popularVisible;
    });

  } catch (error) {
    console.error('Alerts-sivun alustusvirhe:', error);
    showError(error.message);
  }
};

document.addEventListener('DOMContentLoaded', initAlertsPage);

window.addEventListener('stockSelected', async (e) => {
  const symbol = e.detail;
  document.getElementById('stock-symbol').value = symbol;
  await loadStockData(symbol);
});
