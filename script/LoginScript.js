import { BACKEND_URL } from './Shared.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elementit
  const form = document.getElementById('login-form');
  const loginButton = document.getElementById('login-button');
  const loginSpinner = document.getElementById('login-spinner');
  const loginText = document.getElementById('login-text');
  const errorDisplay = document.getElementById('login-error');
  const successDisplay = document.getElementById('registration-success');

  // Tarkista URL-parametrit onnistuneelle rekisteröinnille
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('registered')) {
    successDisplay.style.display = 'block';
  }

  // Kirjautumislomakkeen käsittely
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Resetoi virheviestit
    clearErrorMessages();
    errorDisplay.style.display = 'none';
    
    // Hae lomakkeen arvot
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Validointi
    if (!validateForm(email, password)) {
      return;
    }
    
    // Näytä latausanimaatio
    setLoadingState(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Onnistunut kirjautuminen
        handleSuccessfulLogin(data);
      } else {
        // Näytä virheviesti
        throw new Error(data.error || 'Kirjautuminen epäonnistui');
      }
    } catch (error) {
      console.error('Kirjautumisvirhe:', error);
      showErrorMessage(error.message);
    } finally {
      setLoadingState(false);
    }
  });

  // Apufunktiot
  function clearErrorMessages() {
    document.querySelectorAll('.error-message').forEach(el => {
      el.textContent = '';
    });
  }

  function validateForm(email, password) {
    let isValid = true;

    if (!email) {
      document.getElementById('email-error').textContent = 
        'Sähköposti on pakollinen';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('email-error').textContent = 
        'Anna kelvollinen sähköpostiosoite';
      isValid = false;
    }

    if (!password) {
      document.getElementById('password-error').textContent = 
        'Salasana on pakollinen';
      isValid = false;
    }

    return isValid;
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      loginButton.disabled = true;
      loginSpinner.style.display = 'inline-block';
      loginText.style.display = 'none';
    } else {
      loginButton.disabled = false;
      loginSpinner.style.display = 'none';
      loginText.style.display = 'inline';
    }
  }

  function showErrorMessage(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
  }

  function handleSuccessfulLogin(data) {
    // Tallenna kirjautumistiedot
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('username', data.user.username);
    localStorage.setItem('email', data.user.email);
    localStorage.setItem('isLoggedIn', 'true');
    
    // Ohjaa käyttäjä etusivulle
    window.location.href = '/index.html';
  }
});