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

const loadStockData = async (symbol) => {
  try {
    console.log('Loading stock data for:', symbol);
    showLoading('stock-data', true);
    showLoading('chart-loading', true);

    if (!chart.getChartInstance()) {
      chart.init();
    }

    const [quote, history] = await Promise.all([
      stockAPI.getQuote(symbol),
      stockAPI.getHistoricalData(symbol, '1-month')
    ]);

    if (!quote || !quote['01. symbol']) {
      throw new Error('Osaketietoja ei saatu');
    }

    displayStockData(symbol, quote);

    if (!history || !Array.isArray(history.t) || history.t.length === 0) {
      document.getElementById('chart-message').style.display = 'block';
      document.querySelector('.chart-container').style.display = 'none';
      return;
    }

    showError('Historiallista hintadataa ei tueta ilmaisella API-avaimella');


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
      const newSymbol = document.getElementById('stock-symbol')?.value.trim();
      if (newSymbol) {
        await loadStockData(newSymbol);
      }
    });

    document.querySelectorAll('.chart-button').forEach(button => {
      if (button.id !== 'reset-zoom') {
        button.addEventListener('click', async () => {
          const period = button.id;
          const symbol = document.getElementById('stock-symbol')?.value.trim() ||
                         new URLSearchParams(window.location.search).get('symbol') || 'AAPL';

          try {
            showLoading('chart-loading', true);
            const history = await stockAPI.getHistoricalData(symbol, period);
            chart.update(
              history.t.map(ts => new Date(ts * 1000)),
              history.c
            );

            document.querySelectorAll('.chart-button').forEach(btn => {
              btn.classList.toggle('active', btn.id === period);
            });
          } catch (error) {
            showError(`Datan haku epäonnistui: ${error.message}`);
          } finally {
            showLoading('chart-loading', false);
          }
        });
      }
    });

    document.getElementById('reset-zoom')?.addEventListener('click', () => {
      chartInstance?.resetZoom?.();
    });

    document.getElementById('load-popular-button')?.addEventListener('click', async () => {
      await displayPopularStocks();
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
