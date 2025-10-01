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

  // Individual recharge
  const [msisdnToTopup, setMsisdnToTopup] = useState('');

  // Modal state
  const [showRecargaModal, setShowRecargaModal] = useState(false);
  const [tipoRecarga, setTipoRecarga] = useState('');
  const [paramsRecarga, setParamsRecarga] = useState({});

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
        await winredService.topupIndividual(paramsRecarga);
        showNotification('Recarga individual exitosa', 'success');
      } else if (tipoRecarga === 'lote') {
        await winredService.topupLote(paramsRecarga);
        showNotification('Recarga de lote exitosa', 'success');
      }

      // Refresh balance
      await fetchWinredBalance();

      // Clear form
      setMsisdnToTopup('');
      setLoteParaRecargar('');
      setSelectedPackageBulkId('');
      setSelectedPackageSingleId('');

      setShowRecargaModal(false);
    } catch (error) {
      console.error('Error en recarga:', error);
      const msg = error?.response?.data?.detail || 'Error en la recarga';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
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
                defaultValue="1"
                onValueChange={(v) => {
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

      {/* Modal de Confirmación */}
      <Dialog open={showRecargaModal} onOpenChange={setShowRecargaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirmar {tipoRecarga === 'lote' ? 'Recarga de Lote' : 'Recarga Individual'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsManagement;