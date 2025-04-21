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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(requireAuth),
      credentials: 'include'
    });
    return await handleResponse(response);
  },

  post: async (endpoint, data, requireAuth = false) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(requireAuth),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return await handleResponse(response);
  },

  put: async (endpoint, data, requireAuth = true) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(requireAuth),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return await handleResponse(response);
  },

  delete: async (endpoint, requireAuth = true) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(requireAuth),
      credentials: 'include'
    });
    return await handleResponse(response);
  }
};

export const stockAPI = {
  getQuote: async (symbol) => {
    const response = await api.get(`/api/stock-data?symbol=${symbol}`, false);
    return response.data;
  },

  getHistoricalData: async (symbol, period) => {
    const response = await api.get(`/api/historical-data?symbol=${symbol}&period=${period}`, false);
    return response.data;
  }
};

export const userAPI = {
  register: (userData) => api.post('/api/register', userData),
  login: (credentials) => api.post('/api/login', credentials),
  getProfile: () => api.get('/api/profile'),
  updateProfile: (data) => api.put('/api/profile', data),
  updatePassword: (data) => api.put('/api/profile/password', data),
  deleteAccount: () => api.delete('/api/profile')
};

export const alertAPI = {
  getAlerts: () => api.get('/api/alerts'),
  createAlert: (alertData) => api.post('/api/alerts', alertData),
  deleteAlert: (id) => api.delete(`/api/alerts/${id}`)
};