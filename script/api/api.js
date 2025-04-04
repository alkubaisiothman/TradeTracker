// /script/api/api.js
export const API_BASE_URL = 'http://localhost:5000';

const handleResponse = async (response) => {
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || error.message || `API request failed with status ${response.status}`);
    } catch (e) {
      throw new Error(`API request failed with status ${response.status}`);
    }
  }
  return response.json();
};

const getHeaders = (requireAuth) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (requireAuth) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Kirjautuminen vaaditaan');
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  get: async (endpoint, requireAuth = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: getHeaders(requireAuth),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  },

  post: async (endpoint, data, requireAuth = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(requireAuth),
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  },

  put: async (endpoint, data, requireAuth = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(requireAuth),
        body: JSON.stringify(data),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  },

  delete: async (endpoint, requireAuth = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(requireAuth),
        credentials: 'include'
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }
};

// Osakkeiden API-toiminnot
export const stockAPI = {
  getQuote: (symbol) => api.get(`/api/stock-data?symbol=${symbol}`),
  getHistoricalData: (symbol, period) => 
    api.get(`/api/historical-data?symbol=${symbol}&period=${period}`)
};

// Käyttäjän API-toiminnot (paranneltu versio)
export const userAPI = {
  register: async (userData) => {
    try {
      // Tarkista salasanat ennen API-kutsua
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Salasanat eivät täsmää');
      }

      const response = await api.post('/api/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password
      }, false);

      return response;
    } catch (error) {
      console.error('Rekisteröintivirhe:', error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      // Lisää vahvistus salasanalle
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Salasanat eivät täsmää');
      }
      
      const response = await api.post('/api/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password
      }, false);
      
      // Tallenna token jos rekisteröinti onnistui
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Rekisteröintivirhe:', error);
      throw error;
    }
  },

  getProfile: () => api.get('/api/profile'),
  updateProfile: (data) => api.put('/api/profile', data),
  updatePassword: (data) => api.put('/api/profile/password', data),
  deleteAccount: () => api.delete('/api/profile')
};

// Hälytysten API-toiminnot
export const alertAPI = {
  getAlerts: () => api.get('/api/alerts'),
  createAlert: (alertData) => api.post('/api/alerts', alertData),
  deleteAlert: (id) => api.delete(`/api/alerts/${id}`)
};