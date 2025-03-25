// Ympäristömuuttujat ja yhteiset funktiot
export const BACKEND_URL = 'http://localhost:5000';

// Kirjautumisen hallinta
export function setAuthToken(token, username, email) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('username', username);
  localStorage.setItem('email', email);
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
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userGreeting = document.getElementById('user-greeting');

  if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'block';
  if (registerBtn) registerBtn.style.display = isLoggedIn ? 'none' : 'block';
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
  
  if (userGreeting && isLoggedIn) {
    const username = localStorage.getItem('username');
    userGreeting.textContent = `Hei, ${username}`;
    userGreeting.style.display = 'block';
  }
}

// Kirjaudu ulos
export function logout() {
  localStorage.clear();
  window.location.href = '/sivut/Login.html';
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

const bcrypt = require('bcrypt');
const saltRounds = 10;

// Rekisteröintireitti
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Tarkista pakolliset kentät
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Kaikki kentät ovat pakollisia' 
      });
    }
    
    // Tarkista käyttäjätunnuksen ja sähköpostin yksilöllisyys
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Käyttäjätunnus tai sähköposti on jo käytössä' 
      });
    }
    
    // Hashaa salasana
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Luo uusi käyttäjä
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await newUser.save();
    
    res.json({ 
      success: true,
      message: 'Käyttäjä rekisteröity onnistuneesti' 
    });
    
  } catch (error) {
    console.error('Rekisteröintivirhe:', error);
    res.status(500).json({ 
      success: false,
      error: 'Rekisteröinti epäonnistui',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'salainenavain'; // Käytä .env-tiedostossa olevaa avainta tuotannossa

// Kirjautumisreitti
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Tarkista pakolliset kentät
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Sähköposti ja salasana ovat pakollisia' 
      });
    }
    
    // Etsi käyttäjä
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Väärä sähköposti tai salasana' 
      });
    }
    
    // Vertaa salasanoja
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Väärä sähköposti tai salasana' 
      });
    }
    
    // Luo JWT-token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      jwtSecret,
      { expiresIn: '1h' }
    );
    
    // Onnistunut vastaus
    res.json({ 
      success: true,
      message: 'Kirjautuminen onnistui',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Kirjautumisvirhe:', error);
    res.status(500).json({ 
      success: false,
      error: 'Kirjautuminen epäonnistui',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Kirjautumisen hallinta
export function checkAuth(redirect = false) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  if (!isLoggedIn && redirect) {
    window.location.href = '/sivut/Login.html';
    return false;
  }
  
  updateAuthUI();
  return isLoggedIn;
}

export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('isLoggedIn');
  window.location.href = '/sivut/Login.html';
}

function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userGreeting = document.getElementById('user-greeting');

  if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'block';
  if (registerBtn) registerBtn.style.display = isLoggedIn ? 'none' : 'block';
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
  
  if (userGreeting && isLoggedIn) {
    const username = localStorage.getItem('username');
    userGreeting.textContent = `Hei, ${username}`;
    userGreeting.style.display = 'block';
  }
}

// Alusta kirjautumistila sivun latauksen yhteydessä
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
});