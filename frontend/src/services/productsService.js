import api from './api';

export const productsService = {
  getProducts: async () => {
    const response = await api.get('/api/products/siigo');

    // Process products the same way as in original App.js
    const data = response.data;
    const productosFormateados = (data.products || []).map(p => {
      // Extracción del precio
      const defaultPrice = 0;
      const priceObject = p?.prices?.[0]?.price_list?.[0];
      const unitPrice = priceObject?.value ?? defaultPrice;

      // Validación adicional para asegurar que sea número
      const finalPrice = typeof unitPrice === 'number' ? unitPrice : defaultPrice;

      // Taxes de los productos
      const iva = p?.taxes?.[0]?.percentage ?? 0;

      return {
        id: p.id,
        name: p.name || 'Producto sin nombre',
        code: p.code || 'Sin código',
        type: p.type,
        unit_price: finalPrice > 0 ? finalPrice : defaultPrice,
        iva: iva,
        taxes: p.taxes || [],
        tax_included: p.tax_included ?? true
      };
    });

    return productosFormateados;
  },

  syncProducts: async () => {
    const response = await api.post('/api/products/sync');
    return response.data;
  },

  searchProducts: async (searchTerm) => {
    const response = await api.get('/api/products', {
      params: { search: searchTerm }
    });
    return response.data.products;
  }
};