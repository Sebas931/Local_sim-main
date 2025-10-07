import React, { useState, useEffect, useMemo } from 'react';
import { Clock, DollarSign, FileText, AlertTriangle, Eye, EyeOff, Calendar, CreditCard, Package, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { turnosService } from '../../services/turnosService';
import { useApp } from '../../context/AppContext';
import InventarioSimForm from './InventarioSimForm';

const TurnosManagement = () => {
  const { showNotification, turnoAbierto, setTurnoAbierto } = useApp();

  // Turnos state
  const [misTurnos, setMisTurnos] = useState([]);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [movimientosTurno, setMovimientosTurno] = useState([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);

  // Modal state
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [efectivoReportado, setEfectivoReportado] = useState('');
  const [datafonoReportado, setDatafonoReportado] = useState('');
  const [dolaresReportado, setDolaresReportado] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [resumenCierre, setResumenCierre] = useState(null);
  const [loading, setLoading] = useState(false);

  // Inventario state for opening turn
  const [inventariosApertura, setInventariosApertura] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);

  // Inventario state for closing turn
  const [inventariosCierre, setInventariosCierre] = useState([]);
  const [inventariosExistentes, setInventariosExistentes] = useState([]);


  useEffect(() => {
    verificarTurno();
    fetchMisTurnos();
  }, []);

  useEffect(() => {
    console.log('showAperturaModal cambió a:', showAperturaModal);
  }, [showAperturaModal]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(price || 0);
  };

  const verificarTurno = async () => {
    try {
      const turnoData = await turnosService.verificarTurno();
      setTurnoAbierto(turnoData);
    } catch (error) {
      if (error.response?.status === 404) {
        setTurnoAbierto(null); // No hay turno abierto
      } else {
        console.error('Error verificando turno:', error);
        showNotification('Error al verificar el turno', 'error');
        setTurnoAbierto(null);
      }
    }
  };

  const prepararApertura = async () => {
    try {
      setLoadingPlanes(true);
      console.log('prepararApertura: Iniciando...');

      // Inicializar con inventarios vacíos para registro manual
      const inventariosIniciales = [
        { plan: 'R5D', cantidad_reportada: 0, observaciones: '' },
        { plan: 'R7D', cantidad_reportada: 0, observaciones: '' },
        { plan: 'R15D', cantidad_reportada: 0, observaciones: '' },
        { plan: 'R30D', cantidad_reportada: 0, observaciones: '' }
      ];

      setInventariosApertura(inventariosIniciales);
      setShowAperturaModal(true);
      console.log('prepararApertura: Modal debería abrirse ahora, showAperturaModal=true');
    } catch (error) {
      console.error('Error preparando apertura:', error);
      showNotification('Error al preparar apertura de turno', 'error');
    } finally {
      setLoadingPlanes(false);
    }
  };

  const abrirTurno = async () => {
    try {
      setLoading(true);

      // Filtrar solo inventarios con cantidad > 0
      const inventariosConCantidad = inventariosApertura.filter(inv => inv.cantidad_reportada > 0);

      const response = await turnosService.abrirTurno(inventariosConCantidad);
      setTurnoAbierto(response);
      showNotification('Turno abierto correctamente', 'success');

      // Reset states
      setShowAperturaModal(false);
      setInventariosApertura([]);

      await fetchMisTurnos();
    } catch (error) {
      console.error("Error abriendo turno:", error);
      const errorMessage = error.response?.data?.detail ||
                          error.message ||
                          'Error al abrir turno';
      showNotification(errorMessage, 'error');
      await verificarTurno();
    } finally {
      setLoading(false);
    }
  };

  const prepararCierre = async () => {
    try {
      if (!turnoAbierto) {
        showNotification('No hay un turno abierto para cerrar', 'error');
        return;
      }

      setLoading(true);

      // Load existing inventories from opening
      try {
        const inventarios = await turnosService.getInventariosTurno(turnoAbierto.id);
        setInventariosExistentes(inventarios);

        if (inventarios && inventarios.length > 0) {
          // Initialize closing inventory with the same plans but zero quantities
          const inventariosCierreInit = inventarios.map(inv => ({
            plan: inv.plan,
            cantidad_reportada: 0,
            observaciones: ''
          }));
          setInventariosCierre(inventariosCierreInit);
        } else {
          // Si no hay inventarios de apertura, no mostrar inventarios de cierre
          setInventariosCierre([]);
        }
      } catch (inventariosError) {
        // Si falla cargar inventarios, no mostrar inventarios de cierre
        console.warn('No se pudieron cargar inventarios de apertura:', inventariosError);
        setInventariosCierre([]);
      }
      setShowCierreModal(true);
    } catch (error) {
      console.error('Error preparando cierre:', error);
      const msg = error.response?.data?.detail || 'Error al preparar cierre de caja';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cerrarTurno = async () => {
    try {
      // Validaciones de los campos reportados
      if (efectivoReportado === '' || efectivoReportado === null || efectivoReportado === undefined) {
        showNotification('El efectivo reportado es obligatorio', 'error');
        return;
      }

      if (datafonoReportado === '' || datafonoReportado === null || datafonoReportado === undefined) {
        showNotification('Las ventas por datáfono reportadas son obligatorias', 'error');
        return;
      }

      if (dolaresReportado === '' || dolaresReportado === null || dolaresReportado === undefined) {
        showNotification('Las ventas en dólares reportadas son obligatorias', 'error');
        return;
      }

      const efectivoFloat = parseFloat(efectivoReportado);
      const datafonoFloat = parseFloat(datafonoReportado);
      const dolaresFloat = parseFloat(dolaresReportado);

      if (isNaN(efectivoFloat) || efectivoFloat < 0) {
        showNotification('El efectivo reportado debe ser un número válido mayor o igual a 0', 'error');
        return;
      }

      if (isNaN(datafonoFloat) || datafonoFloat < 0) {
        showNotification('Las ventas por datáfono deben ser un número válido mayor o igual a 0', 'error');
        return;
      }

      if (isNaN(dolaresFloat) || dolaresFloat < 0) {
        showNotification('Las ventas en dólares deben ser un número válido mayor o igual a 0', 'error');
        return;
      }

      setLoading(true);

      // Validar inventarios solo si hay al menos uno con cantidad > 0
      const tieneInventarios = inventariosCierre.some(inv => inv.cantidad_reportada > 0);
      const inventariosParaEnviar = inventariosCierre.filter(inv => inv.cantidad_reportada > 0);

      const cierreData = {
        efectivo_reportado: efectivoFloat,
        datafono_reportado: datafonoFloat,
        dolares_reportado: dolaresFloat,
        observaciones: observacionesCierre?.trim() || null,
        inventarios: inventariosParaEnviar.map(inv => ({
          plan: inv.plan,
          cantidad_reportada: inv.cantidad_reportada,
          observaciones: inv.observaciones?.trim() || null
        }))
      };

      // Usar el endpoint correcto según si hay inventarios o no
      if (tieneInventarios) {
        await turnosService.cerrarTurnoConInventario(cierreData);
      } else {
        // Si no hay inventarios, usar el endpoint normal de cierre
        const { inventarios, ...cierreDataSinInventarios } = cierreData;
        await turnosService.cerrarTurno(cierreDataSinInventarios);
      }

      showNotification('Turno cerrado exitosamente', 'success');

      // Reset states
      setShowCierreModal(false);
      setTurnoAbierto(null);
      setEfectivoReportado('');
      setDatafonoReportado('');
      setDolaresReportado('');
      setObservacionesCierre('');
      setResumenCierre(null);
      setInventariosCierre([]);
      setInventariosExistentes([]);

      // Refresh data
      await fetchMisTurnos();
      await verificarTurno();

    } catch (error) {
      console.error('Error en cerrarTurno:', error);

      let msg = 'Error al cerrar el turno';
      if (error?.code === 'ECONNABORTED') {
        msg = 'La solicitud tardó demasiado. Intente nuevamente.';
      } else if (error?.response) {
        const data = error.response.data;
        if (typeof data === 'object') {
          const detail = data?.detail;
          if (typeof detail === 'string') {
            msg = detail;
          } else if (Array.isArray(detail)) {
            msg = detail.map(err => err.msg || err).join(', ');
          } else {
            msg = detail || 'Error de validación';
          }
        } else {
          msg = data?.detail || data?.message || msg;
        }
      } else if (error?.request) {
        msg = 'No se recibió respuesta del servidor. Verifique su conexión.';
      }

      showNotification(msg, 'error');
      await verificarTurno();
    } finally {
      setLoading(false);
    }
  };

  const fetchMisTurnos = async () => {
    try {
      setLoadingTurnos(true);
      const data = await turnosService.getMisTurnos();
      console.log('Turnos data received:', data);

      // Transform the data to match frontend expectations
      const turnosArray = Array.isArray(data) ? data : [];
      const transformedTurnos = turnosArray.map(turno => ({
        ...turno,
        id: turno.turno_id || turno.id, // Map turno_id to id for frontend compatibility
        total_ventas: turno.total_general || turno.total_ventas || 0,
        diferencia: turno.diferencia // Keep as is if exists
      }));

      setMisTurnos(transformedTurnos);
    } catch (error) {
      console.error('Error fetching turnos:', error);
      showNotification('Error al cargar mis turnos', 'error');
      setMisTurnos([]);
    } finally {
      setLoadingTurnos(false);
    }
  };

  const fetchMovimientosTurno = async (turnoId) => {
    if (!turnoId) {
      showNotification('ID de turno no válido', 'error');
      return;
    }

    try {
      console.log('Fetching movimientos for turno:', turnoId);
      setMovimientosTurno([]); // Clear previous data
      setTurnoSeleccionado(turnoId);

      const data = await turnosService.getMovimientosTurno(turnoId);
      console.log('Movimientos data received:', data);

      setMovimientosTurno(Array.isArray(data) ? data : []);

      if (!data || (Array.isArray(data) && data.length === 0)) {
        showNotification('No hay movimientos para este turno', 'info');
      }
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      const msg = error?.response?.data?.detail || 'Error al cargar movimientos del turno';
      showNotification(msg, 'error');
      setMovimientosTurno([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Turno Status and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Estado del Turno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {turnoAbierto ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      Turno Abierto
                    </Badge>
                    <span className="text-sm text-gray-600">
                      ID: {turnoAbierto.id}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Abierto: {new Date(turnoAbierto.fecha_apertura).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Sin Turno Abierto
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Debes abrir un turno para registrar ventas
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {turnoAbierto ? (
                <Button
                  onClick={prepararCierre}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Preparando...' : 'Cerrar Turno'}
                </Button>
              ) : (
                <Button
                  onClick={prepararApertura}
                  disabled={loading || loadingPlanes}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loadingPlanes ? 'Cargando...' : 'Abrir Turno'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mis Turnos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Turnos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTurnos ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando turnos...</p>
            </div>
          ) : (misTurnos || []).length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay turnos registrados</p>
          ) : (
            <div className="space-y-3">
              {(misTurnos || []).map((turno) => (
                <div key={turno.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={turno.estado === 'abierto' ? 'default' : 'secondary'}>
                          {turno.estado}
                        </Badge>
                        <span className="font-medium">Turno #{turno.id}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Apertura: {new Date(turno.fecha_apertura).toLocaleString()}</p>
                        {turno.fecha_cierre && (
                          <p>Cierre: {new Date(turno.fecha_cierre).toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {turno.estado === 'cerrado' && (
                        <div className="text-sm">
                          <p className="text-gray-600">Total: {formatPrice(turno.total_ventas || 0)}</p>
                          {turno.diferencia !== undefined && (
                            <p className={`font-medium ${
                              turno.diferencia === 0 ? 'text-green-600' :
                              turno.diferencia > 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              Diferencia: {formatPrice(turno.diferencia)}
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Clicking Ver Detalle for turno:', turno);
                          fetchMovimientosTurno(turno.id);
                        }}
                        className="mt-2 flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {turnoSeleccionado === turno.id ? 'Cargando...' : 'Ver Detalle'}
                      </Button>
                    </div>
                  </div>

                  {turnoSeleccionado === turno.id && (
                    <div className="mt-6">
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-blue-600" />
                              Detalle del Turno #{String(turno.id).slice(-8)}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTurnoSeleccionado(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(turno.fecha_apertura).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(turno.fecha_apertura).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} - {turno.fecha_cierre ? new Date(turno.fecha_cierre).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'En curso'}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {(movimientosTurno || []).length === 0 ? (
                            <div className="text-center py-8">
                              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-500 mb-2">No hay movimientos para este turno</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchMovimientosTurno(turno.id)}
                                className="text-xs"
                              >
                                Recargar movimientos
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Resumen por método de pago */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {(() => {
                                  const resumen = movimientosTurno
                                    .filter(mov => !mov.anulada) // Excluir ventas anuladas
                                    .reduce((acc, mov) => {
                                      const metodo = mov.metodo_pago || 'other';
                                      const monto = mov.monto || mov.total || mov.amount || 0;
                                      if (!acc[metodo]) acc[metodo] = 0;
                                      acc[metodo] += monto;
                                      return acc;
                                    }, {});

                                  const metodosConfig = {
                                    'electronic': { label: 'Datáfono', color: 'bg-blue-50 border-blue-200', icon: CreditCard, textColor: 'text-blue-700' },
                                    'cash': { label: 'Efectivo', color: 'bg-green-50 border-green-200', icon: DollarSign, textColor: 'text-green-700' },
                                    'dollars': { label: 'Dólares', color: 'bg-purple-50 border-purple-200', icon: DollarSign, textColor: 'text-purple-700' }
                                  };

                                  return Object.entries(resumen).map(([metodo, total]) => {
                                    const config = metodosConfig[metodo] || {
                                      label: metodo.charAt(0).toUpperCase() + metodo.slice(1),
                                      color: 'bg-gray-50 border-gray-200',
                                      icon: DollarSign,
                                      textColor: 'text-gray-700'
                                    };
                                    const Icon = config.icon;

                                    return (
                                      <div key={metodo} className={`p-3 rounded-lg border ${config.color}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Icon className="h-4 w-4" />
                                          <span className="text-sm font-medium">{config.label}</span>
                                        </div>
                                        <p className={`text-lg font-bold ${config.textColor}`}>
                                          {metodo === 'dollars' ? `$${total.toFixed(2)} USD` : formatPrice(total)}
                                        </p>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Lista de movimientos */}
                              <div>
                                <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Movimientos ({movimientosTurno.length})
                                </h5>
                                <div className="space-y-2 max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-3">
                                  {movimientosTurno.map((mov, idx) => (
                                    <div key={mov.id || idx} className={`p-3 rounded border shadow-sm ${mov.anulada ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-medium ${mov.anulada ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                                              {mov.descripcion || mov.tipo || 'Movimiento'}
                                            </span>
                                            {mov.anulada && (
                                              <Badge variant="destructive" className="text-xs">
                                                ANULADA
                                              </Badge>
                                            )}
                                            {mov.metodo_pago && (
                                              <Badge variant="outline" className="text-xs">
                                                {mov.metodo_pago === 'electronic' ? 'Datáfono' :
                                                 mov.metodo_pago === 'cash' ? 'Efectivo' :
                                                 mov.metodo_pago === 'dollars' ? 'Dólares' :
                                                 mov.metodo_pago}
                                              </Badge>
                                            )}
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                            {mov.producto && (
                                              <div>
                                                <span className="font-medium">Producto:</span> {mov.producto}
                                              </div>
                                            )}
                                            {mov.sale_id && (
                                              <div>
                                                <span className="font-medium">ID Venta:</span> {mov.sale_id}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <div className={`font-bold text-lg ${mov.anulada ? 'text-red-500 line-through' : 'text-gray-900'}`}>
                                            {mov.metodo_pago === 'dollars' ?
                                              `$${(mov.monto || mov.total || mov.amount || 0).toFixed(2)} USD` :
                                              formatPrice(mov.monto || mov.total || mov.amount || 0)
                                            }
                                          </div>
                                          {mov.anulada && (
                                            <div className="text-xs text-red-600 font-medium">
                                              No contabilizado
                                            </div>
                                          )}
                                          <div className="text-xs text-gray-500">
                                            {mov.fecha ? new Date(mov.fecha).toLocaleString('es-CO', {
                                              month: 'short',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            }) :
                                            mov.created_at ? new Date(mov.created_at).toLocaleString('es-CO', {
                                              month: 'short',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            }) :
                                            'Sin fecha'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Total general */}
                                <div className="mt-4 pt-3 border-t bg-gray-100 rounded-lg p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-900">Total del Turno:</span>
                                    <span className="font-bold text-xl text-blue-600">
                                      {formatPrice(movimientosTurno
                                        .filter(mov => !mov.anulada) // Excluir ventas anuladas
                                        .reduce((sum, mov) => sum + (mov.monto || mov.total || mov.amount || 0), 0))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cierre */}
      <Dialog open={showCierreModal} onOpenChange={setShowCierreModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Cerrar Turno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-800">
                <strong>Completa la información para cerrar el turno:</strong><br/>
                1. Registra el inventario final de SIMs que tienes<br/>
                2. Ingresa los totales por método de pago
              </p>
            </div>

            {/* Inventario de Cierre - SIN mostrar inventario de apertura para evitar fraudes */}
            {inventariosCierre.length > 0 ? (
              <InventarioSimForm
                title="Inventario de Cierre - Ingresa cuántas SIMs tienes ahora"
                inventarios={inventariosCierre}
                onInventariosChange={setInventariosCierre}
                planesDisponibles={[]}
                showObservaciones={true}
                readonly={false}
                inventariosApertura={[]}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Inventario de Cierre
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Este turno no tiene inventarios de SIMs registrados en la apertura.
                      El cierre se realizará solo con los totales de ventas.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Totales de Ventas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Totales de Ventas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ventas por Datáfono */}
                <div>
                  <Label htmlFor="datafono-reportado">Ventas por Datáfono *</Label>
                  <Input
                    id="datafono-reportado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={datafonoReportado}
                    onChange={(e) => setDatafonoReportado(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                {/* Efectivo Contado */}
                <div>
                  <Label htmlFor="efectivo-reportado">Ventas en Efectivo*</Label>
                  <Input
                    id="efectivo-reportado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={efectivoReportado}
                    onChange={(e) => setEfectivoReportado(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                {/* Ventas en Dólares */}
                <div>
                  <Label htmlFor="dolares-reportado">Ventas en Dólares (USD) *</Label>
                  <Input
                    id="dolares-reportado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={dolaresReportado}
                    onChange={(e) => setDolaresReportado(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input
                    id="observaciones"
                    value={observacionesCierre}
                    onChange={(e) => setObservacionesCierre(e.target.value)}
                    placeholder="Notas adicionales sobre el turno"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

              {/* Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCierreModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={cerrarTurno}
                  disabled={loading || !efectivoReportado || !datafonoReportado || !dolaresReportado}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Cerrando...' : 'Confirmar Cierre'}
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Apertura con Inventario */}
      <Dialog open={showAperturaModal} onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open);
        setShowAperturaModal(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Abrir Nuevo Turno
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Registra exactamente cuántas SIMs tienes de cada plan al iniciar el turno.
                Esto permitirá detectar descuadres comparando con lo que reportes al cerrar.
              </AlertDescription>
            </Alert>

            <InventarioSimForm
              title="Inventario de Apertura"
              inventarios={inventariosApertura}
              onInventariosChange={setInventariosApertura}
              planesDisponibles={planesDisponibles}
              showObservaciones={true}
              readonly={false}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAperturaModal(false);
                  setInventariosApertura([]);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={abrirTurno}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Abriendo...' : 'Abrir Turno'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TurnosManagement;