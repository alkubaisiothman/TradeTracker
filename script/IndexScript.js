import { initializeAuth, BACKEND_URL } from './Shared.js';

// Valmiit osakkeet
const popularStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' }
];

// Alusta sovellus kotisivulla
document.addEventListener('DOMContentLoaded', function() {
  // Alusta autentikointi
  initializeAuth();
  
  // Näytä suosituimmat osakkeet
  displayPopularStocks();
  
  // Päivitä copyright-vuosi
  updateCopyrightYear();
});

// Näytä suosituimmat osakkeet
function displayPopularStocks() {
  const stockListDiv = document.getElementById('stock-list');
  if (!stockListDiv) return;

  stockListDiv.innerHTML = popularStocks.map(stock => `
    <div class="stock-item" data-symbol="${stock.symbol}">
      <strong>${stock.symbol}</strong> - ${stock.name}
    </div>
  `).join('');

  // Lisää klikkaukset
  document.querySelectorAll('.stock-item').forEach(item => {
    item.addEventListener('click', () => {
      const symbol = item.getAttribute('data-symbol');
      window.location.href = `./sivut/Alerts.html?symbol=${symbol}`;
    });
  });
}

// Päivitä copyright-vuosi
function updateCopyrightYear() {
  document.getElementById('current-year').textContent = new Date().getFullYear();
}