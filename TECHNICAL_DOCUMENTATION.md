# Documentación Técnica - Local SIM Colombia

## Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Base de Datos](#base-de-datos)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Desarrollo](#desarrollo)
7. [Integraciones](#integraciones)
8. [Seguridad](#seguridad)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Mantenimiento](#mantenimiento)
12. [Troubleshooting](#troubleshooting)

---

## Arquitectura del Sistema

### Visión General

Local SIM Colombia es una aplicación web full-stack diseñada con arquitectura cliente-servidor separada.

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                   React 18 + TailwindCSS                     │
│                      (Port 3000)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
                       │ JWT Authentication
┌──────────────────────▼──────────────────────────────────────┐
│                         BACKEND                              │
│                    FastAPI + Uvicorn                         │
│                      (Port 8000)                             │
└──────────┬───────────────────────┬──────────────────────────┘
           │                       │
           │                       │ External APIs
┌──────────▼────────┐   ┌─────────▼────────┐
│   PostgreSQL      │   │  Siigo API       │
│   (asyncpg)       │   │  Winred API      │
└───────────────────┘   └──────────────────┘
```

### Componentes Principales

#### 1. Frontend (React SPA)

- **Framework**: React 18 con hooks
- **Routing**: React Router (gestión interna de estado)
- **UI Components**: shadcn/ui + Radix UI + TailwindCSS
- **State Management**: Context API (AuthContext, AppContext)
- **HTTP Client**: Axios con interceptores

**Características:**
- Single Page Application (SPA)
- Responsive design
- Gestión de roles y permisos en cliente
- Notificaciones en tiempo real
- Offline-first approach (parcial)

#### 2. Backend (FastAPI)

- **Framework**: FastAPI 0.110.1
- **ASGI Server**: Uvicorn 0.25.0
- **ORM**: SQLAlchemy 2.0 (async)
- **Database Driver**: asyncpg 0.29.0
- **Authentication**: JWT con python-jose

**Características:**
- RESTful API
- Async/await para operaciones I/O
- Documentación automática (OpenAPI/Swagger)
- Validación de datos con Pydantic
- Middleware CORS configurado

#### 3. Base de Datos (PostgreSQL)

- **Versión**: PostgreSQL 14+
- **Driver**: asyncpg (asíncrono)
- **ORM**: SQLAlchemy 2.0
- **Migraciones**: Alembic 1.13.0

**Características:**
- Schema relacional normalizado
- Índices optimizados
- Constraints de integridad referencial
- Triggers para auditoría
- UUIDs para IDs de entidades principales

#### 4. Integraciones Externas

**Siigo API**
- Facturación electrónica
- Gestión de clientes
- Reportes fiscales

**Winred API**
- Recargas telefónicas
- Consulta de saldo
- Paquetes de datos

---

## Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python | 3.11+ | Lenguaje principal |
| FastAPI | 0.110.1 | Framework web |
| Uvicorn | 0.25.0 | ASGI server |
| SQLAlchemy | 2.0+ | ORM |
| asyncpg | 0.29.0 | PostgreSQL driver |
| Alembic | 1.13.0 | Migraciones de BD |
| Pydantic | 2.6.4+ | Validación de datos |
| python-jose | 3.3.0 | JWT tokens |
| passlib | 1.7.4 | Hashing de contraseñas |
| aiohttp | 3.9.0 | HTTP client async |
| pandas | 2.2.0 | Procesamiento de Excel |
| openpyxl | 3.1.0 | Lectura de Excel |
| requests | 2.31.0 | HTTP client sync |
| python-dotenv | 1.0.1 | Variables de entorno |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.2.0 | Framework UI |
| Node.js | 18+ | Runtime |
| TailwindCSS | 3.x | Framework CSS |
| Radix UI | 1.x | Componentes accesibles |
| Axios | 1.x | HTTP client |
| Lucide React | 0.x | Iconos |
| date-fns | 2.x | Manejo de fechas |

### Infraestructura

| Tecnología | Propósito |
|------------|-----------|
| PostgreSQL 14+ | Base de datos principal |
| Docker | Containerización |
| Docker Compose | Orquestación local |
| Nginx | Reverse proxy / Static files |
| Git | Control de versiones |

### Herramientas de Desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| pytest | Testing backend |
| black | Code formatting Python |
| isort | Import sorting Python |
| flake8 | Linting Python |
| mypy | Type checking Python |
| ESLint | Linting JavaScript |
| Prettier | Code formatting JS |

---

## Estructura del Proyecto

### Estructura de Directorios

```
Local_sim-main/
├── backend/
│   ├── routes/                  # Endpoints de la API
│   │   ├── auth.py             # Autenticación
│   │   ├── sales.py            # Ventas
│   │   ├── sims.py             # Gestión de SIMs
│   │   ├── dashboard.py        # Métricas y reportes
│   │   ├── winred.py           # Recargas
│   │   ├── devoluciones.py     # Devoluciones
│   │   ├── turnos.py           # Turnos y caja
│   │   ├── users.py            # Usuarios
│   │   ├── roles.py            # Roles y permisos
│   │   └── products.py         # Productos
│   ├── services/               # Lógica de negocio
│   │   ├── sales.py            # Servicio de ventas
│   │   └── winred_client.py    # Cliente Winred
│   ├── utils/                  # Utilidades
│   │   └── auth_utils.py       # JWT y autenticación
│   ├── schemas/                # Esquemas Pydantic
│   │   └── sale_schemas.py     # Schemas de ventas
│   ├── models.py               # Modelos SQLAlchemy
│   ├── database.py             # Configuración de BD
│   ├── server.py               # Punto de entrada
│   ├── requirements.txt        # Dependencias Python
│   ├── .env                    # Variables de entorno
│   ├── Dockerfile              # Docker backend
│   └── alembic/                # Migraciones
│       ├── versions/           # Scripts de migración
│       └── env.py              # Config Alembic
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   │   ├── auth/           # Login
│   │   │   ├── dashboard/      # Dashboard
│   │   │   ├── sales/          # POS
│   │   │   ├── sims/           # SIMs
│   │   │   ├── products/       # Recargas
│   │   │   ├── devoluciones/   # Devoluciones
│   │   │   ├── turnos/         # Turnos
│   │   │   ├── users/          # Usuarios
│   │   │   ├── layout/         # Layout principal
│   │   │   └── ui/             # Componentes UI reutilizables
│   │   ├── context/            # Context API
│   │   │   ├── AuthContext.js  # Contexto de autenticación
│   │   │   └── AppContext.js   # Contexto global
│   │   ├── services/           # Servicios API
│   │   │   ├── api.js          # Axios instance
│   │   │   ├── authService.js  # Auth API
│   │   │   ├── salesService.js # Sales API
│   │   │   ├── simsService.js  # SIMs API
│   │   │   └── winredService.js# Winred API
│   │   ├── App.js              # Componente raíz
│   │   └── index.js            # Punto de entrada
│   ├── public/                 # Assets estáticos
│   ├── package.json            # Dependencias Node
│   ├── tailwind.config.js      # Config TailwindCSS
│   ├── Dockerfile              # Docker frontend
│   └── nginx.conf              # Config Nginx
├── docker-compose.yml          # Orquestación Docker
├── MANUAL_USUARIO.md           # Manual de usuario
├── API_DOCUMENTATION.md        # Documentación de API
├── TECHNICAL_DOCUMENTATION.md  # Este documento
└── README.md                   # Descripción del proyecto
```

### Patrones de Arquitectura

#### Backend

**1. Repository Pattern (implícito)**
- SQLAlchemy ORM actúa como capa de abstracción de datos
- Queries complejas en servicios especializados

**2. Service Layer**
- `services/sales.py`: Lógica de negocio de ventas
- `services/winred_client.py`: Integración con API externa
- Separa lógica de negocio de routes

**3. Dependency Injection**
- FastAPI's `Depends()` para inyección de dependencias
- Ejemplo: `db: AsyncSession = Depends(get_async_session)`

**4. Middleware Pattern**
- CORS middleware
- Authentication middleware (JWT)
- Request/Response interceptors

#### Frontend

**1. Component-Based Architecture**
- Componentes funcionales con hooks
- Componentes de presentación vs. contenedores

**2. Context API**
- AuthContext: Estado de autenticación global
- AppContext: Estado de aplicación (notificaciones, loading, turno)

**3. Service Layer**
- Servicios API encapsulan llamadas HTTP
- Manejo centralizado de errores

**4. Custom Hooks**
- `useAuth()`: Hook de autenticación
- `useApp()`: Hook de aplicación global

---

## Base de Datos

### Diagrama ER Simplificado

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    Users     │───────│    Roles     │───────│   Modules    │
└──────┬───────┘       └──────────────┘       └──────────────┘
       │                                                │
       │ 1:N                                            │
       │                                                │ N:M
┌──────▼───────┐                            ┌──────────▼──────┐
│    Turnos    │                            │  RoleModules    │
└──────┬───────┘                            └─────────────────┘
       │ 1:N
       │
┌──────▼───────┐       ┌──────────────┐       ┌──────────────┐
│    Sales     │───────│  SaleItems   │       │   SimLotes   │
└──────┬───────┘       └──────────────┘       └──────┬───────┘
       │ 1:N                                          │ 1:N
       │                                              │
┌──────▼───────┐                            ┌────────▼────────┐
│MovimientoCaja│                            │  SimDetalle     │
└──────────────┘                            └─────────────────┘
       │ 1:N                                          │
       │                                              │
┌──────▼───────┐                            ┌────────▼────────┐
│ CierreCaja   │                            │ Devoluciones    │
└──────────────┘                            └─────────────────┘
```

### Esquema de Tablas

#### Usuarios y Autenticación

**users**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    email VARCHAR UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    role_id INTEGER REFERENCES roles(id)
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**roles**
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);
```

**modules**
```sql
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);
```

**role_modules**
```sql
CREATE TABLE role_modules (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_role_module ON role_modules(role_id, module_id);
```

#### Ventas

**sales**
```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR,
    customer_identification VARCHAR,
    payment_method VARCHAR,
    siigo_invoice_id VARCHAR,
    total NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    estado VARCHAR(20) DEFAULT 'activa',
    user_id INTEGER REFERENCES users(id)
);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_estado ON sales(estado);
```

**sale_items**
```sql
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    product_code VARCHAR,
    description VARCHAR,
    quantity INTEGER,
    unit_price NUMERIC,
    iva NUMERIC
);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
```

#### SIMs e Inventario

**sim_lotes**
```sql
CREATE TABLE sim_lotes (
    id VARCHAR PRIMARY KEY,
    operador VARCHAR,
    plan_asignado VARCHAR,
    estado VARCHAR,
    fecha_registro TIMESTAMP DEFAULT NOW()
);
```

**sim_detalle**
```sql
CREATE TABLE sim_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id VARCHAR REFERENCES sim_lotes(id),
    numero_linea VARCHAR UNIQUE,
    iccid VARCHAR UNIQUE,
    estado VARCHAR, -- Enum: available, recargado, vendido, defectuosa
    plan_asignado VARCHAR,
    winred_product_id INTEGER,
    fecha_registro TIMESTAMP DEFAULT NOW(),
    fecha_ultima_recarga TIMESTAMP,
    fecha_venta TIMESTAMP,
    venta_id UUID REFERENCES sales(id),
    vendida BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_sim_detalle_lote_id ON sim_detalle(lote_id);
