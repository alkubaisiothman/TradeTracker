import { stockAPI } from './api/api.js';
import { auth } from './auth/auth.js';

const FEATURED_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];

const showLoading = (elementId, isLoading = true) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (isLoading) {
    element.innerHTML = '<div class="loading-spinner"></div>';
    element.style.display = 'block';
  } else {
    element.style.display = 'none';
  }
};

const showError = (message, elementId) => {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `<p class="error">${message}</p>`;
  }
};

const displayStockCard = (symbol, price, changePercent) => {
  return `
    <div class="stock-card">
      <h3>${symbol}</h3>
      <p>Hinta: ${price} USD</p>
      <p class="${parseFloat(changePercent) < 0 ? 'negative' : 'positive'}">
        Muutos: ${changePercent}
      </p>
    </div>
  `;
};

const loadFeaturedStocks = async () => {
  const container = document.getElementById('featured-stocks');
  if (!container) return;

  try {
    showLoading('featured-loading', true);
    let html = '';

    for (const symbol of FEATURED_SYMBOLS) {
      try {
        const quote = await stockAPI.getQuote(symbol);
        const price = parseFloat(quote['05. price']).toFixed(2);
        const changePercent = quote['10. change percent'];

        html += displayStockCard(symbol, price, changePercent);
      } catch (err) {
        html += `<div class="stock-card error-card">
          <h3>${symbol}</h3>
          <p>Tietoja ei saatavilla</p>
        </div>`;
      }
    }

    container.innerHTML = html;
  } catch (error) {
    showError('Osaketietojen haku epäonnistui', 'featured-stocks');
  } finally {
    showLoading('featured-loading', false);
  }
};

const initIndexPage = () => {
  auth.check(); // Näyttää oikean yläpalkin

  // Lisää tapahtumankuuntelija "Näytä osaketiedot" -napille
  const showButton = document.getElementById('load-featured-button');
  if (showButton) {
    showButton.addEventListener('click', loadFeaturedStocks);
  }
};

document.addEventListener('DOMContentLoaded', initIndexPage);
