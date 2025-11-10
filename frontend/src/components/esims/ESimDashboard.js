import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import esimsService from '../../services/esimsService';
import QRRegenerationUpload from './QRRegenerationUpload';
import ESimTable from './ESimTable';

const ESimDashboard = () => {
  const [esims, setEsims] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showRegeneracion, setShowRegeneracion] = useState(false);
  const [proximasVencer, setProximasVencer] = useState([]);

  useEffect(() => {
    loadData();
  }, [filtroEstado, search]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar eSIMs con filtros
      const filters = {};
      if (filtroEstado) filters.estado = filtroEstado;
      if (search) filters.search = search;

      const [esimsData, statsData, proximasData] = await Promise.all([
        esimsService.getEsims(filters),
        esimsService.getStats(),
        esimsService.getProximasVencer(3)
      ]);

      setEsims(esimsData.esims || []);
      setStats(statsData);
      setProximasVencer(proximasData.esims || []);
    } catch (error) {
      console.error('Error cargando datos de eSIMs:', error);
      alert('Error cargando datos de eSIMs');
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneracionCompleta = () => {
    setShowRegeneracion(false);
    loadData(); // Recargar datos
  };

  const getEstadoBadgeColor = (estado) => {
    const colors = {
      disponible: 'bg-green-500',
      vendida: 'bg-blue-500',
      vencida: 'bg-yellow-500',
      inactiva: 'bg-gray-500'
    };
    return colors[estado] || 'bg-gray-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de eSIMs</h1>
          <p className="text-gray-600 mt-1">
            Administra tu inventario de eSIMs, ventas y regeneración de códigos QR
          </p>
        </div>
        <Button
          onClick={() => setShowRegeneracion(!showRegeneracion)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {showRegeneracion ? 'Cerrar Regeneración' : 'Regenerar QRs'}
        </Button>
      </div>

      {/* Alerta de próximas a vencer */}
      {proximasVencer.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-800">
                  {proximasVencer.length} eSIM{proximasVencer.length !== 1 ? 's' : ''} próxima{proximasVencer.length !== 1 ? 's' : ''} a vencer
                </p>
                <p className="text-sm text-yellow-700">
                  En los próximos 3 días
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel de Regeneración */}
      {showRegeneracion && (
        <Card>
          <CardHeader>
            <CardTitle>Regeneración de Códigos QR desde PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <QRRegenerationUpload
              onRegeneracionCompleta={handleRegeneracionCompleta}
              esimsVencidas={esims.filter(e => e.estado === 'vencida')}
            />
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total eSIMs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg" onClick={() => setFiltroEstado('disponible')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.disponibles || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg" onClick={() => setFiltroEstado('vendida')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">
              Vendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.vendidas || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg" onClick={() => setFiltroEstado('vencida')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.vencidas || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg" onClick={() => setFiltroEstado('inactiva')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Inactivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {stats.inactivas || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Input
              type="text"
              placeholder="Buscar por ICCID o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />

            <div className="flex gap-2">
              <Button
                variant={filtroEstado === '' ? 'default' : 'outline'}
                onClick={() => setFiltroEstado('')}
              >
                Todas
              </Button>
              <Button
                variant={filtroEstado === 'disponible' ? 'default' : 'outline'}
                onClick={() => setFiltroEstado('disponible')}
              >
                Disponibles
              </Button>
              <Button
                variant={filtroEstado === 'vendida' ? 'default' : 'outline'}
                onClick={() => setFiltroEstado('vendida')}
              >
                Vendidas
              </Button>
              <Button
                variant={filtroEstado === 'vencida' ? 'default' : 'outline'}
                onClick={() => setFiltroEstado('vencida')}
              >
                Vencidas
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de eSIMs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Inventario de eSIMs
            {filtroEstado && (
              <Badge className={`ml-2 ${getEstadoBadgeColor(filtroEstado)}`}>
                {filtroEstado}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando eSIMs...</p>
            </div>
          ) : (
            <ESimTable
              esims={esims}
              onRefresh={loadData}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ESimDashboard;
