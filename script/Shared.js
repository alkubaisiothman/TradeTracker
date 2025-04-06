// /script/Shared.js

// Ympäristömuuttujat ja yhteiset funktiot
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Autentikaatioutils
export const authUtils = {
  // Tallenna kirjautumistiedot
  setAuthData: (token, userData) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('lastActivity', new Date().getTime());
  },

  // Tarkista autentikaatio
  checkAuth: () => {
    const token = localStorage.getItem('authToken');
    const lastActivity = localStorage.getItem('lastActivity');
    
    // Tarkista token ja viimeisin aktiivisuus (30 min sessio)
    if (!token || (lastActivity && (Date.now() - lastActivity > 1800000))) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      return false;
    }
    
    // Päivitä viimeisin aktiivisuus
    localStorage.setItem('lastActivity', new Date().getTime());
    return true;
  },

  // Kirjaudu ulos
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/index.html';
  },

  // Hae käyttäjätiedot
  getUser: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }
};

// API-apufunktiot
export const apiHelpers = {
  // Käsittele API-virheet
  handleApiError: (error) => {
    console.error('API-virhe:', error);
    throw error.response?.data?.message || error.message || 'API-kutsu epäonnistui';
  },

  // Hae otsikot
  getHeaders: (needsAuth = true) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (needsAuth) {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Kirjautuminen vaaditaan');
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
};

// Muotoiluutils
export const formatUtils = {
  // Muotoile päivämäärä
  formatDate: (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fi-FI', options);
  },

  // Muotoile raha
  formatCurrency: (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency
    }).format(amount);
  }
};

// Alusta sovellus
export const initApp = () => {
  // Tarkista autentikaatio sivun latauksen yhteydessä
  if (!authUtils.checkAuth() && !window.location.pathname.includes('/login')) {
    window.location.href = '/sivut/Login.html';
  }

  // Päivitä UI:n autentikaatiotila
  updateAuthUI();
};

// Päivitä autentikaatio-UI
const updateAuthUI = () => {
  const isAuthenticated = authUtils.checkAuth();
  const user = authUtils.getUser();
  
  // Päivitä navigaatio
  document.querySelectorAll('[data-auth]').forEach(el => {
    el.style.display = el.dataset.auth === 'true' && isAuthenticated ? 'block' : 'none';
  });
  
  // Päivitä käyttäjän tervehdys
  const greetingEl = document.getElementById('user-greeting');
  if (greetingEl) {
    greetingEl.textContent = isAuthenticated ? `Hei, ${user?.username || 'Käyttäjä'}` : '';
  }
};

// Alusta kun DOM on valmis
document.addEventListener('DOMContentLoaded', initApp);