CREATE INDEX idx_sim_detalle_estado ON sim_detalle(estado);
CREATE INDEX idx_sim_detalle_iccid ON sim_detalle(iccid);
CREATE INDEX idx_sim_detalle_numero_linea ON sim_detalle(numero_linea);
```

#### Turnos y Caja

**turnos**
```sql
CREATE TABLE turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    fecha_apertura TIMESTAMP DEFAULT NOW(),
    fecha_cierre TIMESTAMP,
    estado VARCHAR, -- abierto, cerrado
    fondo_inicial NUMERIC,
    observaciones_apertura TEXT,
    observaciones_cierre TEXT
);
CREATE INDEX idx_turnos_user_id ON turnos(user_id);
CREATE INDEX idx_turnos_estado ON turnos(estado);
CREATE INDEX idx_turnos_fecha_apertura ON turnos(fecha_apertura);
```

**movimientos_caja**
```sql
CREATE TABLE movimientos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id),
    sale_id UUID REFERENCES sales(id),
    tipo VARCHAR, -- venta, devolucion, ajuste
    metodo_pago VARCHAR, -- cash, electronic, card, dollars
    monto NUMERIC,
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_movimientos_turno_id ON movimientos_caja(turno_id);
CREATE INDEX idx_movimientos_tipo ON movimientos_caja(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos_caja(fecha);
```

**cierres_caja**
```sql
CREATE TABLE cierres_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id),
    fecha_cierre TIMESTAMP DEFAULT NOW(),
    total_ventas_efectivo NUMERIC,
    total_ventas_datafono NUMERIC,
    total_ventas_electronicas NUMERIC,
    total_ventas_dollars NUMERIC,
    efectivo_reportado NUMERIC,
    datafono_reportado NUMERIC,
    dolares_reportado NUMERIC,
    diferencia NUMERIC,
    observaciones TEXT
);
CREATE INDEX idx_cierres_turno_id ON cierres_caja(turno_id);
CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha_cierre);
```

#### Devoluciones

**devoluciones_sim**
```sql
CREATE TABLE devoluciones_sim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sim_id UUID REFERENCES sim_detalle(id),
    tipo_devolucion VARCHAR, -- intercambio, devolucion_dinero
    sim_reemplazo_id UUID REFERENCES sim_detalle(id),
    monto_devuelto NUMERIC,
    motivo TEXT,
    observaciones TEXT,
    fecha_devolucion TIMESTAMP DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id)
);
CREATE INDEX idx_devoluciones_sim_id ON devoluciones_sim(sim_id);
CREATE INDEX idx_devoluciones_fecha ON devoluciones_sim(fecha_devolucion);
CREATE INDEX idx_devoluciones_tipo ON devoluciones_sim(tipo_devolucion);
```

#### Inventarios

**inventario_sim_turno**
```sql
CREATE TABLE inventario_sim_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id),
    plan VARCHAR,
    cantidad_inicial_reportada INTEGER,
    cantidad_inicial_sistema INTEGER,
    diferencia_inicial INTEGER,
    cantidad_final_reportada INTEGER,
    cantidad_final_sistema INTEGER,
    diferencia_final INTEGER,
    fecha_registro TIMESTAMP DEFAULT NOW(),
    fecha_cierre TIMESTAMP,
    observaciones_apertura TEXT,
    observaciones_cierre TEXT
);
CREATE INDEX idx_inventario_turno_id ON inventario_sim_turno(turno_id);
CREATE INDEX idx_inventario_plan ON inventario_sim_turno(plan);
```

### Enums

**SimStatus**
- `available`: SIM disponible para venta
- `recargado`: SIM recargada con plan
- `vendido`: SIM vendida
- `defectuosa`: SIM con problemas técnicos

**TipoDevolucion**
- `intercambio`: Cambio de SIM
- `devolucion_dinero`: Devolución con reembolso

**EstadoVenta**
- `activa`: Venta válida
- `anulada`: Venta cancelada/devuelta

### Estrategia de Índices

**Índices Principales:**
1. Primary Keys (automático)
2. Foreign Keys (automático)
3. Campos de búsqueda frecuente (username, email, iccid, numero_linea)
4. Campos de filtrado (estado, fecha, tipo)
5. Campos de ordenamiento (created_at, fecha_apertura)

**Índices Compuestos:**
```sql
CREATE INDEX idx_sales_user_date ON sales(user_id, created_at);
CREATE INDEX idx_movimientos_turno_tipo ON movimientos_caja(turno_id, tipo);
```

### Migraciones con Alembic

**Crear una migración:**
```bash
cd backend
alembic revision --autogenerate -m "Descripción del cambio"
```

**Aplicar migraciones:**
```bash
alembic upgrade head
```

**Rollback:**
```bash
alembic downgrade -1
```

**Ver historial:**
```bash
alembic history
```

---

## Instalación y Configuración

### Requisitos Previos

- **Python**: 3.11 o superior
- **Node.js**: 18 o superior
- **PostgreSQL**: 14 o superior
- **Docker** (opcional): 20.10 o superior
- **Git**: 2.x

### Instalación Local (Sin Docker)

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-org/local-sim-colombia.git
cd local-sim-colombia
```

