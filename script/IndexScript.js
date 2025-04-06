// /script/IndexScript.js
import { auth } from './auth/auth.js';
import { stockAPI } from './api/api.js';

// Suosituimmat osakkeet
const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'SAMPO.HE', name: 'Sampo Oyj' },
  { symbol: 'NOKIA.HE', name: 'Nokia Oyj' }
];

// Päivitä copyright-vuosi
const updateCopyrightYear = () => {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
};

// Näytä osakkeen hinta tooltipissa
const showStockPrice = async (symbol) => {
  try {
    const quote = await stockAPI.getQuote(symbol);
    if (quote?.['Global Quote']) {
      const price = parseFloat(quote['Global Quote']['05. price']).toFixed(2);
      return `${symbol}: ${price} USD`;
    }
    return `${symbol}: Hinta ei saatavilla`;
  } catch (error) {
    console.error(`Osakkeen ${symbol} hinnan hakuvirhe:`, error);
    return `${symbol}: Hinnan haku epäonnistui`;
  }
};

// Näytä suosituimmat osakkeet
const displayPopularStocks = async () => {
  const container = document.getElementById('stock-list');
  if (!container) return;

  try {
    // Näytä latausanimaatio
    container.innerHTML = '<div class="loading-spinner"></div>';

    // Luo osakelista
    let stocksHTML = '';
    for (const stock of POPULAR_STOCKS) {
      const priceInfo = await showStockPrice(stock.symbol);
      stocksHTML += `
        <div class="stock-item" data-symbol="${stock.symbol}">
          <strong>${stock.symbol}</strong> - ${stock.name}
          <span class="stock-price-tooltip">${priceInfo}</span>
        </div>
      `;
    }

    container.innerHTML = stocksHTML;

    // Lisää tapahtumankäsittelijät
    document.querySelectorAll('.stock-item').forEach(item => {
      item.addEventListener('click', async () => {
        const symbol = item.dataset.symbol;
        try {
          const priceInfo = await showStockPrice(symbol);
          alert(priceInfo);
        } catch (error) {
          console.error('Osaketietojen haku epäonnistui:', error);
          alert(`Osakkeen ${symbol} tietojen haku epäonnistui`);
        }
      });

      // Lisää hover-efekti
      item.addEventListener('mouseenter', () => {
        const tooltip = item.querySelector('.stock-price-tooltip');
        if (tooltip) {
          tooltip.style.visibility = 'visible';
        }
      });

      item.addEventListener('mouseleave', () => {
        const tooltip = item.querySelector('.stock-price-tooltip');
        if (tooltip) {
          tooltip.style.visibility = 'hidden';
        }
      });
    });

  } catch (error) {
    console.error('Osakelistauksen haku epäonnistui:', error);
    container.innerHTML = `
      <p class="error">Osakelistauksen haku epäonnistui</p>
      <button id="retry-button">Yritä uudelleen</button>
    `;
    
    document.getElementById('retry-button')?.addEventListener('click', displayPopularStocks);
  }
};

// Alusta etusivu
const initIndexPage = () => {
  // Alusta autentikointi
  auth.init();
  
  // Näytä suosituimmat osakkeet
  displayPopularStocks();
  
  // Päivitä copyright-vuosi
  updateCopyrightYear();

  // Lisää kirjautumistilan tarkkailija
  auth.updateUI();
};

// Käynnistä sivu kun DOM on valmis
document.addEventListener('DOMContentLoaded', initIndexPage);