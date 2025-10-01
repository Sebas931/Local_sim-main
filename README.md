# Local SIM Colombia - Sistema de Gestión

Sistema de gestión para Local SIM Colombia con inventario de tarjetas SIM, ventas, productos y administración de usuarios.

## Stack Tecnológico

### Backend
- **Framework:** FastAPI 0.110.1
- **Base de datos:** MongoDB (Motor 3.3.1) + PostgreSQL (SQLAlchemy)
- **Autenticación:** JWT (python-jose, PyJWT)
- **Servidor:** Uvicorn

### Frontend
- **Framework:** React 18.2.0
- **UI Components:** Radix UI + shadcn/ui
- **Estilos:** TailwindCSS 3.4
- **Routing:** React Router DOM 7.5
- **Forms:** React Hook Form + Zod
- **Gráficos:** Recharts 2.15

## Instalación y Configuración

### Requisitos Previos
- Python 3.9+
- Node.js 16+
- MongoDB
- PostgreSQL

### Backend

1. Navegar al directorio backend:
```bash
cd backend
```

2. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
# Crear archivo .env en backend/
cp .env.example .env
# Editar .env con tus configuraciones
```

5. Iniciar servidor:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

1. Navegar al directorio frontend:
```bash
cd frontend
```

2. Instalar dependencias:
```bash
npm install
# o
yarn install
```

3. Configurar variables de entorno:
```bash
# Crear archivo .env en frontend/
cp .env.example .env
```

4. Iniciar servidor de desarrollo:
```bash
npm start
# o
yarn start
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
Local_sim-main/
├── backend/
│   ├── routes/          # Endpoints API
│   ├── models.py        # Modelos de base de datos
│   ├── schemas/         # Esquemas Pydantic
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades
│   ├── siigo/           # Integración Siigo ERP
│   └── server.py        # Punto de entrada
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── ui/          # Componentes shadcn/ui
│   │   └── App.js       # Componente principal
│   └── public/
└── README.md
```

## Características Principales

- **Gestión de SIMs:** Control completo del inventario de tarjetas SIM
- **Ventas:** Registro y facturación con integración a Siigo
- **Productos:** Catálogo de productos y servicios
- **Usuarios y Roles:** Sistema de permisos basado en roles
- **Dashboard:** Análisis y reportes en tiempo real
- **Turnos:** Sistema de gestión de turnos de trabajo
- **Devoluciones:** Procesamiento de devoluciones
- **Integración WinRed:** Procesamiento de pagos

## API Endpoints

El backend expone los siguientes grupos de endpoints:

- `/api/auth` - Autenticación y login
- `/api/sales` - Gestión de ventas
- `/api/sims` - Inventario de SIMs
- `/api/products` - Catálogo de productos
- `/api/users` - Gestión de usuarios
- `/api/roles` - Roles y permisos
- `/api/dashboard` - Analytics y reportes
- `/api/turnos` - Gestión de turnos
- `/api/devoluciones` - Devoluciones
- `/api/winred` - Integración de pagos

## Variables de Entorno

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost/dbname
MONGO_URL=mongodb://localhost:27017
JWT_SECRET_KEY=your-secret-key
SIIGO_API_KEY=your-siigo-key
WINRED_API_KEY=your-winred-key
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8001
```

## Despliegue

Para desplegar en Easypanel u otro servicio:

1. Asegurar que las variables de entorno estén configuradas
2. Backend debe correr en puerto 8001
3. Frontend debe apuntar al backend en producción
4. Configurar base de datos PostgreSQL y MongoDB

## Licencia

Propietario - Local SIM Colombia
