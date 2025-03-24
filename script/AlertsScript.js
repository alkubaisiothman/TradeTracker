import { 
    BACKEND_URL, 
    fetchStockData, 
    updateChart,
    checkAuth 
  } from './shared.js';
  
  // Alustus
  document.addEventListener('DOMContentLoaded', async () => {
    checkAuth(true); // Vaadi kirjautuminen
    
    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get('symbol') || 'AAPL';
    
    // Hae osaketiedot
    const data = await fetchStockData(symbol);
    if (data) {
      displayStockData(data);
      setupAlertHandlers(symbol);
    }
  });
  
  // Näytä osaketiedot
  function displayStockData(stockData) {
    document.getElementById('stock-data').innerHTML = `
      <p><strong>Osake:</strong> ${stockData['01. symbol']}</p>
      <p><strong>Hinta:</strong> ${stockData['05. price']} USD</p>
    `;
  }
  
  // Hälytysten käsittely
  function setupAlertHandlers(symbol) {
    document.getElementById('set-alert-button').addEventListener('click', async () => {
      const price = parseFloat(document.getElementById('alert-price').value);
      
      if (!price) return alert('Aseta hinta');
      
      const response = await fetch(`${BACKEND_URL}/api/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          symbol, 
          price,
          email: localStorage.getItem('email') 
        })
      });
  
      if (response.ok) {
        alert('Hälytys asetettu!');
      }
    });
  }