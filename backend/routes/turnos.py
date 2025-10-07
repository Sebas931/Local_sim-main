from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, or_
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional
import logging
from decimal import Decimal


from database import get_async_session
from utils.auth_utils import get_current_user
from models import (
    Turno as TurnoModel,
    CierreCaja as CierreCajaModel,
    User,
    MovimientoCaja,
    Sale,
    SaleItem,
    InventarioSimTurno,
    SimDetalle,
    SimLote,
)
from schemas.sale_schemas import (
    Turno, CierreCaja, CierreTurnoRequest,
    AbrirTurnoRequest, CierreTurnoRequestWithInventory,
    InventarioSimTurnoResponse, TurnoWithInventory
)

router = APIRouter(prefix="/api/turnos", tags=["Turnos"])
logger = logging.getLogger("turnos")


async def _calcular_inventario_sistema_por_plan(db: AsyncSession, plan: str) -> int:
    """Calcula el inventario real disponible en el sistema para un plan específico."""
    result = await db.execute(
        select(func.count(SimDetalle.id))
        .join(SimLote, SimDetalle.lote_id == SimLote.id)
        .where(
            SimDetalle.estado == "available",
            SimDetalle.plan_asignado == plan
        )
    )
    return result.scalar() or 0


async def _calcular_inventario_teorico_por_plan(db: AsyncSession, turno_id: str, plan: str, cantidad_inicial: int) -> dict:
    """
    Calcula el inventario teórico basado en ventas realizadas durante el turno.

    Args:
        turno_id: ID del turno
        plan: Plan de SIM (R5D, R7D, R15D, R30D)
        cantidad_inicial: Cantidad reportada en la apertura

    Returns:
        dict: {
            'cantidad_inicial': int,
            'ventas_realizadas': int,
            'inventario_teorico': int
        }
    """
    try:
        print(f"\n🔍 Calculando inventario teórico - Turno: {turno_id}, Plan: {plan}, Inicial: {cantidad_inicial}")

        # Primero: Ver TODOS los product_code del turno para debugging
        debug_result = await db.execute(
            select(SaleItem.product_code, SaleItem.description, SaleItem.quantity)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .join(MovimientoCaja, Sale.id == MovimientoCaja.sale_id)
            .where(
                MovimientoCaja.turno_id == turno_id,
                Sale.estado == "activa",
                MovimientoCaja.tipo == "venta"
            )
        )
        todos_items = debug_result.all()
        print(f"   🔎 TODOS los items vendidos en este turno:")
        for item in todos_items:
            print(f"      - product_code='{item.product_code}', description='{item.description}', qty={item.quantity}")

        # Buscar ventas de SIMs del plan específico durante este turno
        # Intentar con coincidencia que incluya el plan en el product_code
        result = await db.execute(
            select(func.coalesce(func.sum(SaleItem.quantity), 0))
            .join(Sale, SaleItem.sale_id == Sale.id)
            .join(MovimientoCaja, Sale.id == MovimientoCaja.sale_id)
            .where(
                MovimientoCaja.turno_id == turno_id,
                Sale.estado == "activa",
                MovimientoCaja.tipo == "venta",
                or_(
                    SaleItem.product_code == plan,
                    SaleItem.product_code.ilike(f'%{plan}%')
                )
            )
        )
        ventas_realizadas = result.scalar() or 0

        # Calcular inventario teórico
        inventario_teorico = cantidad_inicial - ventas_realizadas

        print(f"   📊 Ventas realizadas del plan {plan}: {ventas_realizadas}")
        print(f"   📦 Inventario teórico: {inventario_teorico} (inicial {cantidad_inicial} - ventas {ventas_realizadas})")

        return {
            'cantidad_inicial': cantidad_inicial,
            'ventas_realizadas': ventas_realizadas,
            'inventario_teorico': inventario_teorico
        }

    except Exception as e:
        logging.error(f"Error calculando inventario teórico para plan {plan} en turno {turno_id}: {e}")
        return {
            'cantidad_inicial': cantidad_inicial,
            'ventas_realizadas': 0,
            'inventario_teorico': cantidad_inicial
        }




