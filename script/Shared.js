// shared.js
export const BACKEND_URL = 'http://localhost:5000';

// Kirjautumisen hallinta
export function setAuthToken(token, username, email) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('username', username);
  localStorage.setItem('email', email);
  localStorage.setItem('isLoggedIn', 'true');
}

export function checkAuth(redirect = false) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn && redirect) {
    window.location.href = '/sivut/Login.html';
    return false;
  }
  return isLoggedIn;
}

// Osakkeiden haku
export async function fetchStockData(symbol) {
  try {
    const token = localStorage.getItem('authToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(`${BACKEND_URL}/api/stock-data?symbol=${symbol}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Haku epäonnistui:', error);
    alert('Osaketietojen haku epäonnistui. Yritä uudelleen.');
    return null;
  }
}

// Kaavion alustus ja päivitys
let priceChart;

export function initChart() {
  const ctx = document.getElementById('priceChart');
  if (!ctx) return null;
  
  priceChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Hinta (USD)',
        data: [],
        borderColor: '#007bff',
        borderWidth: 2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Aika' } },
        y: { title: { display: true, text: 'Hinta (USD)' } }
      }
    }
  });
  return priceChart;
}

export function updateChart(labels, data) {
  if (priceChart) {
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = data;
    priceChart.update();
  }
}