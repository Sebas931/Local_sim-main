# routes/sims.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, update, or_, select, text
from database import get_async_session
from models import SimLote, SimDetalle, SimStatus, SimDetalle, SimLote, MovimientoCaja
import pandas as pd
from uuid import uuid4
import io
from typing import Optional, List, Tuple
from datetime import datetime, timedelta, timezone, date, time


router = APIRouter()

# ============================================================
# Helpers de estados (enum/string-safe) y normalización
# ============================================================

def _st(name: str):
    """
    Devuelve el atributo SimStatus.<name> si existe (Enum),
    si no, retorna el string plano. Evita errores con enums nativos de PG.
    """
    return getattr(SimStatus, name, name)

# OJO: estos nombres deben coincidir con los *valores reales* del Enum en tu BD.
# Por lo que reportaste, tu enum contiene: 'available', 'recargado', 'vendido'.
ST_AVAILABLE = _st("available")
ST_RECHARGED = _st("recargado")
ST_SOLD      = _st("vendido")

# Alias de filtros que puedan llegarte desde UI
STATUS_ALIASES = {
    "sold": "vendido",
    "recharged": "recargado",
    "available": "available",
    "vendido": "vendido",
    "recargado": "recargado",
}

# ============================================================
# Utilidades
# ============================================================

def _estado_value(estado) -> str:
    """Extrae string legible del estado (enum o string)."""
    if hasattr(estado, "value"):
        return estado.value
    if hasattr(estado, "name"):
        return estado.name
    return str(estado)

def _sim_to_dict(sim: SimDetalle, lote_plan: Optional[str] = None) -> dict:
    """
    Serializa una SIM. Si la SIM no tiene plan_asignado, usa el plan del lote.
    """
    plan = getattr(sim, "plan_asignado", None) or lote_plan
    return {
        "id": str(getattr(sim, "id", "")),
        "lote_id": getattr(sim, "lote_id", None),
        "numero_linea": getattr(sim, "numero_linea", None),
        "iccid": getattr(sim, "iccid", None),
        "estado": _estado_value(getattr(sim, "estado", None)),
        "fecha_registro": getattr(sim, "fecha_registro", None),

        # Campos que tu POS/UI espera:
        "plan_asignado": plan,                                  # Código Siigo (R7D/R5D/…)
        "winred_product_id": getattr(sim, "winred_product_id", None),
        "fecha_ultima_recarga": getattr(sim, "fecha_ultima_recarga", None),

        # Si tu modelo los tiene, se exponen de forma segura:
        "vendida": getattr(sim, "vendida", None),
        "fecha_venta": getattr(sim, "fecha_venta", None),
        "venta_id": getattr(sim, "venta_id", None),
    }

async def _find_sim_detalle(
    db: AsyncSession,
    *,
    sim_id: Optional[str] = None,
    msisdn: Optional[str] = None,
    iccid: Optional[str] = None
) -> Optional[SimDetalle]:
    q = select(SimDetalle)
    if sim_id:
        q = q.where(SimDetalle.id == str(sim_id))
    if msisdn:
        q = q.where(SimDetalle.numero_linea == str(msisdn))
    if iccid:
        q = q.where(SimDetalle.iccid == str(iccid))
    res = await db.execute(q)
    return res.scalars().first()

async def mark_sim_sold(
    db: AsyncSession,*,
    venta_id: Optional[str] = None,
    sim_id: Optional[str] = None,
    msisdn: Optional[str] = None,
    iccid: Optional[str] = None
) -> int:
    """
    Marca la SIM como vendida (estado=ST_SOLD) y fecha_venta=now().
    Retorna 1 si actualizó, 0 si no encontró.
    """
    sim = await _find_sim_detalle(db, sim_id=sim_id, msisdn=msisdn, iccid=iccid)
    if not sim:
        return 0
    
    values = {
        "estado": ST_SOLD,
        "fecha_venta": func.now(),
    }
    if venta_id is not None:
        values["venta_id"] = venta_id
    # Si tu modelo tiene un boolean "vendida"
    if hasattr(SimDetalle, "vendida"):
        values["vendida"] = True

    await db.execute(
        update(SimDetalle)
        .where(SimDetalle.id == sim.id)
        .values(
            venta_id=venta_id,
            estado=ST_SOLD,
            fecha_venta=func.now(),
            vendida=True,
        )
    )
    await db.commit()
    return 1