#### 2. Configurar Backend

```bash
# Navegar al directorio backend
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo .env
cp .env.example .env
# Editar .env con tus configuraciones
```

**Archivo `.env` Backend:**
```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/localsim

# JWT
SECRET_KEY=tu-secret-key-muy-seguro-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Siigo API
SIIGO_USER=tu-usuario-siigo
SIIGO_PARTNER_ID=tu-partner-id
SIIGO_API_URL=https://api.siigo.com
SIIGO_KEY=tu-api-key-siigo

# Winred API
WINRED_API_KEY=tu-api-key-winred
WINRED_SECRET_KEY=tu-secret-key-winred
WINRED_API_URL=https://api.winred.com
```

#### 3. Crear Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE localsim;

# Salir de psql
\q
```

#### 4. Ejecutar Migraciones

```bash
# Aplicar migraciones
alembic upgrade head

# Opcional: Seed de datos iniciales
python scripts/seed_data.py
```

#### 5. Iniciar Backend

```bash
# Modo desarrollo
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Modo producción
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

#### 6. Configurar Frontend

```bash
# En otra terminal, navegar al frontend
cd ../frontend

# Instalar dependencias
npm install
# o con yarn
yarn install

# Crear archivo .env
cp .env.example .env
# Editar .env con tus configuraciones
```

