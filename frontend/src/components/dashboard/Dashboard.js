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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Control integral de operaciones Local SIM</p>
        </div>
        <Button
          onClick={refreshData}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs Principales */}
      {statsGeneral && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <p className="text-blue-100">Ingresos Total</p>
                <p className="text-2xl font-bold">
                  {formatPrice(statsGeneral?.kpis?.total_general || 0)}
                </p>
                <p className="text-sm text-blue-100">
                  Hoy: {formatPrice(statsGeneral?.kpis?.total_hoy || 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <p className="text-green-100">Ventas Total</p>
                <p className="text-2xl font-bold">
                  {statsGeneral?.kpis?.ventas_total || 0}
                </p>
                <p className="text-sm text-green-100">
                  Hoy: {statsGeneral?.kpis?.ventas_hoy || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Package className="h-8 w-8" />
              </div>
              <div>
                <p className="text-purple-100">SIMs Disponibles</p>
                <p className="text-2xl font-bold">
                  {statsGeneral?.sims?.disponibles || 0}
                </p>
                <p className="text-sm text-purple-100">
                  Total: {statsGeneral?.sims?.total || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <p className="text-orange-100">Alertas Stock</p>
                <p className={`text-2xl font-bold ${getAlertColor(inventarioData?.total_alertas || 0)}`}>
                  {inventarioData?.total_alertas || 0}
                </p>
                <p className="text-sm text-orange-100">
                  Planes con bajo stock
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Alertas críticas */}
      {inventarioData?.alertas_bajo_stock?.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ⚠️ Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventarioData.alertas_bajo_stock.map((alerta, idx) => (
                <div key={idx} className="p-3 bg-white rounded border border-orange-200">
                  <div className="font-medium text-orange-900">
                    {alerta.operador} - {alerta.plan}
                  </div>
                  <div className="text-sm text-orange-700">
                    Solo {alerta.disponibles} disponibles
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegación por tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>Análisis Detallado</CardTitle>
            </div>

            {/* Filtros de fecha y usuario */}
            <div className="flex flex-wrap items-end gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex-1 min-w-[180px]">
                <Label htmlFor="fecha-desde" className="text-sm font-medium text-gray-700">
                  Fecha Desde
                </Label>
                <Input
                  id="fecha-desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  max={fechaHasta}
                  className="mt-1"
                />
              </div>

              <div className="flex-1 min-w-[180px]">
                <Label htmlFor="fecha-hasta" className="text-sm font-medium text-gray-700">
                  Fecha Hasta
                </Label>
                <Input
                  id="fecha-hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  min={fechaDesde}
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>

              {/* Filtro de Usuario */}
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="usuario" className="text-sm font-medium text-gray-700">
                  Filtrar por Usuario
                </Label>
                <select
                  id="usuario"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                Aplicar Filtros
              </Button>
            </div>

            {/* Indicador de período seleccionado */}
            <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded border border-blue-200 flex flex-wrap items-center gap-4">
              <div>
                <strong>Período:</strong> {(() => {
                  const [y1, m1, d1] = fechaDesde.split('-');
                  const [y2, m2, d2] = fechaHasta.split('-');
                  return `${d1}/${m1}/${y1} hasta ${d2}/${m2}/${y2}`;
                })()}
                ({Math.ceil((new Date(fechaHasta + 'T23:59:59') - new Date(fechaDesde + 'T00:00:00')) / (1000 * 60 * 60 * 24)) + 1} días)
              </div>
              {usuarioSeleccionado && usuarios.length > 0 && (
                <div className="border-l border-blue-300 pl-4">
                  <strong>Usuario:</strong> {(() => {
                    const user = usuarios.find(u => String(u.id) === String(usuarioSeleccionado));
                    return user ? (user.full_name || user.username) : 'Cargando...';
                  })()}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'general', label: 'General', icon: BarChart3 },
              { key: 'inventario', label: 'Inventario', icon: Package },
              { key: 'ventas', label: 'Ventas', icon: TrendingUp },
              { key: 'cierres', label: 'Cierres', icon: Clock },
              { key: 'devoluciones', label: 'Devoluciones', icon: RotateCcw }
            ].map(tab => {
              const IconComponent = tab.icon;
              return (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2"
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
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Hoy</h3>
            <div className="text-2xl font-bold text-blue-700">
              {formatPrice(statsGeneral.kpis.total_hoy)}
            </div>
            <div className="text-sm text-blue-600">
              {statsGeneral.kpis.ventas_hoy} ventas
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900">Esta Semana</h3>
            <div className="text-2xl font-bold text-green-700">
              {formatPrice(statsGeneral.kpis.total_semana)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900">Este Mes</h3>
            <div className="text-2xl font-bold text-purple-700">
              {formatPrice(statsGeneral.kpis.total_mes)}
            </div>
          </div>
        </div>

        {/* Gráfico de ventas últimos 14 días */}
        <div className="h-64">
          <h3 className="text-lg font-medium mb-4">Ventas Últimos 14 Días</h3>
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

        {/* Últimas ventas */}
        {statsGeneral.ultimas_ventas?.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Últimas Ventas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1 text-left">Fecha</th>
                    <th className="border px-2 py-1 text-left">Método</th>
                    <th className="border px-2 py-1 text-left">Total</th>
                    <th className="border px-2 py-1 text-left">ID Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {statsGeneral.ultimas_ventas.map((sale, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">
                        {formatDateTime(sale.fecha)}
                      </td>
                      <td className="border px-2 py-1">{sale.metodo_pago}</td>
                      <td className="border px-2 py-1">{formatPrice(sale.monto)}</td>
                      <td className="border px-2 py-1 font-mono text-sm">{sale.sale_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderInventarioTab() {
    if (!inventarioData) return <div>Cargando datos de inventario...</div>;

    return (
      <div className="space-y-6">
        {/* Stock por operador */}
        <div>
          <h3 className="text-lg font-medium mb-4">Stock por Operador</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inventarioData.stock_por_operador?.map((operador, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
                <h4 className="font-medium text-lg">{operador.operador}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>Total: <b>{operador.total}</b></div>
                  <div>Disponibles: <b className="text-green-600">{operador.disponibles}</b></div>
                  <div>Vendidas: <b className="text-blue-600">{operador.vendidas}</b></div>
                  <div>% Vendido: <b>{operador.porcentaje_vendido}%</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock detallado por plan */}
        <div>
          <h3 className="text-lg font-medium mb-4">Stock Detallado por Plan</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-left">Operador</th>
                  <th className="border px-2 py-1 text-left">Plan</th>
                  <th className="border px-2 py-1 text-center">Total</th>
                  <th className="border px-2 py-1 text-center">Disponibles</th>
                  <th className="border px-2 py-1 text-center">Vendidas</th>
                  <th className="border px-2 py-1 text-center">Defectuosas</th>
                  <th className="border px-2 py-1 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {inventarioData.stock_por_plan?.map((item, idx) => (
                  <tr key={idx} className={item.bajo_stock ? 'bg-orange-50' : ''}>
                    <td className="border px-2 py-1">{item.operador}</td>
                    <td className="border px-2 py-1">{item.plan}</td>
                    <td className="border px-2 py-1 text-center">{item.total}</td>
                    <td className="border px-2 py-1 text-center">
                      <span className={item.bajo_stock ? 'text-orange-600 font-bold' : 'text-green-600'}>
                        {item.disponibles}
                      </span>
                    </td>
                    <td className="border px-2 py-1 text-center">{item.vendidas}</td>
                    <td className="border px-2 py-1 text-center">{item.defectuosas}</td>
                    <td className="border px-2 py-1 text-center">
                      {item.bajo_stock ? (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                          ⚠️ Bajo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          ✅ OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderVentasTab() {
    if (loading || !ventasData) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
        <div>
          <h3 className="text-lg font-medium mb-4">Resumen por Método de Pago ({dias} días)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ventasData.resumen_por_metodo?.map((metodo, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
                <h4 className="font-medium capitalize">{metodo.metodo}</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(metodo.total_ingresos)}
                </div>
                <div className="text-sm text-gray-600">
                  {metodo.cantidad_ventas} ventas
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Ticket prom: {formatPrice(metodo.ticket_promedio)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de ventas por día */}
        <div className="h-64">
          <h3 className="text-lg font-medium mb-4">Evolución de Ventas e Ingresos</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="ventas" fill={COLORS.info} name="Cantidad Ventas" />
              <Line yAxisId="right" type="monotone" dataKey="ingresos" stroke={COLORS.success} name="Ingresos" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  function renderCierresTab() {
    if (!cierresData) return <div>Cargando datos de cierres...</div>;

    return (
      <div className="space-y-6">
        {/* Filtros específicos de cierres */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={soloDescuadres}
              onChange={(e) => setSoloDescuadres(e.target.checked)}
            />
            Solo mostrar cierres con descuadres
          </label>
        </div>

        {/* Resumen de diferencias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-medium text-red-900">Diferencia Total Efectivo</h3>
            <div className="text-2xl font-bold text-red-700">
              {formatPrice(cierresData.resumen_diferencias?.efectivo || 0)}
            </div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-900">Diferencia Total Datáfono</h3>
            <div className="text-2xl font-bold text-yellow-700">
              {formatPrice(cierresData.resumen_diferencias?.datafono || 0)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium text-purple-900">Diferencia Total Dólares</h3>
            <div className="text-2xl font-bold text-purple-700">
              {formatPrice(cierresData.resumen_diferencias?.dolares || 0)}
            </div>
          </div>
        </div>

        {/* Tabla de cierres */}
        <div>
          <h3 className="text-lg font-medium mb-4">
            Cierres de Turno ({cierresData.total_cierres} total, {cierresData.cierres_con_diferencias} con diferencias)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-left">Fecha Cierre</th>
                  <th className="border px-2 py-1 text-left">Usuario</th>
                  <th className="border px-2 py-1 text-center">Efectivo</th>
                  <th className="border px-2 py-1 text-center">Datáfono</th>
                  <th className="border px-2 py-1 text-center">Dólares</th>
                  <th className="border px-2 py-1 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cierresData.cierres?.map((cierre, idx) => (
                  <tr key={idx} className={cierre.tiene_diferencias ? 'bg-red-50' : ''}>
                    <td className="border px-2 py-1">{formatDateTime(cierre.fecha_cierre)}</td>
                    <td className="border px-2 py-1">{cierre.usuario}</td>
                    <td className="border px-2 py-1 text-center">
                      <div className="text-sm">
                        <div>Sistema: {formatPrice(cierre.totales_sistema.efectivo)}</div>
                        <div>Reportado: {formatPrice(cierre.totales_reportados.efectivo)}</div>
                        <div className={`font-bold ${cierre.diferencias.efectivo !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Diff: {formatPrice(cierre.diferencias.efectivo)}
                        </div>
                      </div>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <div className="text-sm">
                        <div>Sistema: {formatPrice(cierre.totales_sistema.datafono)}</div>
                        <div>Reportado: {formatPrice(cierre.totales_reportados.datafono)}</div>
                        <div className={`font-bold ${cierre.diferencias.datafono !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Diff: {formatPrice(cierre.diferencias.datafono)}
                        </div>
                      </div>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <div className="text-sm">
                        <div>Sistema: {formatPrice(cierre.totales_sistema.dolares)}</div>
                        <div>Reportado: {formatPrice(cierre.totales_reportados.dolares)}</div>
                        <div className={`font-bold ${cierre.diferencias.dolares !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Diff: {formatPrice(cierre.diferencias.dolares)}
                        </div>
                      </div>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {cierre.tiene_diferencias ? (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          ⚠️ Descuadre
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          ✅ OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderDevolucionesTab() {
    if (!devolucionesData) return <div>Cargando datos de devoluciones...</div>;

    return (
      <div className="space-y-6">
        {/* Resumen de devoluciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Intercambios</h3>
            <div className="text-2xl font-bold text-blue-700">
              {devolucionesData.resumen?.intercambios || 0}
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-medium text-red-900">Devoluciones Dinero</h3>
            <div className="text-2xl font-bold text-red-700">
              {devolucionesData.resumen?.devoluciones_dinero || 0}
            </div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-900">Monto Devuelto</h3>
            <div className="text-2xl font-bold text-yellow-700">
              {formatPrice(devolucionesData.resumen?.monto_total_devuelto || 0)}
            </div>
          </div>
        </div>

        {/* Motivos más comunes */}
        {devolucionesData.motivos_comunes?.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Motivos Más Comunes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devolucionesData.motivos_comunes.map((motivo, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="font-medium">{motivo.motivo}</div>
                  <div className="text-sm text-gray-600">
                    {motivo.frecuencia} casos ({motivo.tipo})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evolución por días */}
        {devolucionesData.devoluciones_por_dia?.length > 0 && (
          <div className="h-64">
            <h3 className="text-lg font-medium mb-4">Evolución de Devoluciones</h3>
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
        )}
      </div>
    );
  }
};

export default Dashboard;