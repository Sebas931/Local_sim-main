import api from './api';

export const devolucionesService = {
  // Obtener SIMs vendidas que pueden ser devueltas
  getSimsVendidas: async (search = '') => {
    const response = await api.get('/api/devoluciones/sims-vendidas', {
      params: { search }
    });
    return response.data;
  },

  // Obtener SIMs disponibles para reemplazo
  getSimsDisponibles: async (search = '') => {
    const response = await api.get('/api/devoluciones/sims-disponibles', {
      params: { search }
    });
    return response.data;
  },

  // Crear una nueva devolución
  crearDevolucion: async (devolucionData) => {
    const response = await api.post('/api/devoluciones/', devolucionData);
    return response.data;
  },

  // Listar todas las devoluciones
  listarDevoluciones: async (skip = 0, limit = 100) => {
    const response = await api.get('/api/devoluciones/', {
      params: { skip, limit }
    });
    return response.data;
  },

  // Obtener detalles de una devolución
  obtenerDevolucion: async (devolucionId) => {
    const response = await api.get(`/api/devoluciones/${devolucionId}`);
    return response.data;
  },

  // Buscar ventas por ICCID
  buscarVentasPorIccid: async (iccid) => {
    const response = await api.get('/api/devoluciones/ventas-por-iccid', {
      params: { iccid }
    });
    return response.data;
  }
};