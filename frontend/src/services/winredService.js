import api from './api';

export const winredService = {
  getPackages: async (productParentId = 1) => {
    const response = await api.get('/api/winred/packages', {
      params: {
        product_parent_id: productParentId,
        _: Date.now()
      }
    });

    const data = response.data;
    return data?.data?.packages || data?.packages || [];
  },

  getBalance: async () => {
    const response = await api.get('/api/winred/balance');
    const data = response.data;
    return data?.data || data || { balance: null, discount: null };
  },

  topupIndividual: async (params) => {
    const response = await api.post('/api/winred/topup', {
      product_id: params.product_id,
      amount: params.amount || 0,
      subscriber: params.subscriber,
      sell_from: params.sell_from || "S"
    });
    return response.data;
  },

  topupLote: async (params) => {
    const response = await api.post('/api/winred/topup_lote', {
      lote_id: params.lote_id,
      product_id: params.product_id,
      amount: params.amount || 0,
      sell_from: params.sell_from || "S"
    });
    return response.data;
  }
};