**Archivo `.env` Frontend:**
```env
# API URL
REACT_APP_API_URL=http://localhost:8000

# Environment
REACT_APP_ENV=development
```

#### 7. Iniciar Frontend

```bash
# Modo desarrollo
npm start

# Build para producción
npm run build
```

### Instalación con Docker

#### 1. Archivo `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: localsim_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: localsim
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: localsim_backend
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/localsim
      SECRET_KEY: ${SECRET_KEY}
      SIIGO_USER: ${SIIGO_USER}
      SIIGO_API_KEY: ${SIIGO_API_KEY}
      WINRED_API_KEY: ${WINRED_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
    command: uvicorn server:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: localsim_frontend
    environment:
      BACKEND_URL: http://backend:8000
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### 2. Iniciar Todos los Servicios

```bash
# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

#### 3. Ejecutar Migraciones en Docker

```bash
docker-compose exec backend alembic upgrade head
```

### Variables de Entorno

#### Backend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| DATABASE_URL | URL de conexión PostgreSQL | `postgresql+asyncpg://user:pass@localhost:5432/localsim` |
| SECRET_KEY | Clave secreta para JWT | `supersecretkey123!@#` |
| ALGORITHM | Algoritmo de encriptación JWT | `HS256` |
| ACCESS_TOKEN_EXPIRE_MINUTES | Expiración del token (minutos) | `1440` (24 horas) |
| SIIGO_USER | Usuario de Siigo | `usuario@empresa.com` |
| SIIGO_PARTNER_ID | Partner ID de Siigo | `partner_id_123` |
| SIIGO_API_URL | URL base de Siigo API | `https://api.siigo.com` |
| SIIGO_KEY | API Key de Siigo | `api_key_siigo` |
| WINRED_API_KEY | API Key de Winred | `api_key_winred` |
| WINRED_SECRET_KEY | Secret Key de Winred | `secret_winred` |
| WINRED_API_URL | URL base de Winred API | `https://api.winred.com` |

#### Frontend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| REACT_APP_API_URL | URL del backend | `http://localhost:8000` |
| REACT_APP_ENV | Entorno de ejecución | `development` o `production` |
| BACKEND_URL (Docker) | URL interna del backend | `http://backend:8000` |

---

## Desarrollo

### Workflow de Desarrollo

1. **Crear rama de feature:**
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollar y probar localmente:**
   ```bash
   # Backend
   cd backend
   pytest

   # Frontend
   cd frontend
   npm test
   ```

3. **Commit siguiendo convenciones:**
   ```bash
   git commit -m "feat: agregar funcionalidad X"
   git commit -m "fix: corregir error en Y"
   git commit -m "docs: actualizar documentación"
   ```

4. **Push y crear Pull Request:**
   ```bash
   git push origin feature/nueva-funcionalidad
   ```

### Convenciones de Código

#### Backend (Python)

**Estilo:**
- PEP 8 compliance
- Black para formatting (line length: 100)
- isort para ordenar imports
- Type hints obligatorios

**Ejemplo:**
```python
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user_by_id(
    user_id: int,
    db: AsyncSession
) -> Optional[User]:
    """
    Obtiene un usuario por ID.

    Args:
        user_id: ID del usuario
        db: Sesión de base de datos

    Returns:
        Usuario encontrado o None
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalars().first()
```

**Naming:**
- Funciones: `snake_case`
- Clases: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Variables privadas: `_prefijo`

#### Frontend (JavaScript/React)

**Estilo:**
- ESLint + Prettier
- Functional components con hooks
- Naming semántico

**Ejemplo:**
```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const UserList = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/users');
        setUsers(response.data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="user-list">
      {loading ? <Spinner /> : <UserTable users={users} />}
    </div>
  );
};

export default UserList;
```

**Naming:**
- Componentes: `PascalCase`
- Funciones/variables: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Archivos componentes: `PascalCase.js`
- Archivos utilidades: `camelCase.js`

### Testing

#### Backend Testing

**Estructura:**
```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Fixtures compartidos
│   ├── test_auth.py          # Tests de autenticación
│   ├── test_sales.py         # Tests de ventas
│   ├── test_sims.py          # Tests de SIMs
│   └── test_integration.py   # Tests de integración
```

**Ejemplo de test:**
```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_create_sale(
    async_client: AsyncClient,
    auth_token: str,
    db: AsyncSession
):
    """Test de creación de venta"""
    sale_data = {
        "items": [
            {
                "product_id": "sim-uuid",
                "quantity": 1,
                "unit_price": 50000,
                "description": "SIM Claro R7D",
                "iva": 19
            }
        ],
        "payment_method": "cash",
        "customer_id": "222222222",
        "customer_identification": "222222222"
    }

    response = await async_client.post(
        "/api/sales/ventas",
        json=sale_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "venta_id" in data
    assert data["message"] == "Venta registrada correctamente"
```

**Ejecutar tests:**
```bash
# Todos los tests
pytest

# Con coverage
pytest --cov=. --cov-report=html

# Tests específicos
pytest tests/test_sales.py

# Test específico
pytest tests/test_sales.py::test_create_sale

# Verbose
pytest -v
```

#### Frontend Testing

**Herramientas:**
- Jest
- React Testing Library
- MSW (Mock Service Worker)

**Ejemplo de test:**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../context/AuthContext';
import Login from '../components/auth/Login';

describe('Login Component', () => {
  it('should login successfully with valid credentials', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await userEvent.type(usernameInput, 'testuser');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});
```

**Ejecutar tests:**
```bash
# Todos los tests
npm test

# Con coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Debugging

#### Backend

**VSCode launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "server:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000"
      ],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "DATABASE_URL": "postgresql+asyncpg://postgres:password@localhost:5432/localsim"
      }
    }
  ]
}
```

**Logging:**
```python
import logging

