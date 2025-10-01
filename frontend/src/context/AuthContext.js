import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app start
    const token = localStorage.getItem('token');
    if (token) {
      // For now, if there's a token, assume user is logged in
      // In a real app, you'd want to verify the token
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData.user) {
        setUser(userData.user);
        setModules(userData.modules || []);
      }
    }
    setLoading(false);
  }, []);

  const verifyAndLoadUser = async (token) => {
    try {
      const userData = await authService.verifyToken(token);
      setUser(userData.user);
      setModules(userData.modules || []);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      console.error('Token verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      localStorage.setItem('token', response.access_token);

      // Now get user details from /me endpoint
      try {
        const userInfo = await authService.verifyToken(response.access_token);
        const userData = {
          user: {
            username: userInfo.username,
            full_name: userInfo.full_name,
            email: userInfo.email,
            role: userInfo.role
          },
          modules: (userInfo.modules || []).map(name => ({ name }))
        };

        localStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData.user);
        setModules(userData.modules);
      } catch (meError) {
        console.error('Failed to get user info:', meError);
        // Fallback if /me endpoint fails
        const userData = {
          user: { username, full_name: username },
          modules: [
            { name: 'Dashboard' },
            { name: 'Punto de Venta' },
            { name: 'SIMs' },
            { name: 'Productos' },
            { name: 'Usuarios' }
          ]
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData.user);
        setModules(userData.modules);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.detail || error.message || 'Usuario o contraseña incorrectos' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setUser(null);
    setModules([]);
  };

  const hasModule = (moduleName) => {
    return modules.some(module => module.name === moduleName);
  };

  const value = {
    user,
    modules,
    loading,
    login,
    logout,
    hasModule
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};