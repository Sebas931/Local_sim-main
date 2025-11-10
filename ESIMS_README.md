# Sistema de Gestión de eSIMs - Local SIM Colombia

## 📋 Descripción

Sistema completo para la gestión de eSIMs con las siguientes características:

- **Inventario de eSIMs**: Control de disponibilidad, ventas y vencimientos
- **Regeneración de QR**: Extracción automática de códigos QR desde PDFs
- **Vencimientos Automáticos**: Job programado que marca eSIMs vencidas
- **Alertas**: Notificaciones de eSIMs próximas a vencer
- **Dashboard**: Estadísticas en tiempo real del inventario

## 🚀 Instalación

### Backend

1. **Instalar dependencias nuevas**:
```bash
cd backend
pip install -r requirements.txt
```

Las nuevas dependencias incluyen:
- `PyMuPDF` - Para leer archivos PDF
- `Pillow` - Procesamiento de imágenes
- `pyzbar` - Decodificación de códigos QR
- `APScheduler` - Scheduler para jobs automáticos

**IMPORTANTE**: Para `pyzbar` necesitas instalar la librería `zbar`:

**Windows**:
```bash
# Descargar e instalar desde: https://sourceforge.net/projects/zbar/files/
# O usar chocolatey:
choco install zbar
```

**Linux/Mac**:
```bash
# Ubuntu/Debian
sudo apt-get install libzbar0

# macOS
brew install zbar
```

2. **Crear las tablas en la base de datos**:
```bash
# El servidor creará automáticamente la tabla 'esims' al iniciar
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001
```

3. **Verificar que el scheduler esté activo**:
Al iniciar el servidor deberías ver:
```
✅ Scheduler iniciado - Job de vencimiento de eSIMs configurado (cada hora)
✅ eSIMs router incluido en la aplicación
```

### Frontend

Los componentes ya están creados en `frontend/src/components/esims/`:
- `ESimDashboard.js` - Pantalla principal
- `ESimTable.js` - Tabla de inventario
- `QRRegenerationUpload.js` - Componente de regeneración

**Integración en el frontend**:

Agregar la ruta en tu componente principal (App.js o Router):

```javascript
import { ESimDashboard } from './components/esims';

// Agregar en tus rutas
<Route path="/esims" element={<ESimDashboard />} />
```

## 📊 Estructura de la Base de Datos

### Tabla: `esims`

```sql
- id (UUID, PK)
- iccid (String, Unique) - Identificador único de la eSIM
- numero_telefono (String, Unique) - Número de teléfono
- estado (Enum) - disponible, vendida, vencida, inactiva
- qr_code_data (Text) - Datos del código QR (base64 o texto)
- qr_code_url (String) - URL alternativa del QR
- fecha_venta (DateTime)
- fecha_vencimiento (DateTime)
- plan_dias (Integer) - Duración del plan en días
- plan_nombre (String) - Nombre del plan
- sale_id (UUID, FK) - Relación con venta
- historial_regeneraciones (Integer) - Contador de regeneraciones
- ultima_regeneracion (DateTime)
- operador (String)
- created_at (DateTime)
- updated_at (DateTime)
- observaciones (Text)
```

## 🔌 API Endpoints

### Gestión de eSIMs

```
GET    /api/esims                      - Listar eSIMs (con filtros)
GET    /api/esims/stats                - Estadísticas del inventario
GET    /api/esims/proximas-vencer      - eSIMs próximas a vencer
GET    /api/esims/{id}                 - Obtener eSIM por ID
POST   /api/esims                      - Crear nueva eSIM
POST   /api/esims/bulk                 - Crear múltiples eSIMs
PUT    /api/esims/{id}                 - Actualizar eSIM
DELETE /api/esims/{id}                 - Eliminar eSIM (soft delete)
```

### Operaciones Especiales

```
POST   /api/esims/venta                - Marcar eSIM como vendida
POST   /api/esims/{id}/regenerar       - Regenerar QR individual
POST   /api/esims/regenerar-bulk       - Regenerar múltiples QRs
POST   /api/esims/extract-qrs          - Extraer QRs desde PDF
POST   /api/esims/procesar-vencimientos - Trigger manual de vencimientos
```

## 📱 Flujo de Uso

### 1. Crear eSIMs Iniciales

```bash
# Opción A: Crear una por una
POST /api/esims
{
  "iccid": "8957000012345678901",
  "numero_telefono": "+573001234567",
  "qr_code_data": "LPA:1$...",
  "operador": "Claro"
}

# Opción B: Crear en masa
POST /api/esims/bulk
{
  "esims": [
    {
      "iccid": "8957000012345678901",
      "numero_telefono": "+573001234567",
      "qr_code_data": "LPA:1$...",
      "operador": "Claro"
    },
    ...
  ]
}
```

### 2. Vender una eSIM

```bash
POST /api/esims/venta
{
  "esim_id": "uuid-de-la-esim",
  "sale_id": "uuid-de-la-venta",
  "plan_dias": 30,
  "plan_nombre": "Plan 30 días 20GB"
}
```

La eSIM cambiará de estado `disponible` → `vendida` y calculará automáticamente la fecha de vencimiento.

### 3. Vencimiento Automático

El sistema ejecuta **cada hora** un job que:
- Busca eSIMs vendidas con fecha de vencimiento <= hoy
- Cambia su estado a `vencida`
- Registra alertas en el log

