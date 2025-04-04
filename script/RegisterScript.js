import { userAPI } from './api/api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hae lomakkeen arvot
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form['confirm-password'].value;

    // Tarkista salasanat
    if (password !== confirmPassword) {
      alert('Salasanat eivät täsmää!');
      form['confirm-password'].focus();
      return;
    }

    try {
      // Näytä latausindikaattori
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Rekisteröidään...';

      // Lähetä rekisteröintipyyntö
      const response = await userAPI.register({
        username,
        email,
        password
      });

      // Onnistunut rekisteröinti
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        alert('Rekisteröinti onnistui!');
        window.location.href = '/sivut/Login.html';
      }
    } catch (error) {
      console.error('Rekisteröintivirhe:', error);
      
      // Näytä käyttäjäystävällinen virheviesti
      let errorMessage = 'Rekisteröinti epäonnistui';
      if (error.message.includes('username')) {
        errorMessage = 'Käyttäjänimi on jo käytössä';
      } else if (error.message.includes('email')) {
        errorMessage = 'Sähköposti on jo käytössä';
      }
      
      alert(errorMessage);
    } finally {
      // Palauta painike normaalitilaan
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Rekisteröidy';
      }
    }
  });
});