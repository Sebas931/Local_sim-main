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
import { usersService } from '../../services/usersService';
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
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const data = await usersService.getUsers();
      const usuariosSimplificados = (data || []).map(user => ({
        id: user.id,
        name: user.full_name || user.username
      }));
      setUsuarios(usuariosSimplificados);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      // Si falla, intentar extraer usuarios únicos de los inventarios
      setUsuarios([]);
    }
  };

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

      // Si el backend devuelve usuarios, actualizarlos
      if (data.usuarios && data.usuarios.length > 0) {
        setUsuarios(data.usuarios);
      }
      // Si no hay usuarios cargados aún, extraerlos de los inventarios
      else if (usuarios.length === 0 && data.inventarios && data.inventarios.length > 0) {
        const usuariosUnicos = [...new Set(data.inventarios.map(inv => inv.usuario))].filter(Boolean);
        const usuariosSimplificados = usuariosUnicos.map((nombre, index) => ({
          id: index + 1,
          name: nombre
        }));
        setUsuarios(usuariosSimplificados);
      }

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
    if (diferencia > 0) return 'text-localsim-teal-600';
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

  // Calculate statistics
  const totalDescuadres = inventarios.filter(inv => inv.tiene_descuadre).length;
  const totalAsesores = new Set(inventarios.map(inv => inv.usuario)).size;
  const totalPlanes = new Set(inventarios.map(inv => inv.plan)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 bg-clip-text text-transparent">
            Control de Inventario de SIMs
          </h1>
          <p className="text-gray-600 mt-1">
            Seguimiento detallado de SIMs por turno: Apertura → Ventas → Esperado vs Real → Descuadres
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            disabled={inventarios.length === 0}
            className="flex items-center gap-2 hover:bg-localsim-teal-50 hover:text-localsim-teal-600 hover:border-localsim-teal-300 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            onClick={() => fetchInventarios()}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 hover:from-localsim-teal-700 hover:to-localsim-teal-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {inventarios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-red-500 to-red-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Descuadres Detectados</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{totalDescuadres}</h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-indigo-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Asesores</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{totalAsesores}</h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-500 to-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Planes Afectados</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{totalPlanes}</h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-cyan-50 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-localsim-teal-600 to-localsim-teal-500 p-2 rounded-lg">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-localsim-teal-700">Filtros de Búsqueda</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Filtra por período, fechas específicas o asesor. Los descuadres se resaltan automáticamente.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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

            <Button
              onClick={() => fetchInventarios()}
              disabled={loading}
              className="bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 hover:from-localsim-teal-700 hover:to-localsim-teal-600 text-white"
            >
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-cyan-50 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-localsim-teal-600 to-localsim-teal-500 p-2 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-localsim-teal-700">Resultados ({inventarios.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-localsim-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Cargando inventarios...</p>
            </div>
          ) : inventarios.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-localsim-teal-100 to-cyan-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-localsim-teal-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No se encontraron inventarios
              </h3>
              <p className="text-gray-600">Ajusta los filtros para ver resultados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Leyenda de colores */}
              <Alert className="mb-6 bg-gradient-to-r from-localsim-teal-50 to-cyan-50 border-localsim-teal-200">
                <AlertDescription>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-semibold text-localsim-teal-700">Leyenda:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded shadow-sm"></div>
                      <span className="font-medium">Inicial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded shadow-sm"></div>
                      <span className="font-medium">Vendidas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded shadow-sm"></div>
                      <span className="font-medium">Esperado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded shadow-sm"></div>
                      <span className="font-medium">Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded shadow-sm"></div>
                      <span className="font-medium">✓ Sin descuadre</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 border border-red-300 rounded shadow-sm"></div>
                      <span className="font-medium">⚠ Con descuadre</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

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
                    <Card key={turno.turno_id} className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all hover:border-localsim-teal-200">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 pb-3 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 text-base px-3 py-1">
                              Turno #{String(turno.turno_id).slice(-8)}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                              <Users className="h-4 w-4 text-localsim-teal-600" />
                              <span className="font-medium text-gray-900">{turno.usuario}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700">{new Date(turno.fecha_registro).toLocaleString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                          </div>
                          <Badge className={turno.inventarios.some(inv => inv.tiene_descuadre)
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0'
                          }>
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
                                          <div className="font-bold text-2xl text-localsim-teal-700">{inventario.cantidad_inicial_reportada || 0}</div>
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
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInventario(inventario);
                                    setShowDetails(true);
                                  }}
                                  className="bg-gradient-to-r from-localsim-teal-500 to-localsim-teal-600 hover:from-localsim-teal-600 hover:to-localsim-teal-700 text-white"
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