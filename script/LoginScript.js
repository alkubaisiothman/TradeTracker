// Yhteiset apufunktiot
import { BACKEND_URL, setAuthToken } from './shared.js';

// Lomakkeen käsittely
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const response = await fetch(`${BACKEND_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    })
  });

  if (response.ok) {
    const { token, username } = await response.json();
    setAuthToken(token, username);
    window.location.href = 'index.html';
  } else {
    alert('Kirjautuminen epäonnistui');
  }
});

// Rekisteröintilinkki
document.getElementById('register-link')?.addEventListener('click', () => {
  window.location.href = 'register.html';
});