logger = logging.getLogger(__name__)

@router.get("/api/endpoint")
async def endpoint():
    logger.info("Endpoint called")
    logger.debug(f"Parameter: {param}")
    logger.error(f"Error occurred: {error}")
```

#### Frontend

**React DevTools:**
- Instalar extensión de navegador
- Inspeccionar componentes y props
- Ver Context y State

**Console Debugging:**
```javascript
console.log('Variable:', variable);
console.error('Error:', error);
console.table(arrayOfObjects);
debugger; // Breakpoint en navegador
```

---

## Integraciones

### Siigo API

**Propósito**: Facturación electrónica y gestión fiscal.

#### Configuración

**Variables de entorno:**
```env
SIIGO_USER=usuario@empresa.com
SIIGO_PARTNER_ID=partner_123
SIIGO_API_URL=https://api.siigo.com
SIIGO_KEY=api_key_siigo
```

#### Autenticación

Siigo usa autenticación por API Key + Partner ID.

**Obtener Token:**
```python
async def get_token(self):
    headers = {
        "Content-Type": "application/json",
        "Partner-Id": self.partner_id
    }

    payload = {
        "username": self.user,
        "access_key": self.access_key
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{self.api_url}/auth",
            json=payload,
            headers=headers
        ) as resp:
            data = await resp.json()
            self.token = data["access_token"]
            return self.token
```

#### Endpoints Utilizados

**1. Crear Factura:**
```
POST /v1/invoices
```

**Payload:**
```json
{
  "document": {"id": 27652},
  "date": "2025-10-01",
  "customer": {
    "id": "222222222",
    "person_type": "Person",
    "id_type": "13",
    "identification": "222222222",
    "name": ["Cliente", "Final"],
    "city": {
      "country_code": "CO",
      "state_code": "05",
      "city_code": "050015"
    }
  },
  "seller": 54,
  "items": [
    {
      "code": "S01",
      "description": "SIM Claro R7D",
      "quantity": 1,
      "price": 42016.81,
      "unit": {"code": "94"},
      "taxes": [{"id": 13156}]
    }
  ],
  "payments": [
    {
      "id": 471,
      "value": 50000,
      "due_date": "2025-10-01"
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid-factura",
  "number": "FE-12345",
  "name": "Factura Electrónica",
  "date": "2025-10-01",
  "total": 50000
}
```

#### Manejo de Errores

```python
try:
    response = await siigo_client.make_request("POST", "/v1/invoices", json=payload)
except Exception as e:
    if "401" in str(e):
        # Token expirado, renovar
        await siigo_client.get_token()
        response = await siigo_client.make_request("POST", "/v1/invoices", json=payload)
    elif "400" in str(e):
        # Error de validación
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail="Datos inválidos para Siigo")
    else:
        raise
```

### Winred API

**Propósito**: Recargas telefónicas y compra de paquetes de datos.

#### Configuración

**Variables de entorno:**
```env
WINRED_API_KEY=api_key_winred
WINRED_SECRET_KEY=secret_winred
WINRED_API_URL=https://api.winred.com
```

#### Autenticación

Winred usa **HMAC-SHA256** para firmar peticiones.

**Firma de Petición:**
```python
import hmac
import hashlib
import base64
import json
from datetime import datetime, timezone

def _b64_hmac_sha256(secret_key: str, message: str) -> str:
    """Genera firma HMAC-SHA256 en base64"""
    h = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    )
    return base64.b64encode(h.digest()).decode('utf-8')

