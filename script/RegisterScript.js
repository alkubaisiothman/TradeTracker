import { userAPI } from './api/api.js';
import { auth } from './auth/auth.js';

// Tarkista lomakkeen tiedot
const validateForm = (formData) => {
  const errors = {};

  if (!formData.username || formData.username.length < 3) {
    errors.username = 'Käyttäjänimen tulee olla vähintään 3 merkkiä pitkä';
  }

  if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
    errors.email = 'Syötä validi sähköpostiosoite';
  }

  if (!formData.password || formData.password.length < 6) {
    errors.password = 'Salasanan tulee olla vähintään 6 merkkiä pitkä';
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Salasanat eivät täsmää';
  }

  return errors;
};

// Näytä lomakkeen virheet
const showFormErrors = (errors) => {
  Object.keys(errors).forEach(key => {
    const errorElement = document.getElementById(`${key}-error`);
    if (errorElement) {
      errorElement.textContent = errors[key];
    }
  });
};

// Tyhjennä virheviestit
const clearFormErrors = () => {
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(el => {
    el.textContent = '';
  });
};

// Käsittele rekisteröinti
const handleRegistration = async (event) => {
  event.preventDefault();

  const form = event.target;
  const formData = {
    username: form.username.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    confirmPassword: form['confirm-password'].value
  };

  clearFormErrors();

  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    showFormErrors(errors);
    return;
  }

  try {
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Rekisteröidään...';

    const response = await userAPI.register(formData);

    if (response.token) {
      auth.setToken(response.token, {
        username: formData.username,
        email: formData.email
      });

      window.location.href = '/index.html';
    }
  } catch (error) {
    console.error('Rekisteröintivirhe:', error);

    let errorMessage = 'Rekisteröinti epäonnistui';

    if (error.message.includes('username')) {
      errorMessage = 'Käyttäjänimi on jo käytössä';
      document.getElementById('username-error').textContent = errorMessage;
    } else if (error.message.includes('email')) {
      errorMessage = 'Sähköposti on jo käytössä';
      document.getElementById('email-error').textContent = errorMessage;
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Yhteys rekisteröintipalveluun epäonnistui. Tarkista internet-yhteytesi tai yritä myöhemmin.';
    }

    alert(errorMessage);
  } finally {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Rekisteröidy';
    }
  }
};

// Alusta rekisteröintisivu
const initRegisterPage = () => {
  const form = document.getElementById('registration-form');
  if (form) {
    form.addEventListener('submit', handleRegistration);
  }
};

// Tämä oli virheellinen: ) lopussa
document.addEventListener('DOMContentLoaded', initRegisterPage);
