import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Plus, Minus, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';

const InventarioSimForm = ({
  title = "Inventario de SIMs",
  inventarios = [],
  onInventariosChange,
  planesDisponibles = [],
  showObservaciones = true,
  readonly = false,
  inventariosApertura = [] // Para mostrar comparación en cierre
}) => {
  const [inventariosInternos, setInventariosInternos] = useState([]);

  // Inicializar inventarios basado en planes disponibles
  useEffect(() => {
    if (planesDisponibles.length > 0 && inventarios.length === 0) {
      const iniciales = planesDisponibles.map(plan => ({
        plan: plan.plan,
        cantidad_reportada: 0,
        observaciones: '',
        cantidad_disponible: plan.cantidad_disponible || 0
      }));
      setInventariosInternos(iniciales);
      onInventariosChange && onInventariosChange(iniciales);
    } else {
      setInventariosInternos(inventarios);
    }
  }, [planesDisponibles, inventarios]);

  const actualizarInventario = (index, campo, valor) => {
    if (readonly) return;

    const nuevosInventarios = [...inventariosInternos];
    nuevosInventarios[index] = {
      ...nuevosInventarios[index],
      [campo]: campo === 'cantidad_reportada' ? parseInt(valor) || 0 : valor
    };
    setInventariosInternos(nuevosInventarios);
    onInventariosChange && onInventariosChange(nuevosInventarios);
  };

  const agregarPlan = () => {
    if (readonly) return;

    const nuevoPlan = {
      plan: '',
      cantidad_reportada: 0,
      observaciones: '',
      cantidad_disponible: 0
    };
    const nuevosInventarios = [...inventariosInternos, nuevoPlan];
    setInventariosInternos(nuevosInventarios);
    onInventariosChange && onInventariosChange(nuevosInventarios);
  };

  const removerPlan = (index) => {
    if (readonly) return;

    const nuevosInventarios = inventariosInternos.filter((_, i) => i !== index);
    setInventariosInternos(nuevosInventarios);
    onInventariosChange && onInventariosChange(nuevosInventarios);
  };

  const getPlanColor = (plan) => {
    const colors = {
      'R5': 'bg-blue-100 text-blue-800',
      'R7': 'bg-green-100 text-green-800',
      'R15': 'bg-orange-100 text-orange-800',
      'R30': 'bg-purple-100 text-purple-800'
    };
    return colors[plan] || 'bg-gray-100 text-gray-800';
  };

  const getTotalInventario = () => {
    return inventariosInternos.reduce((total, inv) => total + (inv.cantidad_reportada || 0), 0);
  };

  const getTotalDisponible = () => {
    return inventariosInternos.reduce((total, inv) => total + (inv.cantidad_disponible || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {title}
        </CardTitle>
        {inventariosInternos.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div>Total reportado: <span className="font-medium">{getTotalInventario()}</span></div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!readonly && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Registra la cantidad exacta de SIMs que tienes por cada plan.
              Esta información será utilizada para el control de inventarios.
            </AlertDescription>
          </Alert>
        )}

        {inventariosInternos.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No hay inventarios registrados</p>
            {!readonly && (
              <Button onClick={agregarPlan} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Plan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {inventariosInternos.map((inventario, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {readonly ? (
                      <Badge className={getPlanColor(inventario.plan)}>
                        {inventario.plan}
                      </Badge>
                    ) : (
                      <div className="flex-1">
                        <Label htmlFor={`plan-${index}`}>Plan</Label>
                        <Input
                          id={`plan-${index}`}
                          value={inventario.plan}
                          onChange={(e) => actualizarInventario(index, 'plan', e.target.value)}
                          placeholder="Ej: R5, R7, R15, R30"
                          className="mt-1"
                        />
                      </div>
                    )}

                  </div>

                  {!readonly && inventariosInternos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerPlan(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Mostrar referencia de apertura si existe */}
                {inventariosApertura.length > 0 && !readonly && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <div className="text-xs text-blue-700 font-medium mb-1">📦 Cantidad Inicial en Apertura:</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {inventariosApertura.find(inv => inv.plan === inventario.plan)?.cantidad_reportada || 0} SIMs
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Ingresa cuántas SIMs de este plan tienes ahora</div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`cantidad-${index}`}>
                      Cantidad que Tienes Ahora *
                    </Label>
                    <Input
                      id={`cantidad-${index}`}
                      type="number"
                      min="0"
                      value={inventario.cantidad_reportada || ''}
                      onChange={(e) => actualizarInventario(index, 'cantidad_reportada', e.target.value)}
                      placeholder="0"
                      className="mt-1 text-lg font-semibold"
                      readOnly={readonly}
                    />
                    {inventariosApertura.length > 0 && !readonly && (
                      <div className="mt-1">
                        {(() => {
                          const inicial = inventariosApertura.find(inv => inv.plan === inventario.plan)?.cantidad_reportada || 0;
                          const actual = inventario.cantidad_reportada || 0;
                          const diferencia = actual - inicial;

                          return (
                            <div className={`text-xs font-medium ${
                              diferencia === 0 ? 'text-gray-600' :
                              diferencia > 0 ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {diferencia === 0 ? 'Sin cambios respecto a apertura' :
                               diferencia > 0 ? `+${diferencia} más que en apertura` :
                               `${diferencia} menos que en apertura (vendidas/usadas)`}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {showObservaciones && (
                    <div>
                      <Label htmlFor={`observaciones-${index}`}>
                        Observaciones
                      </Label>
                      <Textarea
                        id={`observaciones-${index}`}
                        value={inventario.observaciones || ''}
                        onChange={(e) => actualizarInventario(index, 'observaciones', e.target.value)}
                        placeholder="Notas sobre este inventario..."
                        className="mt-1"
                        rows={2}
                        readOnly={readonly}
                      />
                    </div>
                  )}
                </div>

                {/* Mostrar análisis de descuadres si hay datos completos */}
                {readonly && inventario.cantidad_inicial_reportada !== undefined && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Análisis de Inventario</h4>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Apertura:</span>
                        <div className="font-medium">{inventario.cantidad_inicial_reportada || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Ventas:</span>
                        <div className="font-medium">{inventario.ventas_realizadas || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Teórico:</span>
                        <div className="font-medium">{inventario.inventario_teorico || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Reportado:</span>
                        <div className="font-medium">{inventario.cantidad_final_reportada || 'N/A'}</div>
                      </div>
                    </div>

                    {inventario.diferencia_final !== undefined && inventario.diferencia_final !== null && (
                      <div className="mt-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Descuadre:</span>
                          <div className={`font-bold text-lg ${
                            inventario.diferencia_final === 0 ? 'text-green-600' :
                            inventario.diferencia_final > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {inventario.diferencia_final > 0 ? '+' : ''}{inventario.diferencia_final}
                            {inventario.diferencia_final === 0 && ' ✓'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {inventario.diferencia_final === 0 ? 'Sin descuadre' :
                           inventario.diferencia_final > 0 ? 'SIMs de más' : 'SIMs faltantes'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}

            {!readonly && (
              <div className="flex justify-center">
                <Button onClick={agregarPlan} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Otro Plan
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventarioSimForm;