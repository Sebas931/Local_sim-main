import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Calendar, Filter, Download, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
// Removed Radix Select imports - using native HTML selects
import { Alert, AlertDescription } from '../ui/alert';
import { turnosService } from '../../services/turnosService';
import { useApp } from '../../context/AppContext';
import InventarioSimForm from './InventarioSimForm';

const InventarioDescuadresView = () => {
  const { showNotification } = useApp();

  // State for filters
  const [filters, setFilters] = useState({
    dias: '',
    fecha_desde: '',
    fecha_hasta: '',
    user_id: '',
    solo_con_descuadres: true
  });

  // State for data
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);

  // State for selected inventory details
  const [selectedInventario, setSelectedInventario] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Load initial data with default filters (last 7 days with discrepancies)
    setFilters(prev => ({ ...prev, dias: '7' }));
    fetchInventarios({ dias: '7', solo_con_descuadres: true });
  }, []);

  const fetchInventarios = async (customFilters = null) => {
    try {
      setLoading(true);
      const searchFilters = customFilters || filters;

      // Clean up filters - remove empty values
      const cleanFilters = Object.fromEntries(
        Object.entries(searchFilters).filter(([key, value]) => value !== '' && value !== null && value !== undefined)
      );

      const data = await turnosService.getInventariosDescuadres(cleanFilters);
      setInventarios(data.inventarios || []);
      setUsuarios(data.usuarios || []);

      if (!data.inventarios || data.inventarios.length === 0) {
        showNotification(
          cleanFilters.solo_con_descuadres ?
          'No se encontraron inventarios con descuadres en el período seleccionado' :
          'No se encontraron inventarios en el período seleccionado',
          'info'
        );
      }
    } catch (error) {
      console.error('Error fetching inventarios:', error);
      showNotification('Error al cargar inventarios', 'error');
      setInventarios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };

      // Clear date range if using 'dias' filter
      if (key === 'dias' && value) {
        newFilters.fecha_desde = '';
        newFilters.fecha_hasta = '';
      }

      // Clear 'dias' if using date range
      if ((key === 'fecha_desde' || key === 'fecha_hasta') && value) {
        newFilters.dias = '';
      }

      return newFilters;
    });
  };

  const exportToCSV = () => {
    if (inventarios.length === 0) {
      showNotification('No hay datos para exportar', 'info');
      return;
    }

    const headers = [
      'Turno ID',
      'Usuario',
      'Fecha Turno',
      'Plan',
      'Inicial Reportado',
      'Inicial Sistema',
      'Diferencia Inicial',
      'Final Reportado',
      'Final Sistema',
      'Diferencia Final',
      'Observaciones Apertura',
      'Observaciones Cierre'
    ];

    const csvContent = [
      headers.join(','),
      ...inventarios.map(inv => [
        inv.turno_id,
        inv.usuario || '',
        new Date(inv.fecha_registro).toLocaleDateString(),
        inv.plan,
        inv.cantidad_inicial_reportada || 0,
        inv.cantidad_inicial_sistema || 0,
        inv.diferencia_inicial || 0,
        inv.cantidad_final_reportada || '',
        inv.cantidad_final_sistema || '',
        inv.diferencia_final || '',
        `"${inv.observaciones_apertura || ''}"`,
        `"${inv.observaciones_cierre || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventarios_descuadres_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getDifferenceColor = (diferencia) => {
    if (diferencia === 0) return 'text-green-600';
    if (diferencia > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getDifferenceBadgeVariant = (diferencia) => {
    if (diferencia === 0) return 'default';
    if (diferencia > 0) return 'secondary';
    return 'destructive';
  };

  const formatDifference = (diferencia) => {
    if (diferencia === null || diferencia === undefined) return 'N/A';
    return diferencia > 0 ? `+${diferencia}` : `${diferencia}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Control de Inventario de SIMs
          </h2>
          <p className="text-gray-600 mt-1">
            Seguimiento detallado de SIMs por turno: Apertura → Ventas → Esperado vs Real → Descuadres
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            disabled={inventarios.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            onClick={() => fetchInventarios()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <p className="text-sm text-gray-600">
            Filtra por período, fechas específicas o asesor. Los descuadres se resaltan automáticamente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Período rápido */}
            <div>
              <Label htmlFor="dias">Últimos días</Label>
              <select
                id="dias"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
                value={filters.dias}
                onChange={(e) => handleFilterChange('dias', e.target.value)}
              >
                <option value="">Personalizado</option>
                <option value="1">Último día</option>
                <option value="7">Últimos 7 días</option>
                <option value="15">Últimos 15 días</option>
                <option value="30">Últimos 30 días</option>
              </select>
            </div>

            {/* Usuario */}
            <div>
              <Label htmlFor="user_id">Usuario (Asesor)</Label>
              <select
                id="user_id"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="solo_con_descuadres"
                checked={filters.solo_con_descuadres}
                onChange={(e) => handleFilterChange('solo_con_descuadres', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="solo_con_descuadres" className="text-sm">
                Solo mostrar inventarios con descuadres
              </Label>
            </div>

            <Button onClick={() => fetchInventarios()} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resultados ({inventarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando inventarios...</p>
            </div>
          ) : inventarios.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron inventarios con los filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Leyenda de colores */}
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertDescription>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-medium">Leyenda:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 rounded"></div>
                      <span>Inicial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-100 rounded"></div>
                      <span>Vendidas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-100 rounded"></div>
                      <span>Esperado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 rounded"></div>
                      <span>Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 rounded"></div>
                      <span>✓ Sin descuadre</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 rounded"></div>
                      <span>⚠ Con descuadre</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">Descuadres Detectados</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {inventarios.filter(inv => inv.tiene_descuadre).length}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Asesores en el Período</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {new Set(inventarios.map(inv => inv.usuario)).size}
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Planes Afectados</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {new Set(inventarios.map(inv => inv.plan)).size}
                  </p>
                </div>
              </div>

              {/* Inventory list - Grouped by Turno */}
              <div className="space-y-4">
                {(() => {
                  // Agrupar inventarios por turno
                  const turnosAgrupados = inventarios.reduce((acc, inv) => {
                    if (!acc[inv.turno_id]) {
                      acc[inv.turno_id] = {
                        turno_id: inv.turno_id,
                        usuario: inv.usuario,
                        fecha_registro: inv.fecha_registro,
                        inventarios: []
                      };
                    }
                    acc[inv.turno_id].inventarios.push(inv);
                    return acc;
                  }, {});

                  return Object.values(turnosAgrupados).map((turno) => (
                    <Card key={turno.turno_id} className="border-2">
                      <CardHeader className="bg-gray-50 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-purple-100 text-purple-800 text-base px-3 py-1">
                              Turno #{String(turno.turno_id).slice(-8)}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">{turno.usuario}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(turno.fecha_registro).toLocaleString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                          </div>
                          <Badge variant={turno.inventarios.some(inv => inv.tiene_descuadre) ? 'destructive' : 'default'}>
                            {turno.inventarios.filter(inv => inv.tiene_descuadre).length} descuadre(s)
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {turno.inventarios.map((inventario, idx) => (
                            <div
                              key={`${inventario.turno_id}-${inventario.plan}-${idx}`}
                              className={`border rounded-lg p-4 ${
                                inventario.tiene_descuadre ? 'border-red-300 bg-red-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <Badge className={`text-base px-3 py-1 ${
                                      inventario.plan === 'R5' ? 'bg-blue-100 text-blue-800' :
                                      inventario.plan === 'R7' ? 'bg-green-100 text-green-800' :
                                      inventario.plan === 'R15' ? 'bg-orange-100 text-orange-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      Plan {inventario.plan}
                                    </Badge>
                                    {inventario.tiene_descuadre && (
                                      <AlertTriangle className="h-5 w-5 text-red-600" />
                                    )}
                                  </div>

                                  {/* Flujo visual del inventario */}
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-center justify-between gap-4">
                                      {/* Apertura */}
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Inicial</div>
                                        <div className="bg-blue-100 rounded-lg px-4 py-2">
                                          <div className="font-bold text-2xl text-blue-700">{inventario.cantidad_inicial_reportada || 0}</div>
                                        </div>
                                      </div>

                                      {/* Flecha */}
                                      <div className="flex flex-col items-center">
                                        <div className="text-gray-400 text-2xl">→</div>
                                      </div>

                                      {/* Ventas */}
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Vendidas</div>
                                        <div className="bg-orange-100 rounded-lg px-4 py-2">
                                          <div className="font-bold text-2xl text-orange-700">-{inventario.ventas_realizadas || 0}</div>
                                        </div>
                                      </div>

                                      {/* Flecha */}
                                      <div className="flex flex-col items-center">
                                        <div className="text-gray-400 text-2xl">=</div>
                                      </div>

                                      {/* Esperado */}
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Esperado</div>
                                        <div className="bg-purple-100 rounded-lg px-4 py-2">
                                          <div className="font-bold text-2xl text-purple-700">{inventario.inventario_teorico || 0}</div>
                                        </div>
                                      </div>

                                      {/* Flecha */}
                                      <div className="flex flex-col items-center">
                                        <div className="text-gray-400 text-2xl">vs</div>
                                      </div>

                                      {/* Real Reportado */}
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Real Cierre</div>
                                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                                          <div className="font-bold text-2xl text-gray-700">{inventario.cantidad_final_reportada || 'N/A'}</div>
                                        </div>
                                      </div>

                                      {/* Flecha */}
                                      <div className="flex flex-col items-center">
                                        <div className="text-gray-400 text-2xl">=</div>
                                      </div>

                                      {/* Descuadre */}
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Descuadre</div>
                                        <div className={`rounded-lg px-4 py-2 ${
                                          inventario.diferencia_final === 0 ? 'bg-green-100' :
                                          inventario.diferencia_final > 0 ? 'bg-blue-100' :
                                          'bg-red-100'
                                        }`}>
                                          <div className={`font-bold text-2xl ${getDifferenceColor(inventario.diferencia_final)}`}>
                                            {formatDifference(inventario.diferencia_final)}
                                            {inventario.diferencia_final === 0 && ' ✓'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Observaciones si existen */}
                                  {(inventario.observaciones_apertura || inventario.observaciones_cierre) && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <div className="text-xs font-medium text-yellow-800 mb-1">📝 Observaciones:</div>
                                      {inventario.observaciones_apertura && (
                                        <div className="text-sm text-gray-700">
                                          <span className="font-medium">Apertura:</span> {inventario.observaciones_apertura}
                                        </div>
                                      )}
                                      {inventario.observaciones_cierre && (
                                        <div className="text-sm text-gray-700">
                                          <span className="font-medium">Cierre:</span> {inventario.observaciones_cierre}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInventario(inventario);
                                    setShowDetails(true);
                                  }}
                                >
                                  Ver Detalle
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetails && selectedInventario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Detalle de Inventario - {selectedInventario.plan}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Turno:</span> #{selectedInventario.turno_id}
                  </div>
                  <div>
                    <span className="font-medium">Usuario:</span> {selectedInventario.usuario}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {new Date(selectedInventario.fecha_registro).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Plan:</span> {selectedInventario.plan}
                  </div>
                </div>

                <InventarioSimForm
                  title="Análisis Completo del Inventario"
                  inventarios={[{
                    plan: selectedInventario.plan,
                    cantidad_reportada: selectedInventario.cantidad_final_reportada || selectedInventario.cantidad_inicial_reportada,
                    observaciones: selectedInventario.observaciones_cierre || selectedInventario.observaciones_apertura || '',
                    cantidad_inicial_reportada: selectedInventario.cantidad_inicial_reportada,
                    cantidad_final_reportada: selectedInventario.cantidad_final_reportada,
                    ventas_realizadas: selectedInventario.ventas_realizadas,
                    inventario_teorico: selectedInventario.inventario_teorico,
                    diferencia_final: selectedInventario.diferencia_final
                  }]}
                  onInventariosChange={() => {}}
                  planesDisponibles={[]}
                  showObservaciones={true}
                  readonly={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioDescuadresView;