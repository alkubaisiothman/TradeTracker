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

const displayStockData = (quote) => {
  const container = document.getElementById('stock-data');
  if (!container || !quote || !quote['01. symbol']) {
    showError('Osaketietoja ei saatavilla');
    return;
  }

  container.innerHTML = `
    <div class="stock-info">
      <h3>${quote['01. symbol']}</h3>
      <p>Hinta: ${parseFloat(quote['05. price']).toFixed(2)} USD</p>
      <p class="${quote['09. change'].startsWith('-') ? 'negative' : 'positive'}">
        Muutos: ${parseFloat(quote['09. change']).toFixed(2)} (${quote['10. change percent']})
      </p>
      <button id="set-alert-btn" class="alert-button">Aseta hälytys</button>
    </div>
  `;

  document.getElementById('set-alert-btn')?.addEventListener('click', () => {
    setAlertForStock(quote['01. symbol'], parseFloat(quote['05. price']));
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
  const container = document.getElementById('stock-list');
  if (!container) return;

  try {
    showLoading('stocks-loading', true);
    let stocksHTML = '';

    const stockPromises = POPULAR_STOCKS.map(async (stock) => {
      const priceInfo = await showStockPrice(stock.symbol);
      return {
        symbol: stock.symbol,
        name: stock.name,
        priceInfo
      };
    });

    const stocksWithPrices = await Promise.all(stockPromises);

    stocksWithPrices.forEach(stock => {
      stocksHTML += `
        <div class="stock-item" data-symbol="${stock.symbol}">
          <strong>${stock.symbol}</strong> - ${stock.name}
          <span class="stock-price-tooltip">${stock.priceInfo}</span>
        </div>
      `;
    });

    container.innerHTML = stocksHTML;

    document.querySelectorAll('.stock-item').forEach(item => {
      item.addEventListener('click', async () => {
        const symbol = item.dataset.symbol;
        await loadStockData(symbol);
        window.history.pushState({}, '', `?symbol=${symbol}`);
      });
    });

  } catch (error) {
    console.error('Osakelistauksen haku epäonnistui:', error);
    showError('Osakelistauksen haku epäonnistui', 'stock-list');
  } finally {
    showLoading('stocks-loading', false);
  }
};

const loadStockData = async (symbol) => {
  try {
    console.log('Aloitetaan osaketietojen haku symbolille:', symbol);
    showLoading('stock-data', true);
    showLoading('chart-loading', true);

    const quote = await stockAPI.getQuote(symbol);
    if (!quote || !quote['01. symbol']) {
      throw new Error('Osaketietoja ei saatu');
    }

    displayStockData(quote);

    const history = await stockAPI.getHistoricalData(symbol, '1-month');
    chart.addHistoricalData(history, '1-month');

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

    await displayPopularStocks();

    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get('symbol')?.toUpperCase() || 'AAPL';

    await loadStockData(symbol);

    document.getElementById('search-button')?.addEventListener('click', async () => {
      const newSymbol = document.getElementById('stock-symbol')?.value.trim();
      if (newSymbol) {
        await loadStockData(newSymbol);
        window.history.pushState({}, '', `?symbol=${newSymbol}`);
      }
    });

    document.querySelectorAll('.chart-button').forEach(button => {
      button.addEventListener('click', async () => {
        const period = button.id;
        const symbol = document.getElementById('stock-symbol')?.value.trim() ||
                       new URLSearchParams(window.location.search).get('symbol') || 'AAPL';

        try {
          showLoading('chart-loading', true);
          const history = await stockAPI.getHistoricalData(symbol, period);
          chart.addHistoricalData(history, period);

          document.querySelectorAll('.chart-button').forEach(btn => {
            btn.classList.toggle('active', btn.id === period);
          });
        } catch (error) {
          showError(`Datan haku epäonnistui: ${error.message}`);
        } finally {
          showLoading('chart-loading', false);
        }
      });
    });

    // Reset zoom -nappi
    document.getElementById('reset-zoom')?.addEventListener('click', () => {
      chartInstance?.resetZoom?.();
    });

  } catch (error) {
    console.error('Alerts-sivun alustusvirhe:', error);
    showError(error.message);
  }
};

document.addEventListener('DOMContentLoaded', initAlertsPage);