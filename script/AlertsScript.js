import { 
  BACKEND_URL, 
  fetchStockData, 
  fetchHistoricalData,
  initChart,
  updateChart,
  checkAuth,
  logout
} from './Shared.js';

// Alustus
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Alerts-sivu alustettu');
  
  if (!checkAuth(true)) {
    return;
  }

  // Kirjaudu ulos -toiminto
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // Alusta kaavio
  const chart = initChart();
  
  // Käsittele URL-parametrit
  const urlParams = new URLSearchParams(window.location.search);
  const symbol = urlParams.get('symbol') || 'AAPL';
  document.getElementById('stock-symbol').value = symbol;

  // Hae osaketiedot
  await loadStockData(symbol, chart);

  // Hae suosituimmat osakkeet
  await loadPopularStocks();

  // Hakutoiminto
  document.getElementById('search-button').addEventListener('click', async () => {
    const symbol = document.getElementById('stock-symbol').value.trim();
    if (symbol) {
      try {
        const searchButton = document.getElementById('search-button');
        searchButton.disabled = true;
        searchButton.innerHTML = '<span class="loading-spinner small"></span>';
        
        await loadStockData(symbol, chart);
        window.history.pushState({}, '', `?symbol=${symbol}`);
      } catch (error) {
        console.error('Hakuvirhe:', error);
        alert('Osakkeen haku epäonnistui. Tarkista osaketunnus.');
      } finally {
        const searchButton = document.getElementById('search-button');
        searchButton.disabled = false;
        searchButton.innerHTML = 'Hae';
      }
    }
  });
});

async function loadStockData(symbol, chart) {
  console.log(`Ladataan osakedataa: ${symbol}`);
  try {
    const stockDataDiv = document.getElementById('stock-data');
    stockDataDiv.innerHTML = '<div class="loading-spinner"></div>';
    
    const data = await fetchStockData(symbol);
    
    if (data && data['Global Quote']) {
      displayStockData(data['Global Quote']);
      setupAlertHandlers(symbol);
      setupChartControls(symbol, chart);
      
      // Hae historiallinen data
      const historicalData = await fetchHistoricalData(symbol, '1-month');
      if (historicalData) {
        updateChartWithHistoricalData(historicalData, '1-month', chart);
      }
    } else {
      throw new Error('Osaketietoja ei löytynyt');
    }
  } catch (error) {
    console.error('Virhe osakedatan latauksessa:', error);
    document.getElementById('stock-data').innerHTML = 
      `<p class="error-message">Virhe: ${error.message || 'Osaketietojen haku epäonnistui'}</p>`;
  }
}

// Näytä osaketiedot
function displayStockData(stockData) {
  const stockDataDiv = document.getElementById('stock-data');
  if (!stockDataDiv) return;
  
  stockDataDiv.innerHTML = `
    <p><strong>Osake:</strong> ${stockData['01. symbol']}</p>
    <p><strong>Hinta:</strong> ${parseFloat(stockData['05. price']).toFixed(2)} USD</p>
    <p><strong>Muutos:</strong> <span class="${stockData['09. change'].startsWith('-') ? 'negative' : 'positive'}">
      ${stockData['09. change']} (${stockData['10. change percent']})
    </span></p>
  `;
}

// Hälytysten käsittely
function setupAlertHandlers(symbol) {
  const alertButton = document.getElementById('set-alert-button');
  if (!alertButton) return;
  
  alertButton.addEventListener('click', async () => {
    const priceInput = document.getElementById('alert-price');
    const price = parseFloat(priceInput.value);
    const email = localStorage.getItem('email');
    
    if (!price || isNaN(price)) {
      alert('Anna kelvollinen hintataso!');
      priceInput.focus();
      return;
    }
    
    if (!email) {
      alert('Kirjaudu sisään asettaaksesi hälytyksiä!');
      return;
    }
    
    try {
      alertButton.disabled = true;
      alertButton.innerHTML = '<span class="loading-spinner small"></span>';
      
      const currentPriceText = document.querySelector('#stock-data p:nth-child(2)').textContent;
      const currentPrice = parseFloat(currentPriceText.split(':')[1].trim().split(' ')[0]);
      
      const response = await fetch(`${BACKEND_URL}/api/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          symbol, 
          price, 
          email,
          currentPrice
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Hälytys tallennettu onnistuneesti!');
        document.getElementById('alert-status').textContent = 
          `Hälytys asetettu: ${symbol} @ ${price.toFixed(2)} USD`;
      } else {
        throw new Error(result.error || 'Hälytyksen tallennus epäonnistui');
      }
    } catch (error) {
      console.error('Hälytyksen tallennusvirhe:', error);
      document.getElementById('alert-status').textContent = `Virhe: ${error.message}`;
    } finally {
      alertButton.disabled = false;
      alertButton.innerHTML = 'Aseta hälytys';
    }
  });
}

// Kaavion kontrollit
function setupChartControls(symbol, chart) {
  const periods = ['1-day', '1-week', '1-month', '1-year'];
  
  periods.forEach(period => {
    const button = document.getElementById(period);
    if (button) {
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Ladataan...';
        
        try {
          const data = await fetchHistoricalData(symbol, period);
          if (data) {
            updateChartWithHistoricalData(data, period, chart);
          }
        } catch (error) {
          console.error(`Kaavion päivitysvirhe (${period}):`, error);
        } finally {
          button.disabled = false;
          button.textContent = button.id.replace('-', ' ');
        }
      });
    }
  });
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
  
  if (!timeSeries) {
    console.error('Virhe: Historiatietoja ei löytynyt', data);
    return;
  }
  
  const labels = Object.keys(timeSeries).reverse();
  const prices = labels.map(date => parseFloat(timeSeries[date]['4. close']));
  
  updateChart(labels, prices);
  document.getElementById('chart-message').style.display = 'none';
}

// Lataa suosituimmat osakkeet
async function loadPopularStocks() {
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NOKIA.HE', 'SAMPO.HE'];
  const stockList = document.getElementById('stock-list');
  if (!stockList) return;
  
  stockList.innerHTML = '';
  
  for (const symbol of popularStocks) {
    const listItem = document.createElement('div');
    listItem.className = 'stock-item';
    listItem.textContent = symbol;
    listItem.addEventListener('click', () => {
      window.location.href = `?symbol=${symbol}`;
    });
    stockList.appendChild(listItem);
  }
}