import { BACKEND_URL, logout } from './Shared.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Alustus
  const logoutButton = document.getElementById('logout-btn');
  const changeAvatarBtn = document.getElementById('change-avatar');
  const saveUsernameBtn = document.getElementById('save-username');
  const savePasswordBtn = document.getElementById('save-password');
  const deleteAccountBtn = document.getElementById('delete-account');

  // Tarkista kirjautumistila
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/sivut/Login.html';
    return;
  }

  // Lataa käyttäjätiedot
  await loadUserProfile();

  // Tapahtumankäsittelijät
  logoutButton.addEventListener('click', logout);
  changeAvatarBtn.addEventListener('click', changeAvatar);
  saveUsernameBtn.addEventListener('click', updateUsername);
  savePasswordBtn.addEventListener('click', updatePassword);
  deleteAccountBtn.addEventListener('click', deleteAccount);

  // Apufunktiot
  async function loadUserProfile() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Profiilin lataus epäonnistui');
      }

      const userData = await response.json();
      updateProfileUI(userData);
    } catch (error) {
      console.error('Virhe profiilin latauksessa:', error);
      alert('Profiilitietojen haku epäonnistui');
    }
  }

  function updateProfileUI(userData) {
    document.getElementById('profile-username').textContent = userData.username;
    document.getElementById('profile-email').textContent = userData.email;
    document.getElementById('join-date').textContent = new Date(userData.createdAt).toLocaleDateString('fi-FI');
    document.getElementById('alerts-count').textContent = userData.alertCount || 0;
    document.getElementById('stocks-count').textContent = userData.trackedStocks?.length || 0;
    
    if (userData.avatarUrl) {
      document.getElementById('profile-avatar').src = userData.avatarUrl;
    }
  }

  async function changeAvatar() {
    // Toteuta kuvanvaihto logiikka tässä
    alert('Avatarin vaihtotoiminnallisuus toteutetaan myöhemmin');
  }

  async function updateUsername() {
    const newUsername = document.getElementById('change-username').value.trim();
    
    if (!newUsername) {
      alert('Anna uusi käyttäjänimi');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/profile/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Käyttäjänimen päivitys epäonnistui');
      }

      // Päivitä UI ja localStorage
      document.getElementById('profile-username').textContent = newUsername;
      localStorage.setItem('username', newUsername);
      alert('Käyttäjänimi päivitetty onnistuneesti!');
    } catch (error) {
      console.error('Virhe käyttäjänimen päivityksessä:', error);
      alert(error.message);
    }
  }

  async function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Täytä kaikki kentät');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Uudet salasanat eivät täsmää');
      return;
    }

    if (newPassword.length < 6) {
      alert('Salasanan tulee olla vähintään 6 merkkiä pitkä');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Salasanan vaihto epäonnistui');
      }

      // Tyhjennä kentät
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-new-password').value = '';
      
      alert('Salasana vaihdettu onnistuneesti!');
    } catch (error) {
      console.error('Virhe salasanan vaihdossa:', error);
      alert(error.message);
    }
  }

  async function deleteAccount() {
    if (!confirm('Haluatko varmasti poistaa tilisi? Tätä toimintoa ei voi perua.')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Tilin poisto epäonnistui');
      }

      // Kirjaa ulos ja ohjaa etusivulle
      logout();
    } catch (error) {
      console.error('Virhe tilin poistossa:', error);
      alert(error.message);
    }
  }
});