import { auth } from './auth/auth.js';
import { userAPI } from './api/api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      // Näytä latausanimaatio
      setLoading(true);
      
      // Kirjaudu sisään
      const response = await userAPI.login({ email, password });
      
      // Tallenna token ja ohjaa etusivulle
      auth.setToken(response.token, {
        username: response.user.username,
        email: response.user.email
      });
      
      window.location.href = '/index.html';
      
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  });
});

function setLoading(isLoading) {
  const button = document.getElementById('login-button');
  button.disabled = isLoading;
  button.innerHTML = isLoading 
    ? '<span class="loading-spinner"></span>' 
    : 'Kirjaudu sisään';
}

function showError(message) {
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}