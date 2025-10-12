import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  ArrowRightLeft,
  User,
  Phone,
  FileText,
  Plus,
  DollarSign,
  Ban,
  TrendingUp,
  Package,
  Calendar
} from 'lucide-react';
import { devolucionesService } from '../../services/devolucionesService';
import FormularioDevolucion from './FormularioDevolucion';

const Devoluciones = () => {
  const [activeTab, setActiveTab] = useState('lista');
  const [devoluciones, setDevoluciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    cargarDevoluciones();
  }, []);

  const cargarDevoluciones = async () => {
    try {
      setLoading(true);
      const data = await devolucionesService.listarDevoluciones();
      setDevoluciones(data || []);
    } catch (error) {
      console.error('Error al cargar devoluciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevolucionCreada = () => {
    setShowForm(false);
    cargarDevoluciones();
  };

  const filteredDevoluciones = devoluciones.filter(devolucion =>
    devolucion.sim_defectuosa_iccid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devolucion.sim_reemplazo_iccid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devolucion.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devolucion.motivo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular estadísticas
  const totalIntercambios = devoluciones.filter(d => d.tipo_devolucion === 'intercambio').length;
  const totalDevoluciones = devoluciones.filter(d => d.tipo_devolucion === 'devolucion_dinero').length;
  const montoTotalDevuelto = devoluciones
    .filter(d => d.tipo_devolucion === 'devolucion_dinero')
    .reduce((sum, d) => sum + (parseFloat(d.monto_devuelto) || 0), 0);

  if (showForm) {
    return (
      <FormularioDevolucion
        onCancel={() => setShowForm(false)}
        onSuccess={handleDevolucionCreada}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 bg-clip-text text-transparent">
            Devoluciones de SIMs
          </h1>
          <p className="text-gray-600 mt-1">Gestiona intercambios y devoluciones por fallas técnicas</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 hover:from-localsim-teal-700 hover:to-localsim-teal-600 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva Devolución
        </Button>
      </div>

      {/* KPIs */}
      {devoluciones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-500 to-indigo-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total Devoluciones</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {devoluciones.length}
                  </h3>
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
                  <p className="text-white/80 text-sm font-medium">Intercambios</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {totalIntercambios}
                  </h3>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <ArrowRightLeft className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-500 to-emerald-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Monto Devuelto</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    ${montoTotalDevuelto.toLocaleString('es-CO')}
                  </h3>
                  <p className="text-white/70 text-xs mt-1">{totalDevoluciones} devoluciones</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('lista')}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
              activeTab === 'lista'
                ? 'bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Lista de Devoluciones
          </button>
          <button
            onClick={() => setActiveTab('estadisticas')}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
              activeTab === 'estadisticas'
                ? 'bg-gradient-to-r from-localsim-teal-600 to-localsim-teal-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Estadísticas
          </button>
        </nav>
      </div>

      {activeTab === 'lista' && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-cyan-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-localsim-teal-600 to-localsim-teal-500 p-2 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-localsim-teal-700">Historial de Devoluciones</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por ICCID, cliente, motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 border-gray-300 focus:border-localsim-teal-500 focus:ring-localsim-teal-500"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cargarDevoluciones}
                  disabled={loading}
                  className="hover:bg-localsim-teal-50 hover:text-localsim-teal-600 hover:border-localsim-teal-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-localsim-teal-500" />
                <p className="text-gray-600 text-lg">Cargando devoluciones...</p>
              </div>
            ) : filteredDevoluciones.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-localsim-teal-100 to-cyan-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft className="w-10 h-10 text-localsim-teal-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay devoluciones
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {searchTerm ? 'No se encontraron devoluciones que coincidan con la búsqueda.' : 'Aún no se han registrado devoluciones.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDevoluciones.map((devolucion) => (
                  <div key={devolucion.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all bg-white hover:border-localsim-teal-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Tipo de devolución */}
                        <div className="mb-4">
                          <Badge
                            className={`flex items-center gap-1 w-fit px-3 py-1.5 text-sm font-medium ${
                              devolucion.tipo_devolucion === 'intercambio'
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0'
                            }`}
                          >
                            {devolucion.tipo_devolucion === 'intercambio' ? (
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            ) : (
                              <DollarSign className="w-3.5 h-3.5" />
                            )}
                            {devolucion.tipo_devolucion === 'intercambio' ? 'Intercambio' : 'Devolución de Dinero'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* SIM Defectuosa */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
                              <div className="bg-red-500 p-1.5 rounded">
                                <AlertTriangle className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-red-700">
                                SIM {devolucion.tipo_devolucion === 'intercambio' ? 'Defectuosa' : 'Devuelta'}
                              </span>
                            </div>
                            <div className="ml-3 space-y-2">
                              <p className="text-sm">
                                <span className="font-semibold text-gray-700">ICCID:</span>{' '}
                                <span className="font-mono text-gray-900">{devolucion.sim_defectuosa_iccid}</span>
                              </p>
                              <p className="text-sm">
                                <span className="font-semibold text-gray-700">Número:</span>{' '}
                                <span className="text-gray-900">{devolucion.sim_defectuosa_numero}</span>
                              </p>
                            </div>
                          </div>

                          {/* SIM de Reemplazo o Información de devolución */}
                          {devolucion.tipo_devolucion === 'intercambio' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                                <div className="bg-green-500 p-1.5 rounded">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-green-700">SIM de Reemplazo</span>
                              </div>
                              <div className="ml-3 space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold text-gray-700">ICCID:</span>{' '}
                                  <span className="font-mono text-gray-900">{devolucion.sim_reemplazo_iccid}</span>
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold text-gray-700">Número:</span>{' '}
                                  <span className="text-gray-900">{devolucion.sim_reemplazo_numero}</span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg">
                                <div className="bg-emerald-500 p-1.5 rounded">
                                  <DollarSign className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-emerald-700">Devolución de Dinero</span>
                              </div>
                              <div className="ml-3 space-y-2">
                                <p className="text-sm">
                                  <span className="font-semibold text-gray-700">Monto:</span>{' '}
                                  <span className="text-xl font-bold text-green-600">
                                    ${parseFloat(devolucion.monto_devuelto).toLocaleString('es-CO')}
                                  </span>
                                </p>
                                <p className="text-sm">
                                  <span className="font-semibold text-gray-700">Método:</span>{' '}
                                  <span className="px-2 py-1 bg-gray-100 rounded text-gray-900 text-xs font-medium">
                                    {devolucion.metodo_devolucion}
                                  </span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Información adicional */}
                        <div className="mt-5 pt-4 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {devolucion.cliente_nombre && (
                              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700 font-medium">{devolucion.cliente_nombre}</span>
                              </div>
                            )}

                            {devolucion.cliente_identificacion && (
                              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700 font-medium">{devolucion.cliente_identificacion}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                Por: <span className="font-medium">{devolucion.user_name || 'N/A'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Motivo */}
                        <div className="mt-4 p-4 bg-gradient-to-r from-localsim-teal-50 to-cyan-50 rounded-lg border border-localsim-teal-100">
                          <p className="text-sm">
                            <span className="font-semibold text-localsim-teal-700">Motivo:</span>
                            <span className="ml-2 text-gray-700">{devolucion.motivo}</span>
                          </p>
                        </div>
                      </div>

                      {/* Fecha */}
                      <div className="ml-6">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-1 text-gray-600 mb-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs font-medium">Fecha</span>
                          </div>
                          <p className="text-xs text-gray-700 font-mono">
                            {formatDate(devolucion.fecha_devolucion)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'estadisticas' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-purple-700">Estadísticas Detalladas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-blue-800">Total Devoluciones</span>
                    </div>
                    <p className="text-4xl font-bold text-blue-900">{devoluciones.length}</p>
                    <p className="text-sm text-blue-600 mt-2">Registros totales</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-lg">
                        <ArrowRightLeft className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-orange-800">Intercambios</span>
                    </div>
                    <p className="text-4xl font-bold text-orange-900">{totalIntercambios}</p>
                    <p className="text-sm text-orange-700 mt-2">
                      {devoluciones.length > 0 ? Math.round((totalIntercambios / devoluciones.length) * 100) : 0}% del total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-green-800">Devoluciones de Dinero</span>
                    </div>
                    <p className="text-4xl font-bold text-green-900">{totalDevoluciones}</p>
                    <p className="text-sm text-green-600 mt-2">
                      ${montoTotalDevuelto.toLocaleString('es-CO')} devueltos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Estadísticas adicionales */}
              {devoluciones.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Promedio de Devolución</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-600">
                        ${totalDevoluciones > 0 ? (montoTotalDevuelto / totalDevoluciones).toLocaleString('es-CO', { maximumFractionDigits: 0 }) : 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Por devolución de dinero</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Tasa de Intercambio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-orange-600">
                        {Math.round((totalIntercambios / devoluciones.length) * 100)}%
                      </p>
                      <p className="text-sm text-gray-600 mt-1">De todas las devoluciones</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Devoluciones;
