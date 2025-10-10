import React, { useState, useEffect } from 'react';
import { Upload, Plus } from 'lucide-react';
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cargar SIMs */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Cargar Lotes de SIMs</span>
            </CardTitle>
            <CardDescription>
              Suba un archivo Excel con columnas: lote_id, numero_linea, iccid, operador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
            <Button onClick={uploadSims} disabled={loading || !uploadFile}>
              {loading ? 'Subiendo...' : 'Subir SIMs'}
            </Button>
          </CardContent>
        </Card>

        {/* Estadísticas de SIMs */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Estadísticas de SIMs</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardStats?.sims ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">{dashboardStats.sims.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disponibles:</span>
                  <span className="font-semibold text-green-600">{dashboardStats.sims.available}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendidas:</span>
                  <span className="font-semibold text-blue-600">{dashboardStats.sims.sold}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Cargando estadísticas...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Crear SIM Individual */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-green-600" />
            <span>Crear SIM Individual</span>
          </CardTitle>
          <CardDescription>
            Agregue una SIM individual al inventario. Si el lote no existe, se creará automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSim} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loteId">Lote ID</Label>
                <Input
                  id="loteId"
                  type="text"
                  placeholder="Ej: LOTE001"
                  value={simForm.loteId}
                  onChange={(e) => setSimForm({ ...simForm, loteId: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operador">Operador</Label>
                <select
                  id="operador"
                  value={simForm.operador}
                  onChange={(e) => setSimForm({ ...simForm, operador: e.target.value })}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Claro">Claro</option>
                  <option value="Movistar">Movistar</option>
                  <option value="Tigo">Tigo</option>
                  <option value="WOM">WOM</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroLinea">Número de Línea</Label>
                <Input
                  id="numeroLinea"
                  type="text"
                  placeholder="Ej: 3001234567"
                  value={simForm.numeroLinea}
                  onChange={(e) => setSimForm({ ...simForm, numeroLinea: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iccid">ICCID</Label>
                <Input
                  id="iccid"
                  type="text"
                  placeholder="Ej: 89570..."
                  value={simForm.iccid}
                  onChange={(e) => setSimForm({ ...simForm, iccid: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? 'Creando...' : 'Crear SIM'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Listado de Lotes */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-6">
        <CardHeader>
          <CardTitle>Listado de Lotes</CardTitle>
          <div className="mt-4">
            <Input
              type="text"
              placeholder="Buscar por número de línea o ICCID (mín. 3 caracteres)..."
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className="max-w-md"
            />
            {filtroNumero && filtroNumero.length < 3 && (
              <p className="text-sm text-gray-500 mt-1">Escribe al menos 3 caracteres para buscar</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(lotes || []).length === 0 ? (
            <p className="text-gray-500">No hay lotes registrados</p>
          ) : (
            <table className="min-w-full border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">Lote ID</th>
                  <th className="border px-2 py-1">Operador</th>
                  <th className="border px-2 py-1">Plan Asignado</th>
                  <th className="border px-2 py-1">Estado</th>
                  <th className="border px-2 py-1">Total SIMs</th>
                  <th className="border px-2 py-1">Disponibles</th>
                  <th className="border px-2 py-1">Recargadas</th>
                  <th className="border px-2 py-1">Vendidas</th>
                </tr>
              </thead>
              <tbody>
                {(lotes || [])
                  .filter(lote => {
                    // Si hay filtro activo (≥3 caracteres), solo mostrar lotes con coincidencias
                    if (filtroNumero && filtroNumero.length >= 3) {
                      return loteContieneSimsFiltradas(lote.lote_id);
                    }
                    return true;
                  })
                  .map((lote) => {
                    const expandido = debeEstarExpandido(lote.lote_id);
                    return (
                  <React.Fragment key={lote.lote_id}>
                    <tr>
                      <td className="border px-2 py-1">
                        <button onClick={() => toggleLoteExpandido(lote.lote_id)}>
                          {expandido ? "−" : "➕"}
                        </button>{" "}
                        {lote.lote_id}
                      </td>
                      <td className="border px-2 py-1">{lote.operador}</td>
                      <td className="border px-2 py-1">{lote.plan_asignado || "Pendiente"}</td>
                      <td className="border px-2 py-1">{traducirEstado(lote.estado)}</td>
                      <td className="border px-2 py-1">{lote.total_sims}</td>
                      <td className="border px-2 py-1 text-green-600">{lote.sims_disponibles}</td>
                      <td className="border px-2 py-1 text-blue-600">{lote.sims_recargadas}</td>
                      <td className="border px-2 py-1 text-red-600">{lote.sims_vendidas}</td>
                    </tr>
                    {expandido && simsPorLote[lote.lote_id] && (
                      <tr>
                        <td colSpan="8" className="border px-2 py-1 bg-gray-50">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left bg-gray-200">
                                <th className="px-2 py-1">Número</th>
                                <th className="px-2 py-1">ICCID</th>
                                <th className="px-2 py-1">Plan Asignado</th>
                                <th className="px-2 py-1">Estado</th>
                                <th className="px-2 py-1">Fecha Registro</th>
                                <th className="px-2 py-1">Fecha Venta</th>
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
                                <tr key={sim.id}>
                                  <td className="px-2 py-1">{sim.numero_linea}</td>
                                  <td className="px-2 py-1">{sim.iccid}</td>
                                  <td className="px-2 py-1">{sim.plan_asignado || '—'}</td>
                                  <td className="px-2 py-1">{traducirEstado(sim.estado)}</td>
                                  <td className="border px-2 py-1">
                                    {sim.fecha_registro ? new Date(sim.fecha_registro).toLocaleString("es-CO", {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }) : '—'}
                                  </td>
                                  <td className="border px-2 py-1">
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
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimsManagement;