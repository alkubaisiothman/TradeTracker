import { auth } from './auth/auth.js';
import { stockAPI } from './api/api.js';

// Suosituimmat osakkeet
const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' }
];

document.addEventListener('DOMContentLoaded', () => {
  // Alusta autentikointi
  auth.init();
  
  // Näytä suosituimmat osakkeet
  displayPopularStocks();
  
  // Päivitä copyright-vuosi
  updateCopyrightYear();
});

async function displayPopularStocks() {
  const container = document.getElementById('stock-list');
  if (!container) return;

  try {
    container.innerHTML = POPULAR_STOCKS.map(stock => `
      <div class="stock-item" data-symbol="${stock.symbol}">
        <strong>${stock.symbol}</strong> - ${stock.name}
      </div>
    `).join('');

    // Lisää tapahtumankäsittelijät
    document.querySelectorAll('.stock-item').forEach(item => {
      item.addEventListener('click', async () => {
        const symbol = item.dataset.symbol;
        try {
          const quote = await stockAPI.getQuote(symbol);
          alert(`Osake: ${symbol}, Hinta: ${quote['Global Quote']['05. price']} USD`);
        } catch (error) {
          console.error('Osaketietojen haku epäonnistui:', error);
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<p class="error">Osakelistauksen haku epäonnistui</p>`;
  }
}

function updateCopyrightYear() {
  document.getElementById('current-year').textContent = new Date().getFullYear();
}