import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
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
      const packages = await winredService.getPackages(productParentId);
      setWinredPackages(packages);

      // Clear selections if they're no longer valid
      if (!packages.find(p => String(p.product_id) === String(selectedPackageBulkId))) {
        setSelectedPackageBulkId('');
      }
      if (!packages.find(p => String(p.product_id) === String(selectedPackageSingleId))) {
        setSelectedPackageSingleId('');
      }
    } catch (error) {
      console.warn('Winred packages error:', error?.response?.data || error.message);
      setWinredPackages([]);
      setSelectedPackageBulkId('');
      setSelectedPackageSingleId('');
      showNotification('Error cargando paquetes Winred', 'error');
    }
  };

  const fetchWinredBalance = async () => {
    try {
      const balanceData = await winredService.getBalance();
      setWinredBalance({
        balance: balanceData.balance ?? null,
        discount: balanceData.discount ?? null
      });
    } catch (error) {
      console.error('Error fetching Winred balance:', error);
      setWinredBalance({ balance: null, discount: null });
    }
  };

  const fetchLotes = async () => {
    try {
      const data = await simsService.getLotes();
      setLotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching lotes:', error);
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
      {/* ====== RECARGAS (WINRED) ====== */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recargas (Winred)</span>

            {/* Saldos Winred */}
            <div className="text-sm">
              <Badge variant="outline" className="mr-2">
                Saldo: {winredBalance?.balance !== null && winredBalance?.balance !== undefined
                  ? formatPrice(winredBalance.balance)
                  : "—"}
              </Badge>
              <Badge variant="outline">
                Descuentos: {winredBalance?.discount !== null && winredBalance?.discount !== undefined
                  ? formatPrice(winredBalance.discount)
                  : "—"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ------- Filtros / Selecciones (Lote) ------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lote */}
            <div className="col-span-1">
              <Label className="mb-1 block">Lote a recargar</Label>
              <Select value={loteParaRecargar || ""} onValueChange={setLoteParaRecargar}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map(l => (
                    <SelectItem key={String(l.lote_id)} value={String(l.lote_id)}>
                      {l.lote_id} — {l.operador} ({l.total_sims} SIMs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operador (filtra paquetes) */}
            <div className="col-span-1">
              <Label className="mb-1 block">Operador</Label>
              <Select
                value={selectedOperador}
                onValueChange={(v) => {
                  setSelectedOperador(v);
                  const id = Number(v) || 0; // 0=Todos, 1=Claro, 2=Movistar, 3=Tigo
                  // Limpia ambos selects para que sean independientes
                  setSelectedPackageBulkId("");
                  setSelectedPackageSingleId("");
                  fetchWinredPackages(id);
                }}
              >
                <SelectTrigger>
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

            {/* Paquete Winred (para LOTE) */}
            <div className="col-span-1">
              <Label className="mb-1 block">Paquete Winred</Label>
              <Select value={selectedPackageBulkId} onValueChange={setSelectedPackageBulkId}>
                <SelectTrigger>
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
                Para paquetes, Winred requiere <b>amount=0</b>. El cargo se hace con el <b>product_id</b> del paquete.
              </p>
            </div>
          </div>

          {/* Acción Lote */}
          <div className="flex items-center justify-end">
            <Button
              className="bg-green-600 hover:bg-green-700"
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
              Recargar lote seleccionado
            </Button>
          </div>

          <Separator className="my-2" />

          {/* ------- RECARGA INDIVIDUAL ------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Número a recargar */}
            <div className="col-span-1">
              <Label className="mb-1 block">Número / Suscriber</Label>
              <Input
                placeholder="Ej: 3181234567"
                value={msisdnToTopup}
                onChange={(e) => setMsisdnToTopup(e.target.value.replace(/[^\d]/g, ""))}
                maxLength={15}
              />
            </div>

            {/* Paquete (Individual) */}
            <div className="col-span-1">
              <Label className="mb-1 block">Paquete</Label>
              <Select value={selectedPackageSingleId} onValueChange={setSelectedPackageSingleId}>
                <SelectTrigger>
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

            {/* Botón Individual */}
            <div className="col-span-1 flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
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
                Recargar número
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
        <DialogContent className="max-w-2xl max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {recargaStatus === 'idle' && `Confirmar ${tipoRecarga === 'lote' ? 'Recarga de Lote' : 'Recarga Individual'}`}
              {recargaStatus === 'processing' && 'Procesando Recarga...'}
              {recargaStatus === 'completed' && 'Recarga Completada Exitosamente'}
              {recargaStatus === 'completed_with_errors' && 'Recarga Completada con Errores'}
              {recargaStatus === 'error' && 'Error en Recarga'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-auto">
            {recargaStatus === 'idle' && (
              <>
                {tipoRecarga === 'lote' && (
                  <div>
                    <p><strong>Lote:</strong> {paramsRecarga.lote_id}</p>
                    <p><strong>Paquete ID:</strong> {paramsRecarga.product_id}</p>
                  </div>
                )}

                {tipoRecarga === 'individual' && (
                  <div>
                    <p><strong>Número:</strong> {paramsRecarga.subscriber}</p>
                    <p><strong>Paquete ID:</strong> {paramsRecarga.product_id}</p>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  ¿Confirmas esta operación de recarga?
                </p>
              </>
            )}

            {(recargaStatus === 'processing' || recargaStatus === 'completed' || recargaStatus === 'completed_with_errors' || recargaStatus === 'error') && recargaProgress.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-md max-h-[400px] overflow-y-auto">
                <div className="space-y-1 font-mono text-xs">
                  {recargaProgress.map((log, idx) => (
                    <div
                      key={idx}
                      className={`${
                        log.type === 'success' ? 'text-green-700' :
                        log.type === 'error' ? 'text-red-700' :
                        log.type === 'warning' ? 'text-yellow-700' :
                        log.type === 'processing' ? 'text-blue-700' :
                        'text-gray-700'
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
              <div className="flex gap-3">
                <Button
                  onClick={ejecutarRecarga}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Procesando...' : 'Confirmar Recarga'}
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
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setShowRecargaModal(false);
                    setRecargaProgress([]);
                    setRecargaStatus('idle');
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
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