def build_header_for_body(self) -> dict:
    """Construye header con timestamp y hash_key"""
    return {
        "api_version": "1.0.0",
        "api_key": self.api_key,
        "request_id": str(uuid4()),
        "request_date": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + ".000",
        "hash_key": "SHA-256"
    }

def _payload_json_mode(self, data: dict) -> dict:
    """Construye payload firmado"""
    header = self.build_header_for_body()

    # Serializar header y data
    hj = json.dumps(header, separators=(",", ":"), sort_keys=True)
    dj = json.dumps(data, separators=(",", ":"), sort_keys=True)

    # Crear firma: HMAC(secret, header + data + api_key)
    message = f"{hj}{dj}{self.api_key}"
    signature = _b64_hmac_sha256(self.secret_key, message)

    return {
        "header": header,
        "data": data,
        "signature": signature
    }
```

#### Endpoints Utilizados

**1. Consultar Saldo:**
```
POST /api/balance
```

**Request:**
```json
{
  "header": {
    "api_version": "1.0.0",
    "api_key": "your_api_key",
    "request_id": "uuid",
    "request_date": "20251001120000.000",
    "hash_key": "SHA-256"
  },
  "data": {},
  "signature": "base64_signature"
}
```

**Response:**
```json
{
  "result": {
    "success": true,
    "message": "Consulta exitosa"
  },
  "data": {
    "balance": 5000000.00,
    "discount": 50000.00
  }
}
```

**2. Consultar Paquetes:**
```
POST /api/querypackages
```

**Request:**
```json
{
  "header": {...},
  "data": {
    "product_id": 1  // 0=Todos, 1=CLARO, 2=MOVISTAR, 3=TIGO
  },
  "signature": "..."
}
```

**Response:**
```json
{
  "result": {
    "success": true
  },
  "data": {
    "package": [
      {
        "product_id": 101,
        "name": "Recarga 7 Días - 5GB",
        "price": 15000,
        "validity": "7 días"
      }
    ]
  }
}
```

**3. Recarga Individual:**
```
POST /api/topup
```

**Request:**
```json
{
  "header": {...},
  "data": {
    "product_id": 101,
    "amount": 0,
    "subscriber": "3211234567",
    "sell_from": "S"
  },
  "signature": "..."
}
```

**Response:**
```json
{
  "result": {
    "success": true,
    "message": "Recarga exitosa",
    "transaction_id": "TXN123456"
  },
  "data": {
    "balance": 4985000
  }
}
```

#### Manejo de Errores

```python
try:
    response = await winred_client.topup_individual(data)
except Exception as e:
    error_msg = str(e)

    if "firma" in error_msg.lower():
        # Error de firma - verificar secret_key
        logger.error("Error de firma Winred")
        raise HTTPException(
            status_code=500,
            detail="Error de autenticación con Winred"
        )
    elif "saldo" in error_msg.lower():
        # Saldo insuficiente
        raise HTTPException(
            status_code=400,
            detail="Saldo insuficiente en cuenta Winred"
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Error en Winred: {error_msg}"
        )
```

---

## Seguridad

### Autenticación y Autorización

#### JWT (JSON Web Tokens)

**Configuración:**
```python
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas
```

**Crear Token:**
```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

**Verificar Token:**
```python
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_session)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await get_user_by_username(db, username)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

#### Hashing de Contraseñas

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hashea una contraseña"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash"""
    return pwd_context.verify(plain_password, hashed_password)
```

#### Roles y Permisos

**Verificar Permisos:**
```python
def has_module(user: User, module_name: str) -> bool:
    """Verifica si el usuario tiene acceso a un módulo"""
    return any(m.name == module_name for m in user.role.modules)

async def require_module(
    module_name: str,
    current_user: User = Depends(get_current_user)
):
    """Dependency para requerir acceso a un módulo"""
    if not has_module(current_user, module_name):
        raise HTTPException(
            status_code=403,
            detail=f"No tienes acceso al módulo {module_name}"
        )
```

**Uso en Endpoints:**
```python
@router.get("/api/admin/users")
async def get_users(
    db: AsyncSession = Depends(get_async_session),
    _: None = Depends(lambda u: require_module("Usuarios", u))
):
    # Solo usuarios con módulo "Usuarios" pueden acceder
    users = await get_all_users(db)
    return {"users": users}
```

### CORS

**Configuración:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://api.localsim.co",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

### SQL Injection Protection

SQLAlchemy ORM proporciona protección automática usando parámetros bound:

```python
# ✅ SEGURO - Usa parámetros bound
user = await db.execute(
    select(User).where(User.username == username)
)

# ❌ INSEGURO - Nunca usar f-strings con input del usuario
query = f"SELECT * FROM users WHERE username = '{username}'"
```

### XSS Protection

**Backend:**
- Validación de entrada con Pydantic
- Sanitización de datos

**Frontend:**
- React escapa automáticamente contenido por defecto
- Evitar `dangerouslySetInnerHTML`
- Validar input del usuario

```javascript
// ✅ SEGURO
<div>{userInput}</div>

// ❌ INSEGURO
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

### Secrets Management

**Nunca commitear:**
- `.env` files
- API keys
- Contraseñas
- Tokens

**`.gitignore`:**
```
.env
.env.local
.env.*.local
*.key
*.pem
secrets/
```

**Usar variables de entorno:**
```python
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable not set")
```

### Rate Limiting

**Implementar con SlowAPI:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/endpoint")
@limiter.limit("5/minute")
async def endpoint(request: Request):
    return {"message": "success"}
```

