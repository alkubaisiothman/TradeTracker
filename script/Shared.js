export const BACKEND_URL = 'http://localhost:5000';

// Kirjautumisen hallinta
export function setAuthToken(token, username) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('username', username);
  localStorage.setItem('isLoggedIn', 'true');
}

export function checkAuth(redirect = false) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn && redirect) {
    window.location.href = 'login.html';
  }
  return isLoggedIn;
}

// Osakkeiden haku
export async function fetchStockData(symbol) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stock-data?symbol=${symbol}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Haku epäonnistui:', error);
    return null;
  }
}

// Kaavion päivitys
export function updateChart(chart, labels, data) {
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  }
}