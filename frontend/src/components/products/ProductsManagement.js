import React, { useState, useEffect } from 'react';
import { Phone, Wallet, Package, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { winredService } from '../../services/winredService';
import { simsService } from '../../services/simsService';
import { useApp } from '../../context/AppContext';

const ProductsManagement = () => {
  const { showNotification, loading, setLoading } = useApp();

  // Winred state
  const [winredPackages, setWinredPackages] = useState([]);
  const [winredBalance, setWinredBalance] = useState({ balance: null, discount: null });

  // Lotes state
  const [lotes, setLotes] = useState([]);
  const [loteParaRecargar, setLoteParaRecargar] = useState('');

  // Package selection
  const [selectedPackageBulkId, setSelectedPackageBulkId] = useState('');
  const [selectedPackageSingleId, setSelectedPackageSingleId] = useState('');
  const [selectedOperador, setSelectedOperador] = useState('1');

  // Individual recharge
  const [msisdnToTopup, setMsisdnToTopup] = useState('');

  // Modal state
  const [showRecargaModal, setShowRecargaModal] = useState(false);
  const [tipoRecarga, setTipoRecarga] = useState('');
  const [paramsRecarga, setParamsRecarga] = useState({});

  // Progreso de recarga
  const [recargaProgress, setRecargaProgress] = useState([]);
  const [recargaStatus, setRecargaStatus] = useState('idle'); // idle, processing, completed, error
  const progressEndRef = React.useRef(null);

  // Auto-scroll al final del progreso
  useEffect(() => {
    if (progressEndRef.current && recargaProgress.length > 0) {
      progressEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [recargaProgress]);

  useEffect(() => {
    fetchWinredPackages();
    fetchWinredBalance();
    fetchLotes();
  }, []);

  const fetchWinredPackages = async (productParentId = 1) => {
    try {
      console.log('📦 Fetching Winred packages with productParentId:', productParentId);
      const packages = await winredService.getPackages(productParentId);
      console.log('✅ Packages received:', packages);
      setWinredPackages(packages);

      // Clear selections if they're no longer valid
      if (!packages.find(p => String(p.product_id) === String(selectedPackageBulkId))) {
        setSelectedPackageBulkId('');
      }
      if (!packages.find(p => String(p.product_id) === String(selectedPackageSingleId))) {
        setSelectedPackageSingleId('');
      }
    } catch (error) {
      console.error('❌ Winred packages error:', error?.response?.data || error.message);
      setWinredPackages([]);
      setSelectedPackageBulkId('');
      setSelectedPackageSingleId('');
      showNotification('Error cargando paquetes Winred', 'error');
    }
  };

  const fetchWinredBalance = async () => {
    try {
      console.log('💰 Fetching Winred balance...');
      const balanceData = await winredService.getBalance();
      console.log('✅ Balance received:', balanceData);
      setWinredBalance({
        balance: balanceData.balance ?? null,
        discount: balanceData.discount ?? null
      });
    } catch (error) {
      console.error('❌ Error fetching Winred balance:', error);
      setWinredBalance({ balance: null, discount: null });
    }
  };

  const fetchLotes = async () => {
    try {
      console.log('📋 Fetching lotes...');
      const data = await simsService.getLotes();
      console.log('✅ Lotes received:', data);
      setLotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching lotes:', error);
      setLotes([]);
    }
  };

  const ejecutarRecarga = async () => {
    if (!paramsRecarga || !tipoRecarga) return;

    try {
      setLoading(true);

      if (tipoRecarga === 'individual') {
        const result = await winredService.topupIndividual(paramsRecarga);
        console.log('✅ Resultado recarga individual:', result);
        showNotification(`Recarga individual exitosa. Filas actualizadas: ${result.updated_rows || 0}`, 'success');

        // Refresh balance AND lotes
        await Promise.all([
          fetchWinredBalance(),
          fetchLotes()
        ]);

        // Clear form
        setMsisdnToTopup('');
        setSelectedPackageSingleId('');
        setShowRecargaModal(false);
        setLoading(false);

      } else if (tipoRecarga === 'lote') {
        // Recarga de lote con progreso en tiempo real
        setRecargaStatus('processing');
        setRecargaProgress([]);

        const eventSource = new EventSource(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/winred/topup_lote_stream?` +
          new URLSearchParams({
            lote_id: paramsRecarga.lote_id,
            product_id: paramsRecarga.product_id,
            amount: paramsRecarga.amount,
            sell_from: paramsRecarga.sell_from
          })
        );

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('📡 Evento SSE:', data);

          if (data.type === 'start') {
            setRecargaProgress([{ type: 'info', message: `Iniciando recarga de ${data.total} SIMs del lote ${data.lote_id}...` }]);
          } else if (data.type === 'processing') {
            setRecargaProgress(prev => [...prev, { type: 'processing', message: `[${data.index}/${data.total}] Procesando ${data.msisdn}...` }]);
          } else if (data.type === 'success') {
            setRecargaProgress(prev => [...prev, { type: 'success', message: `[${data.index}/${data.total}] ✅ ${data.msisdn} recargado exitosamente` }]);
          } else if (data.type === 'error') {
            setRecargaProgress(prev => [...prev, { type: 'error', message: `[${data.index}/${data.total}] ❌ ${data.msisdn} falló: ${data.error}` }]);
          } else if (data.type === 'retry') {
            setRecargaProgress(prev => [...prev, { type: 'warning', message: `🔄 Reintentando ${data.msisdn} (intento ${data.attempt}/3)...` }]);
          } else if (data.type === 'complete') {
            setRecargaProgress(prev => [...prev, {
              type: 'info',
              message: `\n✅ Recarga completada: ${data.successful}/${data.processed} exitosas, ${data.failed} fallidas`
            }]);
            setRecargaStatus(data.failed === 0 ? 'completed' : 'completed_with_errors');

            if (data.failed > 0 && data.failed_details) {
              data.failed_details.forEach(f => {
                setRecargaProgress(prev => [...prev, {
                  type: 'error',
                  message: `   ❌ ${f.msisdn}: ${f.error}`
                }]);
              });
            }

            eventSource.close();
            setLoading(false);

            // Refresh balance AND lotes
            setTimeout(async () => {
              await Promise.all([
                fetchWinredBalance(),
                fetchLotes()
              ]);
            }, 1000);

            // Mostrar notificación final
            if (data.failed === 0) {
              showNotification(`Recarga exitosa: ${data.successful}/${data.processed} SIMs`, 'success');
            } else {
              showNotification(`Recarga completada con ${data.failed} errores. Ver detalles.`, 'error');
            }

            // Clear form
            setLoteParaRecargar('');
            setSelectedPackageBulkId('');
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ Error SSE:', error);
          setRecargaProgress(prev => [...prev, { type: 'error', message: '❌ Error en la conexión con el servidor' }]);
          setRecargaStatus('error');
          eventSource.close();
          setLoading(false);
          showNotification('Error en la recarga. Revisa los detalles.', 'error');
        };

        // No cerramos el modal aquí, el usuario lo cierra manualmente después de ver el resultado
      }

    } catch (error) {
      console.error('Error en recarga:', error);
      const msg = error?.response?.data?.detail || 'Error en la recarga';
      showNotification(msg, 'error');
      setLoading(false);
      setRecargaStatus('error');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(price || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Saldo Winred */}
        <Card className="bg-gradient-to-br from-localsim-teal-500 to-localsim-teal-600 border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Saldo Disponible</p>
                <h3 className="text-3xl font-bold text-white mt-1">
                  {winredBalance?.balance !== null && winredBalance?.balance !== undefined
                    ? formatPrice(winredBalance.balance)
                    : formatPrice(0)}
                </h3>
                {(winredBalance?.balance === null || winredBalance?.balance === undefined) && (
                  <p className="text-white/60 text-xs mt-1">No configurado</p>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Descuentos */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Descuentos</p>
                <h3 className="text-3xl font-bold text-white mt-1">
                  {winredBalance?.discount !== null && winredBalance?.discount !== undefined
                    ? formatPrice(winredBalance.discount)
                    : formatPrice(0)}
                </h3>
                {(winredBalance?.discount === null || winredBalance?.discount === undefined) && (
                  <p className="text-white/60 text-xs mt-1">No configurado</p>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total lotes */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Lotes Disponibles</p>
                <h3 className="text-3xl font-bold text-white mt-1">{lotes.length}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recarga de Lote */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-localsim-teal-50 to-white border-b">
          <CardTitle className="flex items-center gap-2 text-localsim-teal-700">
            <Package className="h-5 w-5" />
            Recarga por Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lote */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Lote a recargar</Label>
              <Select value={loteParaRecargar || ""} onValueChange={setLoteParaRecargar}>
                <SelectTrigger className="border-2 focus:border-localsim-teal-500">
                  <SelectValue placeholder="Selecciona un lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map(l => (
                    <SelectItem key={String(l.lote_id)} value={String(l.lote_id)}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{l.lote_id}</Badge>
                        <span>{l.operador}</span>
                        <span className="text-gray-500">({l.total_sims} SIMs)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operador */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Operador</Label>
              <Select
                value={selectedOperador}
                onValueChange={(v) => {
                  setSelectedOperador(v);
                  const id = Number(v) || 0;
                  setSelectedPackageBulkId("");
                  setSelectedPackageSingleId("");
                  fetchWinredPackages(id);
                }}
              >
                <SelectTrigger className="border-2 focus:border-localsim-teal-500">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="1">CLARO</SelectItem>
                  <SelectItem value="2">MOVISTAR</SelectItem>
                  <SelectItem value="3">TIGO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paquete */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Paquete Winred</Label>
              <Select value={selectedPackageBulkId} onValueChange={setSelectedPackageBulkId}>
                <SelectTrigger className="border-2 focus:border-localsim-teal-500">
                  <SelectValue placeholder="Selecciona un paquete" />
                </SelectTrigger>
                <SelectContent>
                  {(winredPackages || []).map(p => (
                    <SelectItem key={String(p.product_id)} value={String(p.product_id)}>
                      {`${p.name} — ${formatPrice(Number(p.price))}${p.validity ? ` [${p.validity}]` : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                * Winred requiere amount=0 para paquetes
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-2 shadow-md hover:shadow-lg transition-all"
              onClick={() => {
                setTipoRecarga('lote');
                setParamsRecarga({
                  lote_id: loteParaRecargar,
                  product_id: Number(selectedPackageBulkId),
                  amount: 0,
                  sell_from: "S",
                });
                setShowRecargaModal(true);
              }}
              disabled={!loteParaRecargar || !selectedPackageBulkId}
              title={!loteParaRecargar || !selectedPackageBulkId ? "Selecciona lote y paquete" : ""}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Recargar Lote Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recarga Individual */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Phone className="h-5 w-5" />
            Recarga Individual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Número */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Número / Suscriber</Label>
              <Input
                placeholder="Ej: 3181234567"
                value={msisdnToTopup}
                onChange={(e) => setMsisdnToTopup(e.target.value.replace(/[^\d]/g, ""))}
                maxLength={15}
                className="border-2 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* Paquete Individual */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Paquete</Label>
              <Select value={selectedPackageSingleId} onValueChange={setSelectedPackageSingleId}>
                <SelectTrigger className="border-2 focus:border-purple-500">
                  <SelectValue placeholder="Selecciona un paquete" />
                </SelectTrigger>
                <SelectContent>
                  {(winredPackages || []).map(p => (
                    <SelectItem key={String(p.product_id)} value={String(p.product_id)}>
                      {`${p.name} — ${formatPrice(Number(p.price))}${p.validity ? ` [${p.validity}]` : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botón */}
            <div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium shadow-md hover:shadow-lg transition-all"
                disabled={!msisdnToTopup || !selectedPackageSingleId}
                onClick={() => {
                  setTipoRecarga('individual');
                  setParamsRecarga({
                    product_id: Number(selectedPackageSingleId),
                    amount: 0,
                    subscriber: msisdnToTopup,
                    sell_from: "S",
                  });
                  setShowRecargaModal(true);
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Recargar Número
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmación/Progreso */}
      <Dialog open={showRecargaModal} onOpenChange={(open) => {
        if (!loading || recargaStatus === 'completed' || recargaStatus === 'completed_with_errors' || recargaStatus === 'error') {
          setShowRecargaModal(open);
          if (!open) {
            setRecargaProgress([]);
            setRecargaStatus('idle');
          }
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {recargaStatus === 'idle' && (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  {`Confirmar ${tipoRecarga === 'lote' ? 'Recarga de Lote' : 'Recarga Individual'}`}
                </>
              )}
              {recargaStatus === 'processing' && (
                <>
                  <Loader2 className="h-5 w-5 text-localsim-teal-600 animate-spin" />
                  Procesando Recarga...
                </>
              )}
              {recargaStatus === 'completed' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Recarga Completada Exitosamente
                </>
              )}
              {recargaStatus === 'completed_with_errors' && (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Recarga Completada con Errores
                </>
              )}
              {recargaStatus === 'error' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Error en Recarga
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-auto">
            {recargaStatus === 'idle' && (
              <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                {tipoRecarga === 'lote' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Lote:</span>
                      <Badge variant="outline" className="text-base">{paramsRecarga.lote_id}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Paquete ID:</span>
                      <Badge variant="outline" className="text-base">{paramsRecarga.product_id}</Badge>
                    </div>
                  </div>
                )}

                {tipoRecarga === 'individual' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Número:</span>
                      <Badge variant="outline" className="text-base">{paramsRecarga.subscriber}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Paquete ID:</span>
                      <Badge variant="outline" className="text-base">{paramsRecarga.product_id}</Badge>
                    </div>
                  </div>
                )}

                <Separator />
                <p className="text-sm text-gray-700 text-center">
                  ¿Confirmas esta operación de recarga?
                </p>
              </div>
            )}

            {(recargaStatus === 'processing' || recargaStatus === 'completed' || recargaStatus === 'completed_with_errors' || recargaStatus === 'error') && recargaProgress.length > 0 && (
              <div className="bg-gray-900 p-4 rounded-lg max-h-[400px] overflow-y-auto">
                <div className="space-y-1 font-mono text-sm">
                  {recargaProgress.map((log, idx) => (
                    <div
                      key={idx}
                      className={`${
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'processing' ? 'text-cyan-400' :
                        'text-gray-300'
                      }`}
                    >
                      {log.message}
                    </div>
                  ))}
                  <div ref={progressEndRef} />
                </div>
              </div>
            )}

            {recargaStatus === 'idle' && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={ejecutarRecarga}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar Recarga
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRecargaModal(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            )}

            {(recargaStatus === 'completed' || recargaStatus === 'completed_with_errors' || recargaStatus === 'error') && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => {
                    setShowRecargaModal(false);
                    setRecargaProgress([]);
                    setRecargaStatus('idle');
                  }}
                  className="bg-localsim-teal-500 hover:bg-localsim-teal-600"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsManagement;
