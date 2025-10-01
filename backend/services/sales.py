from datetime import datetime, timezone
from uuid import uuid4
from decimal import Decimal
import logging
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func as sa_func
from siigo_client import siigo_client
from schemas.sale_schemas import SaleRequest, SaleCreateSchema
from models import Sale, SaleItem, MovimientoCaja, Turno, SimDetalle

log = logging.getLogger("sales-service")


def _pm_norm(value: str) -> str:
    v = (value or "").strip().lower()
    if v in ("card", "tarjeta", "datafono", "dataphone", "pos"):
        return "card"
    if v in ("electronic", "electronico", "electrónico", "transfer", "transferencia"):
        return "electronic"
    if v in ("dollars", "dollar", "dolares", "dólar", "dólares", "usd"):
        return "dollars"
    return "cash"


async def _turno_abierto_user_id(db: AsyncSession) -> int | None:
    """Best-effort: si no nos pasaron user_id, intenta inferirlo del último turno abierto."""
    res = await db.execute(
        select(Turno).where(Turno.estado == "abierto").order_by(Turno.fecha_apertura.desc())
    )
    turno = res.scalar_one_or_none()
    return getattr(turno, "user_id", None) if turno else None


async def _registrar_movimiento_caja(
    db: AsyncSession,
    *,
    user_id: int | None,
    sale_id,
    monto: Decimal,
    metodo_pago: str,
    descripcion: str = "Venta",
):
    if user_id is None:
        return None

    res_turno = await db.execute(
        select(Turno).where(Turno.user_id == user_id, Turno.estado == "abierto")
    )
    turno = res_turno.scalar_one_or_none()
    if not turno:
        return None

    mov = MovimientoCaja(
        id=uuid4(),
        turno_id=turno.id,
        tipo="venta",
        monto=Decimal(str(monto or 0)),
        descripcion=descripcion,
        metodo_pago=_pm_norm(metodo_pago),
        sale_id=sale_id,
    )
    db.add(mov)
    return mov


async def save_sale_to_db(
    sale_data: SaleCreateSchema,
    db: AsyncSession,
    siigo_invoice_id: str | None = None,
    user_id: int | None = None,
):
    """
    Crea la venta + items y registra el movimiento de caja.
    Se asegura de que 'user_id' quede seteado.
    """
    # 0) Normalizar método de pago y total
    payment_method = _pm_norm(sale_data.payment_method)

    total = Decimal("0")
    for item in sale_data.items:
        total += Decimal(str(item.unit_price)) * Decimal(str(item.quantity))

    # 1) Si no llega user_id, intenta inferirlo (robusto)
    if user_id is None:
        inferred = await _turno_abierto_user_id(db)
        if inferred is not None:
            log.warning("save_sale_to_db: user_id venía None; usando user_id=%s por turno abierto", inferred)
            user_id = inferred
        else:
            log.error("save_sale_to_db: user_id es None y no hay turno abierto para inferirlo")

    # 2) Crear venta
    venta = Sale(
        id=uuid4(),
        customer_id=sale_data.customer_id,
        customer_identification=sale_data.customer_identification,
        payment_method=payment_method,
        siigo_invoice_id=siigo_invoice_id,
        total=total,
        user_id=user_id,  # <- clave
        # created_at = server_default en el modelo
    )
    db.add(venta)

    # 3) Items
    for item in sale_data.items:
        try:
            iva_val = item.taxes[0].percentage if item.taxes and item.taxes[0].percentage else 0
        except Exception:
            iva_val = 0

        detalle = SaleItem(
            id=uuid4(),
            sale=venta,
            product_code=item.product_code,
            description=item.description,
            quantity=int(item.quantity),
            unit_price=Decimal(str(item.unit_price)),
            iva=Decimal(str(iva_val)),
        )
        db.add(detalle)

        
        # 1) prioridad: campos explícitos
        msisdn = getattr(item, "msisdn", None)
        iccid  = getattr(item, "iccid",  None)

        # 2) heurística: si no vienen, intentar inferir del product_code/description
        pc = (item.product_code or "").strip()
        desc = (item.description or "").strip()

        # si el product_code son ~10-13 dígitos, podría ser msisdn o iccid
        if not msisdn and pc.isdigit() and 10 <= len(pc) <= 13:
            if len(pc) in (10, 11, 12, 13):
                msisdn = pc  # suele ser número de línea
        # intenta iccid en descripción
        if not iccid and any(x in desc.lower() for x in ("iccid", "sim", "chip", "tarjeta")):
            # extrae la primera secuencia larga de dígitos como iccid
            digits = "".join(ch if ch.isdigit() else " " for ch in desc).split()
            iccand = next((d for d in digits if len(d) >= 18), None)
            if iccand:
                iccid = iccand

        try:
            updated = await _mark_sim_sold(db, venta_id=venta.id, msisdn=msisdn, iccid=iccid)
            if updated:
                log.info("SIM marcada vendida (venta=%s, msisdn=%s, iccid=%s)", venta.id, msisdn, iccid)
        except Exception as e:
            log.warning("No se pudo marcar SIM vendida (venta=%s): %s", venta.id, e)

    # 4) Flushear para tener el id de la venta
    await db.flush()

    # 5) Movimiento de caja (si hay turno)
    await _registrar_movimiento_caja(
        db,
        user_id=user_id,
        sale_id=venta.id,
        monto=total,
        metodo_pago=payment_method,
        descripcion=f"Venta #{str(venta.id)[:8]}",
    )

    # 6) Un commit al final
    await db.commit()
    await db.refresh(venta)
    return venta


