import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import esimsService from '../../services/esimsService';

const QRRegenerationUpload = ({ onRegeneracionCompleta, esimsVencidas }) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedQRs, setExtractedQRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('upload'); // 'upload', 'extracted', 'matching', 'completed'
  const [matchings, setMatchings] = useState([]);
  const [regenerating, setRegenerating] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setExtractedQRs([]);
      setMatchings([]);
      setStep('upload');
    } else {
      alert('Por favor selecciona un archivo PDF válido');
    }
  };

  const handleExtractQRs = async () => {
    if (!pdfFile) {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    try {
      setLoading(true);
      const result = await esimsService.extractQrsFromPdf(pdfFile);

      if (result.qr_codes && result.qr_codes.length > 0) {
        setExtractedQRs(result.qr_codes);

        // Auto-matching: Crear matching automático con eSIMs vencidas
        const autoMatchings = result.qr_codes.map((qr, index) => ({
          qr_data: qr.qr_data,
          qr_image: qr.qr_image_base64,
          page: qr.page,
          position: qr.position,
          esim_id: esimsVencidas[index]?.id || null,
          esim_iccid: esimsVencidas[index]?.iccid || null,
          esim_numero: esimsVencidas[index]?.numero_telefono || null
        }));

        setMatchings(autoMatchings);
        setStep('matching');
      } else {
        alert('No se encontraron códigos QR en el PDF');
      }
    } catch (error) {
      console.error('Error extrayendo QRs:', error);
      alert('Error extrayendo códigos QR del PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleEsimChange = (matchingIndex, esimId) => {
    const selectedEsim = esimsVencidas.find(e => e.id === esimId);

    setMatchings(prev => prev.map((m, i) =>
      i === matchingIndex
        ? {
            ...m,
            esim_id: esimId,
            esim_iccid: selectedEsim?.iccid || null,
            esim_numero: selectedEsim?.numero_telefono || null
          }
        : m
    ));
  };

  const handleRegenerar = async () => {
    // Validar que todos tengan eSIM asignada
    const incompletos = matchings.filter(m => !m.esim_id);
    if (incompletos.length > 0) {
      alert(`Hay ${incompletos.length} QRs sin eSIM asignada. Por favor completa todas las asignaciones.`);
      return;
    }

    // Validar duplicados
    const esimIds = matchings.map(m => m.esim_id);
    const duplicados = esimIds.filter((id, index) => esimIds.indexOf(id) !== index);
    if (duplicados.length > 0) {
      alert('Hay eSIMs duplicadas en las asignaciones. Cada eSIM debe usarse solo una vez.');
      return;
    }

    try {
      setRegenerating(true);

      const regeneraciones = matchings.map(m => ({
        esim_id: m.esim_id,
        qr_data: m.qr_data
      }));

      const result = await esimsService.regenerarQrsBulk(regeneraciones);

      alert(`¡Éxito! ${result.esims.length} eSIMs regeneradas correctamente`);
      setStep('completed');

      // Limpiar estado después de 2 segundos
      setTimeout(() => {
        setPdfFile(null);
        setExtractedQRs([]);
        setMatchings([]);
        setStep('upload');
        if (onRegeneracionCompleta) {
          onRegeneracionCompleta();
        }
      }, 2000);
    } catch (error) {
      console.error('Error regenerando QRs:', error);
      alert('Error regenerando códigos QR');
    } finally {
      setRegenerating(false);
    }
  };

  const resetProcess = () => {
    setPdfFile(null);
    setExtractedQRs([]);
    setMatchings([]);
    setStep('upload');
  };

  return (
    <div className="space-y-6">
      {/* Paso 1: Upload PDF */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="text-lg font-semibold">
                  {pdfFile ? pdfFile.name : 'Seleccionar archivo PDF'}
                </p>
                <p className="text-sm text-gray-500">
                  PDF con códigos QR de eSIMs regeneradas
                </p>
              </div>
            </label>
          </div>

          {pdfFile && (
            <div className="flex gap-2">
              <Button
                onClick={handleExtractQRs}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Extrayendo QRs...' : 'Extraer Códigos QR'}
              </Button>
              <Button
                variant="outline"
                onClick={resetProcess}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Paso 2: Matching de QRs con eSIMs */}
      {step === 'matching' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">
                {extractedQRs.length} códigos QR extraídos
              </h3>
              <p className="text-sm text-gray-600">
                Asigna cada QR a una eSIM vencida
              </p>
            </div>
            <Button
              variant="outline"
              onClick={resetProcess}
              size="sm"
            >
              Reiniciar
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {matchings.map((matching, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* QR Code */}
                    <div className="flex items-center space-x-3">
                      {matching.qr_image && (
                        <img
                          src={matching.qr_image}
                          alt={`QR ${index + 1}`}
                          className="w-16 h-16 object-contain"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          QR #{index + 1}
                        </p>
                        <p className="text-xs text-gray-500">
                          Página {matching.page}
                        </p>
                      </div>
                    </div>

                    {/* Selector de eSIM */}
                    <div className="flex-1">
                      <select
                        value={matching.esim_id || ''}
                        onChange={(e) => handleEsimChange(index, e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Seleccionar eSIM...</option>
                        {esimsVencidas.map(esim => (
                          <option key={esim.id} value={esim.id}>
                            {esim.iccid} - {esim.numero_telefono}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Estado del matching */}
                    <div>
                      {matching.esim_id ? (
                        <Badge className="bg-green-500">
                          ✓ Asignado
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRegenerar}
              disabled={regenerating || matchings.some(m => !m.esim_id)}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {regenerating ? 'Regenerando...' : `Regenerar ${matchings.length} eSIMs`}
            </Button>
          </div>
        </div>
      )}

      {/* Paso 3: Completado */}
      {step === 'completed' && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-semibold text-green-600 mb-2">
            ¡Regeneración Completada!
          </h3>
          <p className="text-gray-600">
            Los códigos QR han sido actualizados exitosamente
          </p>
        </div>
      )}

      {/* Información adicional */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-900">ℹ️ Información:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Sube el PDF que contiene los códigos QR regenerados</li>
              <li>El sistema extraerá automáticamente todos los QRs</li>
              <li>Asigna cada QR a una eSIM vencida</li>
              <li>Las eSIMs se marcarán como disponibles automáticamente</li>
              <li>Hay {esimsVencidas.length} eSIM(s) vencida(s) disponible(s) para regenerar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRRegenerationUpload;
