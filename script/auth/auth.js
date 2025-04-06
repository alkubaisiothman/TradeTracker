// /script/auth/auth.js

export const auth = {
  // Alustusfunktio
  init: () => {
    // Päivitä UI heti kun DOM on valmis
    document.addEventListener('DOMContentLoaded', () => {
      auth.updateUI();
      auth.setupLogoutHandler(); // Lisätään logout-käsittelijä
    });
  },

  // Aseta logout-napin tapahtumankäsittelijä
  setupLogoutHandler: () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      // Poista vanha käsittelijä ensin (vältä päällekkäisyydet)
      logoutBtn.removeEventListener('click', auth.handleLogout); 
      logoutBtn.addEventListener('click', auth.handleLogout);
    }
  },

  // Kirjautumistietojen tallennus
  setToken: (token, userData) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    auth.updateUI();
    auth.setupLogoutHandler(); // Varmistetaan, että logout-nappi toimii
  },

  // Kirjautumistilan tarkistus
  check: (redirect = false) => {
    const token = localStorage.getItem('authToken');
    const isLoggedIn = !!token;
    
    if (!isLoggedIn && redirect) {
      window.location.href = '/sivut/Login.html';
      return false;
    }
    return isLoggedIn;
  },

  // Uloskirjauksen käsittelijä (erillinen funktio virheenkorjausta varten)
  handleLogout: (event) => {
    event.preventDefault(); // Estä oletustoiminta
    auth.logout();
  },

  // Uloskirjauslogiikka
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Päivitä UI välittömästi
    auth.updateUI();
    
    // Ohjaa etusivulle lyhyen viiveen jälkeen
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 100);
  },

  // Käyttäjätietojen haku
  getUser: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },

  // Käyttöliittymän päivitys
  updateUI: () => {
    const isLoggedIn = auth.check();
    const user = auth.getUser();

    // Elementtien näkyvyys
    const elements = {
      guest: ['login-item', 'register-item'],
      user: ['user-greeting', 'profile-item', 'alerts-item', 'logout-item']
    };

    elements.guest.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isLoggedIn ? 'none' : 'block';
    });

    elements.user.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isLoggedIn ? 'block' : 'none';
    });

    // Päivitä tervehdys
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
      greetingEl.textContent = isLoggedIn ? `Hei, ${user?.username || 'Käyttäjä'}` : '';
    }
  }
};

// Alusta autentikointi
auth.init();