@router.post("/abrir")
async def abrir_turno(
    turno_data: AbrirTurnoRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # ¿ya hay turno abierto?
    result = await db.execute(
        select(TurnoModel).where(
            TurnoModel.user_id == current_user.id,
            TurnoModel.estado == "abierto"
        )
    )
    turno_abierto = result.scalar_one_or_none()
    if turno_abierto:
        raise HTTPException(status_code=400, detail="Ya tienes un turno abierto")

    # fecha_apertura: aware UTC (columna timezone=True)
    nuevo_turno = TurnoModel(
        id=uuid4(),
        user_id=current_user.id,
        fecha_apertura=datetime.now(timezone.utc),
        estado="abierto",
        fecha_cierre=None
    )

    db.add(nuevo_turno)
    await db.flush()  # Para obtener el ID del turno

    # Registrar inventarios de SIMs si se proporcionaron
    print(f"\n{'='*80}")
    print(f"📦 GUARDANDO INVENTARIOS DE APERTURA - Turno ID: {nuevo_turno.id}")
    print(f"{'='*80}")

    inventarios_creados = []
    for inventario in turno_data.inventarios:
        print(f"\n📝 Guardando inventario:")
        print(f"   Plan: {inventario.plan}")
        print(f"   Cantidad reportada: {inventario.cantidad_reportada}")
        print(f"   Observaciones: {inventario.observaciones or 'N/A'}")

        # No calcular inventario del sistema - será manual
        inventario_sim = InventarioSimTurno(
            id=uuid4(),
            turno_id=nuevo_turno.id,
            plan=inventario.plan,
            cantidad_inicial_reportada=inventario.cantidad_reportada,
            cantidad_inicial_sistema=0,  # Será manual, no calculado automáticamente
            observaciones_apertura=inventario.observaciones,
            fecha_registro=datetime.now(timezone.utc)
        )
        db.add(inventario_sim)
        inventarios_creados.append(inventario_sim)

    await db.commit()
    print(f"\n✅ Se guardaron {len(inventarios_creados)} inventarios de apertura")
    print(f"{'='*80}\n")
    await db.refresh(nuevo_turno)

    # Preparar respuesta simple sin relaciones complejas
    return {
        "id": str(nuevo_turno.id),
        "user_id": nuevo_turno.user_id,
        "fecha_apertura": nuevo_turno.fecha_apertura,
        "fecha_cierre": nuevo_turno.fecha_cierre,
        "estado": nuevo_turno.estado,
        "inventarios_creados": len(inventarios_creados)
    }


@router.post("/cerrar-con-inventario", response_model=CierreCaja)
async def cerrar_turno_con_inventario(
    cierre_data: CierreTurnoRequestWithInventory,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1) turno abierto
        result = await db.execute(
            select(TurnoModel).where(
                TurnoModel.user_id == current_user.id,
                TurnoModel.estado == "abierto"
            )
        )
        turno = result.scalar_one_or_none()
        if not turno:
            raise HTTPException(status_code=404, detail="No tienes un turno abierto")

        # 2) Fechas aware para guardar
        aware_now = datetime.now(timezone.utc)

        # 3) Actualizar inventarios de SIMs si se proporcionaron
        print(f"\n{'='*80}")
        print(f"📦 PROCESANDO INVENTARIOS DE CIERRE - Turno ID: {turno.id}")
        print(f"{'='*80}")

        for inventario_cierre in cierre_data.inventarios:
            print(f"\n🔍 Procesando plan: {inventario_cierre.plan}")
            print(f"   Cantidad reportada en cierre: {inventario_cierre.cantidad_reportada}")

            # Buscar el registro de inventario existente
            inventario_result = await db.execute(
                select(InventarioSimTurno).where(
                    InventarioSimTurno.turno_id == turno.id,
                    InventarioSimTurno.plan == inventario_cierre.plan
                )
            )
            inventario_sim = inventario_result.scalar_one_or_none()

            if inventario_sim:
                print(f"   ✅ Encontrado inventario de apertura:")
                print(f"      - Cantidad inicial reportada: {inventario_sim.cantidad_inicial_reportada}")
                print(f"      - Cantidad inicial sistema: {inventario_sim.cantidad_inicial_sistema}")

                # Calcular inventario teórico basado en ventas del turno
                inventario_teorico = await _calcular_inventario_teorico_por_plan(
                    db, str(turno.id), inventario_cierre.plan, inventario_sim.cantidad_inicial_reportada
                )

                # Actualizar el registro existente
                inventario_sim.cantidad_final_reportada = inventario_cierre.cantidad_reportada
                inventario_sim.cantidad_final_sistema = inventario_teorico['inventario_teorico']
                inventario_sim.diferencia_final = inventario_cierre.cantidad_reportada - inventario_teorico['inventario_teorico']
                inventario_sim.observaciones_cierre = inventario_cierre.observaciones
                inventario_sim.fecha_cierre = aware_now

                print(f"\n   📊 RESULTADO DEL CÁLCULO:")
                print(f"      - Cantidad final reportada: {inventario_sim.cantidad_final_reportada}")
                print(f"      - Cantidad final sistema (teórico): {inventario_sim.cantidad_final_sistema}")
                print(f"      - Diferencia final: {inventario_sim.diferencia_final}")
                print(f"      - {'✅ CUADRA' if inventario_sim.diferencia_final == 0 else '⚠️ DESCUADRE'}")

            else:
                print(f"   ⚠️ NO se encontró inventario de apertura para el plan {inventario_cierre.plan}")
                print(f"   ⚠️ Esto significa que el plan NO se registró en la apertura del turno")
                print(f"   ⚠️ No se puede calcular descuadre sin inventario inicial")

                # Si no existe registro de apertura, no se puede calcular descuadre
                # Crear registro solo para documentar el cierre
                nuevo_inventario = InventarioSimTurno(
                    id=uuid4(),
                    turno_id=turno.id,
                    plan=inventario_cierre.plan,
                    cantidad_inicial_reportada=0,  # No se reportó en apertura
                    cantidad_inicial_sistema=0,
                    cantidad_final_reportada=inventario_cierre.cantidad_reportada,
                    cantidad_final_sistema=0,  # No se puede calcular sin apertura
                    diferencia_final=None,  # No se puede calcular sin apertura
                    observaciones_cierre=inventario_cierre.observaciones,
                    fecha_registro=turno.fecha_apertura,
                    fecha_cierre=aware_now
                )
                db.add(nuevo_inventario)
                print(f"   📝 Se creó registro de cierre sin calcular descuadre")

        # 4) Continuar con el proceso normal de cierre de caja
        # (mismo código que el endpoint original)
        movs_res = await db.execute(
            select(MovimientoCaja).join(
                Sale, MovimientoCaja.sale_id == Sale.id
            ).where(
                MovimientoCaja.turno_id == turno.id,
                MovimientoCaja.tipo == "venta",
                Sale.estado == "activa"
            )
        )
        movs = list(movs_res.scalars().all())

        def mp(m):
            return (getattr(m, "metodo_pago", "") or "").strip().lower()

        def mm(m):
            try:
                return float(getattr(m, "monto", 0) or 0)
            except Exception:
                return 0.0

        total_electronicas = sum(mm(m) for m in movs if mp(m) == "electronic")
        total_efectivo    = sum(mm(m) for m in movs if mp(m) == "cash")
        total_datafono    = sum(mm(m) for m in movs if mp(m) == "card")
        total_dollars     = sum(mm(m) for m in movs if mp(m) == "dollars")

        efectivo_reportado = float(cierre_data.efectivo_reportado or 0)
        datafono_reportado = float(cierre_data.datafono_reportado or 0)
        dolares_reportado = float(cierre_data.dolares_reportado or 0)

        to_dec = lambda x: Decimal(str(x or 0))
        total_electronicas_dec = to_dec(total_electronicas)
        total_efectivo_dec     = to_dec(total_efectivo)
        total_datafono_dec     = to_dec(total_datafono)
        total_dollars_dec      = to_dec(total_dollars)
        efectivo_reportado_dec = to_dec(efectivo_reportado)
        datafono_reportado_dec = to_dec(datafono_reportado)
        dolares_reportado_dec  = to_dec(dolares_reportado)

        cierre = CierreCajaModel(
            id=uuid4(),
            turno_id=turno.id,
            fecha_cierre=aware_now,
            total_ventas_electronicas=total_electronicas_dec,
            total_ventas_efectivo=total_efectivo_dec,
            total_ventas_datafono=total_datafono_dec,
            total_ventas_dollars=total_dollars_dec,
            efectivo_reportado=efectivo_reportado_dec,
            datafono_reportado=datafono_reportado_dec,
            dolares_reportado=dolares_reportado_dec,
            observaciones=(cierre_data.observaciones or "")
        )

        turno.estado = "cerrado"
        turno.fecha_cierre = aware_now

        db.add(cierre)
        await db.commit()

        cierre_db = await db.get(CierreCajaModel, cierre.id)
        return CierreCaja.model_validate(cierre_db, from_attributes=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error cerrando turno con inventario — user=%s, data=%s", getattr(current_user, "id", None), cierre_data)
        raise HTTPException(status_code=500, detail=f"Error interno al cerrar el turno: {e.__class__.__name__}")


@router.post("/cerrar", response_model=CierreCaja)
async def cerrar_turno(
    cierre_data: CierreTurnoRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1) turno abierto
        result = await db.execute(
            select(TurnoModel).where(
                TurnoModel.user_id == current_user.id,
                TurnoModel.estado == "abierto"
            )
        )
        turno = result.scalar_one_or_none()
        if not turno:
            raise HTTPException(status_code=404, detail="No tienes un turno abierto")

        # 2) Fechas aware para guardar
        aware_now = datetime.now(timezone.utc)

        # 3) Totales del turno usando movimientos_caja (excluyendo ventas anuladas)
        movs_res = await db.execute(
            select(MovimientoCaja).join(
                Sale, MovimientoCaja.sale_id == Sale.id
            ).where(
                MovimientoCaja.turno_id == turno.id,
                MovimientoCaja.tipo == "venta",
                Sale.estado == "activa"  # Excluir ventas anuladas
            )
        )
        movs = list(movs_res.scalars().all())

        def mp(m):  # método de pago en minúsculas
            return (getattr(m, "metodo_pago", "") or "").strip().lower()

        def mm(m):  # monto como float seguro
            try:
                return float(getattr(m, "monto", 0) or 0)
            except Exception:
                return 0.0

        total_electronicas = sum(mm(m) for m in movs if mp(m) == "electronic")
        total_efectivo    = sum(mm(m) for m in movs if mp(m) == "cash")   # <- if
        total_datafono    = sum(mm(m) for m in movs if mp(m) == "card")   # <- if
        total_dollars     = sum(mm(m) for m in movs if mp(m) == "dollars")  # <- if

        # 4) Extraer valores reportados por el asesor
        efectivo_reportado = float(cierre_data.efectivo_reportado or 0)
        datafono_reportado = float(cierre_data.datafono_reportado or 0)
        dolares_reportado = float(cierre_data.dolares_reportado or 0)

        # 5) Decimals para columnas Numeric
        to_dec = lambda x: Decimal(str(x or 0))
        total_electronicas_dec = to_dec(total_electronicas)
        total_efectivo_dec     = to_dec(total_efectivo)
        total_datafono_dec     = to_dec(total_datafono)
        total_dollars_dec      = to_dec(total_dollars)
        efectivo_reportado_dec = to_dec(efectivo_reportado)
        datafono_reportado_dec = to_dec(datafono_reportado)
        dolares_reportado_dec  = to_dec(dolares_reportado)

        # 6) Crear cierre con totales calculados y reportados
        cierre = CierreCajaModel(
            id=uuid4(),
            turno_id=turno.id,
            fecha_cierre=aware_now,

            # Totales calculados del sistema
            total_ventas_electronicas=total_electronicas_dec,
            total_ventas_efectivo=total_efectivo_dec,
            total_ventas_datafono=total_datafono_dec,
            total_ventas_dollars=total_dollars_dec,

            # Totales reportados por el asesor
            efectivo_reportado=efectivo_reportado_dec,
            datafono_reportado=datafono_reportado_dec,
            dolares_reportado=dolares_reportado_dec,

            observaciones=(cierre_data.observaciones or "")
            # Las diferencias se calculan automáticamente por las columnas Computed
        )

        # Cerrar turno
        turno.estado = "cerrado"
        turno.fecha_cierre = aware_now

        db.add(cierre)
        await db.commit()

        # 6) Releer para obtener 'diferencia' (columna generada) y devolver con tipos correctos
        cierre_db = await db.get(CierreCajaModel, cierre.id)
        return CierreCaja.model_validate(cierre_db, from_attributes=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error cerrando turno — user=%s, data=%s", getattr(current_user, "id", None), cierre_data)
        raise HTTPException(status_code=500, detail=f"Error interno al cerrar el turno: {e.__class__.__name__}")


@router.get("/estado", response_model=Optional[Turno])
async def estado_turno(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(TurnoModel).where(
            TurnoModel.user_id == current_user.id,
            TurnoModel.estado == "abierto"
        )
    )
    turno = result.scalar_one_or_none()
    if not turno:
        return None

    return Turno.model_validate(turno, from_attributes=True)

@router.get("/por-turno")
async def ventas_por_turno(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # turno abierto del usuario
    res_turno = await db.execute(
        select(TurnoModel).where(
            TurnoModel.user_id == current_user.id,
            TurnoModel.estado == "abierto"
        )
    )
    turno = res_turno.scalar_one_or_none()
    if not turno:
        raise HTTPException(status_code=404, detail="No hay turno abierto")

    # movimientos de venta del turno (excluyendo ventas anuladas)
    movs = (await db.execute(
        select(MovimientoCaja).join(
            Sale, MovimientoCaja.sale_id == Sale.id
        ).where(
            MovimientoCaja.turno_id == turno.id,
            MovimientoCaja.tipo == "venta",
            Sale.estado == "activa"  # Excluir ventas anuladas
        )
    )).scalars().all()

    def mp(m): 
        return (m.metodo_pago or "").strip().lower()

    def mm(m):
        try: 
            return float(m.monto or 0)
        except: 
            return 0.0

    total_electronicas = sum(mm(m) for m in movs if mp(m) == "electronic")
    total_efectivo    = sum(mm(m) for m in movs if mp(m) == "cash")
    total_datafono    = sum(mm(m) for m in movs if mp(m) == "card")
    total_dollars     = sum(mm(m) for m in movs if mp(m) == "dollars")

    return {
        "turno_id": str(turno.id),
        "fecha_apertura": turno.fecha_apertura,
        "cantidad_ventas": len(movs),
        "total_ventas_electronicas": float(total_electronicas),
        "total_ventas_efectivo": float(total_efectivo),
        "total_ventas_datafono": float(total_datafono),
        "total_ventas_dollars": float(total_dollars),
    }



@router.get("/mis")
async def mis_turnos(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Turnos del usuario
    turnos_res = await db.execute(
        select(TurnoModel).where(TurnoModel.user_id == current_user.id).order_by(TurnoModel.fecha_apertura.desc())
    )
    turnos = turnos_res.scalars().all()

    if not turnos:
        return {"turnos": []}

    turno_ids = [t.id for t in turnos]

    # -------------------------------
    # 1) Agregados por turno (ventas activas únicamente)
    # -------------------------------
    agg = await db.execute(
        select(
            MovimientoCaja.turno_id.label("turno_id"),
            func.count(MovimientoCaja.id).label("ventas"),
            func.sum(case((MovimientoCaja.metodo_pago == "electronic", MovimientoCaja.monto), else_=0)).label("total_electronicas"),
            func.sum(case((MovimientoCaja.metodo_pago == "cash", MovimientoCaja.monto), else_=0)).label("total_efectivo"),
            func.sum(case((MovimientoCaja.metodo_pago == "card", MovimientoCaja.monto), else_=0)).label("total_datafono"),
            func.sum(case((MovimientoCaja.metodo_pago == "dollars", MovimientoCaja.monto), else_=0)).label("total_dollars"),
            func.sum(MovimientoCaja.monto).label("total_general"),
        ).join(
            Sale, MovimientoCaja.sale_id == Sale.id
        ).where(
            MovimientoCaja.tipo == "venta",
            MovimientoCaja.turno_id.in_(turno_ids),
            Sale.estado == "activa"  # Excluir ventas anuladas
        ).group_by(MovimientoCaja.turno_id)
    )
    por_turno = {str(r.turno_id): r._asdict() for r in agg.all()}

    # -------------------------------------------------
    # 2) Último cierre por turno → observaciones cierre
    # -------------------------------------------------
    # Subconsulta: última fecha_cierre de CierreCaja por turno
    latest_cierre_sq = (
        select(
            CierreCajaModel.turno_id,
            func.max(CierreCajaModel.fecha_cierre).label("max_fecha")
        )
        .where(CierreCajaModel.turno_id.in_(turno_ids))
        .group_by(CierreCajaModel.turno_id)
        .subquery()
    )

    # Join al registro real del último cierre para obtener observaciones
    cierres_rows = await db.execute(
        select(
            CierreCajaModel.turno_id,
            CierreCajaModel.observaciones
        )
        .join(
            latest_cierre_sq,
            (latest_cierre_sq.c.turno_id == CierreCajaModel.turno_id) &
            (latest_cierre_sq.c.max_fecha == CierreCajaModel.fecha_cierre)
        )
    )
    obs_por_turno = {str(r.turno_id): r.observaciones for r in cierres_rows.all()}

    # -------------------------
    # 3) Armar respuesta final
    # -------------------------
    def to_float(v):
        return float(v or 0)

    out = []
    for t in turnos:
        key = str(t.id)
        agg_row = por_turno.get(key, {})
        out.append({
            "turno_id": key,
            "estado": t.estado,
            "fecha_apertura": t.fecha_apertura,
            "fecha_cierre": t.fecha_cierre,
            "ventas": int(agg_row.get("ventas", 0)),
            "total_electronicas": to_float(agg_row.get("total_electronicas")),
            "total_efectivo": to_float(agg_row.get("total_efectivo")),
            "total_datafono": to_float(agg_row.get("total_datafono")),
            "total_dollars": to_float(agg_row.get("total_dollars")),
            "total_general": to_float(agg_row.get("total_general")),
            # 👇 NUEVO: observaciones del último cierre (si existe)
            "observaciones": obs_por_turno.get(key)
        })

    return {"turnos": out}



@router.get("/{turno_id}/movimientos")
async def movimientos_por_turno(
    turno_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Seguridad: el turno debe pertenecer al usuario
    t = (await db.execute(
        select(TurnoModel).where(TurnoModel.id == turno_id, TurnoModel.user_id == current_user.id)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    # Incluir información del estado de la venta para mostrar ventas anuladas
    rows = (await db.execute(
        select(MovimientoCaja, Sale.estado).outerjoin(
            Sale, MovimientoCaja.sale_id == Sale.id
        ).where(
            MovimientoCaja.turno_id == turno_id,
            MovimientoCaja.tipo == "venta"
        ).order_by(MovimientoCaja.fecha.asc())
    )).all()

    def row(m, estado_venta):
        return {
            "id": str(m.id),
            "fecha": m.fecha,
            "descripcion": m.descripcion,
            "metodo_pago": m.metodo_pago,
            "monto": float(m.monto or 0),
            "sale_id": str(getattr(m, "sale_id", "")) if getattr(m, "sale_id", None) else None,
            "estado_venta": estado_venta or "activa",  # Por compatibilidad con datos antiguos
            "anulada": estado_venta == "anulada"
        }
    return {"movimientos": [row(m, estado) for m, estado in rows]}


@router.get("/inventarios-descuadres")
async def inventarios_con_descuadres(
    dias: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    user_id: Optional[str] = None,
    solo_con_descuadres: Optional[bool] = True,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Obtiene inventarios de SIMs con filtros opcionales."""

    # Construir filtros de fecha
    conditions = []

    if dias is not None:
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=dias)
        conditions.append(InventarioSimTurno.fecha_registro >= fecha_limite)
    elif fecha_desde or fecha_hasta:
        if fecha_desde:
            fecha_desde_dt = datetime.fromisoformat(fecha_desde.replace('Z', '+00:00'))
            conditions.append(InventarioSimTurno.fecha_registro >= fecha_desde_dt)
        if fecha_hasta:
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta.replace('Z', '+00:00'))
            conditions.append(InventarioSimTurno.fecha_registro <= fecha_hasta_dt)
    else:
        # Default: últimos 30 días
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=30)
        conditions.append(InventarioSimTurno.fecha_registro >= fecha_limite)

    # Filtro por usuario
    if user_id:
        conditions.append(TurnoModel.user_id == user_id)

    # Since we now set all differences to 0 or None, we can't filter by discrepancies
    # Instead, we'll return all inventories and let the frontend handle any filtering
    # Remove the discrepancy filter since it's no longer meaningful

    # Consultar inventarios
    result = await db.execute(
        select(InventarioSimTurno, TurnoModel, User)
        .join(TurnoModel, InventarioSimTurno.turno_id == TurnoModel.id)
        .join(User, TurnoModel.user_id == User.id)
        .where(*conditions)
        .order_by(InventarioSimTurno.fecha_registro.desc())
    )

    inventarios = []
    usuarios_set = set()

    for inventario, turno, usuario in result.all():
        usuarios_set.add((usuario.id, usuario.full_name or usuario.username))

        # Calcular información adicional para el dashboard
        tiene_descuadre = False
        if inventario.diferencia_final is not None and inventario.diferencia_final != 0:
            tiene_descuadre = True

        inventarios.append({
            "turno_id": str(turno.id),
            "plan": inventario.plan,
            "cantidad_inicial_reportada": inventario.cantidad_inicial_reportada,
            "cantidad_final_reportada": inventario.cantidad_final_reportada,
            "inventario_teorico": inventario.cantidad_final_sistema,  # Ahora es el teórico
            "ventas_realizadas": (inventario.cantidad_inicial_reportada or 0) - (inventario.cantidad_final_sistema or 0),
            "diferencia_inicial": inventario.diferencia_inicial,
            "diferencia_final": inventario.diferencia_final,
            "tiene_descuadre": tiene_descuadre,
            "fecha_registro": inventario.fecha_registro,
            "fecha_cierre": inventario.fecha_cierre,
            "observaciones_apertura": inventario.observaciones_apertura,
            "observaciones_cierre": inventario.observaciones_cierre,
            "usuario": usuario.full_name or usuario.username,
            "estado_turno": turno.estado
        })

    # Ordenar inventarios por plan (R5D, R7D, R15D, R30D)
    orden_planes = ['R5D', 'R7D', 'R15D', 'R30D']

    def get_plan_order(inv):
        plan = inv.get('plan', '')
        try:
            return orden_planes.index(plan)
        except ValueError:
            return 999  # Plans not in list go to end

    inventarios.sort(key=get_plan_order)

    usuarios = [{"id": uid, "name": name} for uid, name in usuarios_set]

    return {
        "inventarios": inventarios,
        "usuarios": usuarios,
        "total": len(inventarios)
    }


@router.get("/{turno_id}/inventarios")
async def inventarios_por_turno(
    turno_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Obtiene los inventarios de SIMs de un turno específico."""
    # Verificar que el turno pertenece al usuario o es admin
    turno_result = await db.execute(
        select(TurnoModel).where(TurnoModel.id == turno_id)
    )
    turno = turno_result.scalar_one_or_none()
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    # Solo el dueño del turno puede ver sus inventarios (o admin en el futuro)
    if turno.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este turno")

    # Obtener inventarios del turno
    inventarios_result = await db.execute(
        select(InventarioSimTurno)
        .where(InventarioSimTurno.turno_id == turno_id)
    )
    inventarios = inventarios_result.scalars().all()

    # Ordenar por plan (R5D, R7D, R15D, R30D)
    orden_planes = ['R5D', 'R7D', 'R15D', 'R30D']

    def get_plan_order(inv):
        try:
            return orden_planes.index(inv.plan)
        except ValueError:
            return 999

    inventarios_ordenados = sorted(inventarios, key=get_plan_order)

    return {
        "turno_id": turno_id,
        "inventarios": [
            InventarioSimTurnoResponse.from_orm_with_indicators(inv)
            for inv in inventarios_ordenados
        ]
    }


@router.get("/planes-disponibles")
async def planes_sim_disponibles(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Obtiene los planes de SIMs disponibles en el sistema."""
    result = await db.execute(
        select(SimDetalle.plan_asignado, func.count(SimDetalle.id).label("cantidad"))
        .where(
            SimDetalle.estado == "available",
            SimDetalle.plan_asignado.isnot(None)
        )
        .group_by(SimDetalle.plan_asignado)
    )

    planes = [
        {
            "plan": row.plan_asignado,
            "cantidad_disponible": row.cantidad
        }
        for row in result.all()
    ]

    # Ordenar por plan (R5D, R7D, R15D, R30D)
    orden_planes = ['R5D', 'R7D', 'R15D', 'R30D']

    def get_plan_order(plan_dict):
        try:
            return orden_planes.index(plan_dict['plan'])
        except ValueError:
            return 999

    planes.sort(key=get_plan_order)

    return {"planes": planes}
