from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

# --- Modelos del frontend (POST /ventas) ---
class TaxSchema(BaseModel):
    id: int
    name: Optional[str]
    type: Optional[str]
    percentage: Optional[float]

class SaleItemSchema(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    product_code: str  
    description: str
    sim_id: Optional[str] = None
    selected_plan: Optional[str] = None
    taxes: Optional[List[TaxSchema]] = []

    @property
    def iva(self):
        """Extrae el IVA del primer impuesto si existe"""
        return self.taxes[0].percentage if self.taxes else 0.0

class SaleCreateSchema(BaseModel):
    customer_id: str
    customer_identification: str
    payment_method: str  # "cash", "electronic", or "dollars"
    items: List[SaleItemSchema]


# --- Modelos para integración con Siigo ---
class TaxItem(BaseModel):
    id: int
    name: Optional[str]
    type: Optional[str]
    percentage: Optional[float]

class CartItem(BaseModel):
    product_id: str
    product_code: str = Field(..., alias="code")
    quantity: int
    unit_price: float
    description: str
    sim_id: Optional[str] = None
    selected_plan: Optional[str] = None
    taxes: Optional[List[TaxItem]] = []
    msisdn: Optional[str] = None
    iccid: Optional[str] = None

    class Config:
        populate_by_name = True

class SaleRequest(BaseModel):
    items: List[CartItem]
    payment_method: str  # "electronic" or "cash"
    customer_id: str
    customer_identification: str

# --- Modelos de turnos y cuadre de caja ---

class TurnoBase(BaseModel):
    user_id: int
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None
    estado: str

class Turno(TurnoBase):
    id: UUID
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={UUID: str},  # serializa UUID -> string en JSON
    )

class CierreCajaBase(BaseModel):
    turno_id: UUID

    # Totales calculados del sistema
    total_ventas_electronicas: float
    total_ventas_efectivo: float
    total_ventas_datafono: float
    total_ventas_dollars: float

    # Totales reportados por el asesor
    efectivo_reportado: float
    datafono_reportado: float
    dolares_reportado: float

    observaciones: Optional[str] = None

class CierreCaja(CierreCajaBase):
    id: UUID
    fecha_cierre: datetime

    # Diferencias calculadas (para el admin)
    diferencia_efectivo: float
    diferencia_datafono: float
    diferencia_dolares: float

    model_config = ConfigDict(from_attributes=True)

class CierreTurnoRequest(BaseModel):
    efectivo_reportado: float = Field(ge=0, description="Efectivo contado por el usuario al cierre")
    datafono_reportado: float = Field(ge=0, description="Ventas por datáfono reportadas por el usuario")
    dolares_reportado: float = Field(ge=0, description="Ventas en dólares reportadas por el usuario")
    observaciones: Optional[str] = None

# --- Modelos para inventario de SIMs ---

class InventarioSimPlan(BaseModel):
    """Inventario de SIMs por plan."""
    plan: str = Field(..., description="Plan de las SIMs (R5, R7, R15, R30)")
    cantidad_reportada: int = Field(ge=0, description="Cantidad reportada por el asesor")
    observaciones: Optional[str] = None

class AbrirTurnoRequest(BaseModel):
    """Request para abrir turno con inventario inicial de SIMs."""
    inventarios: List[InventarioSimPlan] = Field(
        default_factory=list,
        description="Inventario inicial de SIMs por plan"
    )

class CierreTurnoRequestWithInventory(BaseModel):
    """Request para cerrar turno con dinero e inventario final de SIMs."""
    # Dinero
    efectivo_reportado: float = Field(ge=0, description="Efectivo contado por el usuario al cierre")
    datafono_reportado: float = Field(ge=0, description="Ventas por datáfono reportadas por el usuario")
    dolares_reportado: float = Field(ge=0, description="Ventas en dólares reportadas por el usuario")
    observaciones: Optional[str] = None

    # Inventario de SIMs
    inventarios: List[InventarioSimPlan] = Field(
        default_factory=list,
        description="Inventario final de SIMs por plan"
    )

class InventarioSimTurnoResponse(BaseModel):
    """Response del inventario de SIMs por turno."""
    id: UUID
    turno_id: UUID
    plan: str

    # Cantidades reportadas
    cantidad_inicial_reportada: int
    cantidad_final_reportada: Optional[int] = None

    # Cantidades del sistema
    cantidad_inicial_sistema: int
    cantidad_final_sistema: Optional[int] = None

    # Diferencias
    diferencia_inicial: int
    diferencia_final: Optional[int] = None

    # Timestamps
    fecha_registro: datetime
    fecha_cierre: Optional[datetime] = None

    # Observaciones
    observaciones_apertura: Optional[str] = None
    observaciones_cierre: Optional[str] = None

    # Indicadores de descuadre
    tiene_descuadre_inicial: bool = False
    tiene_descuadre_final: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_indicators(cls, obj):
        """Crear desde ORM incluyendo indicadores de descuadre."""
        data = cls.model_validate(obj, from_attributes=True)
        data.tiene_descuadre_inicial = abs(data.diferencia_inicial) > 0
        if data.diferencia_final is not None:
            data.tiene_descuadre_final = abs(data.diferencia_final) > 0
        return data

class TurnoWithInventory(Turno):
    """Turno con información de inventarios de SIMs."""
    inventarios_sim: List[InventarioSimTurnoResponse] = []

    model_config = ConfigDict(from_attributes=True)