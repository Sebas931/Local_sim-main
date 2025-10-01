import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  CheckCircle,
  User,
  Phone,
  FileText,
  Save,
  Scan,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  CreditCard,
  Banknote
} from 'lucide-react';
import { devolucionesService } from '../../services/devolucionesService';
import { useApp } from '../../context/AppContext';

const FormularioDevolucion = ({ onCancel, onSuccess }) => {
  const { showNotification } = useApp();

  // Tipo de devolución
  const [tipoDevolucion, setTipoDevolucion] = useState('intercambio');

  // Estados para la búsqueda y selección de SIMs
  const [searchDefectuosa, setSearchDefectuosa] = useState('');
  const [searchReemplazo, setSearchReemplazo] = useState('');
  const [simsVendidas, setSimsVendidas] = useState([]);
  const [simsDisponibles, setSimsDisponibles] = useState([]);
  const [loadingVendidas, setLoadingVendidas] = useState(false);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);

  // SIMs y venta seleccionada
  const [simDefectuosa, setSimDefectuosa] = useState(null);
  const [simReemplazo, setSimReemplazo] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // Estados para búsqueda de ventas
  const [searchVenta, setSearchVenta] = useState('');
  const [ventasEncontradas, setVentasEncontradas] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(false);

  // Datos del formulario
  const [motivo, setMotivo] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteIdentificacion, setClienteIdentificacion] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

  // Datos específicos para devolución de dinero
  const [montoDevuelto, setMontoDevuelto] = useState('');
  const [metodoDevolucion, setMetodoDevolucion] = useState('efectivo');

  const [submitting, setSubmitting] = useState(false);

  // Buscar ventas por ICCID (para devolución de dinero)
  const buscarVentasPorIccid = useCallback(async (iccid) => {
    if (!iccid || iccid.length < 3) {
      setVentasEncontradas([]);
      return;
    }

    try {
      setLoadingVentas(true);
      const data = await devolucionesService.buscarVentasPorIccid(iccid);
      setVentasEncontradas(data || []);
    } catch (error) {
      console.error('Error al buscar ventas:', error);
      showNotification('Error al buscar ventas', 'error');
      setVentasEncontradas([]);
    } finally {
      setLoadingVentas(false);
    }
  }, [showNotification]);

  // Cargar SIMs vendidas
  const cargarSimsVendidas = useCallback(async (search = '') => {
    try {
      setLoadingVendidas(true);
      const data = await devolucionesService.getSimsVendidas(search);
      setSimsVendidas(data || []);
    } catch (error) {
      console.error('Error al cargar SIMs vendidas:', error);
      showNotification('Error al cargar SIMs vendidas', 'error');
    } finally {
      setLoadingVendidas(false);
    }
  }, [showNotification]);

  // Cargar SIMs disponibles
  const cargarSimsDisponibles = useCallback(async (search = '') => {
    try {
      setLoadingDisponibles(true);
      const data = await devolucionesService.getSimsDisponibles(search);
      setSimsDisponibles(data || []);
    } catch (error) {
      console.error('Error al cargar SIMs disponibles:', error);
      showNotification('Error al cargar SIMs disponibles', 'error');
    } finally {
      setLoadingDisponibles(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (tipoDevolucion === 'intercambio') {
      cargarSimsVendidas();
      cargarSimsDisponibles();
    }
  }, [tipoDevolucion, cargarSimsVendidas, cargarSimsDisponibles]);

  // Búsqueda con debounce para intercambio
  useEffect(() => {
    if (tipoDevolucion === 'intercambio') {
      const timeoutId = setTimeout(() => {
        if (searchDefectuosa.length >= 3) {
          cargarSimsVendidas(searchDefectuosa);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchDefectuosa, cargarSimsVendidas, tipoDevolucion]);

  useEffect(() => {
    if (tipoDevolucion === 'intercambio') {
      const timeoutId = setTimeout(() => {
        if (searchReemplazo.length >= 3) {
          cargarSimsDisponibles(searchReemplazo);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchReemplazo, cargarSimsDisponibles, tipoDevolucion]);

  // Búsqueda con debounce para devolución de dinero
  useEffect(() => {
    if (tipoDevolucion === 'devolucion_dinero') {
      const timeoutId = setTimeout(() => {
        buscarVentasPorIccid(searchVenta);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchVenta, buscarVentasPorIccid, tipoDevolucion]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones comunes
    if (motivo.trim().length < 10) {
      showNotification('El motivo debe tener al menos 10 caracteres', 'error');
      return;
    }

    let devolucionData = {
      tipo_devolucion: tipoDevolucion,
      motivo: motivo.trim(),
      cliente_nombre: clienteNombre.trim() || null,
      cliente_identificacion: clienteIdentificacion.trim() || null,
      cliente_telefono: clienteTelefono.trim() || null
    };

    if (tipoDevolucion === 'intercambio') {
      // Validaciones para intercambio
      if (!simDefectuosa) {
        showNotification('Debe seleccionar una SIM defectuosa', 'error');
        return;
      }
      if (!simReemplazo) {
        showNotification('Debe seleccionar una SIM de reemplazo', 'error');
        return;
      }

      // Para intercambio, necesitamos buscar la venta asociada a la SIM defectuosa
      try {
        console.log('Buscando ventas para ICCID:', simDefectuosa.iccid);
        const ventasEncontradas = await devolucionesService.buscarVentasPorIccid(simDefectuosa.iccid);
        console.log('Ventas encontradas:', ventasEncontradas);

        if (!ventasEncontradas || ventasEncontradas.length === 0) {
          showNotification('No se encontró una venta activa para esta SIM', 'error');
          return;
        }

        const ventaAsociada = ventasEncontradas[0]; // Usar la primera venta encontrada
        console.log('Venta asociada:', ventaAsociada);

        devolucionData = {
          ...devolucionData,
          sale_id: ventaAsociada.sale_id,
          sim_defectuosa_iccid: simDefectuosa.iccid,
          sim_reemplazo_iccid: simReemplazo.iccid
        };
      } catch (searchError) {
        console.error('Error al buscar venta:', searchError);
        showNotification(`Error al buscar la venta asociada: ${searchError.message || searchError}`, 'error');
        return;
      }
    } else if (tipoDevolucion === 'devolucion_dinero') {
      // Validaciones para devolución de dinero
      if (!ventaSeleccionada) {
        showNotification('Debe seleccionar una venta', 'error');
        return;
      }
      if (!searchVenta) {
        showNotification('Debe especificar el ICCID de la SIM a devolver', 'error');
        return;
      }
      if (!montoDevuelto || parseFloat(montoDevuelto) <= 0) {
        showNotification('Debe especificar un monto válido a devolver', 'error');
        return;
      }

      devolucionData = {
        ...devolucionData,
        sale_id: ventaSeleccionada.sale_id,
        sim_defectuosa_iccid: searchVenta,
        monto_devuelto: parseFloat(montoDevuelto),
        metodo_devolucion: metodoDevolucion
      };
    }

    try {
      setSubmitting(true);
      await devolucionesService.crearDevolucion(devolucionData);
      showNotification(
        tipoDevolucion === 'intercambio'
          ? 'Intercambio registrado exitosamente'
          : 'Devolución de dinero registrada exitosamente',
        'success'
      );
      onSuccess();
    } catch (error) {
      console.error('Error al crear devolución:', error);

      let errorMessage = 'Error al registrar la devolución';

      if (error.response?.data?.detail) {
        // Si detail es un string, usarlo directamente
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
        // Si detail es un array (errores de validación de Pydantic)
        else if (Array.isArray(error.response.data.detail)) {
          const validationErrors = error.response.data.detail
            .map(err => {
              if (err.msg) {
                return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`;
              }
              return 'Error de validación';
            })
            .join(', ');
          errorMessage = validationErrors || 'Error de validación';
        }
        // Si detail es un objeto, intentar extraer el mensaje
        else if (typeof error.response.data.detail === 'object') {
          errorMessage = error.response.data.detail.msg || error.response.data.detail.message || 'Error en la solicitud';
        }
      }

      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const SimCard = ({ sim, selected, onSelect, type, loading }) => (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(sim)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {type === 'defectuosa' ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="font-medium text-sm">{sim.iccid}</span>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p><span className="font-medium">Número:</span> {sim.numero_linea}</p>
            <p><span className="font-medium">Operador:</span> {sim.operador}</p>
            {sim.plan_asignado && (
              <p><span className="font-medium">Plan:</span> {sim.plan_asignado}</p>
            )}
          </div>
        </div>
        {selected && (
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Devolución</h1>
          <p className="text-gray-600">
            {tipoDevolucion === 'intercambio'
              ? 'Intercambio de SIM defectuosa por una nueva'
              : 'Devolución completa con anulación de factura'
            }
          </p>
        </div>
      </div>

      {/* Selector de tipo de devolución */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Devolución</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                tipoDevolucion === 'intercambio'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setTipoDevolucion('intercambio')}
            >
              <div className="flex items-center gap-3 mb-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Intercambio de SIM</span>
              </div>
              <p className="text-sm text-gray-600">
                Cambiar una SIM defectuosa por una nueva sin generar nueva facturación
              </p>
            </div>

            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                tipoDevolucion === 'devolucion_dinero'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setTipoDevolucion('devolucion_dinero')}
            >
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium">Devolución de Dinero</span>
              </div>
              <p className="text-sm text-gray-600">
                Anular la factura completamente y devolver el dinero al cliente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {tipoDevolucion === 'devolucion_dinero' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" />
                Buscar Venta por ICCID
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Ingresa el ICCID de la SIM a devolver..."
                  value={searchVenta}
                  onChange={(e) => setSearchVenta(e.target.value)}
                  className="pl-9"
                />
              </div>

              {ventaSeleccionada && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Venta Seleccionada</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Cliente:</span> {ventaSeleccionada.customer_identification}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> ${ventaSeleccionada.total}
                    </div>
                    <div>
                      <span className="font-medium">Método de pago:</span> {ventaSeleccionada.payment_method}
                    </div>
                    <div>
                      <span className="font-medium">Fecha:</span> {new Date(ventaSeleccionada.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setVentaSeleccionada(null)}
                  >
                    Cambiar venta
                  </Button>
                </div>
              )}

              {!ventaSeleccionada && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {loadingVentas ? (
                    <div className="text-center py-4">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      <p className="text-sm text-gray-600">Buscando ventas...</p>
                    </div>
                  ) : ventasEncontradas.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                      {searchVenta.length >= 3 ? 'No se encontraron ventas con este ICCID' : 'Escribe al menos 3 caracteres para buscar'}
                    </p>
                  ) : (
                    ventasEncontradas.map((venta, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => setVentaSeleccionada(venta)}
                      >
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Cliente:</span> {venta.customer_identification}
                          </div>
                          <div>
                            <span className="font-medium">Total:</span> ${venta.total}
                          </div>
                          <div>
                            <span className="font-medium">Método:</span> {venta.payment_method}
                          </div>
                          <div>
                            <span className="font-medium">Fecha:</span> {new Date(venta.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Campos específicos para devolución de dinero */}
              {ventaSeleccionada && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto a Devolver *
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={ventaSeleccionada.total}
                        value={montoDevuelto}
                        onChange={(e) => setMontoDevuelto(e.target.value)}
                        placeholder="0.00"
                        className="pl-9"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Máximo: ${ventaSeleccionada.total}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Devolución *
                    </label>
                    <select
                      value={metodoDevolucion}
                      onChange={(e) => setMetodoDevolucion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="devolucion_tarjeta">Devolución a Tarjeta</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tipoDevolucion === 'intercambio' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SIM Defectuosa */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                SIM Defectuosa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por ICCID o número..."
                  value={searchDefectuosa}
                  onChange={(e) => setSearchDefectuosa(e.target.value)}
                  className="pl-9"
                />
              </div>

              {simDefectuosa && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">SIM seleccionada:</p>
                  <SimCard
                    sim={simDefectuosa}
                    selected={true}
                    onSelect={() => setSimDefectuosa(null)}
                    type="defectuosa"
                  />
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {loadingVendidas ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">Cargando SIMs...</p>
                  </div>
                ) : simsVendidas.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    {searchDefectuosa.length >= 3 ? 'No se encontraron SIMs' : 'Escribe al menos 3 caracteres para buscar'}
                  </p>
                ) : (
                  simsVendidas.map(sim => (
                    <SimCard
                      key={sim.id}
                      sim={sim}
                      selected={simDefectuosa?.id === sim.id}
                      onSelect={setSimDefectuosa}
                      type="defectuosa"
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

            {/* SIM de Reemplazo */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                SIM de Reemplazo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por ICCID o número..."
                  value={searchReemplazo}
                  onChange={(e) => setSearchReemplazo(e.target.value)}
                  className="pl-9"
                />
              </div>

              {simReemplazo && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">SIM seleccionada:</p>
                  <SimCard
                    sim={simReemplazo}
                    selected={true}
                    onSelect={() => setSimReemplazo(null)}
                    type="reemplazo"
                  />
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {loadingDisponibles ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">Cargando SIMs...</p>
                  </div>
                ) : simsDisponibles.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    {searchReemplazo.length >= 3 ? 'No se encontraron SIMs disponibles' : 'Escribe al menos 3 caracteres para buscar'}
                  </p>
                ) : (
                  simsDisponibles.map(sim => (
                    <SimCard
                      key={sim.id}
                      sim={sim}
                      selected={simReemplazo?.id === sim.id}
                      onSelect={setSimReemplazo}
                      type="reemplazo"
                    />
                  ))
                )}
              </div>
            </CardContent>
            </Card>
          </div>
        )}

        {/* Información del Cliente y Motivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles de la Devolución
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la devolución *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe detalladamente el problema con la SIM (mínimo 10 caracteres)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
                minLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                {motivo.length}/10 caracteres mínimo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Cliente
                </label>
                <Input
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identificación
                </label>
                <Input
                  value={clienteIdentificacion}
                  onChange={(e) => setClienteIdentificacion(e.target.value)}
                  placeholder="Cédula o documento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <Input
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Número de contacto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              motivo.length < 10 ||
              (tipoDevolucion === 'intercambio' && (!simDefectuosa || !simReemplazo)) ||
              (tipoDevolucion === 'devolucion_dinero' && (!ventaSeleccionada || !montoDevuelto || parseFloat(montoDevuelto) <= 0))
            }
            className="flex items-center gap-2"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting
              ? 'Registrando...'
              : tipoDevolucion === 'intercambio'
                ? 'Registrar Intercambio'
                : 'Registrar Devolución'
            }
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormularioDevolucion;