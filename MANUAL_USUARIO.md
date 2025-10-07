# Manual de Usuario - Local SIM Colombia

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Inicio de Sesión](#inicio-de-sesión)
3. [Dashboard](#dashboard)
4. [Gestión de Turnos](#gestión-de-turnos)
5. [Punto de Venta (POS)](#punto-de-venta-pos)
6. [Gestión de SIMs](#gestión-de-sims)
7. [Recargas Winred](#recargas-winred)
8. [Devoluciones](#devoluciones)
9. [Usuarios y Roles](#usuarios-y-roles)
10. [Inventarios de SIMs](#inventarios-de-sims)
11. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

**Local SIM Colombia** es un sistema integral de gestión para puntos de venta de tarjetas SIM y recargas telefónicas. El sistema permite:

- Gestión completa de inventario de SIMs
- Punto de venta con integración a Siigo
- Recargas masivas e individuales vía Winred
- Control de turnos y cierres de caja
- Gestión de devoluciones e intercambios
- Reportes y análisis de ventas
- Control de usuarios con roles y permisos

---

## Inicio de Sesión

### Acceder al Sistema

1. Abra su navegador web y navegue a la URL del sistema
2. Ingrese su **nombre de usuario** y **contraseña**
3. Haga clic en **Iniciar Sesión**

![Login](images/login.png)

### Recuperación de Contraseña

Si olvidó su contraseña, contacte al administrador del sistema para que restablezca sus credenciales.

### Primer Inicio de Sesión

Al iniciar sesión por primera vez:
- Se le recomendará cambiar su contraseña
- Familiarícese con la interfaz y los módulos disponibles según su rol

---

## Dashboard

El **Dashboard** es la página principal que muestra un resumen de todas las operaciones del negocio.

### Vista Principal

Al ingresar al dashboard verá:

#### KPIs Principales
- **Total General**: Total de ventas acumuladas
- **Total Hoy**: Ventas del día actual
- **Total Semana**: Ventas de la semana en curso
- **Total Mes**: Ventas del mes actual
- **Ventas Hoy**: Cantidad de transacciones realizadas hoy

#### Desglose por Método de Pago
- Efectivo
- Electrónicas (Siigo)
- Datáfono
- Dólares

#### Gráficos y Reportes
- **Ventas Últimos 14 Días**: Gráfico de línea mostrando la tendencia de ventas
- **Ventas por Método de Pago**: Gráfico circular
- **Últimas Ventas**: Lista de las 10 ventas más recientes

#### Estadísticas de SIMs
- Total de SIMs en inventario
- SIMs disponibles
- SIMs recargadas
- SIMs vendidas

#### Estadísticas de Lotes
- Número total de lotes
- Distribución de SIMs por estado en cada lote

### Filtros del Dashboard

Puede filtrar los datos usando:
- **Rango de fechas**: Seleccione fecha desde y fecha hasta
- **Usuario**: Filtre por vendedor específico
- **Días**: Vista rápida de últimos 7, 14, 30 días

### Vistas Avanzadas

El dashboard incluye pestañas adicionales:

#### 1. Ventas e Ingresos
Análisis detallado de:
- Ventas por día con desglose por método de pago
- Ticket promedio
- Venta mínima y máxima
- Tendencias por periodo

#### 2. Cierres y Descuadres
Monitoreo de:
- Historial de cierres de caja
- Diferencias entre sistema y efectivo reportado
- Alertas de descuadres
- Observaciones de cierre

#### 3. Devoluciones
Análisis de:
- Devoluciones por día
- Intercambios vs. devoluciones con dinero
- Motivos más comunes de devolución
- Monto total devuelto

#### 4. Inventarios y Descuadres
Control de:
- Diferencias en inventario al abrir/cerrar turno
- Descuadres por plan
- Historial de ajustes de inventario

---

## Gestión de Turnos

Los **turnos** son esenciales para el control de caja y responsabilidad de cada vendedor.

### Abrir un Turno

**Requisito**: Debe tener un turno abierto para realizar ventas o recargas.

#### Pasos para Abrir Turno:

1. Haga clic en su nombre de usuario (esquina superior derecha)
2. Seleccione **Abrir Turno**
3. Complete el formulario:
   - **Fondo de caja inicial**: Monto en efectivo con el que inicia
   - **Inventario de SIMs por plan**: Ingrese la cantidad física de SIMs disponibles por cada plan
   - **Observaciones**: Notas adicionales (opcional)
4. Haga clic en **Abrir Turno**

![Abrir Turno](images/abrir-turno.png)

#### ¿Por qué registrar inventario al abrir turno?

El sistema compara el inventario físico reportado con el inventario del sistema. Si hay diferencias, se generan alertas de descuadre que pueden revisarse posteriormente.

### Verificar Turno Activo

En la esquina superior derecha verá:
- **Indicador verde**: Turno activo
- **ID del turno**: Últimos 8 caracteres del ID

### Cerrar un Turno

#### Pasos para Cerrar Turno:

1. Haga clic en su nombre de usuario
2. Seleccione **Cerrar Turno**
3. El sistema mostrará un resumen automático de ventas:
   - Total de ventas electrónicas (Siigo)
   - Total de ventas en efectivo
   - Total de ventas con datáfono
   - Total de ventas en dólares
4. Ingrese los valores reales:
   - **Efectivo reportado**: Cuente el efectivo real en caja
   - **Datáfono reportado**: Revise el total en el datáfono
   - **Dólares reportado**: Cuente los dólares en caja
5. Complete el inventario final:
   - Ingrese la cantidad de SIMs físicas disponibles por plan
6. Agregue observaciones si hay diferencias o novedades
7. Haga clic en **Cerrar Turno**

![Cerrar Turno](images/cerrar-turno.png)

#### Diferencias en el Cierre

Si hay diferencias entre lo reportado y lo calculado por el sistema:
- El sistema las marcará en **rojo** (faltante) o **verde** (sobrante)
- Debe incluir observaciones explicando las diferencias
- Las diferencias quedan registradas para auditoría

### Pestaña de Turnos

Acceda a **Turnos** en el menú lateral para ver:
- **Historial de turnos**: Todos los turnos abiertos y cerrados
- **Estado**: Abierto / Cerrado
- **Duración**: Tiempo total del turno
- **Totales**: Resumen de ventas por turno
- **Diferencias**: Descuadres detectados

---

## Punto de Venta (POS)

El **Punto de Venta** es el módulo para registrar ventas de SIMs y servicios.

### Requisitos Previos

- Debe tener un **turno abierto**
- Debe tener acceso al módulo "Punto de venta"

### Realizar una Venta

#### 1. Agregar SIM al Carrito

**Opción A: Buscar SIM por Código**
1. En "Buscar SIM", ingrese el **ICCID** o **número de línea**
2. Presione Enter o haga clic en **Buscar**
3. El sistema muestra los detalles de la SIM:
   - Número de línea (MSISDN)
   - ICCID
   - Plan asignado
   - Estado actual
4. Haga clic en **Agregar al Carrito**

**Opción B: Seleccionar de SIMs Disponibles**
1. Vaya a la sección "SIMs Disponibles"
2. Filtre por:
   - **Plan**: R7D, R5D, etc.
   - **Estado**: Recargado, Disponible
3. Haga clic en la SIM deseada
4. Haga clic en **Agregar al Carrito**

#### 2. Agregar Servicios Adicionales

Si vende servicios o productos adicionales (portes, activaciones):
1. Haga clic en **Agregar Producto Manual**
2. Complete:
   - **Código**: Código del producto en Siigo
   - **Descripción**: Nombre del servicio
   - **Cantidad**: Generalmente 1
   - **Precio Unitario**: Valor del servicio
   - **IVA**: Porcentaje de IVA (19% por defecto)
3. Haga clic en **Agregar**

#### 3. Revisar el Carrito

En la sección **Carrito** verá:
- Lista de items agregados
- Subtotal por item
- Total de la venta
- Botón para **eliminar** items

#### 4. Datos del Cliente

Complete los datos del cliente:
- **Identificación**: Cédula o NIT
- **Nombre**: Nombre completo o razón social
- Si no tiene datos, use "Cliente Final" con CC 222222222

#### 5. Seleccionar Método de Pago

Escoja el método:
- **Efectivo** (cash): No genera factura electrónica
- **Electrónica** (electronic): Genera factura en Siigo automáticamente
- **Datáfono** (card): Pago con tarjeta
- **Dólares** (dollars): Pago en moneda extranjera

#### 6. Finalizar Venta

1. Revise que todo esté correcto
2. Haga clic en **Procesar Venta**
3. El sistema:
   - Registra la venta en la base de datos
   - Actualiza el estado de la SIM a "vendida"
   - Si es electrónica, envía la factura a Siigo
   - Registra el movimiento en caja
4. Aparecerá un mensaje de confirmación con el ID de venta

![POS](images/pos.png)

### Cancelar una Venta en Proceso

- Haga clic en **Limpiar Carrito** para empezar de nuevo
- Los items se eliminan del carrito pero no se registra nada

### Errores Comunes en POS

| Error | Causa | Solución |
|-------|-------|----------|
| "Debe tener un turno abierto" | No hay turno activo | Abra un turno antes de vender |
| "SIM no disponible" | SIM ya vendida o en otro estado | Busque otra SIM disponible |
| "Error al generar factura en Siigo" | Problemas de conexión o datos | Verifique datos del cliente y vuelva a intentar |
| "Cliente inválido" | Datos del cliente incompletos | Complete todos los campos requeridos |

---

## Gestión de SIMs

El módulo de **SIMs** permite administrar el inventario de tarjetas SIM.

### Subir Lotes de SIMs

#### Formato del Archivo Excel

El archivo debe contener las siguientes columnas:
- **lote_id**: Identificador único del lote (ej: L001, L002)
- **numero_linea**: Número MSISDN de la SIM
- **iccid**: Código ICCID de la tarjeta
- **operador**: Operador de la SIM (CLARO, MOVISTAR, TIGO)

Ejemplo:

| lote_id | numero_linea | iccid | operador |
|---------|--------------|-------|----------|
| L001 | 3211234567 | 8957000012345678901 | CLARO |
| L001 | 3211234568 | 8957000012345678902 | CLARO |

#### Restricciones:
- Máximo **20 SIMs por lote**
- No puede haber ICCIDs duplicados
- Los lotes deben tener IDs únicos

#### Pasos para Subir Lotes:

1. Vaya al módulo **SIMs**
2. Haga clic en **Subir Lotes**
3. Seleccione el archivo Excel
4. Haga clic en **Subir**
5. El sistema valida y procesa el archivo
6. Recibirá confirmación del número de SIMs registradas

![Subir Lotes](images/subir-lotes.png)

### Asignar Plan a un Lote

Después de subir un lote, debe asignarle un plan (recargarlo):

1. En la lista de lotes, busque el lote deseado
2. Haga clic en el botón **Asignar Plan**
3. Seleccione el plan de la lista:
   - R7D (Recarga 7 Días)
   - R5D (Recarga 5 Días)
   - R1M (Recarga 1 Mes)
   - Etc.
4. Haga clic en **Confirmar**

El sistema:
- Asigna el plan al lote completo
- Marca todas las SIMs del lote como "recargadas"
- Actualiza el estado del lote

### Listar SIMs

En la pestaña **Listado de SIMs** puede:
- Ver todas las SIMs registradas
- Filtrar por:
  - **Estado**: Disponible, Recargada, Vendida
  - **Operador**: CLARO, MOVISTAR, TIGO
  - **Plan**: R7D, R5D, etc.
  - **Lote**: ID del lote
- Buscar por ICCID o número de línea

La tabla muestra:
- Número de línea
- ICCID
- Operador
- Plan asignado
- Estado
- Fecha de registro
- Fecha de venta (si aplica)

### Buscar una SIM Específica

1. Use el campo **Buscar SIM**
2. Ingrese ICCID o número de línea
3. Presione Enter
4. El sistema muestra los detalles completos de la SIM

### Ver Detalles de un Lote

1. En **Gestión de Lotes**, haga clic en un lote
2. Verá:
   - ID del lote
   - Operador
   - Plan asignado
   - Total de SIMs
   - SIMs disponibles
   - SIMs recargadas
   - SIMs vendidas
   - Fecha de registro
3. Puede ver la lista completa de SIMs del lote

---

## Recargas Winred

El módulo de **Recargas** permite realizar recargas telefónicas a través del proveedor Winred.

### Saldo Winred

En la parte superior del módulo verá:
- **Saldo**: Saldo disponible en su cuenta Winred
- **Descuentos**: Descuentos acumulados

### Recarga de Lote

Permite recargar todas las SIMs de un lote en una sola operación.

#### Pasos:

1. Vaya a **Recargas**
2. Sección **Recarga de Lote**
3. Seleccione:
   - **Lote a recargar**: Escoja el lote de la lista
   - **Operador**: CLARO, MOVISTAR, TIGO (filtra los paquetes)
   - **Paquete Winred**: Seleccione el paquete a aplicar
4. Haga clic en **Recargar lote seleccionado**
5. Confirme la operación en el modal
6. El sistema:
   - Envía la petición a Winred
   - Actualiza el estado de cada SIM en el lote
   - Registra la recarga
   - Actualiza el saldo Winred

![Recarga Lote](images/recarga-lote.png)

#### Importante:
- El lote debe estar en estado "disponible" o "recargado"
- Todas las SIMs del lote recibirán la misma recarga
- La operación es irreversible

### Recarga Individual

Permite recargar un número específico (no necesariamente del inventario).

#### Pasos:

1. Vaya a **Recargas**
2. Sección **Recarga Individual**
3. Ingrese:
   - **Número / Suscriber**: Número a recargar (10 dígitos)
   - **Paquete**: Seleccione el paquete de la lista
4. Haga clic en **Recargar número**
5. Confirme la operación
6. El sistema:
   - Envía la recarga a Winred
   - Registra la transacción
   - Actualiza el saldo

### Paquetes Disponibles

Los paquetes se cargan automáticamente desde Winred y varían según el operador:
- Nombre del paquete
- Precio
- Vigencia
- Product ID

### Errores Comunes en Recargas

| Error | Causa | Solución |
|-------|-------|----------|
| "Saldo insuficiente" | No hay saldo en Winred | Recargue su cuenta Winred |
| "Error de firma" | Problema de autenticación | Contacte soporte técnico |
| "Paquete no disponible" | Paquete deshabilitado | Seleccione otro paquete |
| "Número inválido" | Formato incorrecto | Verifique que sea un número de 10 dígitos |

---

## Devoluciones

El módulo de **Devoluciones** gestiona intercambios y devoluciones de dinero.

### Tipos de Devolución

1. **Intercambio**: Se cambia la SIM por otra, no se devuelve dinero
2. **Devolución con dinero**: Se devuelve el monto pagado

### Registrar una Devolución

#### Pasos:

1. Vaya a **Devoluciones**
2. Haga clic en **Nueva Devolución**
3. Complete el formulario:
   - **Buscar SIM**: Ingrese ICCID o número de línea de la SIM vendida
   - El sistema carga los datos de la venta original
4. Seleccione:
   - **Tipo de devolución**: Intercambio o Devolución con dinero
5. Dependiendo del tipo:

#### Si es Intercambio:
- **SIM de reemplazo**: Busque y seleccione la nueva SIM a entregar
- El sistema valida que la SIM esté disponible

#### Si es Devolución con Dinero:
- **Monto a devolver**: Ingrese el valor a devolver
- Puede ser parcial o total

6. Ingrese:
   - **Motivo**: Razón de la devolución (requerido)
   - **Observaciones**: Detalles adicionales (opcional)
7. Haga clic en **Registrar Devolución**

![Devoluciones](images/devolucion.png)

### ¿Qué hace el Sistema?

En un intercambio:
- Marca la SIM original como "devuelta"
- Marca la SIM de reemplazo como "vendida"
- Registra el movimiento
- NO afecta la caja

En una devolución con dinero:
- Marca la SIM como "devuelta"
- Registra el movimiento de caja (salida de efectivo)
- Actualiza los totales del turno
- Genera un registro de auditoría

### Consultar Devoluciones

En la pestaña **Historial de Devoluciones** puede:
- Ver todas las devoluciones registradas
- Filtrar por:
  - Fecha
  - Tipo (intercambio / devolución)
  - Usuario que registró
- Ver detalles completos de cada devolución

---

## Usuarios y Roles

**Nota**: Este módulo solo está disponible para usuarios con rol de **Admin**.

### Gestión de Usuarios

#### Crear un Nuevo Usuario

1. Vaya a **Usuarios**
2. Haga clic en **Nuevo Usuario**
3. Complete el formulario:
   - **Nombre de usuario**: Username único para login
   - **Nombre completo**: Nombre real del usuario
   - **Email**: Correo electrónico
   - **Contraseña**: Contraseña inicial
   - **Confirmar contraseña**: Repetir la contraseña
   - **Rol**: Seleccione el rol apropiado
4. Haga clic en **Crear Usuario**

![Crear Usuario](images/crear-usuario.png)

#### Editar un Usuario

1. En la lista de usuarios, busque el usuario
2. Haga clic en el botón **Editar**
3. Modifique los campos necesarios
4. Haga clic en **Guardar Cambios**

#### Desactivar un Usuario

1. Busque el usuario en la lista
2. Haga clic en **Desactivar**
3. Confirme la acción
4. El usuario no podrá iniciar sesión

### Roles y Permisos

Los roles definen qué módulos puede acceder cada usuario.

#### Roles Predefinidos:

**Admin**
- Acceso total al sistema
- Puede crear y modificar usuarios
- Puede ver todos los reportes
- Puede modificar roles y permisos

**Vendedor**
- Punto de Venta
- Gestión de SIMs (solo lectura)
- Recargas
- Devoluciones
- Dashboard (solo sus propias ventas)

**Supervisor**
- Todos los permisos de Vendedor
- Dashboard completo
- Gestión de Turnos (todos los usuarios)
- Reportes avanzados

**Contador**
- Dashboard completo
- Reportes de ventas
- Cierres de caja
- Análisis financiero
- NO tiene acceso a POS ni recargas

#### Crear un Rol Personalizado

1. Vaya a **Roles** (submódulo de Usuarios)
2. Haga clic en **Nuevo Rol**
3. Ingrese:
   - **Nombre del rol**: Nombre descriptivo
   - **Descripción**: Para qué es el rol
4. Seleccione los módulos permitidos:
   - Dashboard
   - Punto de Venta
   - SIMs
   - Recargas
   - Devoluciones
   - Usuarios
   - Turnos
   - Inventarios SIMs
5. Haga clic en **Crear Rol**

#### Asignar Módulos a un Rol

1. Vaya a **Roles**
2. Seleccione el rol a editar
3. En la sección **Módulos**:
   - Marque los módulos permitidos
   - Desmarque los no permitidos
4. Haga clic en **Guardar Cambios**

---

## Inventarios de SIMs

El módulo de **Inventarios SIMs** permite monitorear y auditar el inventario físico vs. el sistema.

### Vista de Inventarios

Al abrir el módulo verá:
- **Inventario Actual**: Estado actual del inventario en sistema
- **Descuadres Activos**: Diferencias detectadas y no resueltas
- **Historial**: Registro de todos los inventarios tomados

### Tomar Inventario

El inventario se toma automáticamente al:
- **Abrir un turno**: Inventario inicial
- **Cerrar un turno**: Inventario final

#### Proceso Automático:

1. Al abrir turno:
   - El sistema muestra el inventario esperado (según sistema)
   - El usuario ingresa el inventario físico real
   - Se calcula y registra la diferencia

2. Al cerrar turno:
   - El sistema recalcula el inventario esperado basado en ventas
   - El usuario ingresa el inventario físico final
   - Se calcula la diferencia

### Revisar Descuadres

En **Inventarios Descuadres** puede:
- Ver todos los descuadres detectados
- Filtrar por:
  - Fecha
  - Usuario
  - Plan
  - Solo con descuadres
- Ver detalles:
  - Cantidad inicial reportada
  - Cantidad inicial en sistema
  - Diferencia inicial
  - Cantidad final reportada
  - Cantidad final en sistema
  - Diferencia final
  - Observaciones

### Alertas de Descuadre

El sistema genera alertas cuando:
- La diferencia supera ±2 unidades
- Hay descuadres recurrentes
- Un usuario tiene múltiples descuadres

### Resolución de Descuadres

1. Revise el descuadre en la lista
2. Haga clic en **Ver Detalles**
3. Analice:
   - ¿Hubo ventas no registradas?
   - ¿Se registraron ventas sin entregar SIM?
   - ¿Error de conteo físico?
4. Agregue observaciones explicando la causa
5. Si es necesario, ajuste manualmente el inventario

#### Ajuste Manual de Inventario

**Nota**: Solo para usuarios Admin o Supervisor.

1. En **Inventarios SIMs**, haga clic en **Ajustar Inventario**
2. Seleccione el plan a ajustar
3. Ingrese:
   - **Cantidad a ajustar**: Positivo para aumentar, negativo para disminuir
   - **Motivo**: Explicación del ajuste (requerido)
4. Haga clic en **Aplicar Ajuste**
5. El sistema registra el ajuste en el log de auditoría

---

## Preguntas Frecuentes

### Generales

**P: ¿Puedo usar el sistema desde mi celular?**
R: Sí, el sistema es responsive y funciona en dispositivos móviles. Sin embargo, algunas funciones son más cómodas en pantalla grande.

**P: ¿Qué navegadores son compatibles?**
R: Chrome, Firefox, Edge y Safari en sus últimas versiones.

**P: ¿El sistema funciona sin internet?**
R: No, requiere conexión a internet constante para sincronización y facturación.

### Turnos

**P: ¿Qué pasa si olvido cerrar mi turno?**
R: El sistema mantiene el turno abierto. Debe cerrarlo antes de abrir uno nuevo. Un supervisor puede cerrar turnos pendientes.

**P: ¿Puedo tener varios turnos abiertos?**
R: No, solo puede tener un turno activo a la vez por usuario.

**P: ¿Cómo corrijo un error en el cierre de turno?**
R: Contacte a un supervisor o admin para que registre un ajuste manual con observaciones.

### Punto de Venta

**P: ¿Puedo vender sin factura electrónica?**
R: Sí, seleccionando método de pago "Efectivo" o "Datáfono". Solo las ventas "Electrónicas" generan factura en Siigo.

**P: ¿Qué hago si una venta no se completó correctamente?**
R: Verifique en el historial de ventas. Si se registró, puede hacer una devolución. Si no, simplemente reintente.

**P: ¿Puedo vender una SIM que no está en el sistema?**
R: No, todas las SIMs deben estar cargadas previamente en el sistema.

### SIMs

**P: ¿Puedo editar los datos de una SIM después de cargarla?**
R: Solo un Admin puede editar. Los datos críticos (ICCID, MSISDN) no deberían modificarse.

**P: ¿Qué hago si subí un lote con datos incorrectos?**
R: Contacte al admin para eliminar el lote y volver a subirlo correctamente.

**P: ¿Puedo cambiar el plan asignado a un lote?**
R: Sí, puede reasignar el plan. Esto actualizará todas las SIMs del lote.

### Recargas

**P: ¿Qué pasa si la recarga falla?**
R: El sistema mostrará un error y NO se registrará la operación. Verifique su saldo Winred y reintente.

**P: ¿Puedo recargar un número que no vendí?**
R: Sí, use la función "Recarga Individual" para recargar cualquier número.

**P: ¿Cómo verifico si una recarga se aplicó correctamente?**
R: En Winred, revise el historial de transacciones. También puede consultar el balance del número.

### Devoluciones

**P: ¿Puedo devolver una SIM después de varios días?**
R: Sí, pero debe seguir las políticas de devolución de su empresa. El sistema lo permite.

**P: ¿Qué pasa con la factura de Siigo cuando hago una devolución?**
R: La factura original no se modifica. Debe generar una nota crédito manualmente en Siigo si aplica.

**P: ¿Puedo intercambiar una SIM por otra de diferente precio?**
R: Sí, pero el sistema registra el intercambio como tal. Si hay diferencia de precio, debe ajustarlo manualmente en caja.

---

## Soporte Técnico

Si tiene problemas técnicos o preguntas no cubiertas en este manual:

- **Email**: soporte@localsim.co
- **Teléfono**: +57 (1) 234-5678
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

Para reportes de errores críticos, contacte inmediatamente al soporte técnico.

---

## Glosario

- **ICCID**: Identificador único de la tarjeta SIM (19-20 dígitos)
- **MSISDN**: Número de teléfono móvil (10 dígitos en Colombia)
- **Lote**: Conjunto de hasta 20 SIMs del mismo operador
- **Plan**: Paquete de recarga con datos, voz y vigencia específica
- **Turno**: Periodo de trabajo de un usuario con apertura y cierre de caja
- **Descuadre**: Diferencia entre inventario/caja física y registros del sistema
- **Winred**: Proveedor de recargas electrónicas
- **Siigo**: Sistema de facturación electrónica

---

**Fecha de última actualización**: Octubre 2025
**Versión del manual**: 1.0
**Versión del sistema**: 2.0
