import api from './api';

export const esimsService = {
  /**
   * Obtiene todas las eSIMs con filtros opcionales
   */
  getEsims: async (filters = {}) => {
    const params = {};
    if (filters.estado) params.estado = filters.estado;
    if (filters.operador) params.operador = filters.operador;
    if (filters.search) params.search = filters.search;
    if (filters.skip) params.skip = filters.skip;
    if (filters.limit) params.limit = filters.limit;

    const response = await api.get('/api/esims', { params });
    return response.data;
  },

  /**
   * Obtiene estadísticas del inventario
   */
  getStats: async () => {
    const response = await api.get('/api/esims/stats');
    return response.data;
  },

  /**
   * Obtiene eSIMs próximas a vencer
   */
  getProximasVencer: async (dias = 3) => {
    const response = await api.get('/api/esims/proximas-vencer', {
      params: { dias }
    });
    return response.data;
  },

  /**
   * Obtiene una eSIM por ID
   */
  getEsimById: async (esimId) => {
    const response = await api.get(`/api/esims/${esimId}`);
    return response.data;
  },

  /**
   * Crea una nueva eSIM
   */
  createEsim: async (esimData) => {
    const response = await api.post('/api/esims', esimData);
    return response.data;
  },

  /**
   * Crea múltiples eSIMs
   */
  createEsimsBulk: async (esimsArray) => {
    const response = await api.post('/api/esims/bulk', {
      esims: esimsArray
    });
    return response.data;
  },

  /**
   * Marca una eSIM como vendida
   */
  venderEsim: async (esimId, saleId, planDias, planNombre) => {
    const response = await api.post('/api/esims/venta', {
      esim_id: esimId,
      sale_id: saleId,
      plan_dias: planDias,
      plan_nombre: planNombre
    });
    return response.data;
  },

  /**
   * Regenera el QR de una eSIM
   */
  regenerarQr: async (esimId, qrData) => {
    const response = await api.post(`/api/esims/${esimId}/regenerar`, {
      esim_id: esimId,
      qr_data: qrData
    });
    return response.data;
  },

  /**
   * Regenera múltiples QRs
   */
  regenerarQrsBulk: async (regeneraciones) => {
    const response = await api.post('/api/esims/regenerar-bulk', {
      regeneraciones
    });
    return response.data;
  },

  /**
   * Extrae QRs de un archivo PDF
   */
  extractQrsFromPdf: async (pdfFile) => {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const response = await api.post('/api/esims/extract-qrs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Actualiza una eSIM
   */
  updateEsim: async (esimId, updateData) => {
    const response = await api.put(`/api/esims/${esimId}`, updateData);
    return response.data;
  },

  /**
   * Elimina una eSIM (marca como inactiva)
   */
  deleteEsim: async (esimId) => {
    const response = await api.delete(`/api/esims/${esimId}`);
    return response.data;
  },

  /**
   * Procesa vencimientos automáticamente (manual trigger)
   */
  procesarVencimientos: async () => {
    const response = await api.post('/api/esims/procesar-vencimientos');
    return response.data;
  }
};

export default esimsService;
