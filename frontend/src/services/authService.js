import api from './api';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const authService = {
  login: async (username, password) => {
    // Use the same format as FastAPI OAuth2PasswordRequestForm expects
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/api/auth/login', formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    return response.data;
  },

  verifyToken: async (token) => {
    // Get user info using the /me endpoint
    const response = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  }
};