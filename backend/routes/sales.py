from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select  
from sqlalchemy.ext.asyncio import AsyncSession
from database import SessionLocal, get_async_session  
from services.sales import save_sale_to_db, generar_factura_siigo
from schemas.sale_schemas import SaleCreateSchema, SaleRequest, CartItem, TaxItem
from models import User, Sale, Turno  
from utils.auth_utils import get_current_user
from datetime import datetime, timezone
from typing import List  
from routes.sims import mark_sim_sold

router = APIRouter(prefix="/sales", tags=["Ventas"])

# Dependency para obtener sesión de base de datos
async def get_db():
    async with SessionLocal() as session:
        yield session

@router.post("/ventas")
async def registrar_venta(
    sale_data: SaleCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Verificar que el usuario tenga un turno abierto
        turno_abierto = await db.execute(
            select(Turno).where(
                Turno.user_id == current_user.id,
                Turno.estado == "abierto"
            )
        )
        if not turno_abierto.scalar_one_or_none():
            raise HTTPException(
                status_code=403, 
                detail="Debes tener un turno abierto para registrar ventas"
            )

        if sale_data.payment_method == "electronic":
            # Transformar sale_data (Pydantic) a SaleRequest (usado por Siigo)
            siigo_items = [
                CartItem(
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    code=item.product_code,
                    description=item.description,
                    taxes=[TaxItem(id=1, name="IVA 19%", type="IVA", percentage=item.iva)]
                )
                for item in sale_data.items
            ]

            siigo_request = SaleRequest(
                items=siigo_items,
                payment_method=sale_data.payment_method,
                customer_id=sale_data.customer_id,
                customer_identification=sale_data.customer_identification
            )

            # Crear la factura en Siigo
            siigo_invoice_id = await generar_factura_siigo(siigo_request)

            # Guardar venta con usuario
            venta = await save_sale_to_db(sale_data, db, siigo_invoice_id, current_user.id)
        else:
            venta = await save_sale_to_db(sale_data, db, None, current_user.id)


        for it in sale_data.items:
            sim_id  = getattr(it, "sim_id",  None) or getattr(it, "simId",  None) or None
            msisdn  = getattr(it, "msisdn",  None) or getattr(it, "numero_linea", None) or None
            iccid   = getattr(it, "iccid",   None)

            if sim_id or msisdn or iccid:
                # Pasa venta_id para que quede registrado en sim_detalle
                await mark_sim_sold(
                    db,
                    sim_id=sim_id,
                    msisdn=msisdn,
                    iccid=iccid,
                    venta_id=str(venta.id)
                )

        return {
            "message": "Venta registrada correctamente",
            "venta_id": str(venta.id),
            "enviada_a_siigo": sale_data.payment_method == "electronic"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def _to_naive_utc(dt: datetime) -> datetime:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt

@router.get("/por-turno")
async def ventas_por_turno(
    db: AsyncSession = Depends(get_async_session), 
    current_user: User = Depends(get_current_user)
):
    """Obtiene el resumen de ventas para el turno actual del usuario"""
    try:
        # 1) Turno abierto del usuario
        res_turno = await db.execute(
            select(Turno).where(
                Turno.user_id == current_user.id,
                Turno.estado == "abierto"
            )
        )
        turno = res_turno.scalar_one_or_none()
        if not turno:
            raise HTTPException(status_code=404, detail="No tienes un turno abierto")
        
        # 2) Normalizar fechas (evita aware vs naive)
        inicio = _to_naive_utc(turno.fecha_apertura)
        fin = datetime.utcnow()  # naive UTC
        
        # 3) Ventas del turno
        res_ventas = await db.execute(
            select(Sale).where(
                Sale.user_id == current_user.id,
                Sale.created_at >= inicio,
                Sale.created_at <= fin
            )
        )
        ventas = res_ventas.scalars().all()
        
        if not ventas:
            return {
                "turno_id": turno.id,  # 🆕 Agregado para que el front lo pueda enviar al cerrar turno
                "total_ventas_electronicas": 0.0,
                "total_ventas_efectivo": 0.0,
                "total_ventas_datafono": 0.0,
                "fecha_apertura": turno.fecha_apertura,
                "cantidad_ventas": 0
            }
        
        # 4) Totales (acepta alias "card" o "datafono", y ahora también "dollars")
        total_electronicas = sum(v.total for v in ventas if getattr(v, "payment_method", None) == "electronic")
        total_efectivo    = sum(v.total for v in ventas if getattr(v, "payment_method", None) == "cash")
        total_datafono    = sum(v.total for v in ventas if getattr(v, "payment_method", None) in ("card", "datafono"))
        total_dollars     = sum(v.total for v in ventas if getattr(v, "payment_method", None) == "dollars")
        
        return {
            "turno_id": turno.id,  # 🆕 Agregado
            "total_ventas_electronicas": float(total_electronicas or 0),
            "total_ventas_efectivo": float(total_efectivo or 0),
            "total_ventas_datafono": float(total_datafono or 0),
            "total_ventas_dollars": float(total_dollars or 0),
            "fecha_apertura": turno.fecha_apertura,
            "cantidad_ventas": len(ventas)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener ventas: {e}")
