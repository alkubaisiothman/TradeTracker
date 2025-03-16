const BACKEND_URL = 'http://localhost:5000'; // Backend-palvelimen osoite

// Valmiiksi näkyvät osakkeet
const popularStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'FB', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'V', name: 'Visa Inc.' },
];

// Näytä valmiit osakkeet
function displayPopularStocks() {
  const stockListDiv = document.getElementById('stock-list');
  stockListDiv.innerHTML = popularStocks
    .map(
      (stock) => `
      <div class="stock-item" data-symbol="${stock.symbol}">
        <strong>${stock.symbol}</strong> - ${stock.name}
      </div>
    `
    )
    .join('');

  // Lisää tapahtumankuuntelijat osakkeiden valinnalle
  document.querySelectorAll('.stock-item').forEach((item) => {
    item.addEventListener('click', () => {
      const symbol = item.getAttribute('data-symbol');
      fetchStockData(symbol);
    });
  });
}

// Hae osaketiedot backendin kautta
async function fetchStockData(symbol) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stock-data?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error(`HTTP-virhe! Status: ${response.status}`);
    }
    const data = await response.json();

    if (data['Global Quote']) {
      const stockData = data['Global Quote'];
      displayStockData(stockData);
    } else {
      alert('Osaketta ei löytynyt. Tarkista symboli.');
    }
  } catch (error) {
    console.error('Virhe haettaessa osaketietoja:', error);
    alert(`Osaketietojen haku epäonnistui: ${error.message}`);
  }
}

// Näytä osaketiedot käyttäjälle
function displayStockData(data) {
  const stockDataDiv = document.getElementById('stock-data');
  stockDataDiv.innerHTML = `
    <p><strong>Osake:</strong> ${data['01. symbol']}</p>
    <p><strong>Hinta:</strong> ${data['05. price']} USD</p>
    <p><strong>Muutos:</strong> ${data['09. change']} (${data['10. change percent']})</p>
  `;
}

// Hae osakkeita hakutoiminnolla
document.getElementById('search-button').addEventListener('click', async () => {
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert('Syötä osakkeen symboli!');
    return;
  }

  await fetchStockData(symbol);
});

// Aseta hälytys ja lähetä se backendille
document.getElementById('set-alert-button').addEventListener('click', async () => {
  const price = parseFloat(document.getElementById('alert-price').value);
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  const email = 'kayttaja@example.com'; // Korvaa käyttäjän sähköpostilla

  if (isNaN(price) || !symbol || !email) {
    alert('Täytä kaikki kentät!');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, price, email }),
    });

    if (response.ok) {
      alert('Hälytys tallennettu!');
      document.getElementById('alert-status').textContent = `Hälytys asetettu osakkeelle ${symbol} hinnalle: ${price} USD`;
    } else {
      alert('Hälytyksen tallennus epäonnistui.');
    }
  } catch (error) {
    console.error('Virhe tallennettaessa hälytystä:', error);
    alert('Järjestelmässä tapahtui virhe. Yritä uudelleen.');
  }
});

// Alusta sovellus
displayPopularStocks();