---

## Deployment

### Deployment en Easypanel

Easypanel es una plataforma de deployment basada en Docker.

#### 1. Configurar Proyecto en Easypanel

**Backend:**
1. Crear nuevo servicio "Backend"
2. Conectar repositorio Git
3. Especificar Dockerfile: `backend/Dockerfile`
4. Configurar variables de entorno
5. Exponer puerto 8000

**Frontend:**
1. Crear nuevo servicio "Frontend"
2. Conectar repositorio Git
3. Especificar Dockerfile: `frontend/Dockerfile`
4. Configurar variable `BACKEND_URL`
5. Exponer puerto 80

**PostgreSQL:**
1. Crear servicio PostgreSQL desde template
2. Configurar usuario y contraseña
3. Crear base de datos `localsim`

#### 2. Configurar Variables de Entorno

En Easypanel Dashboard:

**Backend:**
```
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/localsim
SECRET_KEY=production-secret-key
SIIGO_USER=usuario
SIIGO_API_KEY=api_key
WINRED_API_KEY=api_key
WINRED_SECRET_KEY=secret
```

**Frontend:**
```
BACKEND_URL=http://backend:8000
```

#### 3. Deploy

```bash
# Commit cambios
git add .
git commit -m "Deploy: actualizar aplicación"
git push origin main
```

Easypanel detectará el push y rebuildeará automáticamente.

#### 4. Ejecutar Migraciones

```bash
# SSH al contenedor backend
easypanel exec backend sh

# Ejecutar migraciones
alembic upgrade head
```

### Deployment Manual (VPS)

#### 1. Configurar Servidor

**Instalar dependencias:**
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python, Node, PostgreSQL
sudo apt install python3.11 python3.11-venv nodejs npm postgresql nginx -y

# Instalar Docker (opcional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### 2. Clonar y Configurar

```bash
# Clonar repositorio
cd /var/www
sudo git clone https://github.com/tu-org/local-sim.git
cd local-sim

# Configurar backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env con configuraciones de producción

# Configurar frontend
cd ../frontend
npm install
npm run build
```

#### 3. Configurar PostgreSQL

```bash
# Crear usuario y base de datos
sudo -u postgres psql

CREATE USER localsim_user WITH PASSWORD 'secure_password';
CREATE DATABASE localsim OWNER localsim_user;
GRANT ALL PRIVILEGES ON DATABASE localsim TO localsim_user;
\q
```

#### 4. Configurar Nginx

```nginx
# /etc/nginx/sites-available/localsim

upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/local-sim/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Activar sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/localsim /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Configurar Systemd Service

```ini
# /etc/systemd/system/localsim-backend.service

[Unit]
Description=Local SIM Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/local-sim/backend
Environment="PATH=/var/www/local-sim/backend/venv/bin"
ExecStart=/var/www/local-sim/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

**Iniciar servicio:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable localsim-backend
sudo systemctl start localsim-backend
sudo systemctl status localsim-backend
```

#### 6. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d yourdomain.com
```

### CI/CD con GitHub Actions

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend
          pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Easypanel
        env:
          EASYPANEL_API_KEY: ${{ secrets.EASYPANEL_API_KEY }}
        run: |
          curl -X POST https://api.easypanel.io/deploy \
            -H "Authorization: Bearer $EASYPANEL_API_KEY" \
            -d '{"project": "local-sim", "service": "backend"}'
```

---

## Mantenimiento

### Backups

#### Base de Datos

**Backup automático diario:**
```bash
#!/bin/bash
# /usr/local/bin/backup-localsim.sh

BACKUP_DIR="/var/backups/localsim"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="localsim"
DB_USER="localsim_user"

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/localsim_$DATE.sql"

# Comprimir
gzip "$BACKUP_DIR/localsim_$DATE.sql"

# Eliminar backups antiguos (> 30 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: localsim_$DATE.sql.gz"
```

**Cron job:**
```bash
# Editar crontab
crontab -e

# Agregar:
0 2 * * * /usr/local/bin/backup-localsim.sh
```

#### Restaurar Backup

```bash
# Descomprimir
gunzip localsim_20251001.sql.gz

# Restaurar
psql -U localsim_user -d localsim < localsim_20251001.sql
```

### Monitoreo

#### Logs

**Backend logs:**
```bash
# Systemd service
sudo journalctl -u localsim-backend -f

# Docker
docker logs -f localsim_backend

# Archivo
tail -f /var/log/localsim/backend.log
```

**Frontend logs (Nginx):**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

#### Métricas

**Prometheus + Grafana (opcional):**

Instalar exporters:
- `node_exporter`: Métricas del servidor
- `postgres_exporter`: Métricas de PostgreSQL
- `nginx_exporter`: Métricas de Nginx

Configurar dashboards en Grafana para:
- CPU, RAM, Disco
- Conexiones de BD
- Request rate
- Response time

### Actualizaciones

#### Actualizar Dependencias

**Backend:**
```bash
cd backend
source venv/bin/activate
pip list --outdated
pip install --upgrade <package>
pip freeze > requirements.txt
```

**Frontend:**
```bash
cd frontend
npm outdated
npm update
npm audit fix
```

#### Actualizar Sistema

**1. Pull cambios:**
```bash
git pull origin main
```

**2. Aplicar migraciones:**
```bash
cd backend
alembic upgrade head
```

**3. Rebuild frontend:**
```bash
cd frontend
npm install
npm run build
```

**4. Reiniciar servicios:**
```bash
sudo systemctl restart localsim-backend
sudo systemctl reload nginx
```

### Limpieza

**Limpiar logs antiguos:**
```bash
# Rotar logs
sudo logrotate -f /etc/logrotate.d/localsim
```

**Limpiar cache:**
```bash
# Python
find . -type d -name "__pycache__" -exec rm -r {} +

