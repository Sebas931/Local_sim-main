# Guía de Despliegue - Local SIM Colombia

Esta guía explica cómo desplegar la aplicación Local SIM Colombia en Easypanel y otros servicios.

## 📋 Requisitos Previos

- Cuenta en Easypanel
- PostgreSQL Database (puede ser proporcionada por Easypanel)
- MongoDB Database (puede ser proporcionada por Easypanel)
- Variables de entorno configuradas (ver `.env.example`)

## 🚀 Despliegue en Easypanel

### Paso 1: Preparar el Repositorio

1. Asegúrate de que todos los archivos estén en tu repositorio Git
2. Verifica que el `.gitignore` esté actualizado para no subir archivos sensibles
3. Sube el código a GitHub/GitLab

```bash
git add .
git commit -m "Prepare for Easypanel deployment"
git push origin main
```

### Paso 2: Configurar Bases de Datos en Easypanel

#### PostgreSQL
1. En Easypanel, crea un nuevo servicio de PostgreSQL
2. Anota las credenciales:
   - Host
   - Puerto
   - Usuario
   - Contraseña
   - Nombre de base de datos

#### MongoDB
1. Crea un servicio de MongoDB
2. Anota las credenciales:
   - Connection String
   - Usuario
   - Contraseña

### Paso 3: Desplegar Backend

1. En Easypanel, crear nuevo proyecto → "App"
2. Configuración:
   - **Name:** localsim-backend
   - **Repository:** Tu repositorio Git
   - **Branch:** main
   - **Build Method:** Dockerfile
   - **Dockerfile Path:** backend/Dockerfile
   - **Port:** 8001

3. Variables de entorno (añadir en Easypanel):

```env
DATABASE_URL=postgresql://usuario:password@host:5432/dbname
MONGO_URL=mongodb://usuario:password@host:27017/dbname?authSource=admin

JWT_SECRET_KEY=genera-una-clave-segura-aqui
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

SIIGO_USER=tu-email@siigo.com
SIIGO_PARTNER_ID=miAppIntegracion
SIIGO_API_URL=https://api.siigo.com
SIIGO_KEY=tu-clave-siigo

DEFAULT_CUSTOMER_ID=tu-customer-id
DEFAULT_CUSTOMER_IDENTIFICATION=222222222222

WINRED_BASE_URL=https://winred.co/api
WINRED_API_VERSION=1.0
WINRED_USER_ID=tu-user-id
WINRED_API_KEY=tu-api-key
WINRED_SECRET_KEY=tu-secret-key
WINRED_BASIC_USER=tu-basic-user
WINRED_BASIC_PASS=tu-basic-pass
```

4. Despliega y espera a que el build complete

### Paso 4: Desplegar Frontend

1. Crear nuevo proyecto → "App"
2. Configuración:
   - **Name:** localsim-frontend
   - **Repository:** Tu repositorio Git (el mismo)
   - **Branch:** main
   - **Build Method:** Dockerfile
   - **Dockerfile Path:** frontend/Dockerfile
   - **Port:** 80

3. Variables de entorno:

```env
REACT_APP_API_URL=https://tu-backend.easypanel.host
```

⚠️ **Importante:** Reemplaza `tu-backend.easypanel.host` con la URL real de tu backend

4. Despliega

### Paso 5: Configurar Dominios (Opcional)

1. En Easypanel, ve a la configuración de cada app
2. Añade dominios personalizados:
   - Frontend: `app.tudominio.com`
   - Backend: `api.tudominio.com`
3. Actualiza `REACT_APP_API_URL` en el frontend con el nuevo dominio del backend

### Paso 6: Inicializar Base de Datos

Una vez desplegado el backend, ejecuta el script de inicialización:

```bash
# Conectarse al contenedor del backend
docker exec -it localsim-backend bash

# Ejecutar script de inicialización
python init_data.py
```

Esto creará:
- Roles por defecto (Admin, Vendedor, etc.)
- Módulos del sistema
- Usuario administrador inicial

## 🐳 Despliegue Local con Docker Compose

Para probar localmente antes de desplegar:

### 1. Copiar variables de entorno

```bash
cp .env.example .env
```

### 2. Editar `.env` con tus credenciales

```bash
nano .env
```

### 3. Levantar servicios

```bash
docker-compose up -d
```

### 4. Ver logs

```bash
docker-compose logs -f
```

### 5. Acceder a la aplicación

- Frontend: http://localhost
- Backend API: http://localhost:8001
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017

### 6. Detener servicios

```bash
docker-compose down
```

### 7. Limpiar todo (incluyendo volúmenes)

```bash
docker-compose down -v
```

## 🔧 Solución de Problemas

### Backend no inicia

1. Verificar logs: `docker-compose logs backend`
2. Verificar conexión a base de datos
3. Revisar variables de entorno

### Frontend no se conecta al backend

1. Verificar `REACT_APP_API_URL` en variables de entorno
2. Verificar CORS en el backend (debe permitir el dominio del frontend)
3. Revisar logs del navegador (F12)

### Error de base de datos

1. Verificar que PostgreSQL y MongoDB estén corriendo
2. Verificar credenciales en `DATABASE_URL` y `MONGO_URL`
3. Verificar que las bases de datos existan

### Build falla en Easypanel

1. Revisar logs del build
2. Verificar que los Dockerfiles sean correctos
3. Verificar que todas las dependencias estén en `requirements.txt` y `package.json`

## 📊 Monitoreo

### Health Checks

- Backend: `http://api.tudominio.com/api/auth/health`
- Frontend: `http://app.tudominio.com/health`

### Logs en Easypanel

1. Ve a tu aplicación en Easypanel
2. Click en "Logs"
3. Filtra por errores si es necesario

## 🔐 Seguridad

### Checklist de seguridad antes de producción:

- [ ] Cambiar `JWT_SECRET_KEY` a un valor seguro aleatorio
- [ ] Usar contraseñas fuertes para bases de datos
- [ ] Habilitar HTTPS en Easypanel (automático con dominios)
- [ ] Revisar que las API keys de Siigo y WinRed estén protegidas
- [ ] Configurar backups automáticos de las bases de datos
- [ ] Limitar acceso a bases de datos solo desde el backend
- [ ] Revisar logs regularmente

## 📦 Actualización de la Aplicación

### En Easypanel:

1. Hacer push de los cambios al repositorio Git
2. En Easypanel, ir a la aplicación
3. Click en "Rebuild"
4. Esperar a que termine el deploy

### Con Docker Compose (local):

```bash
git pull
docker-compose build
docker-compose up -d
```

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs primero
2. Verifica las variables de entorno
3. Consulta la documentación de Easypanel
4. Revisa el código en el repositorio

## 📝 Notas Adicionales

- El backend corre en el puerto 8001
- El frontend corre en el puerto 80 (HTTP) o 443 (HTTPS)
- PostgreSQL se usa para datos transaccionales
- MongoDB se usa para datos auxiliares
- Todos los servicios tienen health checks configurados
- Los volúmenes de Docker persisten los datos de las bases de datos
