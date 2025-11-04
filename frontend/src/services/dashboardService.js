// dashboardService.js
import api from './api';

// Utilidad para limpiar params (evita enviar undefined/null)
const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );

export const dashboardService = {
  // KPIs generales
  getStats: async (days = 30, fechaDesde = null, fechaHasta = null, userId = null) => {
    const params = {};
    if (fechaDesde && fechaHasta) {
      params.fecha_desde = fechaDesde;
      params.fecha_hasta = fechaHasta;
    } else if (days != null) {
      params.days = days;
    }
    if (userId) params.user_id = userId;
    const response = await api.get('/api/dashboard/stats', { params });
    return response.data;
  },

  // Inventario + alertas
  async getInventarioMetrics() {
    const { data } = await api.get('/api/dashboard/inventario');
    return data;
  },

  // Ventas e ingresos
  // Espera: { days, fecha_desde, fecha_hasta, user_id }
  async getVentasIngresos({
    days = 30,
    fecha_desde = null,
    fecha_hasta = null,
    user_id = undefined,
  } = {}) {
    const params =
      fecha_desde && fecha_hasta
        ? { fecha_desde, fecha_hasta, user_id }
        : { days, user_id };

    const { data } = await api.get('/api/dashboard/ventas-ingresos', {
      params: clean(params),
    });
    return data;
  },

  // Cierres / descuadres
  // Espera: { days, fecha_desde, fecha_hasta, user_id, solo_con_diferencias }
  async getCierresDescuadres({
    days = 30,
    fecha_desde = null,
    fecha_hasta = null,
    user_id = undefined,
    solo_con_diferencias = false,
  } = {}) {
    const base = { solo_con_diferencias, user_id };

    const params =
      fecha_desde && fecha_hasta
        ? { ...base, fecha_desde, fecha_hasta }
        : { ...base, days };

    const { data } = await api.get('/api/dashboard/cierres-descuadres', {
      params: clean(params),
    });
    return data;
  },

  // Devoluciones
  // Espera: { days, fecha_desde, fecha_hasta, user_id }
  async getDevoluciones({
    days = 30,
    fecha_desde = null,
    fecha_hasta = null,
    user_id = undefined,
  } = {}) {
    const params =
      fecha_desde && fecha_hasta
        ? { fecha_desde, fecha_hasta, user_id }
        : { days, user_id };

    const { data } = await api.get('/api/dashboard/devoluciones', {
      params: clean(params),
    });
    return data;
  },

  // Trazabilidad de SIMs
  // Espera: { iccid, numero_linea, lote_id }
  async getTrazabilidad({
    iccid = null,
    numero_linea = null,
    lote_id = null,
  } = {}) {
    const { data } = await api.get('/api/dashboard/trazabilidad', {
      params: clean({ iccid, numero_linea, lote_id }),
    });
    return data;
  },

  // Legacy (por si aún lo usas en otra vista)
  async getAnalytics({ date_from, date_to, only_diffs = false } = {}) {
    const { data } = await api.get('/api/sims/dashboard/analytics', {
      params: clean({
        date_from,
        date_to,
        only_diffs,
      }),
    });
    return data;
  },
};
