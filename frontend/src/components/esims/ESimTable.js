import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const ESimTable = ({ esims, onRefresh }) => {
  const [selectedEsim, setSelectedEsim] = useState(null);

  const getEstadoBadge = (estado) => {
    const variants = {
      disponible: { color: 'bg-green-500', text: 'Disponible' },
      vendida: { color: 'bg-blue-500', text: 'Vendida' },
      vencida: { color: 'bg-yellow-500', text: 'Vencida' },
      inactiva: { color: 'bg-gray-500', text: 'Inactiva' }
    };

    const variant = variants[estado] || { color: 'bg-gray-500', text: estado };

    return (
      <Badge className={variant.color}>
        {variant.text}
      </Badge>
    );
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getDiasRestantes = (esim) => {
    if (!esim.dias_restantes || esim.estado !== 'vendida') return null;

    const dias = esim.dias_restantes;
    let color = 'text-green-600';

    if (dias <= 3) color = 'text-red-600 font-bold';
    else if (dias <= 7) color = 'text-yellow-600 font-semibold';

    return <span className={color}>{dias} días</span>;
  };

  const handleVerQR = (esim) => {
    if (esim.qr_code_data) {
      setSelectedEsim(esim);
    }
  };

  const closeQRModal = () => {
    setSelectedEsim(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ICCID</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Fecha Venta</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Días Restantes</TableHead>
              <TableHead>Regeneraciones</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {esims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  No se encontraron eSIMs
                </TableCell>
              </TableRow>
            ) : (
              esims.map((esim) => (
                <TableRow
                  key={esim.id}
                  className={esim.esta_por_vencer ? 'bg-yellow-50' : ''}
                >
                  <TableCell className="font-mono text-sm">
                    {esim.iccid}
                  </TableCell>
                  <TableCell className="font-mono">
                    {esim.numero_telefono}
                  </TableCell>
                  <TableCell>{esim.operador || '-'}</TableCell>
                  <TableCell>{getEstadoBadge(esim.estado)}</TableCell>
                  <TableCell>
                    {esim.plan_nombre ? (
                      <div>
                        <p className="font-medium">{esim.plan_nombre}</p>
                        <p className="text-xs text-gray-500">
                          {esim.plan_dias} días
                        </p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatFecha(esim.fecha_venta)}</TableCell>
                  <TableCell>{formatFecha(esim.fecha_vencimiento)}</TableCell>
                  <TableCell>{getDiasRestantes(esim) || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {esim.historial_regeneraciones || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {esim.qr_code_data && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerQR(esim)}
                        >
                          Ver QR
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de QR Code */}
      {selectedEsim && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeQRModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Código QR de eSIM</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeQRModal}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">ICCID</p>
                <p className="font-mono font-semibold">{selectedEsim.iccid}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Número</p>
                <p className="font-mono font-semibold">{selectedEsim.numero_telefono}</p>
              </div>

              {selectedEsim.qr_code_data && (
                <div className="flex justify-center">
                  {selectedEsim.qr_code_data.startsWith('data:image') ? (
                    <img
                      src={selectedEsim.qr_code_data}
                      alt="QR Code"
                      className="max-w-full h-auto"
                    />
                  ) : (
                    <div className="bg-gray-100 p-4 rounded">
                      <p className="text-xs font-mono break-all">
                        {selectedEsim.qr_code_data}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    // Copiar QR data al portapapeles
                    navigator.clipboard.writeText(selectedEsim.qr_code_data);
                    alert('Datos del QR copiados al portapapeles');
                  }}
                >
                  Copiar Datos
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={closeQRModal}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ESimTable;
