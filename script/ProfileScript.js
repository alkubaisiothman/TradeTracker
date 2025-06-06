import { auth } from './auth/auth.js';
import { userAPI, stockAPI } from './api/api.js';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Filler);

const updateProfileUI = ({ user, alertCount, recentAlerts }) => {
  document.getElementById('profile-username').textContent = user.username || 'Ei saatavilla';
  document.getElementById('profile-email').textContent = user.email || 'Ei saatavilla';
  document.getElementById('alerts-count').textContent = alertCount ?? '0';
  document.getElementById('stocks-count').textContent = user.trackedStocks?.length || '0';

  if (user.createdAt) {
    document.getElementById('join-date').textContent = new Date(user.createdAt).toLocaleDateString('fi-FI');
  }
  if (user.avatarUrl) {
    document.getElementById('profile-avatar').src = user.avatarUrl;
  }

  renderAlerts(recentAlerts);
  renderTrackedStocks(user.trackedStocks || []);
};

const renderAlerts = (alerts = []) => {
  const container = document.getElementById('recent-alerts');
  if (!container) return;

  container.innerHTML = alerts.length === 0
    ? '<p class="info-text">Ei aktiivisia hälytyksiä.</p>'
    : '';

  alerts.forEach(alert => {
    const card = document.createElement('div');
    card.className = 'alert-card';
    card.innerHTML = `
      <div>
        <strong>${alert.symbol}</strong> @ <span class="alert-price">${alert.price}</span> USD
        <span class="alert-date">${new Date(alert.createdAt).toLocaleString('fi-FI')}</span>
      </div>
      <div class="alert-actions">
        <button class="edit-alert-button" data-id="${alert._id}">Muokkaa</button>
        <button class="delete-alert-button" data-id="${alert._id}">Poista</button>
      </div>
    `;

    card.querySelector('.delete-alert-button').addEventListener('click', async () => {
      if (!confirm(`Haluatko varmasti poistaa hälytyksen ${alert.symbol}?`)) return;
      try {
        await (await import('./api/api.js')).alertAPI.deleteAlert(alert._id);
        card.remove();
      } catch {
        alert('Poisto epäonnistui');
      }
    });

    card.querySelector('.edit-alert-button').addEventListener('click', async () => {
      const newPrice = prompt(`Uusi hälytyshinta osakkeelle ${alert.symbol}:`, alert.price);
      const price = parseFloat(newPrice);
      if (!price || isNaN(price)) return alert('Virheellinen hinta');

      try {
        await fetch(`/api/alerts/${alert._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ price })
        });
        card.querySelector('.alert-price').textContent = price.toFixed(2);
        alert('Hälytys päivitetty!');
      } catch {
        alert('Muokkaus epäonnistui');
      }
    });

    container.appendChild(card);
  });
};

const renderTrackedStocks = async (symbols = []) => {
  const container = document.getElementById('tracked-stocks-list');
  if (!container) return;

  container.innerHTML = symbols.length === 0
    ? '<p class="info-text">Ei seurattuja osakkeita.</p>'
    : '';

  for (const symbol of symbols) {
    const wrapper = document.createElement('div');
    wrapper.className = 'stock-item-row';

    // Haetaan osakkeen hintatieto
    let priceText = 'Hinta ei saatavilla';
    try {
      const quote = await stockAPI.getQuote(symbol);
      const price = parseFloat(quote['05. price']);
      if (!isNaN(price)) {
        priceText = `Hinta: ${price.toFixed(2)} USD`;
      }
    } catch {
      priceText = 'Tietoja ei saatavilla';
    }

    wrapper.innerHTML = `
      <div class="stock-row-header">
        <div class="stock-info">
          <strong>${symbol}</strong> <span class="stock-price">${priceText}</span>
        </div>
        <div class="stock-buttons">
          <button class="show-history-button" data-symbol="${symbol}">Näytä historia</button>
          <button class="remove-stock-button" data-symbol="${symbol}">Poista</button>
        </div>
      </div>
      <div class="stock-history" id="history-${symbol}" style="display:none;">
        <canvas id="chart-${symbol}" height="200"></canvas>
      </div>
    `;

    wrapper.querySelector('.remove-stock-button').addEventListener('click', async () => {
      if (!confirm(`Poistetaanko ${symbol} seuratuista?`)) return;
      try {
        const updated = symbols.filter(s => s !== symbol);
        await updateTrackedStocks(updated);
        await renderTrackedStocks(updated);
        document.getElementById('stocks-count').textContent = updated.length;
      } catch {
        alert('Poisto epäonnistui');
      }
    });

    wrapper.querySelector('.show-history-button').addEventListener('click', async () => {
      const chartContainer = document.getElementById(`history-${symbol}`);
      if (chartContainer.style.display === 'none') {
        chartContainer.style.display = 'block';
        const canvas = document.getElementById(`chart-${symbol}`);
        if (!canvas.dataset.loaded) {
          await loadAndRenderChart(symbol, canvas);
          canvas.dataset.loaded = 'true';
        }
      } else {
        chartContainer.style.display = 'none';
      }
    });

    container.appendChild(wrapper);
  }
};

const updateTrackedStocks = async (symbols) => {
  await fetch('/api/profile/stocks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ trackedStocks: symbols })
  });
};

const loadAndRenderChart = async (symbol, canvas) => {
  // Historiadata ei tuettu ilmaisessa versiossa
  canvas.parentElement.innerHTML = '<p class="info-text">Historiadata ei saatavilla (ilmaisversio)</p>';
};

const updateUsername = async () => {
  const newUsername = document.getElementById('change-username').value.trim();
  if (!newUsername || newUsername.length < 3) return alert('Vähintään 3 merkkiä');
  try {
    await userAPI.updateProfile({ username: newUsername });
    alert('Käyttäjänimi päivitetty!');
    const userData = auth.getUser();
    userData.username = newUsername;
    auth.setToken(localStorage.getItem('authToken'), userData);
    location.reload();
  } catch (error) {
    alert(error.message || 'Päivitys epäonnistui');
  }
};

const updatePassword = async () => {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  if (newPassword !== confirmPassword) return alert('Salasanat eivät täsmää');
  if (newPassword.length < 6) return alert('Salasanan pitää olla vähintään 6 merkkiä');

  try {
    await userAPI.updatePassword({ currentPassword, newPassword });
    alert('Salasana vaihdettu!');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
  } catch (error) {
    alert(error.message || 'Virhe vaihdossa');
  }
};

const deleteAccount = async () => {
  if (!confirm('Haluatko varmasti poistaa tilisi?')) return;
  try {
    await userAPI.deleteAccount();
    auth.logout();
  } catch (error) {
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

    document.getElementById('add-stock-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('new-stock-symbol');
      const symbol = input.value.trim().toUpperCase();
      if (!symbol || symbol.length < 1) return alert('Syötä osaketunnus');

      try {
        const current = [...document.querySelectorAll('.stock-item-row strong')].map(el => el.textContent);
        if (current.includes(symbol)) return alert('Osake on jo seurannassa');

        const quote = await stockAPI.getQuote(symbol);
        const price = parseFloat(quote?.['05. price']);
        if (!price || isNaN(price)) return alert('Osaketietoja ei löytynyt');

        const updated = [...current, symbol];
        await updateTrackedStocks(updated);
        await renderTrackedStocks(updated);
        document.getElementById('stocks-count').textContent = updated.length;
        input.value = '';
      } catch {
        alert('Lisäys epäonnistui');
      }
    });

  } catch {
    alert('Profiilitietojen haku epäonnistui');
  }
};

document.addEventListener('DOMContentLoaded', initProfilePage);
