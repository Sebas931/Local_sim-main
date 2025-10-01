import api from './api';

export const salesService = {
  createSale: async (saleData) => {
    // Check payment method to determine endpoint
    if (saleData.payment_method === "electronic") {
      const response = await api.post('/api/sales/create_invoice', saleData);
      return response.data;
    } else {
      // Both cash and dollars go through the same endpoint
      // Backend will handle the different payment methods
      const response = await api.post('/api/sales/ventas', saleData);
      return response.data;
    }
  },

  getSales: async (dateFrom, dateTo) => {
    const response = await api.get('/api/sales/ventas', {
      params: { date_from: dateFrom, date_to: dateTo }
    });
    return response.data;
  },

  getSalesSummary: async (dateFrom, dateTo) => {
    const response = await api.get('/api/sales/resumen', {
      params: { date_from: dateFrom, date_to: dateTo }
    });
    return response.data;
  }
};