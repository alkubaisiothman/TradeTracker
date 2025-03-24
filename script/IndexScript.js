// Yhteiset asetukset
const BACKEND_URL = 'http://localhost:5000';

// Valmiit osakkeet
const popularStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  // ... muut osakkeet ...
];

// Alusta sovellus kotisivulla
document.addEventListener('DOMContentLoaded', function() {
  displayPopularStocks();
  initAuthUI();
});

// Näytä suositukset osakkeet
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
      window.location.href = `alerts.html?symbol=${item.getAttribute('data-symbol')}`;
    });
  });
}

// Alustaa kirjautumis-UI:n
function initAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  document.getElementById('login-btn').style.display = isLoggedIn ? 'none' : 'block';
  document.getElementById('logout-btn').style.display = isLoggedIn ? 'block' : 'none';
}