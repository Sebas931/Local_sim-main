import React, { createContext, useContext, useState, useEffect } from 'react';
import { turnosService } from '../services/turnosService';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Global application state
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState(null);

  // Check turno status on app start
  useEffect(() => {
    const checkTurno = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const turnoData = await turnosService.verificarTurno();
          setTurnoAbierto(turnoData);
        }
      } catch (error) {
        // If no turno or error, keep as null
        setTurnoAbierto(null);
      }
    };

    checkTurno();
  }, []);

  // Notification system
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, timestamp: Date.now() });
    setTimeout(() => setNotification(''), 5000);
  };

  const value = {
    // Global state
    notification,
    loading,
    turnoAbierto,

    // Global actions
    setNotification,
    setLoading,
    setTurnoAbierto,
    showNotification
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};