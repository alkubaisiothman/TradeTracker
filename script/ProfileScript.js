import { auth } from './auth/auth.js';
import { userAPI } from './api/api.js';

const updateProfileUI = (data) => {
  const { user, alertCount, recentAlerts } = data;

  document.getElementById('profile-username').textContent = user.username || 'Ei saatavilla';
  document.getElementById('profile-email').textContent = user.email || 'Ei saatavilla';

  if (user.createdAt) {
    const joinDate = new Date(user.createdAt).toLocaleDateString('fi-FI');
    document.getElementById('join-date').textContent = joinDate;
  }

  document.getElementById('alerts-count').textContent = alertCount ?? '0';
  document.getElementById('stocks-count').textContent = '—'; // ei käytössä vielä

  if (user.avatarUrl) {
    document.getElementById('profile-avatar').src = user.avatarUrl;
  }

  renderAlerts(recentAlerts);
};

const renderAlerts = (alerts = []) => {
  const container = document.getElementById('recent-alerts');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = '<p class="info-text">Ei aktiivisia hälytyksiä.</p>';
    return;
  }

  container.innerHTML = '';

  alerts.forEach(alert => {
    const card = document.createElement('div');
    card.className = 'alert-card';
    card.innerHTML = `
      <div>
        <strong>${alert.symbol}</strong> @ ${alert.price} USD
        <span class="alert-date">${new Date(alert.createdAt).toLocaleString('fi-FI')}</span>
      </div>
      <button class="delete-alert-button" data-id="${alert._id}">Poista</button>
    `;

    card.querySelector('.delete-alert-button').addEventListener('click', async () => {
      if (!confirm(`Haluatko varmasti poistaa hälytyksen ${alert.symbol} @ ${alert.price}?`)) return;

      try {
        await import('./api/api.js').then(module => module.alertAPI.deleteAlert(alert._id));
        card.remove();
      } catch (error) {
        console.error('Hälytyksen poisto epäonnistui:', error);
        alert('Hälytyksen poisto epäonnistui');
      }
    });

    container.appendChild(card);
  });
};

const updateUsername = async () => {
  const newUsername = document.getElementById('change-username').value.trim();
  if (!newUsername || newUsername.length < 3) {
    alert('Käyttäjänimen tulee olla vähintään 3 merkkiä pitkä');
    return;
  }
  try {
    await userAPI.updateProfile({ username: newUsername });
    alert('Käyttäjänimi päivitetty!');
    const userData = auth.getUser();
    userData.username = newUsername;
    auth.setToken(localStorage.getItem('authToken'), userData);
    location.reload();
  } catch (error) {
    console.error('Käyttäjänimen päivitysvirhe:', error);
    alert(error.message || 'Päivitys epäonnistui');
  }
};

const updatePassword = async () => {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  if (newPassword !== confirmPassword) {
    alert('Salasanat eivät täsmää');
    return;
  }
  if (newPassword.length < 6) {
    alert('Salasanan pitää olla vähintään 6 merkkiä');
    return;
  }
  try {
    await userAPI.updatePassword({ currentPassword, newPassword });
    alert('Salasana vaihdettu!');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
  } catch (error) {
    console.error('Salasanan vaihto epäonnistui:', error);
    alert(error.message || 'Virhe vaihdossa');
  }
};

const deleteAccount = async () => {
  if (!confirm('Haluatko varmasti poistaa tilisi?')) return;
  try {
    await userAPI.deleteAccount();
    auth.logout();
  } catch (error) {
    console.error('Tilin poisto epäonnistui:', error);
    alert(error.message || 'Virhe tilin poistossa');
  }
};

const initProfilePage = async () => {
  if (!auth.check(true)) return;
  try {
    const profileData = await userAPI.getProfile();
    updateProfileUI(profileData.data);

    document.getElementById('save-username')?.addEventListener('click', updateUsername);
    document.getElementById('save-password')?.addEventListener('click', updatePassword);
    document.getElementById('delete-account')?.addEventListener('click', deleteAccount);
    document.getElementById('change-avatar')?.addEventListener('click', () => {
      alert('Avatarin vaihto tulossa myöhemmin!');
    });
  } catch (error) {
    console.error('Profiilin latausvirhe:', error);
    alert('Profiilitietojen haku epäonnistui');
  }
};

document.addEventListener('DOMContentLoaded', initProfilePage);
