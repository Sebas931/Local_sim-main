from sqlalchemy import Column, String, Integer, Numeric,  Boolean, ForeignKey, Table, DateTime, Enum, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from database import Base
from sqlalchemy import Column, Integer, ForeignKey, Computed
from sqlalchemy.orm import relationship
import uuid
import enum

# Enums definition
class SimStatus(str, enum.Enum):
    available = "available"
    recargado = "recargado"
    vendido = "vendido"
    defectuosa = "defectuosa"  # Para SIMs devueltas por fallas

class TipoDevolucion(str, enum.Enum):
    intercambio = "intercambio"  # Cambio de SIM defectuosa por una nueva
    devolucion_dinero = "devolucion_dinero"  # Anulación completa con devolución de dinero

class EstadoVenta(str, enum.Enum):
    activa = "activa"
    anulada = "anulada"

class ESimStatus(str, enum.Enum):
    disponible = "disponible"
    vendida = "vendida"
    vencida = "vencida"
    inactiva = "inactiva"

class Sale(Base):
    __tablename__ = 'sales'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(String)
    customer_identification = Column(String)
    payment_method = Column(String)
    siigo_invoice_id = Column(String, nullable=True)
    total = Column(Numeric)
    created_at = Column(DateTime, server_default=func.now())
    estado = Column(String(20), default='activa', nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User")

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = 'sale_items'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"))
    product_code = Column(String)
    description = Column(String)
    quantity = Column(Integer)
    unit_price = Column(Numeric)
    iva = Column(Numeric)

    sale = relationship("Sale", back_populates="items")

# Tabla intermedia para permisos de rol sobre módulos


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    role_modules = relationship("RoleModule", back_populates="role", cascade="all, delete-orphan")
    modules = relationship("Module", secondary="role_modules", back_populates="roles")


class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    role_modules = relationship("RoleModule", back_populates="module", cascade="all, delete-orphan")
    roles = relationship("Role", secondary="role_modules", back_populates="modules")


class RoleModule(Base):
    __tablename__ = "role_modules"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"))
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"))

    role = relationship("Role", back_populates="role_modules")
    module = relationship("Module", back_populates="role_modules")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    email = Column(String, unique=True)
    is_active = Column(Boolean, default=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    role = relationship("Role")


# Lotes de Sims
class SimLote(Base):
    __tablename__ = "sim_lotes"
    id = Column(String, primary_key=True)
    operador = Column(String, nullable=False)
    plan_asignado = Column(String, nullable=True)
    estado = Column(String, default="available")
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    sims = relationship("SimDetalle", back_populates="lote")

class SimDetalle(Base):
    __tablename__ = "sim_detalle"
    id = Column(String, primary_key=True)
    lote_id = Column(String, ForeignKey("sim_lotes.id", ondelete="CASCADE"), nullable=False)
    numero_linea = Column(String, nullable=False)
    iccid = Column(String, unique=True, nullable=False)
    estado = Column(Enum(SimStatus), default=SimStatus.available)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    plan_asignado = Column(String, nullable=True)
    fecha_ultima_recarga = Column(DateTime(timezone=True), nullable=True)
    winred_product_id = Column(String, nullable=True)
    vendida = Column(Boolean, default=False, nullable=False)
    fecha_venta = Column(DateTime(timezone=True), nullable=True)
    venta_id = Column(String, nullable=True)


    lote = relationship("SimLote", back_populates="sims")

class Turno(Base):
    __tablename__ = "turnos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fecha_apertura = Column(DateTime(timezone=True), server_default=func.now())
    fecha_cierre = Column(DateTime(timezone=True))
    estado = Column(String(20), nullable=False, default="abierto")

class CierreCaja(Base):
    __tablename__ = "cierres_caja"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    turno_id = Column(UUID(as_uuid=True), ForeignKey("turnos.id"), nullable=False)
    fecha_cierre = Column(DateTime(timezone=True), server_default=func.now())

    # Totales calculados del sistema (para comparar)
    total_ventas_electronicas = Column(Numeric(12, 2), nullable=False, default=0)
    total_ventas_efectivo = Column(Numeric(12, 2), nullable=False, default=0)
    total_ventas_datafono = Column(Numeric(12, 2), nullable=False, default=0)
    total_ventas_dollars = Column(Numeric(12, 2), nullable=False, default=0)

    # Totales reportados por el asesor
    efectivo_reportado = Column(Numeric(12, 2), nullable=False)
    datafono_reportado = Column(Numeric(12, 2), nullable=False, default=0)
    dolares_reportado = Column(Numeric(12, 2), nullable=False, default=0)

    # Diferencias calculadas
    diferencia_efectivo = Column(Numeric(12, 2), Computed("efectivo_reportado - total_ventas_efectivo", persisted=True), nullable=False)
    diferencia_datafono = Column(Numeric(12, 2), Computed("datafono_reportado - total_ventas_electronicas", persisted=True), nullable=False)
    diferencia_dolares = Column(Numeric(12, 2), Computed("dolares_reportado - total_ventas_dollars", persisted=True), nullable=False)

    observaciones = Column(Text)

class MovimientoCaja(Base):
    __tablename__ = "movimientos_caja"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    turno_id = Column(UUID(as_uuid=True), ForeignKey("turnos.id"), nullable=False)
    tipo = Column(String(20), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    descripcion = Column(Text)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    metodo_pago = Column(String(20))
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"))


class PlanHomologacion(Base):
    __tablename__ = "plan_homologacion"
    winred_product_id = Column(String, primary_key=True)
    operador          = Column(String(20), nullable=False)
    nombre_winred     = Column(String(120), nullable=False)
    siigo_code        = Column(String(20), nullable=False, index=True)
    activo            = Column(Boolean, nullable=False, default=True)


class DevolucionSim(Base):
    __tablename__ = "devoluciones_sim"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Tipo de devolución (usando String temporalmente hasta convertir a enum)
    tipo_devolucion = Column(String(20), nullable=False, default='intercambio')

    # Venta original (siempre requerida)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)

    # SIM defectuosa que se devuelve (siempre requerida)
    sim_defectuosa_id = Column(String, ForeignKey("sim_detalle.id"), nullable=False)
    sim_defectuosa_iccid = Column(String, nullable=False)
    sim_defectuosa_numero = Column(String, nullable=False)

    # SIM de reemplazo (solo para intercambios)
    sim_reemplazo_id = Column(String, ForeignKey("sim_detalle.id"), nullable=True)
    sim_reemplazo_iccid = Column(String, nullable=True)
    sim_reemplazo_numero = Column(String, nullable=True)

    # Información del proceso
    motivo = Column(Text, nullable=False)
    fecha_devolucion = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    turno_id = Column(UUID(as_uuid=True), ForeignKey("turnos.id"), nullable=True)

    # Información del cliente (opcional)
    cliente_nombre = Column(String, nullable=True)
    cliente_identificacion = Column(String, nullable=True)
    cliente_telefono = Column(String, nullable=True)

    # Campos específicos para devolución de dinero
    monto_devuelto = Column(Numeric(12, 2), nullable=True)  # Solo para devolución de dinero
    metodo_devolucion = Column(String, nullable=True)  # efectivo, transferencia, etc.

    # Relaciones
    user = relationship("User")
    sale = relationship("Sale")
    sim_defectuosa = relationship("SimDetalle", foreign_keys=[sim_defectuosa_id])
    sim_reemplazo = relationship("SimDetalle", foreign_keys=[sim_reemplazo_id])
    turno = relationship("Turno")


class ESim(Base):
    """Modelo para gestión de eSIMs con regeneración de QR"""
    __tablename__ = "esims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Identificadores únicos
    iccid = Column(String(20), unique=True, nullable=False, index=True)
    numero_telefono = Column(String(15), unique=True, nullable=False, index=True)

    # Estado actual
    estado = Column(Enum(ESimStatus), default=ESimStatus.disponible, nullable=False, index=True)

    # Información del QR Code
    qr_code_data = Column(Text, nullable=True)  # Datos del QR o base64
    qr_code_url = Column(String(500), nullable=True)  # URL si se almacena en cloud

    # Información de venta y vencimiento
    fecha_venta = Column(DateTime(timezone=True), nullable=True)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=True, index=True)
    plan_dias = Column(Integer, nullable=True)  # Duración del plan en días
    plan_nombre = Column(String(50), nullable=True)  # Nombre del plan (e.g., "30 días 20GB")

    # Relación con venta
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    sale = relationship("Sale")

    # Historial y control
    historial_regeneraciones = Column(Integer, default=0, nullable=False)
    ultima_regeneracion = Column(DateTime(timezone=True), nullable=True)

    # Operador
    operador = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Observaciones
    observaciones = Column(Text, nullable=True)


class InventarioSimTurno(Base):
    """Registro de inventario de SIMs por turno y plan."""
    __tablename__ = "inventario_sim_turno"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    turno_id = Column(UUID(as_uuid=True), ForeignKey("turnos.id"), nullable=False)

    # Plan de SIMs (R5, R7, R15, R30, etc.)
    plan = Column(String(10), nullable=False)

    # Inventario reportado por el asesor al abrir turno
    cantidad_inicial_reportada = Column(Integer, nullable=False, default=0)

    # Inventario reportado por el asesor al cerrar turno
    cantidad_final_reportada = Column(Integer, nullable=True)

    # Inventario calculado por el sistema al abrir turno
    cantidad_inicial_sistema = Column(Integer, nullable=False, default=0)

    # Inventario calculado por el sistema al cerrar turno
    cantidad_final_sistema = Column(Integer, nullable=True)

    # Diferencias calculadas automáticamente
    diferencia_inicial = Column(Integer, Computed("cantidad_inicial_reportada - cantidad_inicial_sistema"), nullable=False)
    diferencia_final = Column(Integer, nullable=True)  # Se calcula al cerrar

    # Timestamps
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)

    # Observaciones del asesor
    observaciones_apertura = Column(Text, nullable=True)
    observaciones_cierre = Column(Text, nullable=True)

    # Relaciones
    turno = relationship("Turno", back_populates="inventarios_sim")


# Agregar relación inversa en Turno
Turno.inventarios_sim = relationship("InventarioSimTurno", back_populates="turno", cascade="all, delete-orphan")