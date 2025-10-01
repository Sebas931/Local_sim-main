import api from './api';

export const usersService = {
  getUsers: async () => {
    const response = await api.get('/api/users/');
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/api/users/', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  },

  changePassword: async (userId, newPassword) => {
    const response = await api.put(`/api/users/${userId}/password`, {
      new_password: newPassword
    });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/users/${userId}`);
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get('/api/roles/');
    return response.data;
  }
};