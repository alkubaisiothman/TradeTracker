// AlertsScript.js
import { 
  BACKEND_URL, 
  fetchStockData, 
  initChart,
  updateChart,
  checkAuth
} from './script/Shared.js';

// Alustus
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth(true)) return;
  
  // Alusta kaavio
  const chart = initChart();
  
  const urlParams = new URLSearchParams(window.location.search);
  const symbol = urlParams.get('symbol') || 'AAPL';
  
  // Hae osaketiedot
  const data = await fetchStockData(symbol);
  if (data && data['Global Quote']) {
    displayStockData(data['Global Quote']);
    setupAlertHandlers(symbol);
    setupChartControls(symbol, chart);
  }
});

// Näytä osaketiedot
function displayStockData(stockData) {
  const stockDataDiv = document.getElementById('stock-data');
  if (!stockDataDiv) return;
  
  stockDataDiv.innerHTML = `
    <p><strong>Osake:</strong> ${stockData['01. symbol']}</p>
    <p><strong>Hinta:</strong> ${stockData['05. price']} USD</p>
    <p><strong>Muutos:</strong> ${stockData['09. change']} (${stockData['10. change percent']})</p>
  `;
}

// Hälytysten käsittely
function setupAlertHandlers(symbol) {
  const alertButton = document.getElementById('set-alert-button');
  if (!alertButton) return;
  
  alertButton.addEventListener('click', async () => {
    const price = parseFloat(document.getElementById('alert-price').value);
    const email = localStorage.getItem('email');
    
    if (!price || !email) {
      alert('Täytä kaikki kentät!');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ symbol, price, email })
      });
      
      const alertStatus = document.getElementById('alert-status');
      if (response.ok) {
        alert('Hälytys tallennettu!');
        if (alertStatus) {
          alertStatus.textContent = `Hälytys asetettu: ${symbol} @ ${price} USD`;
        }
      } else {
        alert('Hälytyksen tallennus epäonnistui');
        if (alertStatus) {
          alertStatus.textContent = 'Virhe hälytyksen tallennuksessa';
        }
      }
    } catch (error) {
      console.error('Virhe:', error);
      alert('Järjestelmävirhe. Yritä uudelleen.');
    }
  });
}

// Kaavion kontrollit
function setupChartControls(symbol, chart) {
  const setupButton = (id, period) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', async () => {
        const data = await fetchHistoricalData(symbol, period);
        if (data) {
          updateChartWithHistoricalData(data, period, chart);
        }
      });
    }
  };
  
  setupButton('1-day', '1-day');
  setupButton('1-week', '1-week');
  setupButton('1-month', '1-month');
  setupButton('1-year', '1-year');
}

// Hae historialliset tiedot
async function fetchHistoricalData(symbol, period) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/historical-data?symbol=${symbol}&period=${period}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Historiallisten tietojen haku epäonnistui:', error);
    return null;
  }
}

// Päivitä kaavio historiallisilla tiedoilla
function updateChartWithHistoricalData(data, period, chart) {
  let timeSeries;
  switch (period) {
    case '1-day': timeSeries = data['Time Series (60min)']; break;
    case '1-week':
    case '1-month': timeSeries = data['Time Series (Daily)']; break;
    case '1-year': timeSeries = data['Monthly Time Series']; break;
    default: return;
  }
  
  const labels = [];
  const prices = [];
  
  for (const date in timeSeries) {
    labels.push(date);
    prices.push(parseFloat(timeSeries[date]['4. close']));
  }
  
  updateChart(labels.reverse(), prices.reverse());
}