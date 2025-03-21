const BACKEND_URL = 'http://localhost:5000'; // Backend-palvelimen osoite

// Valmiit osakkeet
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

// Alusta Chart.js-kaavio
const ctx = document.getElementById('priceChart').getContext('2d');
const priceChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [], // Ajat (x-akseli)
    datasets: [{
      label: 'Hinta (USD)',
      data: [], // Hinnat (y-akseli)
      borderColor: '#007bff',
      borderWidth: 2,
      fill: false,
    }],
  },
  options: {
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Aika',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Hinta (USD)',
        },
      },
    },
  },
});

// Päivitä kaavio uusilla tiedoilla
function updateChart(labels, data) {
  priceChart.data.labels = labels;
  priceChart.data.datasets[0].data = data;
  priceChart.update();
}

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

      // Päivitä kaavio valitun osakkeen tiedoilla
      const labels = ['1 päivä sitten', 'Nykyhetki']; // Esimerkki ajankohdista
      const prices = [stockData['08. previous close'], stockData['05. price']]; // Esimerkki hinnoista
      updateChart(labels, prices);
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

// Hae historialliset tiedot backendin kautta
async function fetchHistoricalData(symbol, period) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/historical-data?symbol=${symbol}&period=${period}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Virhe haettaessa historiallisia tietoja:', error);
    throw error;
  }
}

// Päivitä kaavio historiallisilla tiedoilla
async function updateChartWithHistoricalData(symbol, period) {
  try {
    const data = await fetchHistoricalData(symbol, period);
    const labels = [];
    const prices = [];

    let timeSeries;
    switch (period) {
      case '1-day':
        timeSeries = data['Time Series (60min)'];
        break;
      case '1-week':
      case '1-month':
        timeSeries = data['Time Series (Daily)'];
        break;
      case '1-year':
        timeSeries = data['Monthly Time Series'];
        break;
      default:
        throw new Error('Virheellinen ajanjakso');
    }

    for (const date in timeSeries) {
      labels.push(date);
      prices.push(parseFloat(timeSeries[date]['4. close']));
    }

    updateChart(labels.reverse(), prices.reverse());
  } catch (error) {
    console.error('Virhe päivitettäessä kaaviota:', error);
    alert('Historiallisten tietojen haku epäonnistui. Yritä uudelleen.');
  }
}

// Lisää tapahtumankuuntelijat valintanapeille
document.getElementById('1-day').addEventListener('click', () => {
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (symbol) {
    updateChartWithHistoricalData(symbol, '1-day');
  } else {
    alert('Valitse ensin osake syöttämällä sen symboli.');
  }
});

document.getElementById('1-week').addEventListener('click', () => {
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (symbol) {
    updateChartWithHistoricalData(symbol, '1-week');
  } else {
    alert('Valitse ensin osake syöttämällä sen symboli.');
  }
});

document.getElementById('1-month').addEventListener('click', () => {
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (symbol) {
    updateChartWithHistoricalData(symbol, '1-month');
  } else {
    alert('Valitse ensin osake syöttämällä sen symboli.');
  }
});

document.getElementById('1-year').addEventListener('click', () => {
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (symbol) {
    updateChartWithHistoricalData(symbol, '1-year');
  } else {
    alert('Valitse ensin osake syöttämällä sen symboli.');
  }
});

// Alusta sovellus
displayPopularStocks();