# Node
cd frontend
npm cache clean --force
```

---

## Troubleshooting

### Problemas Comunes

#### 1. Backend no inicia

**Síntoma:** `ModuleNotFoundError` o `ImportError`

**Solución:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Síntoma:** `Connection refused` a PostgreSQL

**Solución:**
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar DATABASE_URL en .env
# Formato: postgresql+asyncpg://user:pass@host:port/db
```

#### 2. Frontend no conecta al Backend

**Síntoma:** `Network Error` en consola del navegador

**Solución:**
- Verificar que backend esté corriendo en puerto 8000
- Verificar variable `REACT_APP_API_URL` en frontend
- Verificar configuración CORS en backend
- Abrir DevTools > Network tab para ver peticiones fallidas

#### 3. Error 401 Unauthorized

**Síntoma:** Todas las peticiones autenticadas fallan con 401

**Solución:**
- Verificar que el token JWT no haya expirado
- Verificar que `SECRET_KEY` en backend no haya cambiado
- Limpiar localStorage del navegador y volver a hacer login

```javascript
// En consola del navegador
localStorage.clear();
location.reload();
```

#### 4. Error de Siigo "Invalid credentials"

**Síntoma:** Facturación falla con error 401 de Siigo

**Solución:**
- Verificar `SIIGO_USER`, `SIIGO_PARTNER_ID`, `SIIGO_KEY` en `.env`
- Verificar que las credenciales sean válidas en el dashboard de Siigo
- Revisar logs del backend para ver request/response exacto

#### 5. Error de Winred "Firma no coincide"

**Síntoma:** Recargas fallan con error de firma

**Solución:**
- Verificar `WINRED_API_KEY` y `WINRED_SECRET_KEY`
- Verificar que el timestamp tenga formato correcto: `YYYYMMDDHHmmss.000`
- Verificar que la firma se calcule en orden: `header + data + api_key`
- Revisar logs con el payload exacto enviado

**Debug:**
```python
# En winred.py
print("Header:", json.dumps(header))
print("Data:", json.dumps(data))
print("Signature:", signature)
```

#### 6. Migraciones de Alembic fallan

**Síntoma:** `alembic upgrade head` falla

**Solución:**
```bash
# Ver historial de migraciones
alembic history

# Ver migración actual
alembic current

# Rollback una migración
alembic downgrade -1

# Regenerar migración
alembic revision --autogenerate -m "Fix migration"
alembic upgrade head
```

#### 7. Performance Lento

**Síntoma:** Queries lentas, timeout en peticiones

**Solución:**
- Verificar índices en tablas grandes
- Usar `EXPLAIN ANALYZE` en queries problemáticas
- Aumentar pool de conexiones de BD
- Agregar cache (Redis) para queries frecuentes

```python
# Diagnosticar query lenta
from sqlalchemy import text

query = text("SELECT * FROM sales WHERE user_id = :user_id")
result = await db.execute(query, {"user_id": 5})

# Ver plan de ejecución
explain = await db.execute(text("EXPLAIN ANALYZE SELECT ..."))
print(explain.fetchall())
```

#### 8. Descuadres de Inventario

**Síntoma:** Inventario no cuadra al cerrar turno

**Solución:**
- Revisar tabla `inventario_sim_turno`
- Verificar que todas las ventas tengan `sim_id` correcto
- Revisar devoluciones registradas
- Ejecutar query de verificación:

```sql
-- Verificar conteo de SIMs por estado
SELECT plan_asignado, estado, COUNT(*)
FROM sim_detalle
GROUP BY plan_asignado, estado;

-- Comparar con inventario reportado
SELECT plan, cantidad_final_sistema, cantidad_final_reportada, diferencia_final
FROM inventario_sim_turno
WHERE turno_id = 'turno-uuid';
```

### Logs de Debug

**Habilitar logs detallados:**

**Backend:**
```python
# server.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

**Frontend:**
```javascript
// Habilitar logs de axios
axios.interceptors.request.use(request => {
  console.log('Starting Request', request);
  return request;
});

axios.interceptors.response.use(response => {
  console.log('Response:', response);
  return response;
});
```

### Comandos Útiles

```bash
# Ver procesos Python
ps aux | grep python

# Ver procesos Node
ps aux | grep node

# Ver conexiones de BD
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Ver uso de disco
df -h

# Ver uso de memoria
free -h

# Ver logs en tiempo real
tail -f /var/log/syslog

# Reiniciar todo
sudo systemctl restart postgresql nginx localsim-backend
```

---

## Contacto y Soporte

**Equipo de Desarrollo:**
- Email: dev@localsim.co
- GitHub: https://github.com/tu-org/local-sim

**Soporte Técnico:**
- Email: soporte@localsim.co
- Teléfono: +57 (1) 234-5678

---

**Versión de la documentación**: 1.0
**Fecha de última actualización**: Octubre 2025
**Autor**: Equipo de Desarrollo Local SIM Colombia
