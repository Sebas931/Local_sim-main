# dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, and_, func
from datetime import datetime, timedelta, timezone
from typing import Optional

from database import get_async_session
from models import (
    SimDetalle, SimLote, MovimientoCaja, Sale, CierreCaja,
    DevolucionSim, Turno, User, InventarioSimTurno
)
from utils.auth_utils import get_current_user

router = APIRouter(tags=["dashboard"])

def _tznow():
    
    return datetime.now(timezone.utc).astimezone()

@router.get("/stats")
async def get_dashboard_stats(
    days: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """
    KPIs + serie por día con filtros opcionales:
    - days (si NO hay rango)
    - fecha_desde, fecha_hasta (YYYY-MM-DD)  [hasta exclusivo: fecha_hasta + 1 día]
    - user_id
    """
    now = _tznow()

    # Anchuras relativas (no dependen de rango)
    today0 = now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    week0  = (today0 - timedelta(days=now.weekday()))
    month0 = today0.replace(day=1)

    # Normalizar filtros
    user_id_int = None
    if user_id:
        try:
            user_id_int = int(user_id)
        except Exception:
            user_id_int = None

    rango_desde = None
    rango_hasta = None
    if fecha_desde and fecha_hasta:
        rango_desde = datetime.strptime(fecha_desde, "%Y-%m-%d")
        rango_hasta = datetime.strptime(fecha_hasta, "%Y-%m-%d") + timedelta(days=1)  # exclusivo
    elif days:
        rango_desde = (now - timedelta(days=days)).replace(tzinfo=None)
        rango_hasta = now.replace(tzinfo=None)

    where_user  = " and s.user_id = :user_id " if user_id_int else ""
    where_rango = " and m.fecha >= :desde and m.fecha < :hasta " if (rango_desde and rango_hasta) else ""

    params_base = {"today0": today0, "week0": week0, "month0": month0}
    if user_id_int:
        params_base["user_id"] = user_id_int
    if rango_desde and rango_hasta:
        params_base["desde"] = rango_desde
        params_base["hasta"] = rango_hasta

    # 1) KPIs totales
    sql_payments = text(f"""
        select
            coalesce(sum(m.monto),0)                                              as total_general,
            coalesce(sum(case when m.metodo_pago='cash' then m.monto end),0)      as total_efectivo,
            coalesce(sum(case when m.metodo_pago='electronic' then m.monto end),0) as total_electronicas,
            coalesce(sum(case when m.metodo_pago='card' then m.monto end),0)      as total_datafono,
            coalesce(sum(case when m.fecha >= :today0 then m.monto end),0)        as total_hoy,
            coalesce(sum(case when m.fecha >= :week0  then m.monto end),0)        as total_semana,
            coalesce(sum(case when m.fecha >= :month0 then m.monto end),0)        as total_mes,
            count(*)                                                              as ventas_total,
            coalesce(sum(case when m.fecha >= :today0 then 1 else 0 end),0)       as ventas_hoy
        from movimientos_caja m
        join sales s on m.sale_id = s.id
        where m.tipo='venta' and s.estado='activa'
        {where_user}
        {where_rango}
    """)
    res_pay = (await db.execute(sql_payments, params_base)).mappings().one()

    # 2) Ticket promedio
    sql_ticket = text(f"""
        select
            coalesce(avg(case when m.fecha >= :today0 then m.monto end),0) as ticket_promedio_hoy,
            coalesce(avg(m.monto),0)                                       as ticket_promedio_mes
        from movimientos_caja m
        join sales s on m.sale_id = s.id
        where m.tipo='venta' and s.estado = 'activa'
        {where_user}
        {where_rango}
    """)
    res_ticket = (await db.execute(sql_ticket, params_base)).mappings().one()

    # 3) Serie diaria continua (incluye días con 0)
    if rango_desde and rango_hasta:
        serie_desde, serie_hasta = rango_desde, rango_hasta
    else:
        ventana = days if days else 14
        serie_desde = (now - timedelta(days=ventana)).replace(tzinfo=None)
        serie_hasta = now.replace(tzinfo=None)

    # Convertir a date objects si son datetime
    serie_desde_date = serie_desde.date() if hasattr(serie_desde, 'date') else serie_desde
    serie_hasta_date = serie_hasta.date() if hasattr(serie_hasta, 'date') else serie_hasta
    serie_hasta_minus_one = serie_hasta_date - timedelta(days=1)

    # Usar f-string para insertar las fechas directamente (ya que son objetos date seguros)
    where_user_series = f" and s.user_id = {user_id_int} " if user_id_int else ""

    sql_series = text(f"""
        with days as (
            select generate_series(
                '{serie_desde_date}'::date,
                '{serie_hasta_minus_one}'::date,
                interval '1 day'
            )::date as d
        ),
        agg as (
            select
                date(m.fecha) as d,
                coalesce(sum(m.monto), 0) as total
            from movimientos_caja m
            join sales s on m.sale_id = s.id
            where m.tipo='venta'
              and s.estado='activa'
              and m.fecha >= '{serie_desde_date}'::date
              and m.fecha < '{serie_hasta_date}'::date
              {where_user_series}
            group by 1
        )
        select d as fecha, coalesce(a.total, 0) as total
        from days
        left join agg a using(d)
        order by d
    """)
    series_rows = (await db.execute(sql_series)).mappings().all()
    series_por_dia = [{"fecha": r["fecha"].isoformat(), "total": float(r["total"])} for r in series_rows]

    # 4) SIMs (global)
    sql_sims = text("""
        select
            count(*)                                                   as total_sims,
            coalesce(sum(case when estado='available'  then 1 end),0)  as disponibles,
            coalesce(sum(case when estado='recargado'  then 1 end),0)  as recargadas,
            coalesce(sum(case when estado='vendido'    then 1 end),0)  as vendidas
        from sim_detalle
    """)
    res_sims = (await db.execute(sql_sims)).mappings().one()

    # 5) Lotes (global)
    sql_lotes = text("""
        select
            count(*) as lotes,
            coalesce(sum(total_sims),0) as total_sims,
            coalesce(sum(disponibles),0) as disponibles,
            coalesce(sum(recargadas),0) as recargadas,
            coalesce(sum(vendidas),0) as vendidas
        from (
            select
                l.id,
                count(d.id)                                                      as total_sims,
                sum(case when d.estado='available' then 1 else 0 end)            as disponibles,
                sum(case when d.estado='recargado' then 1 else 0 end)            as recargadas,
                sum(case when d.estado='vendido'   then 1 else 0 end)            as vendidas
            from sim_lotes l
            left join sim_detalle d on d.lote_id = l.id
            group by l.id
        ) t
    """)
    res_lotes = (await db.execute(sql_lotes)).mappings().one()

    # 6) Ventas por método HOY (relativo a hoy)
    sql_hoy_metodo = text("""
        select m.metodo_pago, coalesce(sum(m.monto),0) as total
        from movimientos_caja m
        join sales s on m.sale_id = s.id
        where m.tipo='venta' and s.estado = 'activa'
          and m.fecha >= :today0
        group by m.metodo_pago
    """)
    res_hoy_met = (await db.execute(sql_hoy_metodo, {"today0": today0})).mappings().all()
    ventas_hoy_por_metodo = {r["metodo_pago"]: float(r["total"]) for r in res_hoy_met}

    # 7) Últimas ventas (filtradas por el mismo rango/usuario si aplica)
    where_user_last  = " and s.user_id = :user_id " if user_id_int else ""
    where_rango_last = " and m.fecha >= :desde and m.fecha < :hasta " if (rango_desde and rango_hasta) else ""

    sql_last_sales = text(f"""
        select m.fecha, m.metodo_pago, m.monto, m.sale_id
        from movimientos_caja m
        join sales s on m.sale_id = s.id
        where m.tipo='venta' and s.estado = 'activa'
        {where_user_last}
        {where_rango_last}
        order by m.fecha desc
        limit 10
    """)
    res_last = (await db.execute(sql_last_sales, params_base)).mappings().all()
    ultimas_ventas = [
        {"fecha": r["fecha"], "metodo_pago": r["metodo_pago"], "monto": float(r["monto"]), "sale_id": r["sale_id"]}
        for r in res_last
    ]

    return {
        "kpis": {
            "total_general": float(res_pay["total_general"]),
            "total_efectivo": float(res_pay["total_efectivo"]),
            "total_electronicas": float(res_pay["total_electronicas"]),
            "total_datafono": float(res_pay["total_datafono"]),
            "total_hoy": float(res_pay["total_hoy"]),
            "total_semana": float(res_pay["total_semana"]),
            "total_mes": float(res_pay["total_mes"]),
            "ventas_total": int(res_pay["ventas_total"]),
            "ventas_hoy": int(res_pay["ventas_hoy"]),
            "ticket_promedio_hoy": float(res_ticket["ticket_promedio_hoy"]),
            "ticket_promedio_mes": float(res_ticket["ticket_promedio_mes"]),
        },
        "series": {
            "ventas_ultimos_14_dias": series_por_dia,
            "ventas_hoy_por_metodo": ventas_hoy_por_metodo,
        },
        "sims": {
            "total": int(res_sims["total_sims"]),
            "disponibles": int(res_sims["disponibles"]),
            "recargadas": int(res_sims["recargadas"]),
            "vendidas": int(res_sims["vendidas"]),
        },
        "lotes": {
            "lotes": int(res_lotes["lotes"]),
            "total_sims": int(res_lotes["total_sims"]),
            "disponibles": int(res_lotes["disponibles"]),
            "recargadas": int(res_lotes["recargadas"]),
            "vendidas": int(res_lotes["vendidas"]),
        },
        "ultimas_ventas": ultimas_ventas,
    }




@router.get("/inventario")
async def get_inventario_metrics(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Métricas de inventario con alertas de bajo stock por planes"""

    # Stock por operador y plan
    sql_stock_plan = text("""
        SELECT
            l.operador,
            d.plan_asignado,
            COUNT(*) as total,
            SUM(CASE WHEN d.estado = 'available' THEN 1 ELSE 0 END) as disponibles,
            SUM(CASE WHEN d.estado = 'vendido' THEN 1 ELSE 0 END) as vendidas,
            SUM(CASE WHEN d.estado = 'recargado' THEN 1 ELSE 0 END) as recargadas,
            SUM(CASE WHEN d.estado = 'defectuosa' THEN 1 ELSE 0 END) as defectuosas
        FROM sim_detalle d
        JOIN sim_lotes l ON d.lote_id = l.id
        GROUP BY l.operador, d.plan_asignado
        ORDER BY l.operador, d.plan_asignado
    """)

    result = await db.execute(sql_stock_plan)
    stock_por_plan = [
        {
            "operador": row.operador,
            "plan": row.plan_asignado or "Sin plan",
            "total": int(row.total),
            "disponibles": int(row.disponibles),
            "vendidas": int(row.vendidas),
            "recargadas": int(row.recargadas),
            "defectuosas": int(row.defectuosas),
            "bajo_stock": int(row.disponibles) < 10  # Umbral de alerta
        }
        for row in result
    ]

    # Alertas de bajo stock
    alertas = [item for item in stock_por_plan if item["bajo_stock"]]

    # Stock por operador (resumen)
    sql_stock_operador = text("""
        SELECT
            l.operador,
            COUNT(*) as total,
            SUM(CASE WHEN d.estado = 'available' THEN 1 ELSE 0 END) as disponibles,
            SUM(CASE WHEN d.estado = 'vendido' THEN 1 ELSE 0 END) as vendidas
        FROM sim_detalle d
        JOIN sim_lotes l ON d.lote_id = l.id
        GROUP BY l.operador
        ORDER BY l.operador
    """)

    result = await db.execute(sql_stock_operador)
    stock_por_operador = [
        {
            "operador": row.operador,
            "total": int(row.total),
            "disponibles": int(row.disponibles),
            "vendidas": int(row.vendidas),
            "porcentaje_vendido": round((int(row.vendidas) / int(row.total)) * 100, 1) if int(row.total) > 0 else 0
        }
        for row in result
    ]

    return {
        "stock_por_plan": stock_por_plan,
        "stock_por_operador": stock_por_operador,
        "alertas_bajo_stock": alertas,
        "total_alertas": len(alertas)
    }


@router.get("/ventas-ingresos")
async def get_ventas_ingresos(
    days: int = 30,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Análisis detallado de ventas e ingresos con filtros de fecha y usuario"""

    print(f"[VENTAS] Backend recibió: days={days}, fecha_desde={fecha_desde}, fecha_hasta={fecha_hasta}, user_id={user_id}")

    # Convertir user_id de string a int si es necesario
    user_id_int = None
    if user_id:
        try:
            user_id_int = int(user_id)
            print(f"[USER] User ID convertido a int: {user_id_int}")
        except (ValueError, TypeError) as e:
            print(f"[ERROR] Error convirtiendo user_id a int: {e}")
            raise HTTPException(status_code=400, detail=f"user_id debe ser un número entero válido")

    # Manejo de filtros de fecha
    if fecha_desde and fecha_hasta:
        try:
            # Asegurar que las fechas cubran todo el día
            fecha_desde_dt = datetime.fromisoformat(fecha_desde).replace(hour=0, minute=0, second=0, microsecond=0)
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta).replace(hour=23, minute=59, second=59, microsecond=999999)
            print(f"[DATE] Fechas parseadas: {fecha_desde_dt} hasta {fecha_hasta_dt}")
        except ValueError as e:
            print(f"[ERROR] Error parseando fechas: {e}")
            raise HTTPException(status_code=400, detail=f"Formato de fecha inválido. Use ISO format (YYYY-MM-DD). Error: {str(e)}")
    else:
        fecha_desde_dt = datetime.now(timezone.utc) - timedelta(days=days)
        fecha_hasta_dt = datetime.now(timezone.utc)
        print(f"[DATE] Usando dias por defecto: {days}")

    # Construcción dinámica de la consulta
    where_clauses = [
        "m.tipo = 'venta'",
        "s.estado = 'activa'",
        "m.fecha >= :fecha_desde",
        "m.fecha <= :fecha_hasta"
    ]

    if user_id_int:
        where_clauses.append("s.user_id = :user_id")

    where_clause = " AND ".join(where_clauses)

    # Ventas por día con desglose por método de pago
    sql_ventas_dia = text(f"""
        SELECT
            DATE(m.fecha) as fecha,
            m.metodo_pago,
            COUNT(*) as cantidad_ventas,
            SUM(m.monto) as total_ingresos,
            AVG(m.monto) as ticket_promedio
        FROM movimientos_caja m
        JOIN sales s ON m.sale_id = s.id
        WHERE {where_clause}
        GROUP BY DATE(m.fecha), m.metodo_pago
        ORDER BY fecha DESC, m.metodo_pago
    """)

    # Parámetros para la consulta
    query_params = {
        "fecha_desde": fecha_desde_dt,
        "fecha_hasta": fecha_hasta_dt
    }
    if user_id_int:
        query_params["user_id"] = user_id_int

    result = await db.execute(sql_ventas_dia, query_params)
    ventas_por_dia = {}

    for row in result:
        fecha_str = str(row.fecha)
        if fecha_str not in ventas_por_dia:
            ventas_por_dia[fecha_str] = {
                "fecha": fecha_str,
                "total_ventas": 0,
                "total_ingresos": 0,
                "por_metodo": {}
            }

        metodo = row.metodo_pago or "unknown"
        ventas_por_dia[fecha_str]["por_metodo"][metodo] = {
            "cantidad": int(row.cantidad_ventas),
            "ingresos": float(row.total_ingresos),
            "ticket_promedio": float(row.ticket_promedio)
        }
        ventas_por_dia[fecha_str]["total_ventas"] += int(row.cantidad_ventas)
        ventas_por_dia[fecha_str]["total_ingresos"] += float(row.total_ingresos)

    # Resumen por método de pago
    sql_resumen_metodos = text(f"""
        SELECT
            m.metodo_pago,
            COUNT(*) as cantidad_ventas,
            SUM(m.monto) as total_ingresos,
            AVG(m.monto) as ticket_promedio,
            MIN(m.monto) as venta_minima,
            MAX(m.monto) as venta_maxima
        FROM movimientos_caja m
        JOIN sales s ON m.sale_id = s.id
        WHERE {where_clause}
        GROUP BY m.metodo_pago
        ORDER BY total_ingresos DESC
    """)

    result = await db.execute(sql_resumen_metodos, query_params)
    resumen_metodos = [
        {
            "metodo": row.metodo_pago or "unknown",
            "cantidad_ventas": int(row.cantidad_ventas),
            "total_ingresos": float(row.total_ingresos),
            "ticket_promedio": float(row.ticket_promedio),
            "venta_minima": float(row.venta_minima),
            "venta_maxima": float(row.venta_maxima)
        }
        for row in result
    ]

    return {
        "ventas_por_dia": list(ventas_por_dia.values()),
        "resumen_por_metodo": resumen_metodos,
        "periodo_dias": (fecha_hasta_dt - fecha_desde_dt).days,
        "fecha_desde": fecha_desde_dt.isoformat(),
        "fecha_hasta": fecha_hasta_dt.isoformat(),
        "user_id": user_id_int
    }


@router.get("/cierres-descuadres")
async def get_cierres_descuadres(
    days: int = 30,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    user_id: Optional[str] = None,
    solo_con_diferencias: bool = False,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Análisis de cierres de turno y detección de descuadres con filtros de fecha y usuario"""
    print(f"[CIERRES] Backend /cierres-descuadres recibió: days={days}, fecha_desde={fecha_desde}, fecha_hasta={fecha_hasta}, user_id={user_id}, solo_con_diferencias={solo_con_diferencias}")

    # Convertir user_id de string a int si es necesario
    user_id_int = None
    if user_id:
        try:
            user_id_int = int(user_id)
            print(f"[USER] User ID convertido a int: {user_id_int}")
        except (ValueError, TypeError) as e:
            print(f"[ERROR] Error convirtiendo user_id a int: {e}")
            raise HTTPException(status_code=400, detail=f"user_id debe ser un número entero válido")

    # Manejo de filtros de fecha
    if fecha_desde and fecha_hasta:
        try:
            # Asegurar que las fechas cubran todo el día
            fecha_desde_dt = datetime.fromisoformat(fecha_desde).replace(hour=0, minute=0, second=0, microsecond=0)
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta).replace(hour=23, minute=59, second=59, microsecond=999999)
            print(f"[DATE] Fechas parseadas: {fecha_desde_dt} hasta {fecha_hasta_dt}")
        except ValueError as e:
            print(f"[ERROR] Error parseando fechas: {e}")
            raise HTTPException(status_code=400, detail=f"Formato de fecha inválido. Use ISO format (YYYY-MM-DD). Error: {str(e)}")
    else:
        fecha_desde_dt = datetime.now(timezone.utc) - timedelta(days=days)
        fecha_hasta_dt = datetime.now(timezone.utc)

    # Construcción dinámica de filtros WHERE
    where_clauses = ["c.fecha_cierre >= :fecha_desde", "c.fecha_cierre <= :fecha_hasta"]

    if user_id_int:
        where_clauses.append("t.user_id = :user_id")

    where_clause = " AND ".join(where_clauses)

    base_query = f"""
        SELECT
            c.id,
            c.fecha_cierre,
            c.total_ventas_efectivo,
            c.total_ventas_datafono,
            c.total_ventas_electronicas,
            c.total_ventas_dollars,
            c.efectivo_reportado,
            c.datafono_reportado,
            c.dolares_reportado,
            (c.efectivo_reportado - c.total_ventas_efectivo) as diferencia_efectivo,
            (c.datafono_reportado - c.total_ventas_datafono) as diferencia_datafono,
            (c.dolares_reportado - c.total_ventas_dollars) as diferencia_dolares,
            c.observaciones,
            u.full_name as usuario_nombre,
            u.username as usuario_username,
            t.fecha_apertura,
            t.user_id
        FROM cierres_caja c
        JOIN turnos t ON c.turno_id = t.id
        JOIN users u ON t.user_id = u.id
        WHERE {where_clause}
    """

    if solo_con_diferencias:
        base_query += """
        AND (
            ABS(c.efectivo_reportado - c.total_ventas_efectivo) > 0.01 OR
            ABS(c.datafono_reportado - c.total_ventas_datafono) > 0.01 OR
            ABS(c.dolares_reportado - c.total_ventas_dollars) > 0.01
        )
        """

    base_query += " ORDER BY c.fecha_cierre DESC"

    # Parámetros para la consulta
    query_params = {
        "fecha_desde": fecha_desde_dt,
        "fecha_hasta": fecha_hasta_dt
    }
    if user_id_int:
        query_params["user_id"] = user_id_int

    result = await db.execute(text(base_query), query_params)
    cierres = []

    total_diferencias = {
        "efectivo": 0,
        "datafono": 0,
        "dolares": 0
    }

    for row in result:
        diff_efectivo = float(row.diferencia_efectivo or 0)
        diff_datafono = float(row.diferencia_datafono or 0)
        diff_dolares = float(row.diferencia_dolares or 0)

        total_diferencias["efectivo"] += diff_efectivo
        total_diferencias["datafono"] += diff_datafono
        total_diferencias["dolares"] += diff_dolares

        tiene_diferencias = (
            abs(diff_efectivo) > 0.01 or
            abs(diff_datafono) > 0.01 or
            abs(diff_dolares) > 0.01
        )

        cierres.append({
            "id": str(row.id),
            "fecha_cierre": row.fecha_cierre,
            "fecha_apertura": row.fecha_apertura,
            "usuario": row.usuario_nombre or row.usuario_username,
            "totales_sistema": {
                "efectivo": float(row.total_ventas_efectivo or 0),
                "datafono": float(row.total_ventas_datafono or 0),
                "electronicas": float(row.total_ventas_electronicas or 0),
                "dolares": float(row.total_ventas_dollars or 0)
            },
            "totales_reportados": {
                "efectivo": float(row.efectivo_reportado or 0),
                "datafono": float(row.datafono_reportado or 0),
                "dolares": float(row.dolares_reportado or 0)
            },
            "diferencias": {
                "efectivo": diff_efectivo,
                "datafono": diff_datafono,
                "dolares": diff_dolares
            },
            "tiene_diferencias": tiene_diferencias,
            "observaciones": row.observaciones
        })

    return {
        "cierres": cierres,
        "resumen_diferencias": total_diferencias,
        "total_cierres": len(cierres),
        "cierres_con_diferencias": len([c for c in cierres if c["tiene_diferencias"]]),
        "periodo_dias": (fecha_hasta_dt - fecha_desde_dt).days,
        "fecha_desde": fecha_desde_dt.isoformat(),
        "fecha_hasta": fecha_hasta_dt.isoformat(),
        "user_id": user_id_int,
        "solo_con_diferencias": solo_con_diferencias
    }


@router.get("/devoluciones")
async def get_devoluciones_analytics(
    days: int = 30,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Análisis de devoluciones e intercambios con filtros de fecha y usuario"""
    print(f"[DEVOLUCIONES] Backend /devoluciones recibió: days={days}, fecha_desde={fecha_desde}, fecha_hasta={fecha_hasta}, user_id={user_id}")

    # Convertir user_id de string a int si es necesario
    user_id_int = None
    if user_id:
        try:
            user_id_int = int(user_id)
            print(f"[USER] User ID convertido a int: {user_id_int}")
        except (ValueError, TypeError) as e:
            print(f"[ERROR] Error convirtiendo user_id a int: {e}")
            raise HTTPException(status_code=400, detail=f"user_id debe ser un número entero válido")

    # Manejo de filtros de fecha
    if fecha_desde and fecha_hasta:
        try:
            # Asegurar que las fechas cubran todo el día
            fecha_desde_dt = datetime.fromisoformat(fecha_desde).replace(hour=0, minute=0, second=0, microsecond=0)
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta).replace(hour=23, minute=59, second=59, microsecond=999999)
            print(f"[DATE] Fechas parseadas: {fecha_desde_dt} hasta {fecha_hasta_dt}")
        except ValueError as e:
            print(f"[ERROR] Error parseando fechas: {e}")
            raise HTTPException(status_code=400, detail=f"Formato de fecha inválido. Use ISO format (YYYY-MM-DD). Error: {str(e)}")
    else:
        fecha_desde_dt = datetime.now(timezone.utc) - timedelta(days=days)
        fecha_hasta_dt = datetime.now(timezone.utc)

    # Construcción dinámica de filtros WHERE
    where_clauses = ["d.fecha_devolucion >= :fecha_desde", "d.fecha_devolucion <= :fecha_hasta"]

    if user_id_int:
        where_clauses.append("d.user_id = :user_id")

    where_clause = " AND ".join(where_clauses)

    # Parámetros para las consultas
    query_params = {
        "fecha_desde": fecha_desde_dt,
        "fecha_hasta": fecha_hasta_dt
    }
    if user_id_int:
        query_params["user_id"] = user_id_int

    # Devoluciones por tipo y día
    sql_devoluciones = text(f"""
        SELECT
            DATE(d.fecha_devolucion) as fecha,
            d.tipo_devolucion,
            COUNT(*) as cantidad,
            SUM(CASE WHEN d.monto_devuelto IS NOT NULL THEN d.monto_devuelto ELSE 0 END) as monto_total,
            AVG(CASE WHEN d.monto_devuelto IS NOT NULL THEN d.monto_devuelto ELSE NULL END) as monto_promedio
        FROM devoluciones_sim d
        WHERE {where_clause}
        GROUP BY DATE(d.fecha_devolucion), d.tipo_devolucion
        ORDER BY fecha DESC, d.tipo_devolucion
    """)

    result = await db.execute(sql_devoluciones, query_params)
    devoluciones_por_dia = {}

    for row in result:
        fecha_str = str(row.fecha)
        if fecha_str not in devoluciones_por_dia:
            devoluciones_por_dia[fecha_str] = {
                "fecha": fecha_str,
                "intercambios": 0,
                "devoluciones_dinero": 0,
                "monto_devuelto": 0
            }

        tipo = row.tipo_devolucion or "intercambio"
        if tipo == "intercambio":
            devoluciones_por_dia[fecha_str]["intercambios"] = int(row.cantidad)
        else:
            devoluciones_por_dia[fecha_str]["devoluciones_dinero"] = int(row.cantidad)
            devoluciones_por_dia[fecha_str]["monto_devuelto"] += float(row.monto_total or 0)

    # Resumen general
    sql_resumen = text(f"""
        SELECT
            d.tipo_devolucion,
            COUNT(*) as total_casos,
            SUM(CASE WHEN d.monto_devuelto IS NOT NULL THEN d.monto_devuelto ELSE 0 END) as monto_total_devuelto
        FROM devoluciones_sim d
        WHERE {where_clause}
        GROUP BY d.tipo_devolucion
    """)

    result = await db.execute(sql_resumen, query_params)
    resumen = {
        "intercambios": 0,
        "devoluciones_dinero": 0,
        "monto_total_devuelto": 0
    }

    for row in result:
        tipo = row.tipo_devolucion or "intercambio"
        if tipo == "intercambio":
            resumen["intercambios"] = int(row.total_casos)
        else:
            resumen["devoluciones_dinero"] = int(row.total_casos)
            resumen["monto_total_devuelto"] = float(row.monto_total_devuelto or 0)

    # Motivos más comunes
    sql_motivos = text(f"""
        SELECT
            d.motivo,
            COUNT(*) as frecuencia,
            d.tipo_devolucion
        FROM devoluciones_sim d
        WHERE {where_clause}
          AND d.motivo IS NOT NULL
        GROUP BY d.motivo, d.tipo_devolucion
        ORDER BY frecuencia DESC
        LIMIT 10
    """)

    result = await db.execute(sql_motivos, query_params)
    motivos_comunes = [
        {
            "motivo": row.motivo,
            "frecuencia": int(row.frecuencia),
            "tipo": row.tipo_devolucion or "intercambio"
        }
        for row in result
    ]

    return {
        "devoluciones_por_dia": list(devoluciones_por_dia.values()),
        "resumen": resumen,
        "motivos_comunes": motivos_comunes,
        "periodo_dias": (fecha_hasta_dt - fecha_desde_dt).days,
        "fecha_desde": fecha_desde_dt.isoformat(),
        "fecha_hasta": fecha_hasta_dt.isoformat(),
        "user_id": user_id
    }


@router.get("/inventarios-descuadres")
async def get_inventarios_descuadres(
    days: int = 30,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    user_id: Optional[int] = None,
    solo_con_descuadres: bool = True,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Dashboard de descuadres de inventario de SIMs con filtros de fecha y usuario"""

    # Manejo de filtros de fecha
    if fecha_desde and fecha_hasta:
        try:
            fecha_desde_dt = datetime.fromisoformat(fecha_desde.replace('Z', '+00:00'))
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use ISO format (YYYY-MM-DD)")
    else:
        fecha_desde_dt = datetime.now(timezone.utc) - timedelta(days=days)
        fecha_hasta_dt = datetime.now(timezone.utc)

    # Construcción dinámica de filtros WHERE
    where_clauses = [
        "i.fecha_registro >= :fecha_desde",
        "i.fecha_registro <= :fecha_hasta"
    ]

    if user_id:
        where_clauses.append("t.user_id = :user_id")

    if solo_con_descuadres:
        where_clauses.append("(i.diferencia_inicial != 0 OR i.diferencia_final != 0)")

    where_clause = " AND ".join(where_clauses)

    # Consulta principal de inventarios con descuadres
    base_query = f"""
        SELECT
            i.id,
            i.turno_id,
            i.plan,
            i.cantidad_inicial_reportada,
            i.cantidad_inicial_sistema,
            i.diferencia_inicial,
            i.cantidad_final_reportada,
            i.cantidad_final_sistema,
            i.diferencia_final,
            i.fecha_registro,
            i.fecha_cierre,
            i.observaciones_apertura,
            i.observaciones_cierre,
            t.fecha_apertura as turno_fecha_apertura,
            t.fecha_cierre as turno_fecha_cierre,
            t.estado as turno_estado,
            u.full_name as usuario_nombre,
            u.username as usuario_username
        FROM inventario_sim_turno i
        JOIN turnos t ON i.turno_id = t.id
        JOIN users u ON t.user_id = u.id
        WHERE {where_clause}
        ORDER BY i.fecha_registro DESC
    """

    # Parámetros para la consulta
    query_params = {
        "fecha_desde": fecha_desde_dt,
        "fecha_hasta": fecha_hasta_dt
    }
    if user_id:
        query_params["user_id"] = user_id

    result = await db.execute(text(base_query), query_params)
    inventarios = []

    total_descuadres_inicial = 0
    total_descuadres_final = 0
    descuadres_por_plan = {}

    for row in result.all():
        tiene_descuadre_inicial = abs(row.diferencia_inicial or 0) > 0
        tiene_descuadre_final = abs(row.diferencia_final or 0) > 0 if row.diferencia_final is not None else False

        if tiene_descuadre_inicial:
            total_descuadres_inicial += 1

        if tiene_descuadre_final:
            total_descuadres_final += 1

        # Contabilizar descuadres por plan
        plan = row.plan
        if plan not in descuadres_por_plan:
            descuadres_por_plan[plan] = {
                "plan": plan,
                "descuadres_inicial": 0,
                "descuadres_final": 0,
                "diferencia_total_inicial": 0,
                "diferencia_total_final": 0
            }

        if tiene_descuadre_inicial:
            descuadres_por_plan[plan]["descuadres_inicial"] += 1
            descuadres_por_plan[plan]["diferencia_total_inicial"] += (row.diferencia_inicial or 0)

        if tiene_descuadre_final:
            descuadres_por_plan[plan]["descuadres_final"] += 1
            descuadres_por_plan[plan]["diferencia_total_final"] += (row.diferencia_final or 0)

        inventarios.append({
            "id": str(row.id),
            "turno_id": str(row.turno_id),
            "plan": row.plan,
            "cantidades": {
                "inicial_reportada": row.cantidad_inicial_reportada,
                "inicial_sistema": row.cantidad_inicial_sistema,
                "final_reportada": row.cantidad_final_reportada,
                "final_sistema": row.cantidad_final_sistema
            },
            "diferencias": {
                "inicial": row.diferencia_inicial or 0,
                "final": row.diferencia_final
            },
            "descuadres": {
                "inicial": tiene_descuadre_inicial,
                "final": tiene_descuadre_final,
                "tiene_descuadre": tiene_descuadre_inicial or tiene_descuadre_final
            },
            "fechas": {
                "registro": row.fecha_registro,
                "cierre": row.fecha_cierre,
                "turno_apertura": row.turno_fecha_apertura,
                "turno_cierre": row.turno_fecha_cierre
            },
            "turno": {
                "estado": row.turno_estado
            },
            "usuario": row.usuario_nombre or row.usuario_username,
            "observaciones": {
                "apertura": row.observaciones_apertura,
                "cierre": row.observaciones_cierre
            }
        })

    return {
        "inventarios": inventarios,
        "resumen": {
            "total_registros": len(inventarios),
            "total_descuadres_inicial": total_descuadres_inicial,
            "total_descuadres_final": total_descuadres_final,
            "descuadres_por_plan": list(descuadres_por_plan.values())
        },
        "periodo_dias": (fecha_hasta_dt - fecha_desde_dt).days,
        "fecha_desde": fecha_desde_dt.isoformat(),
        "fecha_hasta": fecha_hasta_dt.isoformat(),
        "user_id": user_id,
        "solo_con_descuadres": solo_con_descuadres
    }
