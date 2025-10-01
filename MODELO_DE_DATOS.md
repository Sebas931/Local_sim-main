# 📊 Modelo de Datos - Local SIM Colombia

## 🏗️ Arquitectura General

Esta aplicación es un **Sistema de Gestión de Ventas de SIMs** para Local SIM Colombia, que permite:
- Gestión de inventario de tarjetas SIM
- Procesamiento de ventas con diferentes métodos de pago
- Control de turnos y cierres de caja
- Sistema de devoluciones e intercambios
- Integración con facturación electrónica (Siigo)
- Control de acceso basado en roles

---

## 📋 Entidades Principales

### 1. 👥 **Gestión de Usuarios y Permisos**

#### `users` - Usuarios del Sistema
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR UNIQUE NOT NULL    -- Nombre de usuario único
hashed_password VARCHAR NOT NULL           -- Contraseña hasheada
full_name       VARCHAR                    -- Nombre completo
email           VARCHAR UNIQUE             -- Correo electrónico
is_active       BOOLEAN DEFAULT TRUE       -- Usuario activo/inactivo
role_id         INTEGER → roles.id         -- Rol asignado
```

#### `roles` - Roles del Sistema
```sql
id   SERIAL PRIMARY KEY
name VARCHAR UNIQUE NOT NULL  -- Ej: "admin", "vendedor", "supervisor"
```

#### `modules` - Módulos de la Aplicación
```sql
id   SERIAL PRIMARY KEY
name VARCHAR UNIQUE NOT NULL  -- Ej: "ventas", "inventario", "turnos"
```

#### `role_modules` - Permisos (Tabla Intermedia)
```sql
id        SERIAL PRIMARY KEY
role_id   INTEGER → roles.id
module_id INTEGER → modules.id
```

### 2. 📱 **Gestión de Inventario SIM**

#### `sim_lotes` - Lotes de SIMs
```sql
id              VARCHAR PRIMARY KEY        -- ID del lote
operador        VARCHAR NOT NULL           -- Ej: "Claro", "Movistar", "Tigo"
plan_asignado   VARCHAR                    -- Plan por defecto del lote
estado          VARCHAR DEFAULT "available" -- Estado del lote
fecha_registro  TIMESTAMP WITH TIME ZONE   -- Fecha de registro
```

#### `sim_detalle` - Tarjetas SIM Individuales
```sql
id                    VARCHAR PRIMARY KEY
lote_id               VARCHAR → sim_lotes.id         -- Lote al que pertenece
numero_linea          VARCHAR NOT NULL               -- Número telefónico
iccid                 VARCHAR UNIQUE NOT NULL        -- Identificador único SIM
estado                SimStatus DEFAULT "available"  -- Estado: available, recargado, vendido, defectuosa
fecha_registro        TIMESTAMP WITH TIME ZONE       -- Fecha de ingreso
plan_asignado         VARCHAR                        -- Plan específico asignado
fecha_ultima_recarga  TIMESTAMP WITH TIME ZONE       -- Última recarga realizada
winred_product_id     VARCHAR                        -- ID producto en WinRed
vendida               BOOLEAN DEFAULT FALSE          -- Marcador de venta
fecha_venta           TIMESTAMP WITH TIME ZONE       -- Cuándo se vendió
venta_id              VARCHAR                        -- ID de la venta asociada
```

**Enum `SimStatus`:**
- `available`: Disponible para venta
- `recargado`: SIM con recarga aplicada
- `vendido`: SIM vendida a cliente
- `defectuosa`: SIM con fallas (devuelta)

### 3. 💰 **Sistema de Ventas**

#### `sales` - Ventas Realizadas
```sql
id                      UUID PRIMARY KEY
customer_id             VARCHAR              -- ID del cliente
customer_identification VARCHAR              -- Cédula/documento cliente
payment_method          VARCHAR              -- Método: cash, card, electronic, dollars
siigo_invoice_id        VARCHAR              -- ID factura en Siigo
total                   NUMERIC              -- Total de la venta
created_at              TIMESTAMP            -- Fecha/hora venta
estado                  VARCHAR(20) DEFAULT "activa"  -- activa, anulada
user_id                 INTEGER → users.id   -- Vendedor que realizó
```

#### `sale_items` - Items de Venta
```sql
id          UUID PRIMARY KEY
sale_id     UUID → sales.id        -- Venta a la que pertenece
product_code VARCHAR               -- Código del producto
description VARCHAR                -- Descripción del item
quantity    INTEGER                -- Cantidad vendida
unit_price  NUMERIC               -- Precio unitario
iva         NUMERIC               -- IVA aplicado
```

### 4. 🕒 **Control de Turnos**

#### `turnos` - Turnos de Trabajo
```sql
id             UUID PRIMARY KEY
user_id        INTEGER → users.id            -- Usuario del turno
fecha_apertura TIMESTAMP WITH TIME ZONE     -- Inicio del turno
fecha_cierre   TIMESTAMP WITH TIME ZONE     -- Fin del turno
estado         VARCHAR(20) DEFAULT "abierto" -- abierto, cerrado
```

#### `movimientos_caja` - Movimientos Financieros
```sql
id          UUID PRIMARY KEY
turno_id    UUID → turnos.id         -- Turno asociado
tipo        VARCHAR(20) NOT NULL     -- "venta", "gasto", "ingreso"
monto       NUMERIC(12,2) NOT NULL   -- Cantidad del movimiento
descripcion TEXT                     -- Descripción del movimiento
fecha       TIMESTAMP WITH TIME ZONE -- Fecha/hora del movimiento
metodo_pago VARCHAR(20)             -- cash, card, electronic, dollars
sale_id     UUID → sales.id         -- Venta asociada (si aplica)
```

#### `cierres_caja` - Cierres de Turno
```sql
id                        UUID PRIMARY KEY
turno_id                  UUID → turnos.id         -- Turno cerrado
fecha_cierre              TIMESTAMP WITH TIME ZONE -- Fecha del cierre

