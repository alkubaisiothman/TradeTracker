const BACKEND_URL = 'http://localhost:5000'; // Backend-palvelimen osoite

// Hae osaketiedot backendin kautta
document.getElementById('search-button').addEventListener('click', async () => {
  const symbol = document.getElementById('stock-symbol').value.toUpperCase();
  if (!symbol) {
    alert('Syötä osakkeen symboli!');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/stock-data?symbol=${symbol}`);
    const data = await response.json();

    if (data['Global Quote']) {
      const stockData = data['Global Quote'];
      displayStockData(stockData);
    } else {
      alert('Osaketta ei löytynyt. Tarkista symboli.');
    }
  } catch (error) {
    console.error('Virhe haettaessa osaketietoja:', error);
    alert('Osaketietojen haku epäonnistui. Yritä uudelleen.');
  }
});

// Näytä osaketiedot käyttäjälle
function displayStockData(data) {
  const stockDataDiv = document.getElementById('stock-data');
  stockDataDiv.innerHTML = `
    <p><strong>Osake:</strong> ${data['01. symbol']}</p>
    <p><strong>Hinta:</strong> ${data['05. price']} USD</p>
    <p><strong>Muutos:</strong> ${data['09. change']} (${data['10. change percent']})</p>
  `;
}

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