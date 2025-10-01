import api from './api';

export const turnosService = {
  getMisTurnos: async () => {
    const response = await api.get('/api/turnos/mis');
    // Extract turnos array from response, handle both formats
    const data = response.data;
    return data.turnos || data || [];
  },

  abrirTurno: async (inventarios = []) => {
    const requestData = { inventarios };
    const response = await api.post('/api/turnos/abrir', requestData);
    return response.data;
  },

  cerrarTurno: async (cierreData) => {
    const response = await api.post('/api/turnos/cerrar', cierreData, {
      timeout: 15000 // 15 segundos como en el original
    });
    return response.data;
  },

  cerrarTurnoConInventario: async (cierreData) => {
    const response = await api.post('/api/turnos/cerrar-con-inventario', cierreData, {
      timeout: 15000 // 15 segundos para permitir procesamiento
    });
    return response.data;
  },

  getResumenCierre: async () => {
    const response = await api.get('/api/turnos/por-turno');
    return response.data;
  },

  verificarTurno: async () => {
    const response = await api.get('/api/turnos/estado');
    return response.data;
  },

  getMovimientosTurno: async (turnoId) => {
    const response = await api.get(`/api/turnos/${turnoId}/movimientos`);
    // Extract movimientos array from response, handle both formats
    const data = response.data;
    return data.movimientos || data || [];
  },

  // Nuevas funciones para inventarios de SIMs
  getPlanesDisponibles: async () => {
    const response = await api.get('/api/turnos/planes-disponibles');
    return response.data.planes || [];
  },

  getInventariosTurno: async (turnoId) => {
    const response = await api.get(`/api/turnos/${turnoId}/inventarios`);
    return response.data.inventarios || [];
  },

  getInventariosDescuadres: async (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.dias) queryParams.append('dias', params.dias);
    if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
    if (params.user_id) queryParams.append('user_id', params.user_id);
    if (params.solo_con_descuadres !== undefined) {
      queryParams.append('solo_con_descuadres', params.solo_con_descuadres);
    }

    const response = await api.get(`/api/turnos/inventarios-descuadres?${queryParams}`);
    return response.data;
  }
};