-- Totales Calculados por el Sistema
total_ventas_electronicas NUMERIC(12,2) DEFAULT 0  -- Suma electronic
total_ventas_efectivo     NUMERIC(12,2) DEFAULT 0  -- Suma cash
total_ventas_datafono     NUMERIC(12,2) DEFAULT 0  -- Suma card
total_ventas_dollars      NUMERIC(12,2) DEFAULT 0  -- Suma dollars

-- Totales Reportados por el Asesor
efectivo_reportado        NUMERIC(12,2) NOT NULL   -- Efectivo contado
datafono_reportado        NUMERIC(12,2) DEFAULT 0  -- Datafono reportado
dolares_reportado         NUMERIC(12,2) DEFAULT 0  -- Dólares reportados

-- Diferencias (Columnas Calculadas)
diferencia_efectivo       NUMERIC(12,2) COMPUTED   -- efectivo_reportado - total_ventas_efectivo
diferencia_datafono       NUMERIC(12,2) COMPUTED   -- datafono_reportado - total_ventas_electronicas
diferencia_dolares        NUMERIC(12,2) COMPUTED   -- dolares_reportado - total_ventas_dollars

observaciones             TEXT                     -- Notas del cierre
```

### 5. 🔄 **Sistema de Devoluciones**

#### `devoluciones_sim` - Devoluciones e Intercambios
```sql
id                      UUID PRIMARY KEY
tipo_devolucion         VARCHAR(20) DEFAULT "intercambio"  -- intercambio, devolucion_dinero
sale_id                 UUID → sales.id                    -- Venta original
fecha_devolucion        TIMESTAMP WITH TIME ZONE           -- Fecha del proceso

-- SIM Defectuosa (Siempre Requerida)
sim_defectuosa_id       VARCHAR → sim_detalle.id          -- SIM con problema
sim_defectuosa_iccid    VARCHAR NOT NULL                  -- ICCID de la SIM defectuosa
sim_defectuosa_numero   VARCHAR NOT NULL                  -- Número de la SIM defectuosa

-- SIM de Reemplazo (Solo Intercambios)
sim_reemplazo_id        VARCHAR → sim_detalle.id          -- SIM nueva (nullable)
sim_reemplazo_iccid     VARCHAR                           -- ICCID nueva SIM (nullable)
sim_reemplazo_numero    VARCHAR                           -- Número nueva SIM (nullable)

-- Información del Proceso
motivo                  TEXT NOT NULL                     -- Razón de la devolución
user_id                 INTEGER → users.id                -- Usuario que procesó
turno_id                UUID → turnos.id                  -- Turno en que se procesó

-- Información del Cliente (Opcional)
cliente_nombre          VARCHAR                           -- Nombre del cliente
cliente_identificacion VARCHAR                           -- Documento del cliente
cliente_telefono        VARCHAR                           -- Teléfono de contacto

