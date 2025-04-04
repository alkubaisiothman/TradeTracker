import { auth } from './auth/auth.js';
import { stockAPI, alertAPI } from './api/api.js';
import { chart } from './chart/chart.js';

// Apufunktio latausanimaatiolle
function showLoading(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = '<div class="loading-spinner"></div>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM ladattu'); // Debug
  
  try {
    // Tarkista kirjautuminen
    if (!auth.check(true)) {
      console.log('Ei kirjautunut, ohjataan kirjautumissivulle');
      return;
    }

    // Alusta kaavio
    console.log('Alustetaan kaavio...');
    const chartInstance = chart.init();
    if (!chartInstance) {
      throw new Error('Kaavion alustus epäonnistui');
    }

    // Hae URL-parametrit
    const urlParams = new URLSearchParams(window.location.search);
    let symbol = urlParams.get('symbol') || 'AAPL';
    console.log('Haetaan osaketta:', symbol);
    
    // Lataa osaketiedot
    await loadStockData(symbol, chartInstance);
    
    // Aseta hakutoiminto
    document.getElementById('search-button').addEventListener('click', async () => {
      const newSymbol = document.getElementById('stock-symbol').value.trim();
      if (newSymbol) {
        console.log('Haetaan uutta osaketta:', newSymbol);
        await loadStockData(newSymbol, chartInstance);
        window.history.pushState({}, '', `?symbol=${newSymbol}`);
      }
    });
    
  } catch (error) {
    console.error('Alerts-sivun alustusvirhe:', error);
    document.getElementById('stock-data').innerHTML = 
      `<p class="error">Virhe: ${error.message}</p>`;
  }
});

async function loadStockData(symbol, chartInstance) {
  try {
    showLoading('#stock-data');
    console.log('Ladataan osaketietoja...');
    
    // Hae reaaliaikaiset tiedot
    const quote = await stockAPI.getQuote(symbol);
    console.log('Osaketiedot:', quote);
    
    if (!quote || !quote['Global Quote']) {
      throw new Error('Osaketietoja ei saatu');
    }
    
    displayStockData(quote['Global Quote']);
    
    // Hae historialliset tiedot
    const history = await stockAPI.getHistoricalData(symbol, '1-month');
    console.log('Historialliset tiedot:', history);
    
    if (!history) {
      throw new Error('Historiallisia tietoja ei saatu');
    }
    
    chart.addHistoricalData(history, '1-month');
    
  } catch (error) {
    console.error('Osaketietojen latausvirhe:', error);
    throw error;
  }
}

function displayStockData(data) {
  const container = document.getElementById('stock-data');
  if (!container) return;
  
  container.innerHTML = `
    <div class="stock-info">
      <h3>${data['01. symbol']}</h3>
      <p>Hinta: ${data['05. price']} USD</p>
      <p class="${data['09. change'].startsWith('-') ? 'negative' : 'positive'}">
        Muutos: ${data['09. change']} (${data['10. change percent']})
      </p>
    </div>
  `;
}