# Documentación de API - Local SIM Colombia

## Índice

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Endpoints por Módulo](#endpoints-por-módulo)
   - [Auth](#auth)
   - [Dashboard](#dashboard)
   - [Ventas (Sales)](#ventas-sales)
   - [SIMs](#sims)
   - [Recargas (Winred)](#recargas-winred)
   - [Devoluciones](#devoluciones)
   - [Turnos](#turnos)
   - [Usuarios](#usuarios)
   - [Roles](#roles)
   - [Productos](#productos)
4. [Modelos de Datos](#modelos-de-datos)
5. [Códigos de Error](#códigos-de-error)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Introducción

### Base URL

```
Production: https://api.localsim.co
Development: http://localhost:8000
```

### Formato de Respuesta

Todas las respuestas de la API están en formato JSON.

### Versionamiento

La API actualmente está en versión 1.0. Todas las rutas están bajo el prefijo `/api`.

### Rate Limiting

No implementado actualmente.

---

## Autenticación

La API utiliza **JWT (JSON Web Tokens)** para autenticación.

### Flujo de Autenticación

1. El cliente envía credenciales a `/api/auth/login`
2. El servidor responde con un `access_token`
3. El cliente incluye el token en el header `Authorization` en todas las peticiones subsiguientes

### Login

#### `POST /api/auth/login`

Autentica un usuario y devuelve un token JWT.

**Request Body:**

```json
{
  "username": "usuario",
  "password": "contraseña"
}
```

**Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errores:**
- `400 Bad Request`: Usuario o contraseña incorrectos
- `422 Unprocessable Entity`: Datos inválidos

### Uso del Token

Incluir el token en todas las peticiones autenticadas:

```http
Authorization: Bearer <access_token>
```

### Obtener Usuario Actual

#### `GET /api/auth/me`

Obtiene la información del usuario autenticado.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "username": "vendedor1",
  "full_name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "Vendedor",
  "modules": [
    "Punto de venta",
    "Dashboard",
    "SIMs",
    "Recargas"
  ]
}
```

### Registro de Usuario

#### `POST /api/auth/register`

Crea un nuevo usuario (solo Admin).

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "username": "nuevo_usuario",
  "password": "contraseña_segura",
  "full_name": "Nombre Completo",
  "email": "email@example.com",
  "role_id": 2
}
```

**Response (200 OK):**

```json
{
  "message": "Usuario creado exitosamente"
}
```

**Errores:**
- `403 Forbidden`: Usuario no autorizado (no es admin)
- `400 Bad Request`: Username ya existe

---

## Dashboard

### Estadísticas Generales

#### `GET /api/dashboard/stats`

Obtiene KPIs y métricas principales del negocio.

**Query Parameters:**
- `days` (opcional): Número de días hacia atrás (ej: 7, 14, 30)
- `fecha_desde` (opcional): Fecha inicio (formato: YYYY-MM-DD)
- `fecha_hasta` (opcional): Fecha fin (formato: YYYY-MM-DD)
- `user_id` (opcional): Filtrar por usuario específico

**Example Request:**

```http
GET /api/dashboard/stats?days=30&user_id=5
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "kpis": {
    "total_general": 15000000.00,
    "total_efectivo": 8000000.00,
    "total_electronicas": 5000000.00,
    "total_datafono": 2000000.00,
    "total_hoy": 500000.00,
    "total_semana": 3000000.00,
    "total_mes": 12000000.00,
    "ventas_total": 450,
    "ventas_hoy": 12,
    "ticket_promedio_hoy": 41666.67,
    "ticket_promedio_mes": 26666.67
  },
  "series": {
    "ventas_ultimos_14_dias": [
      {
        "fecha": "2025-09-18",
        "total": 350000.00
      },
      {
        "fecha": "2025-09-19",
        "total": 420000.00
      }
    ],
    "ventas_hoy_por_metodo": {
      "cash": 200000.00,
      "electronic": 250000.00,
      "card": 50000.00
    }
  },
  "sims": {
    "total": 500,
    "disponibles": 120,
    "recargadas": 200,
    "vendidas": 180
  },
  "lotes": {
    "lotes": 25,
    "total_sims": 500,
    "disponibles": 120,
    "recargadas": 200,
    "vendidas": 180
  },
  "ultimas_ventas": [
    {
      "fecha": "2025-10-01T14:30:00",
      "metodo_pago": "cash",
      "monto": 50000.00,
      "sale_id": "abc123"
    }
  ]
}
```

### Inventario Dashboard

#### `GET /api/dashboard/inventario`

Métricas de inventario con alertas de bajo stock.

**Response (200 OK):**

```json
{
  "stock_por_plan": [
    {
      "operador": "CLARO",
      "plan": "R7D",
      "total": 100,
      "disponibles": 5,
      "vendidas": 80,
      "recargadas": 15,
      "defectuosas": 0,
      "bajo_stock": true
    }
  ],
  "stock_por_operador": [
    {
      "operador": "CLARO",
      "total": 300,
      "disponibles": 80,
      "vendidas": 200,
      "porcentaje_vendido": 66.7
    }
  ],
  "alertas_bajo_stock": [
    {
      "operador": "CLARO",
      "plan": "R7D",
      "disponibles": 5
    }
  ],
  "total_alertas": 1
}
```

### Ventas e Ingresos

#### `GET /api/dashboard/ventas-ingresos`

Análisis detallado de ventas e ingresos.

**Query Parameters:**
- `days`: Días hacia atrás (default: 30)
- `fecha_desde`: Fecha inicio (YYYY-MM-DD)
- `fecha_hasta`: Fecha fin (YYYY-MM-DD)
- `user_id`: ID del usuario

**Response (200 OK):**

```json
{
  "ventas_por_dia": [
    {
      "fecha": "2025-10-01",
      "total_ventas": 15,
      "total_ingresos": 750000.00,
      "por_metodo": {
        "cash": {
          "cantidad": 8,
          "ingresos": 400000.00,
          "ticket_promedio": 50000.00
        },
        "electronic": {
          "cantidad": 7,
          "ingresos": 350000.00,
          "ticket_promedio": 50000.00
        }
      }
    }
  ],
  "resumen_por_metodo": [
    {
      "metodo": "cash",
      "cantidad_ventas": 120,
      "total_ingresos": 6000000.00,
      "ticket_promedio": 50000.00,
      "venta_minima": 10000.00,
      "venta_maxima": 150000.00
    }
  ],
  "periodo_dias": 30,
  "fecha_desde": "2025-09-01T00:00:00",
  "fecha_hasta": "2025-10-01T23:59:59",
  "user_id": null
}
```

### Cierres y Descuadres

#### `GET /api/dashboard/cierres-descuadres`

Análisis de cierres de turno y detección de descuadres.

**Query Parameters:**
- `days`: Días hacia atrás (default: 30)
- `fecha_desde`: Fecha inicio
- `fecha_hasta`: Fecha fin
- `user_id`: ID del usuario
- `solo_con_diferencias`: boolean (default: false)

**Response (200 OK):**

```json
{
  "cierres": [
    {
      "id": "cierre-uuid",
      "fecha_cierre": "2025-10-01T20:00:00",
      "fecha_apertura": "2025-10-01T08:00:00",
      "usuario": "Juan Pérez",
      "totales_sistema": {
        "efectivo": 500000.00,
        "datafono": 200000.00,
        "electronicas": 300000.00,
        "dolares": 0.00
      },
      "totales_reportados": {
        "efectivo": 495000.00,
        "datafono": 200000.00,
        "dolares": 0.00
      },
      "diferencias": {
        "efectivo": -5000.00,
        "datafono": 0.00,
        "dolares": 0.00
      },
      "tiene_diferencias": true,
      "observaciones": "Faltaron $5000 en efectivo"
    }
  ],
  "resumen_diferencias": {
    "efectivo": -15000.00,
    "datafono": 0.00,
    "dolares": 0.00
  },
  "total_cierres": 25,
  "cierres_con_diferencias": 3,
  "periodo_dias": 30,
  "fecha_desde": "2025-09-01T00:00:00",
  "fecha_hasta": "2025-10-01T23:59:59",
  "user_id": null,
  "solo_con_diferencias": false
}
```

### Devoluciones Analytics

#### `GET /api/dashboard/devoluciones`

Análisis de devoluciones e intercambios.

**Query Parameters:**
- `days`: Días hacia atrás (default: 30)
- `fecha_desde`: Fecha inicio
- `fecha_hasta`: Fecha fin
- `user_id`: ID del usuario

**Response (200 OK):**

```json
{
  "devoluciones_por_dia": [
    {
      "fecha": "2025-10-01",
      "intercambios": 3,
      "devoluciones_dinero": 1,
      "monto_devuelto": 50000.00
    }
  ],
  "resumen": {
    "intercambios": 45,
    "devoluciones_dinero": 10,
    "monto_total_devuelto": 500000.00
  },
  "motivos_comunes": [
    {
      "motivo": "SIM defectuosa",
      "frecuencia": 15,
      "tipo": "intercambio"
    },
    {
      "motivo": "Cambio de operador",
      "frecuencia": 10,
      "tipo": "devolucion"
    }
  ],
  "periodo_dias": 30,
  "fecha_desde": "2025-09-01T00:00:00",
  "fecha_hasta": "2025-10-01T23:59:59",
  "user_id": null
}
```

### Inventarios y Descuadres

#### `GET /api/dashboard/inventarios-descuadres`

Dashboard de descuadres de inventario de SIMs.

**Query Parameters:**
- `days`: Días hacia atrás (default: 30)
- `fecha_desde`: Fecha inicio
- `fecha_hasta`: Fecha fin
- `user_id`: ID del usuario (int)
- `solo_con_descuadres`: boolean (default: true)

**Response (200 OK):**

```json
{
  "inventarios": [
    {
      "id": "inv-uuid",
      "turno_id": "turno-uuid",
      "plan": "R7D",
      "cantidades": {
        "inicial_reportada": 50,
        "inicial_sistema": 52,
        "final_reportada": 30,
        "final_sistema": 28
      },
      "diferencias": {
        "inicial": -2,
        "final": 2
      },
      "descuadres": {
        "inicial": true,
        "final": true,
        "tiene_descuadre": true
      },
      "fechas": {
        "registro": "2025-10-01T08:00:00",
        "cierre": "2025-10-01T20:00:00",
        "turno_apertura": "2025-10-01T08:00:00",
        "turno_cierre": "2025-10-01T20:00:00"
      },
      "turno": {
        "estado": "cerrado"
      },
      "usuario": "Juan Pérez",
      "observaciones": {
        "apertura": "Diferencia en conteo inicial",
        "cierre": "Se encontraron 2 SIMs adicionales"
      }
    }
  ],
  "resumen": {
    "total_registros": 15,
    "total_descuadres_inicial": 5,
    "total_descuadres_final": 3,
    "descuadres_por_plan": [
      {
        "plan": "R7D",
        "descuadres_inicial": 2,
        "descuadres_final": 1,
        "diferencia_total_inicial": -3,
        "diferencia_total_final": 2
      }
    ]
  },
  "periodo_dias": 30,
  "fecha_desde": "2025-09-01T00:00:00",
  "fecha_hasta": "2025-10-01T23:59:59",
  "user_id": null,
  "solo_con_descuadres": true
}
```

---

## Ventas (Sales)

### Registrar Venta

#### `POST /api/sales/ventas`

Registra una nueva venta en el sistema.

**Headers:**
```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "items": [
    {
      "product_id": "sim-uuid",
      "product_code": "S01",
      "quantity": 1,
      "unit_price": 50000.00,
      "description": "SIM Claro R7D",
      "iva": 19,
      "sim_id": "sim-uuid",
      "simId": "sim-uuid",
      "msisdn": "3211234567",
      "iccid": "8957000012345678901"
    }
  ],
  "payment_method": "cash",
  "customer_id": "222222222",
  "customer_identification": "222222222"
}
```

**payment_method valores:**
- `cash`: Efectivo
- `electronic`: Electrónica (genera factura Siigo)
- `card` o `datafono`: Datáfono
- `dollars`: Dólares

**Response (200 OK):**

```json
{
  "message": "Venta registrada correctamente",
  "venta_id": "venta-uuid",
  "enviada_a_siigo": false
}
```

**Errores:**
- `403 Forbidden`: No tiene turno abierto
- `404 Not Found`: SIM no encontrada
- `500 Internal Server Error`: Error al generar factura Siigo

### Ventas por Turno

#### `GET /api/sales/por-turno`

Obtiene el resumen de ventas del turno actual del usuario autenticado.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "turno_id": "turno-uuid",
  "total_ventas_electronicas": 500000.00,
  "total_ventas_efectivo": 750000.00,
  "total_ventas_datafono": 200000.00,
  "total_ventas_dollars": 0.00,
  "fecha_apertura": "2025-10-01T08:00:00",
  "cantidad_ventas": 25
}
```

**Errores:**
- `404 Not Found`: No tiene turno abierto

---

## SIMs

### Subir Lotes

#### `POST /api/sims/upload_lotes`

Carga un archivo Excel con lotes de SIMs.

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
- `file`: Archivo Excel (.xlsx o .xls)

**Formato del Excel:**

| lote_id | numero_linea | iccid | operador |
|---------|--------------|-------|----------|
| L001 | 3211234567 | 8957000012345678901 | CLARO |

**Response (200 OK):**

```json
{
  "message": "Archivo procesado correctamente, 20 SIMs registradas."
}
```

**Errores:**
- `400 Bad Request`: Formato incorrecto, lote duplicado, o más de 20 SIMs
- `500 Internal Server Error`: Error al procesar

### Listar Lotes

#### `GET /api/sims/lotes`

Obtiene la lista de todos los lotes con estadísticas.

**Response (200 OK):**

```json
{
  "lotes": [
    {
      "lote_id": "L001",
      "operador": "CLARO",
      "plan_asignado": "R7D",
      "estado": "recargado",
      "fecha_registro": "2025-09-15T10:00:00",
      "total_sims": 20,
      "sims_disponibles": 5,
      "sims_recargadas": 10,
      "sims_vendidas": 5
    }
  ]
}
```

### Asignar Plan a Lote

#### `POST /api/sims/asignar_plan/{lote_id}`

Asigna un plan a todas las SIMs de un lote.

**Path Parameters:**
- `lote_id`: ID del lote

**Query Parameters:**
- `plan`: Código del plan (ej: R7D, R5D, R1M)

**Example Request:**

```http
POST /api/sims/asignar_plan/L001?plan=R7D
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "Plan 'R7D' asignado al lote L001."
}
```

**Errores:**
- `404 Not Found`: Lote no encontrado

### Listar SIMs

#### `GET /api/sims/`

Obtiene la lista de SIMs con filtros opcionales.

**Query Parameters:**
- `status`: Filtrar por estado (available, recargado, vendido)

**Example Request:**

```http
GET /api/sims/?status=available
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "sims": [
    {
      "id": "sim-uuid",
      "lote_id": "L001",
      "numero_linea": "3211234567",
      "iccid": "8957000012345678901",
      "estado": "available",
      "fecha_registro": "2025-09-15T10:00:00",
      "plan_asignado": "R7D",
      "winred_product_id": null,
      "fecha_ultima_recarga": null,
      "vendida": false,
      "fecha_venta": null,
      "venta_id": null
    }
  ]
}
```

### Buscar SIM

#### `GET /api/sims/search`

Busca una SIM por ICCID o MSISDN.

**Query Parameters:**
- `iccid`: ICCID de la SIM
- `msisdn`: Número de línea (MSISDN)

**Example Request:**

```http
GET /api/sims/search?iccid=8957000012345678901
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "sim": {
    "id": "sim-uuid",
    "lote_id": "L001",
    "numero_linea": "3211234567",
    "iccid": "8957000012345678901",
    "estado": "available",
    "plan_asignado": "R7D",
    "winred_product_id": null,
    "fecha_registro": "2025-09-15T10:00:00"
  }
}
```

**Errores:**
- `400 Bad Request`: No se envió iccid ni msisdn
- `404 Not Found`: SIM no encontrada

### Buscar por Código

#### `GET /api/sims/find-by-code`

Busca una SIM por código (ICCID o MSISDN).

**Query Parameters:**
- `code`: ICCID o número de línea

**Response (200 OK):**

```json
{
  "sim": {
    "id": "sim-uuid",
    "numero_linea": "3211234567",
    "iccid": "8957000012345678901",
    "estado": "available",
    "plan_asignado": "R7D"
  }
}
```

### SIMs por Lote

#### `GET /api/sims/por_lote`

Obtiene todas las SIMs de un lote específico.

**Query Parameters:**
- `lote_id`: ID del lote (requerido)

**Example Request:**

```http
GET /api/sims/por_lote?lote_id=L001
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "sims": [
    {
      "id": "sim-uuid-1",
      "lote_id": "L001",
      "numero_linea": "3211234567",
      "iccid": "8957000012345678901",
      "estado": "vendido",
      "plan_asignado": "R7D"
    },
    {
      "id": "sim-uuid-2",
      "lote_id": "L001",
      "numero_linea": "3211234568",
      "iccid": "8957000012345678902",
      "estado": "available",
      "plan_asignado": "R7D"
    }
  ]
}
```

---

## Recargas (Winred)

### Consultar Saldo

#### `GET /api/winred/balance`

Obtiene el saldo actual de la cuenta Winred.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "balance": 5000000.00,
  "discount": 50000.00
}
```

### Obtener Paquetes

#### `POST /api/winred/querypackages`

Obtiene la lista de paquetes disponibles por operador.

**Request Body:**

```json
{
  "product_id": 1
}
```

**product_id valores:**
- `0`: Todos
- `1`: CLARO
- `2`: MOVISTAR
- `3`: TIGO

**Response (200 OK):**

```json
{
  "result": {
    "success": true,
    "message": "Consulta exitosa"
  },
  "data": {
    "package": [
      {
        "product_id": 101,
        "name": "Recarga 7 Días - 5GB",
        "description": "5GB + 300 min + 300 SMS",
        "price": 15000.00,
        "validity": "7 días",
        "operator": "CLARO"
      }
    ]
  }
}
```

### Recarga Individual

#### `POST /api/winred/topup`

Realiza una recarga individual a un número específico.

**Request Body:**

```json
{
  "product_id": 101,
  "amount": 0,
  "subscriber": "3211234567",
  "sell_from": "S"
}
```

**Campos:**
- `product_id`: ID del paquete Winred
- `amount`: Siempre 0 para paquetes
- `subscriber`: Número a recargar (10 dígitos)
- `sell_from`: Siempre "S"

**Response (200 OK):**

```json
{
  "result": {
    "success": true,
    "message": "Recarga exitosa",
    "transaction_id": "TXN123456"
  },
  "data": {
    "balance": 4985000.00,
    "subscriber": "3211234567",
    "product": "Recarga 7 Días - 5GB"
  }
}
```

**Errores:**
- `400 Bad Request`: Datos inválidos
- `500 Internal Server Error`: Error de Winred (saldo insuficiente, etc.)

### Recarga de Lote

#### `POST /api/winred/topup-lote`

Realiza recarga masiva a todas las SIMs de un lote.

**Request Body:**

```json
{
  "lote_id": "L001",
  "product_id": 101,
  "amount": 0,
  "sell_from": "S"
}
```

**Response (200 OK):**

```json
{
  "result": {
    "success": true,
    "message": "Recarga de lote exitosa"
  },
  "data": {
    "lote_id": "L001",
    "total_sims": 20,
    "recargas_exitosas": 20,
    "recargas_fallidas": 0,
    "balance_final": 4685000.00,
    "detalles": [
      {
        "msisdn": "3211234567",
        "success": true,
        "transaction_id": "TXN123456"
      }
    ]
  }
}
```

**Errores:**
- `404 Not Found`: Lote no encontrado
- `400 Bad Request`: Lote sin SIMs disponibles
- `500 Internal Server Error`: Error de Winred

---

## Devoluciones

### Registrar Devolución

#### `POST /api/devoluciones/`

Registra una devolución o intercambio de SIM.

**Request Body:**

**Para Intercambio:**
```json
{
  "sim_id": "sim-original-uuid",
  "tipo_devolucion": "intercambio",
  "sim_reemplazo_id": "sim-nueva-uuid",
  "motivo": "SIM defectuosa",
  "observaciones": "Cliente reportó que no tiene señal"
}
```

**Para Devolución con Dinero:**
```json
{
  "sim_id": "sim-original-uuid",
  "tipo_devolucion": "devolucion",
  "monto_devuelto": 50000.00,
  "motivo": "Cliente cambió de operador",
  "observaciones": "Devolución en efectivo"
}
```

**Response (200 OK):**

```json
{
  "message": "Devolución registrada exitosamente",
  "devolucion_id": "dev-uuid",
  "tipo": "intercambio"
}
```

**Errores:**
- `404 Not Found`: SIM no encontrada
- `400 Bad Request`: SIM no vendida o datos inválidos

### Listar Devoluciones

#### `GET /api/devoluciones/`

Obtiene el historial de devoluciones con filtros.

**Query Parameters:**
- `fecha_desde`: Fecha inicio (YYYY-MM-DD)
- `fecha_hasta`: Fecha fin (YYYY-MM-DD)
- `tipo`: Filtrar por tipo (intercambio, devolucion)
- `user_id`: Filtrar por usuario

**Response (200 OK):**

```json
{
  "devoluciones": [
    {
      "id": "dev-uuid",
      "sim_id": "sim-uuid",
      "sim_msisdn": "3211234567",
      "sim_iccid": "8957000012345678901",
      "tipo_devolucion": "intercambio",
      "sim_reemplazo_id": "sim-nueva-uuid",
      "sim_reemplazo_msisdn": "3211234568",
      "monto_devuelto": null,
      "motivo": "SIM defectuosa",
      "observaciones": "Cliente reportó que no tiene señal",
      "fecha_devolucion": "2025-10-01T15:30:00",
      "user_id": 5,
      "usuario_nombre": "Juan Pérez"
    }
  ],
  "total": 45
}
```

---

## Turnos

### Abrir Turno

#### `POST /api/turnos/abrir`

Abre un nuevo turno para el usuario autenticado.

**Request Body:**

```json
{
  "fondo_inicial": 100000.00,
  "observaciones_apertura": "Turno mañana",
  "inventario_inicial": [
    {
      "plan": "R7D",
      "cantidad_reportada": 50,
      "cantidad_sistema": 52
    },
    {
      "plan": "R5D",
      "cantidad_reportada": 30,
      "cantidad_sistema": 30
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "message": "Turno abierto exitosamente",
  "turno_id": "turno-uuid",
  "fecha_apertura": "2025-10-01T08:00:00",
  "descuadres_detectados": [
    {
      "plan": "R7D",
      "diferencia": -2,
      "mensaje": "Faltan 2 SIMs en inventario inicial"
    }
  ]
}
```

**Errores:**
- `400 Bad Request`: Ya tiene un turno abierto

### Cerrar Turno

#### `POST /api/turnos/cerrar`

Cierra el turno actual del usuario autenticado.

**Request Body:**

```json
{
  "turno_id": "turno-uuid",
  "efectivo_reportado": 495000.00,
  "datafono_reportado": 200000.00,
  "dolares_reportado": 0.00,
  "observaciones_cierre": "Faltaron $5000 en efectivo",
  "inventario_final": [
    {
      "plan": "R7D",
      "cantidad_reportada": 30,
      "cantidad_sistema": 28
    },
    {
      "plan": "R5D",
      "cantidad_reportada": 20,
      "cantidad_sistema": 20
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "message": "Turno cerrado exitosamente",
  "cierre_id": "cierre-uuid",
  "fecha_cierre": "2025-10-01T20:00:00",
  "totales_sistema": {
    "efectivo": 500000.00,
    "datafono": 200000.00,
    "electronicas": 300000.00,
    "dolares": 0.00
  },
  "diferencias": {
    "efectivo": -5000.00,
    "datafono": 0.00,
    "dolares": 0.00
  },
  "descuadres_inventario": [
    {
      "plan": "R7D",
      "diferencia_final": 2,
      "mensaje": "Sobran 2 SIMs en inventario final"
    }
  ],
  "tiene_diferencias": true
}
```

**Errores:**
- `404 Not Found`: No tiene turno abierto
- `400 Bad Request`: turno_id inválido

### Listar Turnos

#### `GET /api/turnos/`

Obtiene el historial de turnos.

**Query Parameters:**
- `user_id`: Filtrar por usuario (opcional)
- `estado`: Filtrar por estado (abierto, cerrado)
- `fecha_desde`: Fecha inicio
- `fecha_hasta`: Fecha fin

**Response (200 OK):**

```json
{
  "turnos": [
    {
      "id": "turno-uuid",
      "user_id": 5,
      "usuario_nombre": "Juan Pérez",
      "fecha_apertura": "2025-10-01T08:00:00",
      "fecha_cierre": "2025-10-01T20:00:00",
      "estado": "cerrado",
      "fondo_inicial": 100000.00,
      "total_ventas": 1000000.00,
      "tiene_diferencias": true,
      "diferencia_efectivo": -5000.00
    }
  ],
  "total": 120
}
```

---

## Usuarios

### Listar Usuarios

#### `GET /api/users/`

Obtiene la lista de todos los usuarios (solo Admin).

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "full_name": "Administrador",
      "email": "admin@localsim.co",
      "role_id": 1,
      "role_name": "Admin",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00"
    },
    {
      "id": 2,
      "username": "vendedor1",
      "full_name": "Juan Pérez",
      "email": "juan@localsim.co",
      "role_id": 2,
      "role_name": "Vendedor",
      "is_active": true,
      "created_at": "2025-09-01T00:00:00"
    }
  ],
  "total": 2
}
```

### Obtener Usuario

#### `GET /api/users/{user_id}`

Obtiene los detalles de un usuario específico.

**Response (200 OK):**

```json
{
  "id": 2,
  "username": "vendedor1",
  "full_name": "Juan Pérez",
  "email": "juan@localsim.co",
  "role": {
    "id": 2,
    "name": "Vendedor",
    "modules": [
      "Punto de venta",
      "Dashboard",
      "SIMs",
      "Recargas"
    ]
  },
  "is_active": true,
  "created_at": "2025-09-01T00:00:00"
}
```

### Actualizar Usuario

#### `PUT /api/users/{user_id}`

Actualiza los datos de un usuario (solo Admin).

**Request Body:**

```json
{
  "full_name": "Juan Carlos Pérez",
  "email": "juancarlos@localsim.co",
  "role_id": 3,
  "is_active": true
}
```

**Response (200 OK):**

```json
{
  "message": "Usuario actualizado exitosamente",
  "user": {
    "id": 2,
    "username": "vendedor1",
    "full_name": "Juan Carlos Pérez",
    "email": "juancarlos@localsim.co",
    "role_id": 3,
    "is_active": true
  }
}
```

### Desactivar Usuario

#### `DELETE /api/users/{user_id}`

Desactiva un usuario (no elimina, solo marca como inactivo).

**Response (200 OK):**

```json
{
  "message": "Usuario desactivado exitosamente"
}
```

---

## Roles

### Listar Roles

#### `GET /api/roles/`

Obtiene la lista de todos los roles.

**Response (200 OK):**

```json
{
  "roles": [
    {
      "id": 1,
      "name": "Admin",
      "description": "Acceso total al sistema",
      "modules": [
        {
          "id": 1,
          "name": "Dashboard"
        },
        {
          "id": 2,
          "name": "Punto de venta"
        },
        {
          "id": 3,
          "name": "SIMs"
        }
      ]
    }
  ]
}
```

### Crear Rol

#### `POST /api/roles/`

Crea un nuevo rol (solo Admin).

**Request Body:**

```json
{
  "name": "Supervisor",
  "description": "Supervisor de ventas",
  "module_ids": [1, 2, 3, 4, 5]
}
```

**Response (200 OK):**

```json
{
  "message": "Rol creado exitosamente",
  "role": {
    "id": 4,
    "name": "Supervisor",
    "description": "Supervisor de ventas",
    "modules": [
      {"id": 1, "name": "Dashboard"},
      {"id": 2, "name": "Punto de venta"}
    ]
  }
}
```

### Actualizar Rol

#### `PUT /api/roles/{role_id}`

Actualiza un rol existente (solo Admin).

**Request Body:**

```json
{
  "name": "Supervisor Senior",
  "description": "Supervisor con permisos extendidos",
  "module_ids": [1, 2, 3, 4, 5, 6, 7]
}
```

**Response (200 OK):**

```json
{
  "message": "Rol actualizado exitosamente"
}
```

---

## Productos

### Listar Productos

#### `GET /api/products/`

Obtiene la lista de productos/servicios del catálogo.

**Response (200 OK):**

```json
{
  "products": [
    {
      "id": "prod-uuid",
      "code": "S01",
      "name": "SIM Card",
      "description": "Tarjeta SIM física",
      "price": 10000.00,
      "tax_percentage": 19,
      "is_active": true
    },
    {
      "id": "prod-uuid-2",
      "code": "PORTE",
      "name": "Portabilidad",
      "description": "Servicio de portabilidad",
      "price": 5000.00,
      "tax_percentage": 19,
      "is_active": true
    }
  ]
}
```

---

## Modelos de Datos

### User

```typescript
{
  id: number;
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  role: Role;
  is_active: boolean;
  created_at: datetime;
}
```

### Role

```typescript
{
  id: number;
  name: string;
  description: string;
  modules: Module[];
}
```

### Module

```typescript
{
  id: number;
  name: string; // "Dashboard", "Punto de venta", "SIMs", etc.
}
```

### SimLote

```typescript
{
  id: string;
  operador: string; // "CLARO", "MOVISTAR", "TIGO"
  plan_asignado: string | null; // "R7D", "R5D", etc.
  estado: string; // "available", "recargado"
  fecha_registro: datetime;
  total_sims: number;
  sims_disponibles: number;
  sims_recargadas: number;
  sims_vendidas: number;
}
```

### SimDetalle

```typescript
{
  id: string;
  lote_id: string;
  numero_linea: string; // MSISDN
  iccid: string;
  estado: string; // "available", "recargado", "vendido"
  plan_asignado: string | null;
  winred_product_id: number | null;
  fecha_registro: datetime;
  fecha_ultima_recarga: datetime | null;
  fecha_venta: datetime | null;
  venta_id: string | null;
  vendida: boolean;
}
```

### Sale

```typescript
{
  id: string;
  user_id: number;
  customer_id: string;
  customer_identification: string;
  payment_method: string; // "cash", "electronic", "card", "dollars"
  total: number;
  siigo_invoice_id: string | null;
  estado: string; // "activa", "devuelta"
  created_at: datetime;
  items: SaleItem[];
}
```

### SaleItem

```typescript
{
  id: string;
  sale_id: string;
  product_id: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  description: string;
  iva: number;
  sim_id: string | null;
}
```

### Turno

```typescript
{
  id: string;
  user_id: number;
  fecha_apertura: datetime;
  fecha_cierre: datetime | null;
  estado: string; // "abierto", "cerrado"
  fondo_inicial: number;
  observaciones_apertura: string | null;
  observaciones_cierre: string | null;
}
```

### CierreCaja

```typescript
{
  id: string;
  turno_id: string;
  fecha_cierre: datetime;
  total_ventas_efectivo: number;
  total_ventas_datafono: number;
  total_ventas_electronicas: number;
  total_ventas_dollars: number;
  efectivo_reportado: number;
  datafono_reportado: number;
  dolares_reportado: number;
  diferencia: number; // Suma de todas las diferencias
  observaciones: string | null;
}
```

### DevolucionSim

```typescript
{
  id: string;
  sim_id: string;
  tipo_devolucion: string; // "intercambio", "devolucion"
  sim_reemplazo_id: string | null;
  monto_devuelto: number | null;
  motivo: string;
  observaciones: string | null;
  fecha_devolucion: datetime;
  user_id: number;
}
```

### InventarioSimTurno

```typescript
{
  id: string;
  turno_id: string;
  plan: string;
  cantidad_inicial_reportada: number;
  cantidad_inicial_sistema: number;
  diferencia_inicial: number;
  cantidad_final_reportada: number | null;
  cantidad_final_sistema: number | null;
  diferencia_final: number | null;
  fecha_registro: datetime;
  fecha_cierre: datetime | null;
  observaciones_apertura: string | null;
  observaciones_cierre: string | null;
}
```

---

## Códigos de Error

### HTTP Status Codes

- **200 OK**: Petición exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Datos inválidos o faltantes
- **401 Unauthorized**: No autenticado (token inválido o ausente)
- **403 Forbidden**: No autorizado (sin permisos)
- **404 Not Found**: Recurso no encontrado
- **422 Unprocessable Entity**: Validación de datos falló
- **500 Internal Server Error**: Error del servidor

### Estructura de Error

```json
{
  "detail": "Descripción del error"
}
```

Para errores de validación:

```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Flujo Completo de Venta

```javascript
// 1. Login
const loginResponse = await fetch('https://api.localsim.co/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'vendedor1',
    password: 'password123'
  })
});
const { access_token } = await loginResponse.json();

// 2. Abrir Turno
const turnoResponse = await fetch('https://api.localsim.co/api/turnos/abrir', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    fondo_inicial: 100000,
    observaciones_apertura: 'Turno mañana',
    inventario_inicial: [
      { plan: 'R7D', cantidad_reportada: 50, cantidad_sistema: 52 }
    ]
  })
});

// 3. Buscar SIM Disponible
const simResponse = await fetch('https://api.localsim.co/api/sims/search?iccid=8957000012345678901', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const { sim } = await simResponse.json();

// 4. Registrar Venta
const ventaResponse = await fetch('https://api.localsim.co/api/sales/ventas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    items: [{
      product_id: sim.id,
      product_code: 'S01',
      quantity: 1,
      unit_price: 50000,
      description: `SIM ${sim.plan_asignado}`,
      iva: 19,
      sim_id: sim.id,
      msisdn: sim.numero_linea,
      iccid: sim.iccid
    }],
    payment_method: 'cash',
    customer_id: '222222222',
    customer_identification: '222222222'
  })
});

console.log('Venta registrada:', await ventaResponse.json());
```

### Ejemplo 2: Recarga de Lote

```python
import requests

# Configuración
BASE_URL = "https://api.localsim.co"
token = "your-jwt-token"
headers = {"Authorization": f"Bearer {token}"}

# 1. Consultar paquetes disponibles
packages_response = requests.post(
    f"{BASE_URL}/api/winred/querypackages",
    json={"product_id": 1},  # CLARO
    headers=headers
)
packages = packages_response.json()["data"]["package"]
selected_package = packages[0]  # Seleccionar primer paquete

# 2. Recargar lote
recharge_response = requests.post(
    f"{BASE_URL}/api/winred/topup-lote",
    json={
        "lote_id": "L001",
        "product_id": selected_package["product_id"],
        "amount": 0,
        "sell_from": "S"
    },
    headers=headers
)

result = recharge_response.json()
print(f"Recargas exitosas: {result['data']['recargas_exitosas']}")
print(f"Saldo final: {result['data']['balance_final']}")
```

### Ejemplo 3: Monitoreo de Dashboard

```bash
# Obtener estadísticas del día
curl -X GET "https://api.localsim.co/api/dashboard/stats?days=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Obtener ventas de un usuario específico
curl -X GET "https://api.localsim.co/api/dashboard/ventas-ingresos?user_id=5&days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ver cierres con descuadres
curl -X GET "https://api.localsim.co/api/dashboard/cierres-descuadres?solo_con_diferencias=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notas Adicionales

### Fechas

Todas las fechas están en formato **ISO 8601** (YYYY-MM-DDTHH:MM:SS).

Ejemplo: `2025-10-01T14:30:00`

### UUIDs

Los IDs de entidades como ventas, turnos, SIMs, etc., son **UUIDs** en formato string.

Ejemplo: `"550e8400-e29b-41d4-a716-446655440000"`

### Paginación

Actualmente no implementada. Todas las listas devuelven todos los registros.

### CORS

La API permite peticiones desde:
- `http://localhost:3000` (desarrollo)
- `http://127.0.0.1:3000` (desarrollo)
- Cualquier puerto en localhost (desarrollo)
- `https://api.localsim.co` (producción)

---

**Versión de la documentación**: 1.0
**Fecha**: Octubre 2025
**Contacto**: dev@localsim.co
