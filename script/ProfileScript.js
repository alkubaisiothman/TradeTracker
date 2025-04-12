import { auth } from './auth/auth.js';
import { userAPI } from './api/api.js';

const updateProfileUI = (userData) => {
  document.getElementById('profile-username').textContent = userData.username || 'Ei saatavilla';
  document.getElementById('profile-email').textContent = userData.email || 'Ei saatavilla';
  if (userData.createdAt) {
    const joinDate = new Date(userData.createdAt).toLocaleDateString('fi-FI');
    document.getElementById('join-date').textContent = joinDate;
  }
  document.getElementById('alerts-count').textContent = userData.alertCount || '0';
  document.getElementById('stocks-count').textContent = userData.trackedStocks?.length || '0';
  if (userData.avatarUrl) {
    document.getElementById('profile-avatar').src = userData.avatarUrl;
  }
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
    const userData = await userAPI.getProfile();
    updateProfileUI(userData);
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
