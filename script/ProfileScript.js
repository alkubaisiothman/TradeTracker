import { auth } from './auth/auth.js';
import { userAPI } from './api/api.js';
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Filler } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Filler);

const updateProfileUI = (data) => {
  const { user, alertCount, recentAlerts } = data;

  document.getElementById('profile-username').textContent = user.username || 'Ei saatavilla';
  document.getElementById('profile-email').textContent = user.email || 'Ei saatavilla';

  if (user.createdAt) {
    const joinDate = new Date(user.createdAt).toLocaleDateString('fi-FI');
    document.getElementById('join-date').textContent = joinDate;
  }

  document.getElementById('alerts-count').textContent = alertCount ?? '0';
  document.getElementById('stocks-count').textContent = user.trackedStocks?.length || '0';

  if (user.avatarUrl) {
    document.getElementById('profile-avatar').src = user.avatarUrl;
  }

  renderAlerts(recentAlerts);
  renderTrackedStocks(user.trackedStocks || []);
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
        await import('./api/api.js').then(module => module.alertAPI.deleteAlert(alert._id));
        card.remove();
      } catch (error) {
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
      } catch (error) {
        alert('Muokkaus epäonnistui');
      }
    });

    container.appendChild(card);
  });
};

const renderTrackedStocks = (symbols = []) => {
  const container = document.getElementById('tracked-stocks-list');
  if (!container) return;

  if (symbols.length === 0) {
    container.innerHTML = '<p class="info-text">Ei seurattuja osakkeita.</p>';
    return;
  }

  container.innerHTML = '';
  symbols.forEach(symbol => {
    const wrapper = document.createElement('div');
    wrapper.className = 'stock-item-row';
    wrapper.innerHTML = `
      <div class="stock-row-header">
        <span>${symbol}</span>
        <div class="stock-buttons">
          <button class="show-history-button" data-symbol="${symbol}">Näytä historia</button>
          <button class="remove-stock-button" data-symbol="${symbol}">Poista</button>
        </div>
      </div>
      <div class="stock-history" id="history-${symbol}" style="display:none;">
        <canvas id="chart-${symbol}" height="200"></canvas>
      </div>
    `;

    // Poisto
    wrapper.querySelector('.remove-stock-button').addEventListener('click', async () => {
      if (!confirm(`Poistetaanko ${symbol} seuratuista?`)) return;
      try {
        const updated = symbols.filter(s => s !== symbol);
        await updateTrackedStocks(updated);
        renderTrackedStocks(updated);
        document.getElementById('stocks-count').textContent = updated.length;
      } catch (err) {
        alert('Poisto epäonnistui');
      }
    });

    // Historia
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
  });
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
  try {
    const response = await fetch(`/api/historical-data?symbol=${symbol}&period=1-month`);
    const result = await response.json();

    if (!result.success || !result.data['Time Series (Daily)']) {
      canvas.parentElement.innerHTML = '<p class="info-text">Historiadataa ei saatavilla.</p>';
      return;
    }

    const timeSeries = result.data['Time Series (Daily)'];
    const labels = Object.keys(timeSeries).sort().map(date => new Date(date));
    const prices = labels.map(date => parseFloat(timeSeries[date.toISOString().split('T')[0]]['4. close']));

    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${symbol} hinta`,
          data: prices,
          borderColor: '#17C3B2',
          backgroundColor: 'rgba(23, 195, 178, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'day' },
            title: { display: true, text: 'Päivämäärä' }
          },
          y: {
            title: { display: true, text: 'USD' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  } catch (error) {
    console.error('Virhe kaavion luonnissa:', error);
    canvas.parentElement.innerHTML = '<p class="info-text">Virhe historiadatan latauksessa.</p>';
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
    location.reload();
  } catch (error) {
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
        const current = [...document.querySelectorAll('.stock-item-row span')].map(el => el.textContent);
        if (current.includes(symbol)) return alert('Osake on jo seurannassa');

        const updated = [...current, symbol];
        await updateTrackedStocks(updated);
        renderTrackedStocks(updated);
        document.getElementById('stocks-count').textContent = updated.length;
        input.value = '';
      } catch (err) {
        alert('Lisäys epäonnistui');
      }
    });

  } catch (error) {
    alert('Profiilitietojen haku epäonnistui');
  }
};

document.addEventListener('DOMContentLoaded', initProfilePage);