-- Campos Específicos para Devolución de Dinero
monto_devuelto          NUMERIC(12,2)                     -- Dinero devuelto (nullable)
metodo_devolucion       VARCHAR                           -- efectivo, transferencia, etc.
```

**Enum `TipoDevolucion`:**
- `intercambio`: Cambio de SIM defectuosa por nueva (sin devolución de dinero)
- `devolucion_dinero`: Anulación completa con reembolso

### 6. 🔗 **Integración y Homologación**

#### `plan_homologacion` - Mapeo de Productos
```sql
winred_product_id VARCHAR PRIMARY KEY    -- ID en sistema WinRed
operador          VARCHAR(20) NOT NULL  -- Operador móvil
nombre_winred     VARCHAR(120) NOT NULL -- Nombre en WinRed
siigo_code        VARCHAR(20) NOT NULL  -- Código en Siigo
activo            BOOLEAN DEFAULT TRUE  -- Producto activo
```

---

## 🔗 Relaciones Principales

### **Relaciones de Usuario**
- `User` → `Role` (many-to-one)
- `Role` → `Module` (many-to-many via `role_modules`)
- `User` → `Sale` (one-to-many) - vendedor
- `User` → `Turno` (one-to-many) - turnos del usuario
- `User` → `DevolucionSim` (one-to-many) - devoluciones procesadas

### **Relaciones de Inventario**
- `SimLote` → `SimDetalle` (one-to-many)
- `SimDetalle` → `Sale` (via venta_id string reference)
- `SimDetalle` → `DevolucionSim` (as sim_defectuosa or sim_reemplazo)

### **Relaciones de Ventas**
- `Sale` → `SaleItem` (one-to-many)
- `Sale` → `User` (many-to-one) - vendedor
- `Sale` → `MovimientoCaja` (one-to-many)
- `Sale` → `DevolucionSim` (one-to-many)

### **Relaciones de Turnos**
- `Turno` → `User` (many-to-one)
- `Turno` → `MovimientoCaja` (one-to-many)
- `Turno` → `CierreCaja` (one-to-many)
- `Turno` → `DevolucionSim` (one-to-many)

### **Relaciones de Devoluciones**
- `DevolucionSim` → `Sale` (many-to-one) - venta original
- `DevolucionSim` → `User` (many-to-one) - quien procesó
- `DevolucionSim` → `Turno` (many-to-one) - turno del proceso
- `DevolucionSim` → `SimDetalle` (two foreign keys: defectuosa + reemplazo)

---

## 📊 Estados y Flujos de Datos

### **Estado de SIMs**
```
available → recargado → vendido
available → vendido
vendido → defectuosa (por devolución)
defectuosa → available (por reparación - no implementado)
```

### **Estado de Ventas**
```
activa → anulada (por devolución de dinero)
```

### **Estado de Turnos**
```
abierto → cerrado (con cierre de caja)
```

### **Tipos de Movimientos de Caja**
- `venta`: Ingresos por ventas
- `gasto`: Gastos del turno
- `ingreso`: Otros ingresos

### **Métodos de Pago**
- `cash`: Efectivo
- `card`: Tarjeta/Datáfono
- `electronic`: Transferencias/Nequi
- `dollars`: Dólares americanos

---

## 🚀 Características Técnicas

### **Base de Datos**
- **Motor**: PostgreSQL
- **ORM**: SQLAlchemy (Python)
- **Migrations**: Alembic
- **Timezone**: UTC con soporte timezone-aware

### **Tipos de Datos Especiales**
- **UUID**: Para IDs principales (sales, turnos, cierres, devoluciones)
- **NUMERIC(12,2)**: Para montos financieros
- **TIMESTAMP WITH TIME ZONE**: Para fechas con zona horaria
- **ENUM**: Para estados controlados
- **COMPUTED COLUMNS**: Para diferencias en cierres

### **Índices y Constraints**
- **Unique**: `username`, `email`, `iccid`
- **Foreign Keys**: Con CASCADE donde corresponde
- **Defaults**: Valores por defecto para estados
- **NOT NULL**: Campos críticos para integridad

### **Integraciones Externas**
- **Siigo**: Facturación electrónica
- **WinRed**: Sistema de recargas
- **Plan Homologación**: Mapeo entre sistemas

---

## 📈 Casos de Uso Principales

### **Flujo de Venta Normal**
1. Usuario abre turno
2. Busca SIM disponible por operador/plan
3. Crea venta con items
4. SIM cambia estado a `vendido`
5. Se crea `MovimientoCaja` con el monto
6. Opcionalmente genera factura en Siigo

### **Flujo de Intercambio**
1. Cliente reporta SIM defectuosa
2. Se busca la venta original por ICCID
3. Se selecciona SIM de reemplazo disponible
4. SIM defectuosa → estado `defectuosa`
5. SIM reemplazo → estado `vendido`
6. Se registra en `devoluciones_sim`
7. Venta original permanece `activa`

### **Flujo de Devolución de Dinero**
1. Cliente solicita devolución completa
2. Se busca la venta original
3. Se especifica monto y método de devolución
4. Venta cambia estado a `anulada`
5. SIM regresa a estado `available`
6. Se registra en `devoluciones_sim`
7. Movimientos de caja se excluyen de cálculos

### **Flujo de Cierre de Turno**
1. Usuario reporta totales contados
2. Sistema calcula totales reales (excluyendo ventas anuladas)
3. Se calculan diferencias automáticamente
4. Se genera `CierreCaja` con toda la información
5. Turno cambia estado a `cerrado`

---

## 🔐 Seguridad y Validaciones

### **Autenticación**
- Contraseñas hasheadas
- JWT tokens para sesiones
- Control de usuarios activos

### **Autorización**
- Sistema RBAC (Role-Based Access Control)
- Permisos por módulo
- Validación en cada endpoint

### **Integridad de Datos**
- Foreign keys con constraints
- Validaciones en modelos Pydantic
- Transacciones para operaciones críticas
- Estados controlados por enums

### **Auditoría**
- Timestamps automáticos
- Registro de usuario en operaciones
- Historial completo de devoluciones
- Trazabilidad de SIMs por ICCID

---

Este modelo de datos soporta completamente las operaciones de Local SIM Colombia, proporcionando:
- ✅ Control completo del inventario
- ✅ Procesamiento de ventas multi-método
- ✅ Gestión de turnos y cierres
- ✅ Sistema robusto de devoluciones
- ✅ Integridad financiera
- ✅ Trazabilidad completa
- ✅ Integración con sistemas externos