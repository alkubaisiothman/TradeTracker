// Ympäristömuuttujat ja yhteiset funktiot
export const BACKEND_URL = 'http://localhost:5000';

// Kirjautumisen hallinta
export function setAuthToken(token, username, email, userId) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('username', username);
  localStorage.setItem('email', email);
  localStorage.setItem('userId', userId);
  localStorage.setItem('isLoggedIn', 'true');
  updateAuthUI();
}

export function checkAuth(redirect = false) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn && redirect) {
    window.location.href = '/sivut/Login.html';
    return false;
  }
  updateAuthUI();
  return isLoggedIn;
}

function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const loginItem = document.getElementById('login-item');
  const registerItem = document.getElementById('register-item');
  const logoutItem = document.getElementById('logout-item');
  const profileItem = document.getElementById('profile-item');
  const alertsItem = document.getElementById('alerts-item');
  const userGreeting = document.getElementById('user-greeting');

  if (loginItem) loginItem.style.display = isLoggedIn ? 'none' : 'block';
  if (registerItem) registerItem.style.display = isLoggedIn ? 'none' : 'block';
  if (logoutItem) logoutItem.style.display = isLoggedIn ? 'block' : 'none';
  if (profileItem) profileItem.style.display = isLoggedIn ? 'block' : 'none';
  if (alertsItem) alertsItem.style.display = isLoggedIn ? 'block' : 'none';
  
  if (userGreeting) {
    if (isLoggedIn) {
      const username = localStorage.getItem('username') || 'Käyttäjä';
      userGreeting.textContent = `Hei, ${username}`;
      userGreeting.style.display = 'block';
    } else {
      userGreeting.style.display = 'none';
    }
  }
}

// Kirjaudu ulos
export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('userId');
  localStorage.removeItem('isLoggedIn');
  window.location.href = '/index.html';
}

// Alusta kirjautumistila
export function initializeAuth() {
  updateAuthUI();
  
  // Lisää uloskirjautumistapahtuma
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

// Osakedatan haku
export async function fetchStockData(symbol) {
  console.log(`Haetaan osakedataa symbolille: ${symbol}`);
  try {
    const token = localStorage.getItem('authToken');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/stock-data?symbol=${symbol}`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Osakedatan haku epäonnistui:', error);
    throw error;
  }
}

// Käyttäjäprofiilin haku
export async function fetchUserProfile() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Kirjautuminen vaaditaan');
    }

    const response = await fetch(`${BACKEND_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Profiilin haku epäonnistui:', error);
    throw error;
  }
}

// Käyttäjän hälytysten haku
export async function fetchUserAlerts() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Kirjautuminen vaaditaan');
    }

    const response = await fetch(`${BACKEND_URL}/api/alerts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Hälytysten haku epäonnistui:', error);
    throw error;
  }
}

// Kaavion hallinta
let priceChart;

export function initChart() {
  const ctx = document.getElementById('priceChart');
  if (!ctx) {
    console.error('Kaavion canvas-elementtiä ei löytynyt');
    return null;
  }
  
  priceChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Hinta (USD)',
        data: [],
        borderColor: '#17C3B2',
        borderWidth: 2,
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Aika' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          title: { display: true, text: 'Hinta (USD)' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
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
  } else {
    console.error('Kaaviota ei ole alustettu');
  }
}

// Historiallisen datan haku
export async function fetchHistoricalData(symbol, period) {
  console.log(`Haetaan historiallista dataa: ${symbol}, ${period}`);
  try {
    const response = await fetch(`${BACKEND_URL}/api/historical-data?symbol=${symbol}&period=${period}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Historiallisten tietojen haku epäonnistui:', error);
    throw error;
  }
}

// Alusta kirjautumistila sivun latauksen yhteydessä
document.addEventListener('DOMContentLoaded', initializeAuth);