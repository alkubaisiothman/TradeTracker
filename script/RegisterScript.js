import { BACKEND_URL } from './Shared.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const registerButton = document.getElementById('register-button');
  const registerSpinner = document.getElementById('register-spinner');
  const registerText = document.getElementById('register-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Resetoi virheviestit
    clearErrorMessages();
    
    // Hae lomakkeen arvot
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validoi lomake
    if (!validateForm(username, email, password, confirmPassword)) {
      return;
    }
    
    // Näytä latausanimaatio
    setLoadingState(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Rekisteröinti epäonnistui');
      }
      
      // Onnistunut rekisteröinti
      showSuccessMessage('Rekisteröinti onnistui! Voit nyt kirjautua sisään.');
      setTimeout(() => {
        window.location.href = '/sivut/Login.html';
      }, 1500);
      
    } catch (error) {
      console.error('Rekisteröintivirhe:', error);
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

  function validateForm(username, email, password, confirmPassword) {
    let isValid = true;

    if (username.length < 3) {
      document.getElementById('username-error').textContent = 
        'Käyttäjätunnuksen tulee olla vähintään 3 merkkiä';
      isValid = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('email-error').textContent = 
        'Anna kelvollinen sähköpostiosoite';
      isValid = false;
    }

    if (password.length < 6) {
      document.getElementById('password-error').textContent = 
        'Salasanan tulee olla vähintään 6 merkkiä';
      isValid = false;
    }

    if (password !== confirmPassword) {
      document.getElementById('confirm-password-error').textContent = 
        'Salasanat eivät täsmää';
      isValid = false;
    }

    return isValid;
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      registerButton.disabled = true;
      registerSpinner.style.display = 'inline-block';
      registerText.style.display = 'none';
    } else {
      registerButton.disabled = false;
      registerSpinner.style.display = 'none';
      registerText.style.display = 'inline';
    }
  }

  function showSuccessMessage(message) {
    const successAlert = document.createElement('div');
    successAlert.className = 'success-message';
    successAlert.textContent = message;
    successAlert.style.cssText = `
      background-color: #2ecc71;
      color: white;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      text-align: center;
    `;
    
    form.prepend(successAlert);
    setTimeout(() => {
      successAlert.remove();
    }, 3000);
  }

  function showErrorMessage(message) {
    const errorAlert = document.createElement('div');
    errorAlert.className = 'error-message';
    errorAlert.textContent = message;
    errorAlert.style.cssText = `
      background-color: #e74c3c;
      color: white;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      text-align: center;
    `;
    
    form.prepend(errorAlert);
    setTimeout(() => {
      errorAlert.remove();
    }, 3000);
  }
});