# ============================================================
# Upload de lotes (Excel)
# ============================================================

@router.post("/upload_lotes")
async def upload_lotes(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        required = {"lote_id", "numero_linea", "iccid", "operador"}
        if not required.issubset(df.columns):
            raise HTTPException(
                status_code=400,
                detail=f"El archivo debe contener las columnas: {', '.join(required)}"
            )

        for lote_id_raw, grupo in df.groupby("lote_id"):
            lote_id = str(lote_id_raw).strip()

            # Verifica que no exista
            exists = await db.execute(select(SimLote).where(SimLote.id == lote_id))
            if exists.scalars().first():
                raise HTTPException(status_code=400, detail=f"El lote {lote_id} ya existe.")

            # Máximo 20 SIMs
            if len(grupo) > 20:
                raise HTTPException(status_code=400, detail=f"El lote {lote_id} tiene más de 20 SIMs ({len(grupo)}).")

            # Duplicados dentro del excel
            if grupo["iccid"].duplicated().any():
                raise HTTPException(status_code=400, detail=f"El lote {lote_id} contiene ICCID duplicados.")

            # ICCIDs ya en BD
            iccids = grupo["iccid"].astype(str).tolist()
            ya_en_bd = (await db.execute(
                select(SimDetalle.iccid).where(SimDetalle.iccid.in_(iccids))
            )).scalars().all()
            if ya_en_bd:
                raise HTTPException(status_code=400, detail=f"Algunas SIMs del lote {lote_id} ya existen en BD.")

            # Crear lote
            operador = str(grupo["operador"].iloc[0]).strip()
            db.add(SimLote(id=lote_id, operador=operador))

            # Insertar SIMs
            for _, row in grupo.iterrows():
                db.add(
                    SimDetalle(
                        id=str(uuid4()),
                        lote_id=lote_id,
                        numero_linea=str(row["numero_linea"]),
                        iccid=str(row["iccid"]),
                        estado=ST_AVAILABLE
                    )
                )

        await db.commit()
        return {"message": f"Archivo procesado correctamente, {len(df)} SIMs registradas."}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Crear lote manualmente (vacío o con info básica)
# ============================================================

@router.post("/lotes/create")
async def crear_lote(
    lote_id: str,
    operador: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Crear un nuevo lote vacío para luego agregar SIMs individuales"""
    try:
        # Verificar que el lote no exista
        exists = await db.execute(select(SimLote).where(SimLote.id == lote_id))
        if exists.scalars().first():
            raise HTTPException(status_code=400, detail=f"El lote {lote_id} ya existe")

        # Crear el lote
        nuevo_lote = SimLote(
            id=lote_id.strip(),
            operador=operador.strip(),
            estado="available"
        )
        db.add(nuevo_lote)
        await db.commit()

        return {
            "message": f"Lote {lote_id} creado exitosamente",
            "lote_id": lote_id,
            "operador": operador
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear lote: {str(e)}")

# ============================================================
# Agregar SIM individual a un lote
# ============================================================

@router.post("/sim/individual")
async def agregar_sim_individual(
    lote_id: str,
    numero_linea: str,
    iccid: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Agregar una SIM individual a un lote existente"""
    try:
        # Validar que el lote exista
        lote = (await db.execute(select(SimLote).where(SimLote.id == lote_id))).scalars().first()
        if not lote:
            raise HTTPException(status_code=404, detail=f"El lote {lote_id} no existe")

        # Validar que el ICCID no exista ya
        iccid_clean = iccid.strip()
        exists = (await db.execute(
            select(SimDetalle).where(SimDetalle.iccid == iccid_clean)
        )).scalars().first()

        if exists:
            raise HTTPException(
                status_code=400,
                detail=f"El ICCID {iccid_clean} ya existe en el sistema"
            )

        # Contar SIMs en el lote
        count = (await db.execute(
            select(func.count(SimDetalle.id)).where(SimDetalle.lote_id == lote_id)
        )).scalar() or 0

        if count >= 20:
            raise HTTPException(
                status_code=400,
                detail=f"El lote {lote_id} ya tiene 20 SIMs (límite máximo)"
            )

        # Crear la SIM
        nueva_sim = SimDetalle(
            id=str(uuid4()),
            lote_id=lote_id,
            numero_linea=numero_linea.strip(),
            iccid=iccid_clean,
            estado=ST_AVAILABLE
        )
        db.add(nueva_sim)
        await db.commit()
        await db.refresh(nueva_sim)

        return {
            "message": f"SIM agregada exitosamente al lote {lote_id}",
            "sim": _sim_to_dict(nueva_sim, lote.plan_asignado),
            "total_sims_en_lote": count + 1
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al agregar SIM: {str(e)}")

# ============================================================
# Crear SIM completa (crea lote si no existe)
# ============================================================

@router.post("/sim/create-complete")
async def crear_sim_completa(
    lote_id: str,
    operador: str,
    numero_linea: str,
    iccid: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Crear una SIM completa. Si el lote no existe, lo crea automáticamente.
    Útil para agregar SIMs individuales sin preocuparse por crear el lote primero.
    """
    try:
        # Validar que el ICCID no exista ya
        iccid_clean = iccid.strip()
        exists = (await db.execute(
            select(SimDetalle).where(SimDetalle.iccid == iccid_clean)
        )).scalars().first()

        if exists:
            raise HTTPException(
                status_code=400,
                detail=f"El ICCID {iccid_clean} ya existe en el sistema"
            )

        # Buscar o crear el lote
        lote = (await db.execute(select(SimLote).where(SimLote.id == lote_id))).scalars().first()

        if not lote:
            # Crear el lote si no existe
            lote = SimLote(
                id=lote_id.strip(),
                operador=operador.strip(),
                estado="available"
            )
            db.add(lote)
            await db.flush()  # Flush para obtener el lote antes de agregar la SIM
            lote_creado = True
        else:
            lote_creado = False
            # Verificar límite de SIMs en el lote existente
            count = (await db.execute(
                select(func.count(SimDetalle.id)).where(SimDetalle.lote_id == lote_id)
            )).scalar() or 0

            if count >= 20:
                raise HTTPException(
                    status_code=400,
                    detail=f"El lote {lote_id} ya tiene 20 SIMs (límite máximo)"
                )

        # Crear la SIM
        nueva_sim = SimDetalle(
            id=str(uuid4()),
            lote_id=lote_id,
            numero_linea=numero_linea.strip(),
            iccid=iccid_clean,
            estado=ST_AVAILABLE
        )
        db.add(nueva_sim)
        await db.commit()
        await db.refresh(nueva_sim)

        # Contar total de SIMs en el lote
        total_sims = (await db.execute(
            select(func.count(SimDetalle.id)).where(SimDetalle.lote_id == lote_id)
        )).scalar() or 0

        return {
            "message": f"SIM creada exitosamente" + (f" (lote {lote_id} creado)" if lote_creado else ""),
            "lote_creado": lote_creado,
            "lote_id": lote_id,
            "operador": lote.operador,
            "sim": _sim_to_dict(nueva_sim, lote.plan_asignado),
            "total_sims_en_lote": total_sims
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear SIM: {str(e)}")

# ============================================================
# Eliminar SIM individual
# ============================================================

@router.delete("/sim/{sim_id}")
async def eliminar_sim(
    sim_id: str,
    force: bool = Query(False, description="Forzar eliminación incluso si está vendida"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Eliminar una SIM individual del sistema.
    Por defecto, no permite eliminar SIMs vendidas a menos que se use force=true
    """
    try:
        # Buscar la SIM
        sim = (await db.execute(
            select(SimDetalle).where(SimDetalle.id == sim_id)
        )).scalars().first()

        if not sim:
            raise HTTPException(status_code=404, detail="SIM no encontrada")

        # Verificar si está vendida
        if sim.estado == ST_SOLD or sim.vendida:
            if not force:
                raise HTTPException(
                    status_code=400,
                    detail="No se puede eliminar una SIM vendida. Use force=true para forzar la eliminación."
                )

        lote_id = sim.lote_id

        # Eliminar la SIM
        await db.delete(sim)
        await db.commit()

        # Contar SIMs restantes en el lote
        remaining = (await db.execute(
            select(func.count(SimDetalle.id)).where(SimDetalle.lote_id == lote_id)
        )).scalar() or 0

        return {
            "message": f"SIM {sim.iccid} eliminada exitosamente",
            "sim_id": sim_id,
            "lote_id": lote_id,
            "sims_restantes_en_lote": remaining
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar SIM: {str(e)}")

# ============================================================
# Asignar plan a un lote (propaga a cada SIM)
# ============================================================

@router.post("/asignar_plan/{lote_id}")
async def asignar_plan(
    lote_id: str,
    plan: str = Query(..., description="Código Siigo del plan (p.ej. R7D)"),
    db: AsyncSession = Depends(get_async_session)
):
    try:
        lote = (await db.execute(select(SimLote).where(SimLote.id == lote_id))).scalars().first()
        if not lote:
            raise HTTPException(status_code=404, detail="Lote no encontrado")

        # Guarda plan en el lote
        lote.plan_asignado = plan

        # (Opcional) marcar estado del lote si manejas campo 'estado' a nivel lote
        if hasattr(lote, "estado"):
            lote.estado = ST_RECHARGED

        # Propagar a SIMs del lote
        sims = (await db.execute(select(SimDetalle).where(SimDetalle.lote_id == lote_id))).scalars().all()
        for s in sims:
            # Guarda plan en la SIM (si el modelo lo tiene)
            if hasattr(s, "plan_asignado"):
                s.plan_asignado = plan
            # (Opcional) estado recargado
            if hasattr(s, "estado"):
                s.estado = ST_RECHARGED

        await db.commit()
        return {"message": f"Plan '{plan}' asignado al lote {lote_id}."}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Listado de lotes (con contadores por estado)
# ============================================================

@router.get("/lotes")
async def listar_lotes(db: AsyncSession = Depends(get_async_session)):
    try:
        q = (
            select(
                SimLote.id.label("lote_id"),
                SimLote.operador,
                SimLote.plan_asignado,
                SimLote.estado,
                SimLote.fecha_registro,
                func.count(SimDetalle.id).label("total_sims"),
                func.sum(case((SimDetalle.estado == 'available', 1), else_=0)).label("sims_disponibles"),
                func.sum(case((SimDetalle.estado == 'recargado', 1), else_=0)).label("sims_recargadas"),
                func.sum(case((SimDetalle.estado == 'vendido', 1), else_=0)).label("sims_vendidas"),
            )
            .join(SimDetalle, SimDetalle.lote_id == SimLote.id)
            .group_by(
                SimLote.id,
                SimLote.operador,
                SimLote.plan_asignado,
                SimLote.estado,
                SimLote.fecha_registro,
            )
            .order_by(SimLote.fecha_registro.desc())
        )
        rows = (await db.execute(q)).all()

        lotes = [
            {
                "lote_id": str(r.lote_id),
                "operador": r.operador,
                "plan_asignado": r.plan_asignado,
                "estado": _estado_value(r.estado),
                "fecha_registro": r.fecha_registro,
                "total_sims": int(r.total_sims or 0),
                "sims_disponibles": int(r.sims_disponibles or 0),
                "sims_recargadas": int(r.sims_recargadas or 0),
                "sims_vendidas": int(r.sims_vendidas or 0),
            }
            for r in rows
        ]
        return {"lotes": lotes}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Listado de SIMs (filtro opcional por estado)
# ============================================================

@router.get("/", include_in_schema=False)
@router.get("")
async def list_sims(
    status: Optional[str] = Query(None, description="available | recargado | vendido (o sus alias)"),
    db: AsyncSession = Depends(get_async_session),
):
    q = (
        select(SimDetalle, SimLote.plan_asignado.label("lote_plan"))
        .join(SimLote, SimLote.id == SimDetalle.lote_id)
    )

    if status:
        desired_key = STATUS_ALIASES.get(str(status).lower(), str(status).lower())
        # Mapear a valor enum real
        if desired_key == "available":
            desired = ST_AVAILABLE
        elif desired_key == "recargado":
            desired = ST_RECHARGED
        elif desired_key == "vendido":
            desired = ST_SOLD
        else:
            desired = desired_key  # fallback
        q = q.where(SimDetalle.estado == desired)

    rows = (await db.execute(q)).all()
    sims = [_sim_to_dict(sim, lote_plan) for sim, lote_plan in rows]
    return {"sims": sims}

# ============================================================
# Búsqueda por ICCID/MSISDN (UN solo /search)
# ============================================================

@router.get("/search")
async def search_sim(
    iccid: Optional[str] = Query(None, description="ICCID de la SIM"),
    msisdn: Optional[str] = Query(None, description="Número de línea (MSISDN)"),
    db: AsyncSession = Depends(get_async_session),
):
    if not iccid and not msisdn:
        raise HTTPException(status_code=400, detail="Envíe iccid o msisdn")

    conds = []
    if iccid:
        conds.append(SimDetalle.iccid == str(iccid))
    if msisdn:
        conds.append(SimDetalle.numero_linea == str(msisdn))

    q = (
        select(SimDetalle, SimLote.plan_asignado.label("lote_plan"))
        .join(SimLote, SimLote.id == SimDetalle.lote_id)
        .where(or_(*conds) if len(conds) > 1 else conds[0])
    )
    r = (await db.execute(q)).first()
    if not r:
        raise HTTPException(status_code=404, detail="SIM no encontrada")

    sim, lote_plan = r
    return {"sim": _sim_to_dict(sim, lote_plan)}

# ============================================================
# Buscar por código (alias que acepta ICCID o MSISDN)
# ============================================================

@router.get("/find-by-code")
async def find_by_code(code: str, db: AsyncSession = Depends(get_async_session)):
    q = (
        select(SimDetalle, SimLote.plan_asignado.label("lote_plan"))
        .join(SimLote, SimLote.id == SimDetalle.lote_id)
        .where((SimDetalle.iccid == code) | (SimDetalle.numero_linea == code))
    )
    r = (await db.execute(q)).first()
    if not r:
        raise HTTPException(status_code=404, detail="SIM no encontrada")
    sim, lote_plan = r
    return {"sim": _sim_to_dict(sim, lote_plan)}

# ============================================================
# SIMs por lote
# ============================================================

@router.get("/por_lote")
async def get_sims_by_lote_id(
    lote_id: str = Query(...),
    db: AsyncSession = Depends(get_async_session)
):
    rows = (await db.execute(
        select(SimDetalle, SimLote.plan_asignado.label("lote_plan"))
        .join(SimLote, SimLote.id == SimDetalle.lote_id)
        .where(SimDetalle.lote_id == lote_id)
    )).all()

    sims = [_sim_to_dict(sim, lote_plan) for sim, lote_plan in rows]
    return {"sims": sims}

# ============================================================
# Stats para Dashboard
# ============================================================

@router.get("/dashboard/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_async_session)):
    # Bordes de tiempo (UTC para no liarnos con TZ del server; ajusta si quieres)
    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_utc - timedelta(days=today_utc.weekday())
    month_start = today_utc.replace(day=1)

    # ===== VENTAS / CAJA =====
    ventas_base = select(MovimientoCaja).where(MovimientoCaja.tipo == "venta")

    # Totales
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(MovimientoCaja.monto), 0.0)).where(MovimientoCaja.tipo == "venta")
    )).scalar() or 0.0

    total_ventas = (await db.execute(
        select(func.count()).where(MovimientoCaja.tipo == "venta")
    )).scalar() or 0

    # Por periodos
    revenue_hoy = (await db.execute(
        select(func.coalesce(func.sum(MovimientoCaja.monto), 0.0))
        .where(MovimientoCaja.tipo == "venta", MovimientoCaja.fecha >= today_utc)
    )).scalar() or 0.0

    ventas_hoy = (await db.execute(
        select(func.count()).where(MovimientoCaja.tipo == "venta", MovimientoCaja.fecha >= today_utc)
    )).scalar() or 0

    revenue_semana = (await db.execute(
        select(func.coalesce(func.sum(MovimientoCaja.monto), 0.0))
        .where(MovimientoCaja.tipo == "venta", MovimientoCaja.fecha >= week_start)
    )).scalar() or 0.0

    revenue_mes = (await db.execute(
        select(func.coalesce(func.sum(MovimientoCaja.monto), 0.0))
        .where(MovimientoCaja.tipo == "venta", MovimientoCaja.fecha >= month_start)
    )).scalar() or 0.0

    ventas_mes = (await db.execute(
        select(func.count()).where(MovimientoCaja.tipo == "venta", MovimientoCaja.fecha >= month_start)
    )).scalar() or 0

    ticket_prom_hoy = (float(revenue_hoy) / ventas_hoy) if ventas_hoy else 0.0
    ticket_prom_mes = (float(revenue_mes) / ventas_mes) if ventas_mes else 0.0

    # Por método de pago
    by_method_rows = (await db.execute(
        select(MovimientoCaja.metodo_pago, func.coalesce(func.sum(MovimientoCaja.monto), 0.0))
        .where(MovimientoCaja.tipo == "venta")
        .group_by(MovimientoCaja.metodo_pago)
    )).all()
    by_method = {m or "desconocido": float(t or 0) for m, t in by_method_rows}

    # Serie últimos 14 días
    serie_rows = (await db.execute(
        select(
            func.date_trunc('day', MovimientoCaja.fecha).label('dia'),
            func.coalesce(func.sum(MovimientoCaja.monto), 0.0).label('total')
        )
        .where(MovimientoCaja.tipo == "venta",
               MovimientoCaja.fecha >= (today_utc - timedelta(days=13)))
        .group_by(text("1"))       # 1 = 'dia'
        .order_by(text("1"))
    )).all()
    serie_14d = [{"date": d.date().isoformat(), "total": float(t)} for d, t in serie_rows]

    # Últimos 10 movimientos
    ultimos = (await db.execute(
        select(MovimientoCaja)
        .where(MovimientoCaja.tipo == "venta")
        .order_by(MovimientoCaja.fecha.desc())
        .limit(10)
    )).scalars().all()
    ultimas_ventas = [
        {
            "fecha": (m.fecha.isoformat() if getattr(m, "fecha", None) else None),
            "metodo": getattr(m, "metodo_pago", None),
            "monto": float(getattr(m, "monto", 0) or 0),
            "sale_id": getattr(m, "sale_id", None),
            "descripcion": getattr(m, "descripcion", None)
        } for m in ultimos
    ]

    # ===== SIMS / STOCK =====
    total_sims = (await db.execute(select(func.count()).select_from(SimDetalle))).scalar() or 0
    # Disponibles: incluye 'available' Y 'recargado'
    sims_available = (await db.execute(
        select(func.count()).select_from(SimDetalle).where(SimDetalle.estado.in_([ST_AVAILABLE, ST_RECHARGED]))
    )).scalar() or 0
    sims_sold = (await db.execute(
        select(func.count()).select_from(SimDetalle).where(SimDetalle.estado == ST_SOLD)
    )).scalar() or 0

    # Operadores con poco stock disponible (umbral configurable)
    THRESHOLD = 5
        # Tomamos el plan de la SIM; si no lo tiene, usamos el plan del lote
    plan_expr = func.coalesce(SimDetalle.plan_asignado, SimLote.plan_asignado)

    # Disponibles por plan: incluye 'available' Y 'recargado'
    por_plan_rows = (await db.execute(
        select(plan_expr.label("plan"), func.count(SimDetalle.id))
        .join(SimLote, SimLote.id == SimDetalle.lote_id)
        .where(SimDetalle.estado.in_([ST_AVAILABLE, ST_RECHARGED]))
        .group_by(plan_expr)
    )).all()

    low_stock_plans = [
        {"plan": (p or "Sin plan"), "disponibles": int(c)}
        for p, c in por_plan_rows
        if int(c) <= THRESHOLD
    ]

    return {
        "sales": {
            "revenue_total": float(total_revenue),
            "ventas_total": int(total_ventas),
            "revenue_hoy": float(revenue_hoy),
            "ventas_hoy": int(ventas_hoy),
            "revenue_semana": float(revenue_semana),
            "revenue_mes": float(revenue_mes),
            "ventas_mes": int(ventas_mes),
            "ticket_prom_hoy": float(ticket_prom_hoy),
            "ticket_prom_mes": float(ticket_prom_mes),
            "by_method": by_method,
            "serie_14d": serie_14d,
            "ultimas_ventas": ultimas_ventas,
        },
        "sims": {
            "total": int(total_sims),
            "available": int(sims_available),
            "sold": int(sims_sold)
        },
        "alerts": {
            "low_stock_by_plan": low_stock_plans
        }
    }

@router.get("/dashboard/analytics")
async def dashboard_analytics(
    start: Optional[date] = None,
    end: Optional[date] = None,
    only_diffs: bool = False,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Métricas dentro del rango [start, end] (fechas inclusive):
    - ventas_por_dia: [{date, ventas, total}]
    - ventas_por_producto: pie por tipo/código
    - ventas_por_usuario: [{usuario, ventas, total}]
    - cierres: cierres de caja (con diferencias si only_diffs=True)
    """

    # normaliza rango
    if not end:
        end = datetime.utcnow().date()     # utcnow -> date(); sigue siendo naive
    if not start:
        start = end - timedelta(days=29)

    # límites datetime NAIVE (sin tzinfo)
    start_dt = datetime.combine(start, time.min)  # 00:00:00 (naive)
    end_dt   = datetime.combine(end,   time.max)  # 23:59:59.999999 (naive)

    params = {"start": start_dt, "end": end_dt, "onlydiff": only_diffs}

    # 1) Tendencia: ventas por día (#ventas y total)
    sql_trend = text("""
        with days as (
          select generate_series(date(:start), date(:end), interval '1 day')::date d
        ),
        agg as (
          select date(m.fecha) d,
                 count(*) as ventas,
                 coalesce(sum(m.monto),0) as total
          from movimientos_caja m
          where m.tipo='venta'
            and m.fecha between :start and :end
          group by 1
        )
        select d, coalesce(a.ventas,0) as ventas, coalesce(a.total,0) as total
        from days
        left join agg a using(d)
        order by d
    """)
    trend_rows = (await db.execute(sql_trend, params)).mappings().all()
    ventas_por_dia = [{"date": str(r["d"]), "ventas": int(r["ventas"]), "total": float(r["total"])} for r in trend_rows]

    # 2) Pie: “tipo de producto”
    # Si no tienes categorías, lo práctico es 2 grupos:
    #   - SIM Física (code = 'S01')
    #   - Plan/Recarga (cualquier otro product_code)
    sql_pie = text("""
        select
          case when si.product_code = 'S01' then 'SIM Física'
               else 'Plan/Recarga' end as categoria,
          coalesce(sum(si.quantity * si.unit_price),0) as total
        from sale_items si
        join sales s on s.id = si.sale_id
        where s.created_at between :start and :end
        group by 1
        order by total desc
    """)
    pie_rows = (await db.execute(sql_pie, params)).mappings().all()
    ventas_por_producto = [{"name": r["categoria"], "value": float(r["total"])} for r in pie_rows]

    # 3) Ventas por usuario (asesor)
    # Tomamos el usuario desde turnos -> movimientos_caja.turno_id
    sql_user = text("""
        select coalesce(u.full_name, u.username, 'Desconocido') as usuario,
               count(*) as ventas,
               coalesce(sum(m.monto),0) as total
        from movimientos_caja m
        join turnos t on t.id = m.turno_id
        left join users u on u.id = t.user_id
        where m.tipo='venta' and m.fecha between :start and :end
        group by 1
        order by total desc
    """)
    user_rows = (await db.execute(sql_user, params)).mappings().all()
    ventas_por_usuario = [{"usuario": r["usuario"], "ventas": int(r["ventas"]), "total": float(r["total"])} for r in user_rows]

    # 4) Cierres de caja del rango (opcional: solo con diferencia != 0)
    sql_cierres = text(f"""
        select c.id as cierre_id,
               c.turno_id,
               c.fecha_cierre,
               c.total_ventas_electronicas,
               c.total_ventas_efectivo,
               c.total_ventas_datafono,
               c.efectivo_reportado,
               c.diferencia,
               c.observaciones,
               coalesce(u.full_name, u.username, '—') as asesor
        from cierres_caja c
        join turnos t on t.id = c.turno_id
        left join users u on u.id = t.user_id
        where c.fecha_cierre between :start and :end
          {'and c.diferencia <> 0' if only_diffs else ''}
        order by c.fecha_cierre desc
        limit 200
    """)
    cierres_rows = (await db.execute(sql_cierres, params)).mappings().all()
    cierres = [{
        "cierre_id": str(r["cierre_id"]),
        "turno_id": str(r["turno_id"]),
        "fecha_cierre": r["fecha_cierre"].isoformat() if r["fecha_cierre"] else None,
        "total_ventas_electronicas": float(r["total_ventas_electronicas"] or 0),
        "total_ventas_efectivo": float(r["total_ventas_efectivo"] or 0),
        "total_ventas_datafono": float(r["total_ventas_datafono"] or 0),
        "efectivo_reportado": float(r["efectivo_reportado"] or 0),
        "diferencia": float(r["diferencia"] or 0),
        "observaciones": r["observaciones"],
        "asesor": r["asesor"],
    } for r in cierres_rows]

    return {
        "range": {"start": str(start), "end": str(end)},
        "ventas_por_dia": ventas_por_dia,
        "ventas_por_producto": ventas_por_producto,
        "ventas_por_usuario": ventas_por_usuario,
        "cierres": cierres
    }