**Trigger manual** (opcional):
```bash
POST /api/esims/procesar-vencimientos
```

### 4. Regeneración de QR desde PDF

**Desde el Frontend**:

1. Ir a la pantalla de eSIMs
2. Click en "Regenerar QRs"
3. Subir el PDF con los nuevos códigos QR
4. El sistema extrae automáticamente todos los QRs
5. Asignar cada QR a una eSIM vencida
6. Click en "Regenerar X eSIMs"

Las eSIMs regeneradas:
- Cambian de estado `vencida` → `disponible`
- Se actualiza el `qr_code_data`
- Se incrementa el contador de `historial_regeneraciones`
- Se limpia la información de venta anterior

**Desde la API**:
```bash
# 1. Extraer QRs del PDF
POST /api/esims/extract-qrs
Content-Type: multipart/form-data
file: [archivo.pdf]

# Respuesta:
{
  "qr_codes": [
    {
      "qr_data": "LPA:1$...",
      "qr_image_base64": "data:image/png;base64,...",
      "page": 1,
      "position": 1
    },
    ...
  ]
}

# 2. Regenerar QRs
POST /api/esims/regenerar-bulk
{
  "regeneraciones": [
    {
      "esim_id": "uuid-1",
      "qr_data": "LPA:1$..."
    },
    {
      "esim_id": "uuid-2",
      "qr_data": "LPA:1$..."
    }
  ]
}
```

## ⚙️ Configuración del Scheduler

El job de vencimientos está configurado para ejecutarse **cada hora**.

Para cambiar la frecuencia, edita `backend/server.py`:

```python
# Cada hora (actual)
scheduler.add_job(
    process_esim_expirations,
    trigger=CronTrigger(hour='*'),
    ...
)

# Cada día a las 2 AM
scheduler.add_job(
    process_esim_expirations,
    trigger=CronTrigger(hour='2', minute='0'),
    ...
)

# Cada 30 minutos
scheduler.add_job(
    process_esim_expirations,
    trigger='interval',
    minutes=30,
    ...
)
```

## 🎨 Personalización del Frontend

### Estados y Colores

Edita `ESimDashboard.js` para cambiar colores de badges:

```javascript
const getEstadoBadgeColor = (estado) => {
  const colors = {
    disponible: 'bg-green-500',
    vendida: 'bg-blue-500',
    vencida: 'bg-yellow-500',
    inactiva: 'bg-gray-500'
  };
  return colors[estado];
};
```

### Alertas de Vencimiento

Por defecto muestra eSIMs que vencen en 3 días. Para cambiar:

```javascript
// En ESimDashboard.js
const proximasData = await esimsService.getProximasVencer(7); // 7 días
```

## 🔍 Monitoreo y Logs

El sistema genera logs en:
- **Servidor**: Verificar consola donde corre uvicorn
- **Jobs**: Logs del scheduler en la consola

Busca mensajes como:
```
=== Iniciando job de vencimiento de eSIMs ===
eSIMs procesadas como vencidas: 5
eSIMs próximas a vencer (3 días): 12
ALERTA: 12 eSIMs vencerán en los próximos 3 días
```

## 📝 Notas Importantes

1. **Formato de QR**: El sistema detecta automáticamente códigos QR que empiezan con "LPA:" (formato GSMA estándar para eSIM)

2. **Imágenes de QR**: Se guardan como base64 en la base de datos. Para producción, considera usar un storage externo (S3, Cloudinary)

3. **Matching Manual**: El componente de regeneración hace matching automático por orden, pero permite ajuste manual antes de confirmar

4. **Seguridad**: Todos los endpoints (excepto auth) requieren token JWT. Asegúrate de incluir el token en las peticiones

5. **Performance**: Para grandes volúmenes (>10,000 eSIMs), considera:
   - Paginación en el frontend
   - Indexación adicional en la BD
   - Almacenamiento externo de imágenes QR

## 🐛 Troubleshooting

### Error: "No module named 'pyzbar'"
```bash
# Instalar librería zbar del sistema operativo (ver sección de instalación)
```

### Error: "Scheduler not starting"
```bash
# Verificar que APScheduler esté instalado
pip install APScheduler>=3.10.0
```

### PDFs no procesan correctamente
- Verifica que el PDF no esté protegido con contraseña
- Asegúrate que los QRs sean visibles y de buena calidad
- Aumenta el DPI en `qr_extractor.py` si necesitas mayor precisión:
```python
extractor = QRExtractor(dpi=600)  # Mayor calidad
```

## 🚀 Próximos Pasos Sugeridos

1. **Integrar con ventas**: Conectar el flujo de venta de eSIMs con el POS existente
2. **Notificaciones**: Email/SMS cuando eSIMs estén por vencer
3. **Reportes**: Dashboard de analytics de ventas de eSIMs
4. **Exportación**: Generar reportes en Excel/PDF
5. **Multi-operador**: Gestión avanzada por operador
6. **Precios dinámicos**: Diferentes planes con precios variables

## 📞 Soporte

Para dudas o problemas con el sistema de eSIMs, consulta:
- Logs del servidor backend
- Consola del navegador (frontend)
- Este documento README

---

**Desarrollado para Local SIM Colombia** 🇨🇴
