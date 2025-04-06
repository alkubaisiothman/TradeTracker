// /script/AlertsScript.js
import { auth } from './auth/auth.js';
import { stockAPI, alertAPI } from './api/api.js';
import { chart } from './chart/chart.js';

// Suositut osakkeet (siirretty tänne, jotta ne ovat käytettävissä)
const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'SAMPO.HE', name: 'Sampo Oyj' },
  { symbol: 'NOKIA.HE', name: 'Nokia Oyj' }
];

// Apufunktio latausanimaatiolle
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

// Näytä virheviesti
const showError = (message, elementId = 'stock-data') => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<p class="error">${message}</p>`;
  }
  console.error(message);
};

// Näytä osaketiedot
const displayStockData = (data) => {
  const container = document.getElementById('stock-data');
  if (!container) return;

  if (!data || !data['01. symbol']) {
    showError('Osaketietoja ei saatavilla');
    return;
  }

  container.innerHTML = `
    <div class="stock-info">
      <h3>${data['01. symbol']}</h3>
      <p>Hinta: ${parseFloat(data['05. price']).toFixed(2)} USD</p>
      <p class="${data['09. change'].startsWith('-') ? 'negative' : 'positive'}">
        Muutos: ${parseFloat(data['09. change']).toFixed(2)} (${data['10. change percent']})
      </p>
      <button id="set-alert-btn" class="alert-button">Aseta hälytys</button>
    </div>
  `;

  // Lisää hälytyksen asetusnappi
  document.getElementById('set-alert-btn')?.addEventListener('click', () => {
    setAlertForStock(data['01. symbol'], parseFloat(data['05. price']));
  });
};

// Aseta hälytys osakkeelle
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

// Näytä osakkeen hinta tooltipissa
const showStockPrice = async (symbol) => {
  try {
    const quote = await stockAPI.getQuote(symbol);
    if (quote?.['Global Quote']) {
      const price = parseFloat(quote['Global Quote']['05. price']).toFixed(2);
      return `${symbol}: ${price} USD`;
    }
    return `${symbol}: Hinta ei saatavilla`;
  } catch (error) {
    console.error(`Osakkeen ${symbol} hinnan hakuvirhe:`, error);
    return `${symbol}: Hinnan haku epäonnistui`;
  }
};

// Näytä suosituimmat osakkeet
const displayPopularStocks = async () => {
  const container = document.getElementById('stock-list');
  if (!container) return;

  try {
    showLoading('stocks-loading', true);
    let stocksHTML = '';

    for (const stock of POPULAR_STOCKS) {
      const priceInfo = await showStockPrice(stock.symbol);
      stocksHTML += `
        <div class="stock-item" data-symbol="${stock.symbol}">
          <strong>${stock.symbol}</strong> - ${stock.name}
          <span class="stock-price-tooltip">${priceInfo}</span>
        </div>
      `;
    }

    container.innerHTML = stocksHTML;

    // Lisää tapahtumankäsittelijät
    document.querySelectorAll('.stock-item').forEach(item => {
      item.addEventListener('click', async () => {
        const symbol = item.dataset.symbol;
        await loadStockData(symbol, null);
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

// Lataa osaketiedot
const loadStockData = async (symbol, chartInstance) => {
  try {
    showLoading('stock-data', true);
    showLoading('chart-loading', true);

    // Hae reaaliaikaiset tiedot
    const quote = await stockAPI.getQuote(symbol);
    if (!quote?.['Global Quote']) {
      throw new Error('Osaketietoja ei saatu');
    }
    displayStockData(quote['Global Quote']);

    // Hae historialliset tiedot
    const history = await stockAPI.getHistoricalData(symbol, '1-month');
    if (!history) {
      throw new Error('Historiallisia tietoja ei saatu');
    }
    chart.addHistoricalData(history, '1-month');

  } catch (error) {
    console.error('Osaketietojen latausvirhe:', error);
    showError(error.message);
  } finally {
    showLoading('chart-loading', false);
  }
};

// Alusta hälytyssivu
const initAlertsPage = async () => {
  try {
    // Tarkista kirjautuminen
    if (!auth.check(true)) {
      return;
    }

    // Alusta kaavio
    const chartInstance = chart.init();
    if (!chartInstance) {
      throw new Error('Kaavion alustus epäonnistui');
    }

    // Näytä suosituimmat osakkeet
    await displayPopularStocks();

    // Hae URL-parametrit
    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get('symbol')?.toUpperCase() || 'AAPL';
    
    // Lataa osaketiedot
    await loadStockData(symbol, chartInstance);
    
    // Aseta hakutoiminto
    document.getElementById('search-button')?.addEventListener('click', async () => {
      const newSymbol = document.getElementById('stock-symbol')?.value.trim();
      if (newSymbol) {
        await loadStockData(newSymbol, chartInstance);
        window.history.pushState({}, '', `?symbol=${newSymbol}`);
      }
    });

    // Aseta aikajakson valitsimet
    document.querySelectorAll('.chart-button').forEach(button => {
      button.addEventListener('click', async () => {
        const period = button.id;
        const symbol = document.getElementById('stock-symbol')?.value.trim() || 
                       new URLSearchParams(window.location.search).get('symbol') || 'AAPL';
        
        try {
          showLoading('chart-loading', true);
          const history = await stockAPI.getHistoricalData(symbol, period);
          chart.addHistoricalData(history, period);
          
          // Päivitä aktiivinen painike
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

  } catch (error) {
    console.error('Alerts-sivun alustusvirhe:', error);
    showError(error.message);
  }
};

// Käynnistä sivu kun DOM on valmis
document.addEventListener('DOMContentLoaded', initAlertsPage);