async def generar_factura_siigo(sale_data: SaleRequest) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_amount = sum(item.unit_price * item.quantity for item in sale_data.items)

    invoice_payload = {
        "document": {"id": 27652},
        "date": today,
        "customer": {
            "id": "38165ed3-4562-45f6-8c59-78867af1989b",
            "person_type": "Person",
            "id_type": "13",
            "identification": sale_data.customer_identification,
            "name": ["Cliente", "Final"],
            "city": {"country_code": "CO", "state_code": "05", "city_code": "050015"},
            "contacts": [{"first_name": "Cliente", "last_name": "Final", "email": "cliente@email.com"}],
        },
        "seller": 54,
        "observations": "Factura generada desde Local Sim Colombia",
        "stamp": {"send": True},
        "mail": {"send": True},
        "items": [],
        "payments": [{"id": 471, "value": round(total_amount, 2), "due_date": today}],
    }

    for item in sale_data.items:
        invoice_payload["items"].append({
            "code": item.product_code,
            "description": item.description,
            "quantity": item.quantity,
            "price": item.unit_price,
            "price_include_tax": True,
            "unit": {"code": "94"},
            "discount": 0,
            "taxes": [{"id": tax.id} for tax in (item.taxes or [])],
        })

    response = await siigo_client.make_request("POST", "/v1/invoices", json=invoice_payload)
    return str(response.get("number") or response.get("id"))


def _digits_only(v: str | None) -> str | None:
    if not v:
        return v
    d = "".join(ch for ch in str(v) if ch.isdigit())
    return d or None

async def _mark_sim_sold(
    db: AsyncSession,
    *,
    venta_id,
    msisdn: str | None = None,
    iccid: str | None = None,
) -> int:
    """
    Marca como vendida una SIM en sim_detalle.
    Busca por msisdn (numero_linea) o por iccid.
    Retorna la cantidad de filas actualizadas (0 o 1).
    """
    msisdn = _digits_only(msisdn)
    iccid = (iccid or "").strip() if iccid else None

    if not msisdn and not iccid:
        return 0

    q = update(SimDetalle).values(
        vendida=True,
        fecha_venta=sa_func.now(),
        venta_id=str(venta_id),
        estado="sold",
    ).execution_options(synchronize_session=False)

    if msisdn and iccid:
        q = q.where(or_(SimDetalle.numero_linea == msisdn, SimDetalle.iccid == iccid))
    elif msisdn:
        # admite que en DB guardes con o sin prefijo país (últimos 10 dígitos)
        last10 = msisdn[-10:] if len(msisdn) > 10 else msisdn
        q = q.where(or_(SimDetalle.numero_linea == msisdn, SimDetalle.numero_linea == last10))
    else:
        q = q.where(SimDetalle.iccid == iccid)

    res = await db.execute(q)
    return res.rowcount or 0