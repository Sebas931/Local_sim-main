import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, DollarSign, Activity, AlertTriangle, Package,
  TrendingUp, Users, Clock, RotateCcw, ArrowUpDown,
  TrendingDown, Eye, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, Area, AreaChart
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { usersService } from '../../services/usersService';
import { useApp } from '../../context/AppContext';

const Dashboard = () => {
  const { showNotification } = useApp();

  // Estados principales
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Filtros de fecha - rango personalizable
  const [fechaDesde, setFechaDesde] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Últimos 30 días por defecto
    return date.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filtro de usuario
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  // Datos del dashboard
  const [statsGeneral, setStatsGeneral] = useState(null);
  const [inventarioData, setInventarioData] = useState(null);
  const [ventasData, setVentasData] = useState(null);
  const [cierresData, setCierresData] = useState(null);
  const [devolucionesData, setDevolucionesData] = useState(null);

  // Filtros
  const [soloDescuadres, setSoloDescuadres] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Carga inicial
  useEffect(() => {
    loadAllData();
  }, []);

  // Recargar cuando cambia de pestaña
  useEffect(() => {
    if (activeTab !== 'inventario') {
      loadTabData();
    }
  }, [activeTab]);

  // Si estoy en "cierres" y cambio el toggle de solo descuadres, recargo
  useEffect(() => {
    if (activeTab === 'cierres') {
      loadTabData();
    }
  }, [soloDescuadres]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [general, inventario, usuariosData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getInventarioMetrics(),
        usersService.getUsers()
      ]);

      setStatsGeneral(general);
      setInventarioData(inventario);
      setUsuarios(usuariosData || []);

      // Cargar datos de la pestaña activa con los filtros actuales
      if (activeTab !== 'general') {
        await loadTabData();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showNotification('Error al cargar datos del dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    if (!activeTab || activeTab === 'inventario') return;

    console.log('🔍 Cargando datos con filtros:', {
      activeTab,
      fechaDesde,
      fechaHasta,
      usuarioSeleccionado
    });

    setLoading(true);
    try {
      // Calcular días entre fechas
      const dias = Math.ceil((new Date(fechaHasta) - new Date(fechaDesde)) / (1000 * 60 * 60 * 24));

      switch (activeTab) {
        case 'general': {
          const general = await dashboardService.getStats(
          dias,
          fechaDesde,
          fechaHasta,
          usuarioSeleccionado || null
          );
          setStatsGeneral(general);
          break;
          }
        case 'ventas':
          console.log('📊 Cargando ventas...');
          const ventas = await dashboardService.getVentasIngresos({
            days: dias,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            user_id: usuarioSeleccionado || undefined
            });
          console.log('✅ Ventas cargadas:', ventas);
          setVentasData(ventas);
          break;
        case 'cierres':
          console.log('📊 Cargando cierres...');
          const cierres = await dashboardService.getCierresDescuadres({
            days: dias,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            user_id: usuarioSeleccionado || undefined,
            solo_con_diferencias: !!soloDescuadres
          });
          console.log('✅ Cierres cargados:', cierres);
          setCierresData(cierres);
          break;
        case 'devoluciones':
          console.log('📊 Cargando devoluciones...');
          const devoluciones = await dashboardService.getDevoluciones({
            days: dias,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            user_id: usuarioSeleccionado || undefined
          });
          console.log('✅ Devoluciones cargadas:', devoluciones);
          setDevolucionesData(devoluciones);
          break;
      }
      showNotification('Datos actualizados correctamente', 'success');
    } catch (error) {
      console.error(`❌ Error loading ${activeTab} data:`, error);
      showNotification(`Error al cargar datos de ${activeTab}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
      showNotification('Datos actualizados correctamente', 'success');
    } catch (error) {
      showNotification('Error al actualizar datos', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Funciones auxiliares
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-CO');
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('es-CO');
  };

  const getAlertColor = (count) => {
    if (count === 0) return 'text-green-600';
    if (count <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Colores para gráficos
  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#6366F1',
    secondary: '#8B5CF6'
  };

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];

  if (loading && !statsGeneral) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Control integral de operaciones Local SIM</p>
        </div>
        <Button
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center gap-2 bg-gradient-to-r from-localsim-teal-500 to-localsim-teal-600 hover:from-localsim-teal-600 hover:to-localsim-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs Principales */}
      {statsGeneral && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Ingresos Total</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {formatPrice(statsGeneral?.kpis?.total_general || 0)}
                  </h3>
                  <p className="text-white/70 text-xs mt-1">
                    Hoy: {formatPrice(statsGeneral?.kpis?.total_hoy || 0)}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500 to-emerald-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Ventas Total</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {statsGeneral?.kpis?.ventas_total || 0}
                  </h3>
                  <p className="text-white/70 text-xs mt-1">
                    Hoy: {statsGeneral?.kpis?.ventas_hoy || 0}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Activity className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-500 to-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">SIMs Disponibles</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {statsGeneral?.sims?.disponibles || 0}
                  </h3>
                  <p className="text-white/70 text-xs mt-1">
                    Total: {statsGeneral?.sims?.total || 0}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-500 to-orange-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Alertas Stock</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {inventarioData?.total_alertas || 0}
                  </h3>
                  <p className="text-white/70 text-xs mt-1">
                    Planes con bajo stock
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas críticas */}
      {inventarioData?.alertas_bajo_stock?.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100 border-b border-orange-200">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <div className="bg-orange-500 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventarioData.alertas_bajo_stock.map((alerta, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                  <div className="font-semibold text-orange-900">
                    {alerta.operador} - {alerta.plan}
                  </div>
                  <div className="text-sm text-orange-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Solo {alerta.disponibles} disponibles
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegación por tabs */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-blue-50 border-b">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-localsim-teal-500 to-localsim-teal-600 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-localsim-teal-700">Análisis Detallado</CardTitle>
            </div>

            {/* Filtros de fecha y usuario */}
            <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex-1 min-w-[180px]">
                <Label htmlFor="fecha-desde" className="text-sm font-semibold text-gray-700">
                  Fecha Desde
                </Label>
                <Input
                  id="fecha-desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  max={fechaHasta}
                  className="mt-1 border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
                />
              </div>

              <div className="flex-1 min-w-[180px]">
                <Label htmlFor="fecha-hasta" className="text-sm font-semibold text-gray-700">
                  Fecha Hasta
                </Label>
                <Input
                  id="fecha-hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  min={fechaDesde}
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1 border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
                />
              </div>

              {/* Filtro de Usuario */}
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="usuario" className="text-sm font-semibold text-gray-700">
                  Filtrar por Usuario
                </Label>
                <select
                  id="usuario"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-localsim-teal-500 focus:border-localsim-teal-500 mt-1"
                  value={usuarioSeleccionado}
                  onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {usuarios.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => loadTabData()}
                disabled={loading || !fechaDesde || !fechaHasta || new Date(fechaDesde) > new Date(fechaHasta)}
                className="bg-gradient-to-r from-localsim-teal-500 to-localsim-teal-600 hover:from-localsim-teal-600 hover:to-localsim-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                Aplicar Filtros
              </Button>
            </div>

            {/* Indicador de período seleccionado */}
            <div className="text-sm text-gray-700 bg-gradient-to-r from-localsim-teal-50 to-blue-50 px-4 py-3 rounded-lg border border-localsim-teal-200 flex flex-wrap items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-localsim-teal-600" />
                <strong className="text-localsim-teal-700">Período:</strong>
                <span>{(() => {
                  const [y1, m1, d1] = fechaDesde.split('-');
                  const [y2, m2, d2] = fechaHasta.split('-');
                  return `${d1}/${m1}/${y1} hasta ${d2}/${m2}/${y2}`;
                })()}</span>
                <span className="text-localsim-teal-600 font-medium">
                  ({Math.ceil((new Date(fechaHasta + 'T23:59:59') - new Date(fechaDesde + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1} días)
                </span>
              </div>
              {usuarioSeleccionado && usuarios.length > 0 && (
                <div className="border-l-2 border-localsim-teal-300 pl-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-localsim-teal-600" />
                  <strong className="text-localsim-teal-700">Usuario:</strong>
                  <span>{(() => {
                    const user = usuarios.find(u => String(u.id) === String(usuarioSeleccionado));
                    return user ? (user.full_name || user.username) : 'Cargando...';
                  })()}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'general', label: 'General', icon: BarChart3 },
              { key: 'inventario', label: 'Inventario', icon: Package },
              { key: 'ventas', label: 'Ventas', icon: TrendingUp },
              { key: 'cierres', label: 'Cierres', icon: Clock },
              { key: 'devoluciones', label: 'Devoluciones', icon: RotateCcw }
            ].map(tab => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-localsim-teal-500 to-localsim-teal-600 text-white shadow-lg hover:from-localsim-teal-600 hover:to-localsim-teal-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-localsim-teal-400'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Contenido dinámico según tab activo */}
          {renderTabContent()}
        </CardContent>
      </Card>
    </div>
  );

  // Renderizado específico por sección
  function renderTabContent() {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'inventario':
        return renderInventarioTab();
      case 'ventas':
        return renderVentasTab();
      case 'cierres':
        return renderCierresTab();
      case 'devoluciones':
        return renderDevolucionesTab();
      default:
        return renderGeneralTab();
    }
  }

  function renderGeneralTab() {
    if (!statsGeneral) return <div>Cargando datos generales...</div>;

    const chartData = (statsGeneral.series?.ventas_ultimos_14_dias ?? []).map(item => {
      // item.fecha viene como 'YYYY-MM-DD' desde el backend.
      // NO usar new Date() para evitar corrimiento por timezone.
      const [y, m, d] = String(item.fecha).split('-');
      return { fecha: `${d}/${m}/${y}`, total: item.total };
    });

    return (
      <div className="space-y-6">
        {/* Resumen rápido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-localsim-teal-500 to-localsim-teal-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Hoy</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(statsGeneral.kpis.total_hoy)}
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    {statsGeneral.kpis.ventas_hoy} ventas
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500 to-emerald-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Esta Semana</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(statsGeneral.kpis.total_semana)}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500 to-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Este Mes</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(statsGeneral.kpis.total_mes)}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de ventas últimos 14 días */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
              Ventas Últimos 14 Días
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPrice(value)} />
                  <Area type="monotone" dataKey="total" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Últimas ventas */}
        {statsGeneral.ultimas_ventas?.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Activity className="h-5 w-5" />
                Últimas Ventas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Método</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Total</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">ID Venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsGeneral.ultimas_ventas.map((sale, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="border border-gray-200 px-4 py-2">
                          {formatDateTime(sale.fecha)}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <span className="px-2 py-1 bg-localsim-teal-100 text-localsim-teal-700 rounded text-sm">
                            {sale.metodo_pago}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-2 font-semibold text-green-600">
                          {formatPrice(sale.monto)}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm text-gray-600">
                          {sale.sale_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderInventarioTab() {
    if (!inventarioData) return <div>Cargando datos de inventario...</div>;

    return (
      <div className="space-y-6">
        {/* Stock por operador */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Package className="h-5 w-5" />
              Stock por Operador
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inventarioData.stock_por_operador?.map((operador, idx) => (
                <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                  <CardContent className="p-4">
                    <h4 className="font-bold text-lg text-gray-800 mb-3">{operador.operador}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Total</span>
                        <span className="font-bold text-gray-800 text-lg">{operador.total}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Disponibles</span>
                        <span className="font-bold text-green-600 text-lg">{operador.disponibles}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Vendidas</span>
                        <span className="font-bold text-localsim-teal-600 text-lg">{operador.vendidas}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">% Vendido</span>
                        <span className="font-bold text-purple-600 text-lg">{operador.porcentaje_vendido}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock detallado por plan */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <BarChart3 className="h-5 w-5" />
              Stock Detallado por Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Operador</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Plan</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Disponibles</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Vendidas</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Defectuosas</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioData.stock_por_plan?.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 transition-colors ${item.bajo_stock ? 'bg-orange-50' : ''}`}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{item.operador}</td>
                      <td className="border border-gray-200 px-4 py-2">{item.plan}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center font-semibold">{item.total}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <span className={`font-bold ${item.bajo_stock ? 'text-orange-600' : 'text-green-600'}`}>
                          {item.disponibles}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center font-semibold text-localsim-teal-600">{item.vendidas}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center font-semibold text-red-600">{item.defectuosas}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {item.bajo_stock ? (
                          <span className="px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-medium flex items-center gap-1 justify-center">
                            <AlertTriangle className="h-3 w-3" />
                            Bajo
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderVentasTab() {
    if (loading || !ventasData) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-localsim-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando datos de ventas...</p>
          </div>
        </div>
      );
    }

    const chartData = ventasData.ventas_por_dia?.map(item => ({
      fecha: formatDate(item.fecha),
      ventas: item.total_ventas,
      ingresos: item.total_ingresos
    })) || [];

    const dias = Math.ceil((new Date(fechaHasta + 'T23:59:59') - new Date(fechaDesde + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1;

    return (
      <div className="space-y-6">
        {/* Resumen por método de pago */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <DollarSign className="h-5 w-5" />
              Resumen por Método de Pago ({dias} días)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ventasData.resumen_por_metodo?.map((metodo, idx) => (
                <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold capitalize text-gray-700 mb-2">{metodo.metodo}</h4>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatPrice(metodo.total_ingresos)}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {metodo.cantidad_ventas} ventas
                    </div>
                    <div className="text-xs text-gray-500">
                      Ticket prom: <span className="font-semibold">{formatPrice(metodo.ticket_promedio)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de ventas por día */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
              Evolución de Ventas e Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="ventas" fill={COLORS.info} name="Cantidad Ventas" />
                  <Line yAxisId="right" type="monotone" dataKey="ingresos" stroke={COLORS.success} name="Ingresos" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderCierresTab() {
    if (!cierresData) return <div>Cargando datos de cierres...</div>;

    return (
      <div className="space-y-6">
        {/* Filtros específicos de cierres */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloDescuadres}
              onChange={(e) => setSoloDescuadres(e.target.checked)}
              className="w-4 h-4 text-localsim-teal-600 rounded focus:ring-localsim-teal-500"
            />
            <span className="text-sm font-medium text-gray-700">Solo mostrar cierres con descuadres</span>
          </label>
        </div>

        {/* Resumen de diferencias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-red-500 to-red-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Diferencia Total Efectivo</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(cierresData.resumen_diferencias?.efectivo || 0)}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-500 to-amber-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Diferencia Total Datáfono</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(cierresData.resumen_diferencias?.datafono || 0)}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ArrowUpDown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500 to-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Diferencia Total Dólares</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(cierresData.resumen_diferencias?.dolares || 0)}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de cierres */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Clock className="h-5 w-5" />
              Cierres de Turno ({cierresData.total_cierres} total, {cierresData.cierres_con_diferencias} con diferencias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Fecha Cierre</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Usuario</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Efectivo</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Datáfono</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Dólares</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cierresData.cierres?.map((cierre, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 transition-colors ${cierre.tiene_diferencias ? 'bg-red-50' : ''}`}>
                      <td className="border border-gray-200 px-4 py-2">{formatDateTime(cierre.fecha_cierre)}</td>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{cierre.usuario}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <div className="text-sm space-y-1">
                          <div className="text-gray-600">Sistema: <span className="font-semibold">{formatPrice(cierre.totales_sistema.efectivo)}</span></div>
                          <div className="text-gray-600">Reportado: <span className="font-semibold">{formatPrice(cierre.totales_reportados.efectivo)}</span></div>
                          <div className={`font-bold ${cierre.diferencias.efectivo !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Diff: {formatPrice(cierre.diferencias.efectivo)}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <div className="text-sm space-y-1">
                          <div className="text-gray-600">Sistema: <span className="font-semibold">{formatPrice(cierre.totales_sistema.datafono)}</span></div>
                          <div className="text-gray-600">Reportado: <span className="font-semibold">{formatPrice(cierre.totales_reportados.datafono)}</span></div>
                          <div className={`font-bold ${cierre.diferencias.datafono !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Diff: {formatPrice(cierre.diferencias.datafono)}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <div className="text-sm space-y-1">
                          <div className="text-gray-600">Sistema: <span className="font-semibold">{formatPrice(cierre.totales_sistema.dolares)}</span></div>
                          <div className="text-gray-600">Reportado: <span className="font-semibold">{formatPrice(cierre.totales_reportados.dolares)}</span></div>
                          <div className={`font-bold ${cierre.diferencias.dolares !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Diff: {formatPrice(cierre.diferencias.dolares)}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {cierre.tiene_diferencias ? (
                          <span className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Descuadre
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderDevolucionesTab() {
    if (!devolucionesData) return <div>Cargando datos de devoluciones...</div>;

    return (
      <div className="space-y-6">
        {/* Resumen de devoluciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-localsim-teal-500 to-localsim-teal-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Intercambios</h3>
                  <div className="text-3xl font-bold text-white mt-1">
                    {devolucionesData.resumen?.intercambios || 0}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ArrowUpDown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-red-500 to-red-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Devoluciones Dinero</h3>
                  <div className="text-3xl font-bold text-white mt-1">
                    {devolucionesData.resumen?.devoluciones_dinero || 0}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <RotateCcw className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-500 to-amber-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white/80 text-sm">Monto Devuelto</h3>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatPrice(devolucionesData.resumen?.monto_total_devuelto || 0)}
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Motivos más comunes */}
        {devolucionesData.motivos_comunes?.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <AlertTriangle className="h-5 w-5" />
                Motivos Más Comunes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devolucionesData.motivos_comunes.map((motivo, idx) => (
                  <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                    <CardContent className="p-4">
                      <div className="font-semibold text-gray-800">{motivo.motivo}</div>
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {motivo.frecuencia} casos
                        </span>
                        <span className="text-gray-500">({motivo.tipo})</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evolución por días */}
        {devolucionesData.devoluciones_por_dia?.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <TrendingDown className="h-5 w-5" />
                Evolución de Devoluciones
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={devolucionesData.devoluciones_por_dia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="intercambios" fill={COLORS.info} name="Intercambios" />
                    <Bar dataKey="devoluciones_dinero" fill={COLORS.danger} name="Devoluciones $" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
};

export default Dashboard;