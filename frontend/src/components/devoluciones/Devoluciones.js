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
  Ban
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
          <h1 className="text-2xl font-bold text-gray-900">Devoluciones de SIMs</h1>
          <p className="text-gray-600">Gestiona las devoluciones por fallas técnicas</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Devolución
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('lista')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lista'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lista de Devoluciones
          </button>
          <button
            onClick={() => setActiveTab('estadisticas')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estadisticas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Estadísticas
          </button>
        </nav>
      </div>

      {activeTab === 'lista' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Historial de Devoluciones
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por ICCID, cliente, motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cargarDevoluciones}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-gray-600">Cargando devoluciones...</p>
              </div>
            ) : filteredDevoluciones.length === 0 ? (
              <div className="text-center py-8">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No hay devoluciones
                </h3>
                <p className="text-gray-600">
                  {searchTerm ? 'No se encontraron devoluciones que coincidan con la búsqueda.' : 'Aún no se han registrado devoluciones.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDevoluciones.map((devolucion) => (
                  <div key={devolucion.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Tipo de devolución */}
                        <div className="mb-4">
                          <Badge
                            variant={devolucion.tipo_devolucion === 'intercambio' ? 'default' : 'destructive'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {devolucion.tipo_devolucion === 'intercambio' ? (
                              <ArrowRightLeft className="w-3 h-3" />
                            ) : (
                              <DollarSign className="w-3 h-3" />
                            )}
                            {devolucion.tipo_devolucion === 'intercambio' ? 'Intercambio' : 'Devolución de Dinero'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* SIM Defectuosa */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium text-gray-700">SIM {devolucion.tipo_devolucion === 'intercambio' ? 'Defectuosa' : 'Devuelta'}</span>
                            </div>
                            <div className="ml-6 space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">ICCID:</span> {devolucion.sim_defectuosa_iccid}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Número:</span> {devolucion.sim_defectuosa_numero}
                              </p>
                            </div>
                          </div>

                          {/* SIM de Reemplazo o Información de devolución */}
                          {devolucion.tipo_devolucion === 'intercambio' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium text-gray-700">SIM de Reemplazo</span>
                              </div>
                              <div className="ml-6 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">ICCID:</span> {devolucion.sim_reemplazo_iccid}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Número:</span> {devolucion.sim_reemplazo_numero}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium text-gray-700">Devolución de Dinero</span>
                              </div>
                              <div className="ml-6 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Monto:</span> ${devolucion.monto_devuelto}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Método:</span> {devolucion.metodo_devolucion}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Información adicional */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {devolucion.cliente_nombre && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{devolucion.cliente_nombre}</span>
                            </div>
                          )}

                          {devolucion.cliente_identificacion && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{devolucion.cliente_identificacion}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Por: {devolucion.user_name || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Motivo */}
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm">
                            <span className="font-medium text-gray-700">Motivo:</span>
                            <span className="ml-2 text-gray-600">{devolucion.motivo}</span>
                          </p>
                        </div>
                      </div>

                      {/* Fecha y acciones */}
                      <div className="ml-4 text-right">
                        <Badge variant="outline" className="mb-2">
                          {formatDate(devolucion.fecha_devolucion)}
                        </Badge>
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
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas de Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Total Devoluciones</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{devoluciones.length}</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Intercambios</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {devoluciones.filter(d => d.tipo_devolucion === 'intercambio').length}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Devoluciones de Dinero</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {devoluciones.filter(d => d.tipo_devolucion === 'devolucion_dinero').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Devoluciones;