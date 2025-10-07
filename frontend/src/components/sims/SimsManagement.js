import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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

      {/* Listado de Lotes */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-6">
        <CardHeader>
          <CardTitle>Listado de Lotes</CardTitle>
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
                {(lotes || []).map((lote) => (
                  <React.Fragment key={lote.lote_id}>
                    <tr>
                      <td className="border px-2 py-1">
                        <button onClick={() => toggleLoteExpandido(lote.lote_id)}>
                          {lotesExpandido[lote.lote_id] ? "−" : "➕"}
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
                    {lotesExpandido[lote.lote_id] && simsPorLote[lote.lote_id] && (
                      <tr>
                        <td colSpan="8" className="border px-2 py-1 bg-gray-50">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left bg-gray-200">
                                <th className="px-2 py-1">Número</th>
                                <th className="px-2 py-1">ICCID</th>
                                <th className="px-2 py-1">Estado</th>
                                <th className="px-2 py-1">Fecha Registro</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(simsPorLote[lote.lote_id] || []).map((sim) => (
                                <tr key={sim.id}>
                                  <td className="px-2 py-1">{sim.numero_linea}</td>
                                  <td className="px-2 py-1">{sim.iccid}</td>
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
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimsManagement;