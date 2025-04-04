// Kirjautumistoiminnot ja käyttäjäsession hallinta
export const auth = {
  check: (redirect = false) => {
    const isLoggedIn = !!localStorage.getItem('authToken');
    if (!isLoggedIn && redirect) {
      window.location.href = '/sivut/Login.html';
      return false;
    }
    return isLoggedIn;
  },
  
    // Tallenna kirjautumistiedot
    setToken: (token, userData) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      this.updateUI();
    },
  
    // Tarkista kirjautumistila
    check: (redirect = false) => {
      const isLoggedIn = !!localStorage.getItem('authToken');
      if (!isLoggedIn && redirect) {
        window.location.href = '/sivut/Login.html';
        return false;
      }
      return isLoggedIn;
    },
  
    // Kirjaudu ulos
    logout: () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/index.html';
    },
  
    // Hae käyttäjätiedot
    getUser: () => {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    },
  
    // Päivitä käyttöliittymän näkymä
    updateUI: () => {
      const isLoggedIn = this.check();
      const navItems = {
        guest: ['login-item', 'register-item'],
        user: ['profile-item', 'alerts-item', 'logout-item']
      };
  
      // Näytä/piilota elementit
      navItems.guest.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isLoggedIn ? 'none' : 'block';
      });
      
      navItems.user.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isLoggedIn ? 'block' : 'none';
      });
  
      // Päivitä tervehdys
      const greetingEl = document.getElementById('user-greeting');
      if (greetingEl) {
        greetingEl.textContent = isLoggedIn ? `Hei, ${this.getUser()?.username || 'Käyttäjä'}` : '';
        greetingEl.style.display = isLoggedIn ? 'block' : 'none';
      }
    }
  };
  
  // Alusta autentikointi sivun latauksen yhteydessä
  document.addEventListener('DOMContentLoaded', () => auth.init());