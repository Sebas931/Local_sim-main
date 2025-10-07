import api from './api';

export const simsService = {
  getSims: async () => {
    // Traer SIMs que NO estén vendidas (tanto 'available' como 'recargado' están disponibles para venta)
    const response = await api.get('/api/sims');
    const data = response.data;
    const allSims = data.sims || data || [];

    console.log('📊 Total SIMs recibidas del backend:', allSims.length);

    // Filtrar SIMs que tengan plan asignado y NO estén vendidas
    const simsDisponibles = allSims.filter(sim => {
      const tienePlan = sim.plan_asignado && sim.plan_asignado !== '';
      const noVendida = sim.estado !== 'vendido' && sim.estado !== 'sold';
      return tienePlan && noVendida;
    });

    console.log('📊 SIMs disponibles con plan asignado (no vendidas):', simsDisponibles.length);
    console.log('📋 Estados encontrados:', [...new Set(allSims.map(s => s.estado))]);
    console.log('📋 SIMs con plan:', allSims.filter(s => s.plan_asignado).length);

    return simsDisponibles;
  },

  // Get all SIMs without status filter for management view
  getAllSims: async () => {
    const response = await api.get('/api/sims');
    const data = response.data;
    return data.sims || data || [];
  },

  getLotes: async () => {
    const response = await api.get('/api/sims/lotes');
    // Handle both direct array and wrapped object responses
    const data = response.data;
    return data.lotes || data || [];
  },

  getSimsByLote: async (loteId) => {
    const response = await api.get('/api/sims/por_lote', {
      params: { lote_id: loteId }
    });
    // Handle both direct array and wrapped object responses
    const data = response.data;
    return data.sims || data || [];
  },

  assignPlan: async (loteId, plan) => {
    const response = await api.post(`/api/sims/asignar_plan/${loteId}`, null, {
      params: { plan }
    });
    return response.data;
  },

  rechargeBalance: async (loteId, amount) => {
    const response = await api.post(`/api/sims/lotes/${loteId}/recharge`, { amount });
    return response.data;
  },

  uploadSims: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/sims/upload_lotes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/api/sims/dashboard/stats');
    return response.data;
  }
};