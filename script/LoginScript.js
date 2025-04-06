// /script/LoginScript.js
import { auth } from './auth/auth.js';
import { userAPI } from './api/api.js';

// Näytä virheviesti
const showError = (message) => {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
};

// Aseta lataustila
const setLoading = (isLoading) => {
  const button = document.getElementById('login-button');
  if (button) {
    button.disabled = isLoading;
    button.innerHTML = isLoading 
      ? '<span class="loading-spinner"></span>' 
      : 'Kirjaudu sisään';
  }
};

// Käsittele kirjautumislomake
const handleLogin = async (event) => {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  if (!email || !password) {
    showError('Sähköposti ja salasana ovat pakollisia');
    return;
  }

  try {
    setLoading(true);
    const response = await userAPI.login({ email, password });
    
    if (response.token) {
      auth.setToken(response.token, {
        username: response.user.username,
        email: response.user.email
      });

      // Jos "Muista minut" valittu, tallenna token pysyvämmin
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      // Ohjaa etusivulle tai aikaisempaan osoitteeseen
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/index.html';
      window.location.href = redirectUrl;
    }
  } catch (error) {
    console.error('Kirjautumisvirhe:', error);
    showError(error.message || 'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana.');
  } finally {
    setLoading(false);
  }
};

// Alusta kirjautumissivu
const initLoginPage = () => {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  // Näytä rekisteröintiviesti jos tullaan rekisteröinnin jälkeen
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('registered')) {
    const successEl = document.getElementById('registration-success');
    if (successEl) {
      successEl.style.display = 'block';
    }
  }
};

// Käynnistä sivu kun DOM on valmis
document.addEventListener('DOMContentLoaded', initLoginPage);