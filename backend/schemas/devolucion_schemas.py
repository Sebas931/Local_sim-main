from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class DevolucionIntercambioSchema(BaseModel):
    """Schema para intercambio de SIM"""
    tipo_devolucion: Literal["intercambio"] = "intercambio"
    sale_id: str = Field(..., description="ID de la venta original")
    sim_defectuosa_iccid: str = Field(..., description="ICCID de la SIM defectuosa")
    sim_reemplazo_iccid: str = Field(..., description="ICCID de la SIM de reemplazo")
    motivo: str = Field(..., min_length=10, description="Motivo del intercambio")

    # Información del cliente (opcional)
    cliente_nombre: Optional[str] = None
    cliente_identificacion: Optional[str] = None
    cliente_telefono: Optional[str] = None


class DevolucionDineroSchema(BaseModel):
    """Schema para devolución de dinero"""
    tipo_devolucion: Literal["devolucion_dinero"] = "devolucion_dinero"
    sale_id: str = Field(..., description="ID de la venta original a anular")
    sim_defectuosa_iccid: str = Field(..., description="ICCID de la SIM a devolver")
    motivo: str = Field(..., min_length=10, description="Motivo de la devolución")
    monto_devuelto: Decimal = Field(..., ge=0, description="Monto a devolver")
    metodo_devolucion: str = Field(..., description="Método de devolución (efectivo, transferencia, etc.)")

    # Información del cliente (opcional)
    cliente_nombre: Optional[str] = None
    cliente_identificacion: Optional[str] = None
    cliente_telefono: Optional[str] = None


class DevolucionCreateSchema(BaseModel):
    """Schema unificado para crear devoluciones"""
    tipo_devolucion: str = Field(..., description="Tipo: intercambio o devolucion_dinero")
    sale_id: str = Field(..., description="ID de la venta original")
    sim_defectuosa_iccid: str = Field(..., description="ICCID de la SIM defectuosa")
    motivo: str = Field(..., min_length=10, description="Motivo de la devolución")

    # Para intercambio
    sim_reemplazo_iccid: Optional[str] = None

    # Para devolución de dinero
    monto_devuelto: Optional[Decimal] = None
    metodo_devolucion: Optional[str] = None

    # Información del cliente (opcional)
    cliente_nombre: Optional[str] = None
    cliente_identificacion: Optional[str] = None
    cliente_telefono: Optional[str] = None

    @validator('sim_reemplazo_iccid')
    def validate_sim_reemplazo(cls, v, values):
        if values.get('tipo_devolucion') == 'intercambio' and not v:
            raise ValueError('SIM de reemplazo es requerida para intercambios')
        return v

    @validator('monto_devuelto')
    def validate_monto_devuelto(cls, v, values):
        if values.get('tipo_devolucion') == 'devolucion_dinero' and not v:
            raise ValueError('Monto devuelto es requerido para devoluciones de dinero')
        return v

    @validator('metodo_devolucion')
    def validate_metodo_devolucion(cls, v, values):
        if values.get('tipo_devolucion') == 'devolucion_dinero' and not v:
            raise ValueError('Método de devolución es requerido para devoluciones de dinero')
        return v


class DevolucionResponseSchema(BaseModel):
    """Schema para respuesta de devolución"""
    id: UUID
    tipo_devolucion: str
    sale_id: UUID

    # SIM defectuosa
    sim_defectuosa_id: str
    sim_defectuosa_iccid: str
    sim_defectuosa_numero: str

    # SIM de reemplazo (solo para intercambios)
    sim_reemplazo_id: Optional[str]
    sim_reemplazo_iccid: Optional[str]
    sim_reemplazo_numero: Optional[str]

    # Información del proceso
    motivo: str
    fecha_devolucion: datetime
    user_id: int
    turno_id: Optional[UUID]

    # Campos específicos para devolución de dinero
    monto_devuelto: Optional[Decimal]
    metodo_devolucion: Optional[str]

    # Información del cliente
    cliente_nombre: Optional[str]
    cliente_identificacion: Optional[str]
    cliente_telefono: Optional[str]

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={UUID: str}
    )


class DevolucionListSchema(BaseModel):
    """Schema para listar devoluciones con información adicional"""
    id: UUID
    tipo_devolucion: str
    sale_id: UUID

    # SIM defectuosa
    sim_defectuosa_iccid: str
    sim_defectuosa_numero: str

    # SIM de reemplazo (solo para intercambios)
    sim_reemplazo_iccid: Optional[str]
    sim_reemplazo_numero: Optional[str]

    # Información del proceso
    motivo: str
    fecha_devolucion: datetime
    user_name: Optional[str] = None  # Nombre del usuario que hizo la devolución

    # Campos específicos para devolución de dinero
    monto_devuelto: Optional[Decimal]
    metodo_devolucion: Optional[str]

    # Información del cliente
    cliente_nombre: Optional[str]
    cliente_identificacion: Optional[str]

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={UUID: str}
    )


class SimDisponibleSchema(BaseModel):
    """Schema para SIMs disponibles para reemplazo"""
    id: str
    iccid: str
    numero_linea: str
    operador: str
    plan_asignado: Optional[str]
    estado: str

    model_config = ConfigDict(from_attributes=True)