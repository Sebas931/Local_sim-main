import React, { useState, useEffect } from 'react';
import {
  Upload,
  Plus,
  Package,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { simsService } from '../../services/simsService';
import { useApp } from '../../context/AppContext';

const SimsManagement = () => {
  const { showNotification, loading, setLoading } = useApp();

  // SIMs and lotes state
  const [lotes, setLotes] = useState([]);
  const [simsPorLote, setSimsPorLote] = useState({});
  const [lotesExpandido, setLotesExpandido] = useState({});
  const [dashboardStats, setDashboardStats] = useState(null);

  // File upload
  const [uploadFile, setUploadFile] = useState(null);

  // Filtro de búsqueda
  const [filtroNumero, setFiltroNumero] = useState('');

  // Form state for creating individual SIM
  const [simForm, setSimForm] = useState({
    loteId: '',
    operador: 'Claro',
    numeroLinea: '',
    iccid: ''
  });

  // Helper para traducir estados
  const traducirEstado = (estado) => {
    const traducciones = {
      'available': 'Disponible',
      'recargado': 'Recargado',
      'vendido': 'Vendido',
      'sold': 'Vendido'
    };
    return traducciones[estado?.toLowerCase()] || estado || '—';
  };

  // Helper para obtener color del estado
  const getEstadoColor = (estado) => {
    const colors = {
      'available': 'text-green-600 bg-green-50',
      'recargado': 'text-blue-600 bg-blue-50',
      'vendido': 'text-red-600 bg-red-50',
      'sold': 'text-red-600 bg-red-50'
    };
    return colors[estado?.toLowerCase()] || 'text-gray-600 bg-gray-50';
  };

  useEffect(() => {
    fetchLotes();
    fetchDashboardStats();
  }, []);

  // Cargar SIMs de todos los lotes cuando hay filtro activo
  useEffect(() => {
    const cargarSimsParaFiltro = async () => {
      if (filtroNumero && filtroNumero.length >= 3) {
        // Cargar SIMs de todos los lotes para filtrar
        for (const lote of lotes) {
          if (!simsPorLote[lote.lote_id]) {
            await fetchSimsPorLote(lote.lote_id);
          }
        }
      }
    };
    cargarSimsParaFiltro();
  }, [filtroNumero, lotes]);

  const fetchDashboardStats = async () => {
    try {
      const data = await simsService.getDashboardStats();
      setDashboardStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats(null);
    }
  };

  const fetchLotes = async () => {
    try {
      const data = await simsService.getLotes();
      setLotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching lotes:', error);
      showNotification('Error al cargar lotes', 'error');
      setLotes([]);
    }
  };

  const fetchSimsPorLote = async (loteId) => {
    if (simsPorLote[loteId]) return; // Already loaded

    try {
      const data = await simsService.getSimsByLote(loteId);
      setSimsPorLote(prev => ({ ...prev, [loteId]: Array.isArray(data) ? data : [] }));
    } catch (error) {
      console.error('Error fetching SIMs por lote:', error);
      showNotification('Error al cargar SIMs del lote', 'error');
      setSimsPorLote(prev => ({ ...prev, [loteId]: [] }));
    }
  };

  const toggleLoteExpandido = async (loteId) => {
    const isExpanded = lotesExpandido[loteId];
    setLotesExpandido(prev => ({ ...prev, [loteId]: !isExpanded }));

    if (!isExpanded && !simsPorLote[loteId]) {
      await fetchSimsPorLote(loteId);
    }
  };

  // Función para verificar si un lote tiene SIMs que coinciden con el filtro
  const loteContieneSimsFiltradas = (loteId) => {
    if (!filtroNumero || filtroNumero.length < 3) return true;

    const sims = simsPorLote[loteId] || [];
    return sims.some(sim =>
      sim.numero_linea?.toLowerCase().includes(filtroNumero.toLowerCase()) ||
      sim.iccid?.toLowerCase().includes(filtroNumero.toLowerCase())
    );
  };

  // Determinar si un lote debe estar expandido automáticamente por el filtro
  const debeEstarExpandido = (loteId) => {
    if (filtroNumero && filtroNumero.length >= 3) {
      return loteContieneSimsFiltradas(loteId);
    }
    return lotesExpandido[loteId];
  };

  const uploadSims = async () => {
    if (!uploadFile) {
      showNotification('Selecciona un archivo', 'error');
      return;
    }

    try {
      setLoading(true);
      await simsService.uploadSims(uploadFile);
      showNotification('SIMs cargadas exitosamente', 'success');

      // Refresh data
      await fetchLotes();
      await fetchDashboardStats();

      // Clear file
      setUploadFile(null);
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Error al cargar archivo';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSim = async (e) => {
    e.preventDefault();

    // Validations
    if (!simForm.loteId || !simForm.operador || !simForm.numeroLinea || !simForm.iccid) {
      showNotification('Todos los campos son obligatorios', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await simsService.createSimComplete(
        simForm.loteId,
        simForm.operador,
        simForm.numeroLinea,
        simForm.iccid
      );

      showNotification(result.message || 'SIM creada exitosamente', 'success');

      // Refresh data
      await fetchLotes();
      await fetchDashboardStats();

      // Clear form
      setSimForm({
        loteId: '',
        operador: 'Claro',
        numeroLinea: '',
        iccid: ''
      });

    } catch (error) {
      const msg = error?.response?.data?.detail || 'Error al crear SIM';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 bg-clip-text text-transparent">
          Gestión de SIMs
        </h1>
        <p className="text-gray-600 mt-1">Administre el inventario de tarjetas SIM</p>
      </div>

      {/* KPIs de Estadísticas */}
      {dashboardStats?.sims && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total SIMs</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {dashboardStats.sims.total}
                  </h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500 to-emerald-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Disponibles</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {dashboardStats.sims.available}
                  </h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-red-500 to-red-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Vendidas</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {dashboardStats.sims.sold}
                  </h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cargar SIMs */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-blue-50 border-b">
            <CardTitle className="flex items-center gap-2 text-localsim-teal-700">
              <div className="bg-gradient-to-br from-localsim-teal-500 to-localsim-teal-600 p-2 rounded-lg">
                <Upload className="h-5 w-5 text-white" />
              </div>
              Cargar Lotes de SIMs
            </CardTitle>
            <CardDescription>
              Suba un archivo Excel con columnas: lote_id, numero_linea, iccid, operador
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-localsim-teal-400 transition-colors">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="cursor-pointer"
              />
              {uploadFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Archivo seleccionado: <span className="font-semibold">{uploadFile.name}</span>
                </p>
              )}
            </div>
            <Button
              onClick={uploadSims}
              disabled={loading || !uploadFile}
              className="w-full bg-gradient-to-r from-localsim-teal-500 to-localsim-teal-600 hover:from-localsim-teal-600 hover:to-localsim-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? 'Subiendo...' : 'Subir SIMs'}
            </Button>
          </CardContent>
        </Card>

        {/* Crear SIM Individual */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              Crear SIM Individual
            </CardTitle>
            <CardDescription>
              Agregue una SIM individual al inventario
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateSim} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loteId" className="text-sm font-semibold text-gray-700">Lote ID</Label>
                  <Input
                    id="loteId"
                    type="text"
                    placeholder="Ej: LOTE001"
                    value={simForm.loteId}
                    onChange={(e) => setSimForm({ ...simForm, loteId: e.target.value })}
                    disabled={loading}
                    className="border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operador" className="text-sm font-semibold text-gray-700">Operador</Label>
                  <select
                    id="operador"
                    value={simForm.operador}
                    onChange={(e) => setSimForm({ ...simForm, operador: e.target.value })}
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-localsim-teal-500 focus:border-localsim-teal-500"
                  >
                    <option value="Claro">Claro</option>
                    <option value="Movistar">Movistar</option>
                    <option value="Tigo">Tigo</option>
                    <option value="WOM">WOM</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroLinea" className="text-sm font-semibold text-gray-700">Número de Línea</Label>
                  <Input
                    id="numeroLinea"
                    type="text"
                    placeholder="Ej: 3001234567"
                    value={simForm.numeroLinea}
                    onChange={(e) => setSimForm({ ...simForm, numeroLinea: e.target.value })}
                    disabled={loading}
                    className="border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iccid" className="text-sm font-semibold text-gray-700">ICCID</Label>
                  <Input
                    id="iccid"
                    type="text"
                    placeholder="Ej: 89570..."
                    value={simForm.iccid}
                    onChange={(e) => setSimForm({ ...simForm, iccid: e.target.value })}
                    disabled={loading}
                    className="border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? 'Creando...' : 'Crear SIM'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Lotes */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-purple-700">Listado de Lotes</CardTitle>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por número de línea o ICCID (mín. 3 caracteres)..."
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className="pl-10 max-w-md border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
            />
          </div>
          {filtroNumero && filtroNumero.length < 3 && (
            <p className="text-sm text-gray-500 mt-2">Escribe al menos 3 caracteres para buscar</p>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {(lotes || []).length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay lotes registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Lote ID</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Operador</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Plan Asignado</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Total SIMs</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Disponibles</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Recargadas</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Vendidas</th>
                  </tr>
                </thead>
                <tbody>
                  {(lotes || [])
                    .filter(lote => {
                      if (filtroNumero && filtroNumero.length >= 3) {
                        return loteContieneSimsFiltradas(lote.lote_id);
                      }
                      return true;
                    })
                    .map((lote) => {
                      const expandido = debeEstarExpandido(lote.lote_id);
                      return (
                        <React.Fragment key={lote.lote_id}>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="border border-gray-200 px-4 py-2">
                              <button
                                onClick={() => toggleLoteExpandido(lote.lote_id)}
                                className="flex items-center gap-2 hover:text-localsim-teal-600 transition-colors"
                              >
                                {expandido ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="font-medium">{lote.lote_id}</span>
                              </button>
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                                {lote.operador}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {lote.plan_asignado ? (
                                <span className="px-2 py-1 bg-localsim-teal-100 text-localsim-teal-700 rounded text-sm">
                                  {lote.plan_asignado}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Pendiente</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              <span className={`px-2 py-1 rounded text-sm font-medium ${getEstadoColor(lote.estado)}`}>
                                {traducirEstado(lote.estado)}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center font-semibold">{lote.total_sims}</td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              <span className="font-bold text-green-600">{lote.sims_disponibles}</span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              <span className="font-bold text-blue-600">{lote.sims_recargadas}</span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              <span className="font-bold text-red-600">{lote.sims_vendidas}</span>
                            </td>
                          </tr>
                          {expandido && simsPorLote[lote.lote_id] && (
                            <tr>
                              <td colSpan="8" className="border border-gray-200 p-0">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4">
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="bg-gradient-to-r from-gray-200 to-gray-100">
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                            <Smartphone className="h-3 w-3 inline mr-1" />
                                            Número
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">ICCID</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Plan</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Estado</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            Registro
                                          </th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            Venta
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(simsPorLote[lote.lote_id] || [])
                                          .filter(sim => {
                                            if (!filtroNumero) return true;
                                            return sim.numero_linea?.toLowerCase().includes(filtroNumero.toLowerCase()) ||
                                                   sim.iccid?.toLowerCase().includes(filtroNumero.toLowerCase());
                                          })
                                          .map((sim) => (
                                            <tr key={sim.id} className="hover:bg-white/80 transition-colors">
                                              <td className="px-3 py-2 text-xs font-medium">{sim.numero_linea}</td>
                                              <td className="px-3 py-2 text-xs font-mono text-gray-600">{sim.iccid}</td>
                                              <td className="px-3 py-2 text-xs">
                                                {sim.plan_asignado ? (
                                                  <span className="px-2 py-0.5 bg-localsim-teal-100 text-localsim-teal-700 rounded text-xs">
                                                    {sim.plan_asignado}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">—</span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEstadoColor(sim.estado)}`}>
                                                  {traducirEstado(sim.estado)}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-xs text-gray-600">
                                                {sim.fecha_registro ? new Date(sim.fecha_registro).toLocaleString("es-CO", {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                }) : '—'}
                                              </td>
                                              <td className="px-3 py-2 text-xs text-gray-600">
                                                {sim.fecha_venta ? new Date(sim.fecha_venta).toLocaleString("es-CO", {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                }) : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimsManagement;
