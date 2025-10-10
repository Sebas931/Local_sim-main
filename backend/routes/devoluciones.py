from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload, joinedload
from database import get_async_session
from models import DevolucionSim, SimDetalle, User, SimStatus, Sale, SaleItem, TipoDevolucion, EstadoVenta
from schemas.devolucion_schemas import (
    DevolucionCreateSchema,
    DevolucionResponseSchema,
    DevolucionListSchema,
    SimDisponibleSchema
)
from utils.auth_utils import get_current_user
from utils.turno_utils import get_turno_activo
from typing import List
from uuid import UUID

router = APIRouter()


@router.get("/ventas-por-iccid")
async def buscar_ventas_por_iccid(
    iccid: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Buscar ventas que contengan una SIM específica por ICCID"""
    try:
        # Buscar la SIM por ICCID
        sim_query = select(SimDetalle).where(SimDetalle.iccid == iccid)
        result = await db.execute(sim_query)
        sim = result.scalar_one_or_none()

        if not sim:
            raise HTTPException(status_code=404, detail="SIM no encontrada")

        ventas_encontradas = []

        # Si hay venta_id en la SIM, usarla directamente
        if sim.venta_id:
            try:
                # Intentar convertir a UUID si es posible
                if isinstance(sim.venta_id, str):
                    venta_uuid = UUID(sim.venta_id)
                else:
                    venta_uuid = sim.venta_id

                # Buscar la venta específica
                sale_query = select(Sale).options(
                    selectinload(Sale.items),
                    selectinload(Sale.user)
                ).where(
                    and_(
                        Sale.id == venta_uuid,
                        Sale.estado == 'activa'
                    )
                )

                result = await db.execute(sale_query)
                sale = result.scalar_one_or_none()

                if sale:
                    ventas_encontradas.append({
                        "sale_id": str(sale.id),
                        "customer_id": sale.customer_id,
                        "customer_identification": sale.customer_identification,
                        "payment_method": sale.payment_method,
                        "total": float(sale.total),
                        "created_at": sale.created_at.isoformat(),
                        "user_name": sale.user.full_name or sale.user.username if sale.user else None,
                        "items": [
                            {
                                "description": item.description,
                                "quantity": item.quantity,
                                "unit_price": float(item.unit_price)
                            }
                            for item in sale.items
                        ]
                    })
                    return ventas_encontradas
            except (ValueError, TypeError) as e:
                print(f"Error converting venta_id to UUID: {e}")
                # Si no se puede convertir UUID, continuar con búsqueda por descripción

        # Buscar por descripción en items de venta
        sales_query = select(Sale).options(
            selectinload(Sale.items),
            selectinload(Sale.user)
        ).join(SaleItem).where(
            and_(
                Sale.estado == 'activa',  # Solo ventas activas
                SaleItem.description.ilike(f"%{iccid}%")
            )
        )

        result = await db.execute(sales_query)
        sales = result.scalars().unique().all()

        for sale in sales:
            ventas_encontradas.append({
                "sale_id": str(sale.id),
                "customer_id": sale.customer_id,
                "customer_identification": sale.customer_identification,
                "payment_method": sale.payment_method,
                "total": float(sale.total),
                "created_at": sale.created_at.isoformat(),
                "user_name": sale.user.full_name or sale.user.username if sale.user else None,
                "items": [
                    {
                        "description": item.description,
                        "quantity": item.quantity,
                        "unit_price": float(item.unit_price)
                    }
                    for item in sale.items
                ]
            })

        return ventas_encontradas

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in buscar_ventas_por_iccid: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al buscar ventas: {str(e)}")


@router.get("/sims-vendidas", response_model=List[SimDisponibleSchema])
async def get_sims_vendidas(
    search: str = "",
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Obtener SIMs vendidas que pueden ser devueltas por fallas"""
    try:
        query = select(SimDetalle).options(
            joinedload(SimDetalle.lote)
        ).where(
            and_(
                SimDetalle.vendida == True,
                SimDetalle.estado == SimStatus.vendido,
                or_(
                    SimDetalle.iccid.ilike(f"%{search}%"),
                    SimDetalle.numero_linea.ilike(f"%{search}%")
                ) if search else True
            )
        ).limit(50)

        result = await db.execute(query)
        sims = result.scalars().unique().all()

        return [
            SimDisponibleSchema(
                id=sim.id,
                iccid=sim.iccid,
                numero_linea=sim.numero_linea,
                operador=sim.lote.operador,
                plan_asignado=sim.plan_asignado,
                estado=sim.estado.value
            )
            for sim in sims
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener SIMs vendidas: {str(e)}")


@router.get("/sims-disponibles", response_model=List[SimDisponibleSchema])
async def get_sims_disponibles_reemplazo(
    search: str = "",
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Obtener SIMs disponibles para usar como reemplazo"""
    try:
        # Disponibles: incluye 'available' Y 'recargado'
        query = select(SimDetalle).options(
            joinedload(SimDetalle.lote)
        ).where(
            and_(
                SimDetalle.vendida == False,
                SimDetalle.estado.in_([SimStatus.available, SimStatus.recargado]),
                or_(
                    SimDetalle.iccid.ilike(f"%{search}%"),
                    SimDetalle.numero_linea.ilike(f"%{search}%")
                ) if search else True
            )
        ).limit(50)

        result = await db.execute(query)
        sims = result.scalars().unique().all()

        return [
            SimDisponibleSchema(
                id=sim.id,
                iccid=sim.iccid,
                numero_linea=sim.numero_linea,
                operador=sim.lote.operador,
                plan_asignado=sim.plan_asignado,
                estado=sim.estado.value
            )
            for sim in sims
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener SIMs disponibles: {str(e)}")


@router.post("/", response_model=DevolucionResponseSchema)
async def crear_devolucion(
    devolucion_data: DevolucionCreateSchema,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Crear una nueva devolución (intercambio o devolución de dinero)"""
    try:
        # Convertir sale_id a UUID si es string
        try:
            if isinstance(devolucion_data.sale_id, str):
                sale_id = UUID(devolucion_data.sale_id)
            else:
                sale_id = devolucion_data.sale_id
        except (ValueError, TypeError) as e:
            raise HTTPException(status_code=400, detail=f"Sale ID inválido: {str(e)}")

        # Validar la venta original
        sale_query = select(Sale).where(Sale.id == sale_id)
        result = await db.execute(sale_query)
        sale = result.scalar_one_or_none()

        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        if sale.estado != 'activa':
            raise HTTPException(status_code=400, detail="La venta ya está anulada")

        # Buscar la SIM defectuosa
        sim_defectuosa_query = select(SimDetalle).where(
            SimDetalle.iccid == devolucion_data.sim_defectuosa_iccid
        )
        result = await db.execute(sim_defectuosa_query)
        sim_defectuosa = result.scalar_one_or_none()

        if not sim_defectuosa:
            raise HTTPException(status_code=404, detail="SIM defectuosa no encontrada")

        if not sim_defectuosa.vendida or sim_defectuosa.estado != SimStatus.vendido:
            raise HTTPException(status_code=400, detail="La SIM debe estar vendida para poder devolverla")

        # Obtener turno activo
        turno_activo = await get_turno_activo(db, current_user.id)

        # Procesar según el tipo de devolución
        if devolucion_data.tipo_devolucion == 'intercambio':
            return await _procesar_intercambio(
                devolucion_data, sale, sim_defectuosa, turno_activo, current_user, db, sale_id
            )
        elif devolucion_data.tipo_devolucion == 'devolucion_dinero':
            return await _procesar_devolucion_dinero(
                devolucion_data, sale, sim_defectuosa, turno_activo, current_user, db, sale_id
            )
        else:
            raise HTTPException(status_code=400, detail="Tipo de devolución no válido")

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear devolución: {str(e)}")


async def _procesar_intercambio(devolucion_data, sale, sim_defectuosa, turno_activo, current_user, db, sale_id):
    """Procesar intercambio de SIM"""
    # Buscar la SIM de reemplazo
    sim_reemplazo_query = select(SimDetalle).where(
        SimDetalle.iccid == devolucion_data.sim_reemplazo_iccid
    )
    result = await db.execute(sim_reemplazo_query)
    sim_reemplazo = result.scalar_one_or_none()

    if not sim_reemplazo:
        raise HTTPException(status_code=404, detail="SIM de reemplazo no encontrada")

    # Disponibles: incluye 'available' Y 'recargado'
    if sim_reemplazo.vendida or sim_reemplazo.estado not in [SimStatus.available, SimStatus.recargado]:
        raise HTTPException(status_code=400, detail="La SIM de reemplazo debe estar disponible")

    # Verificar que no sean la misma SIM
    if sim_defectuosa.id == sim_reemplazo.id:
        raise HTTPException(status_code=400, detail="La SIM defectuosa y de reemplazo no pueden ser la misma")

    # Crear la devolución
    devolucion = DevolucionSim(
        tipo_devolucion='intercambio',
        sale_id=sale_id,
        sim_defectuosa_id=sim_defectuosa.id,
        sim_defectuosa_iccid=sim_defectuosa.iccid,
        sim_defectuosa_numero=sim_defectuosa.numero_linea,
        sim_reemplazo_id=sim_reemplazo.id,
        sim_reemplazo_iccid=sim_reemplazo.iccid,
        sim_reemplazo_numero=sim_reemplazo.numero_linea,
        motivo=devolucion_data.motivo,
        user_id=current_user.id,
        turno_id=turno_activo.id if turno_activo else None,
        cliente_nombre=devolucion_data.cliente_nombre,
        cliente_identificacion=devolucion_data.cliente_identificacion,
        cliente_telefono=devolucion_data.cliente_telefono
    )

    db.add(devolucion)

    # Actualizar estados de las SIMs
    # SIM defectuosa: marcar como defectuosa
    sim_defectuosa.estado = SimStatus.defectuosa
    sim_defectuosa.vendida = False

    # SIM de reemplazo: marcar como vendida (sustituye a la defectuosa)
    sim_reemplazo.estado = SimStatus.vendido
    sim_reemplazo.vendida = True
    sim_reemplazo.plan_asignado = sim_defectuosa.plan_asignado
    sim_reemplazo.fecha_venta = func.now()
    sim_reemplazo.venta_id = str(sale_id)

    await db.commit()
    await db.refresh(devolucion)

    return DevolucionResponseSchema.model_validate(devolucion)


async def _procesar_devolucion_dinero(devolucion_data, sale, sim_defectuosa, turno_activo, current_user, db, sale_id):
    """Procesar devolución completa de dinero"""
    # Crear la devolución
    devolucion = DevolucionSim(
        tipo_devolucion='devolucion_dinero',
        sale_id=sale_id,
        sim_defectuosa_id=sim_defectuosa.id,
        sim_defectuosa_iccid=sim_defectuosa.iccid,
        sim_defectuosa_numero=sim_defectuosa.numero_linea,
        motivo=devolucion_data.motivo,
        monto_devuelto=devolucion_data.monto_devuelto,
        metodo_devolucion=devolucion_data.metodo_devolucion,
        user_id=current_user.id,
        turno_id=turno_activo.id if turno_activo else None,
        cliente_nombre=devolucion_data.cliente_nombre,
        cliente_identificacion=devolucion_data.cliente_identificacion,
        cliente_telefono=devolucion_data.cliente_telefono
    )

    db.add(devolucion)

    # Anular la venta original
    sale.estado = 'anulada'

    # Marcar la SIM como disponible nuevamente
    sim_defectuosa.estado = SimStatus.available
    sim_defectuosa.vendida = False
    sim_defectuosa.fecha_venta = None
    sim_defectuosa.venta_id = None

    await db.commit()
    await db.refresh(devolucion)

    return DevolucionResponseSchema.model_validate(devolucion)


@router.get("/", response_model=List[DevolucionListSchema])
async def listar_devoluciones(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Listar todas las devoluciones"""
    try:
        query = select(DevolucionSim).options(
            selectinload(DevolucionSim.user)
        ).order_by(DevolucionSim.fecha_devolucion.desc()).offset(skip).limit(limit)

        result = await db.execute(query)
        devoluciones = result.scalars().all()

        return [
            DevolucionListSchema(
                id=dev.id,
                tipo_devolucion=dev.tipo_devolucion if dev.tipo_devolucion else 'intercambio',
                sale_id=dev.sale_id,
                sim_defectuosa_iccid=dev.sim_defectuosa_iccid,
                sim_defectuosa_numero=dev.sim_defectuosa_numero,
                sim_reemplazo_iccid=dev.sim_reemplazo_iccid,
                sim_reemplazo_numero=dev.sim_reemplazo_numero,
                motivo=dev.motivo,
                fecha_devolucion=dev.fecha_devolucion,
                user_name=dev.user.full_name or dev.user.username if dev.user else None,
                monto_devuelto=dev.monto_devuelto,
                metodo_devolucion=dev.metodo_devolucion,
                cliente_nombre=dev.cliente_nombre,
                cliente_identificacion=dev.cliente_identificacion
            )
            for dev in devoluciones
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar devoluciones: {str(e)}")


@router.get("/{devolucion_id}", response_model=DevolucionResponseSchema)
async def obtener_devolucion(
    devolucion_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Obtener detalles de una devolución específica"""
    try:
        query = select(DevolucionSim).where(DevolucionSim.id == devolucion_id)
        result = await db.execute(query)
        devolucion = result.scalar_one_or_none()

        if not devolucion:
            raise HTTPException(status_code=404, detail="Devolución no encontrada")

        return DevolucionResponseSchema.model_validate(devolucion)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener devolución: {str(e)}")