# routes/winred.py — Winred: paquetes OK + recarga fiel al PHP (firma y orden exactos)

import os
import json
import hmac
import base64
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import random
import aiohttp
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, update, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_session
from models import PlanHomologacion, SimDetalle, SimLote, SimStatus

router = APIRouter()

# ====== ENV ======
WINRED_BASE_URL    = os.getenv("WINRED_BASE_URL", "https://winred.co/api").rstrip("/")
WINRED_API_VERSION = os.getenv("WINRED_API_VERSION", "1.0")
WINRED_USER_ID     = os.getenv("WINRED_USER_ID", "")
WINRED_API_KEY     = os.getenv("WINRED_API_KEY", "")
WINRED_SECRET_KEY  = os.getenv("WINRED_SECRET_KEY", "")
WINRED_BASIC_USER  = os.getenv("WINRED_BASIC_USER", "")
WINRED_BASIC_PASS  = os.getenv("WINRED_BASIC_PASS", "")
WINRED_PROBE_SUBSCRIBER = os.getenv("WINRED_PROBE_SUBSCRIBER", "")
WINRED_MS = os.getenv("WINRED_MS", "1").lower()  # "1" con .000, "0" sin .000

# IDs permitidos para mostrar en UI (ajusta en .env si quieres)
WINRED_ALLOWED_IDS = set(
    s.strip() for s in os.getenv("WINRED_ALLOWED_IDS", "1163,1188,1189,1067").split(",") if s.strip()
)

# ====== HELPERS ======
def _must_have_creds() -> None:
    missing = [n for n, v in [
        ("WINRED_USER_ID", WINRED_USER_ID),
        ("WINRED_API_KEY", WINRED_API_KEY),
        ("WINRED_SECRET_KEY", WINRED_SECRET_KEY),
        ("WINRED_BASIC_USER", WINRED_BASIC_USER),
        ("WINRED_BASIC_PASS", WINRED_BASIC_PASS),
    ] if not v]
    if missing:
        raise HTTPException(status_code=400, detail=f"Config Winred incompleta: {', '.join(missing)}")

def _b64_hmac_sha256(secret: str, message: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")

def _compact_json(obj: Any) -> str:
    # JSON compacto, sin espacios, sin ordenar claves (igual a json_encode por defecto)
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)

def _now_reqdate() -> str:
    base = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{base}.000" if WINRED_MS not in ("0", "false", "no") else base

def _filter_allowed_packages_in_resp(resp: dict) -> dict:
    try:
        data = resp.get("data", {}) if isinstance(resp, dict) else {}
        pkgs = data.get("packages", []) or []
        filtered = [p for p in pkgs if str(p.get("product_id")) in WINRED_ALLOWED_IDS]
        if isinstance(resp, dict):
            resp.setdefault("data", {})["packages"] = filtered
            resp["data"]["count"] = len(filtered)
        print("🎯 allowed ids:", sorted(list(WINRED_ALLOWED_IDS)))
        print("✅ ids filtrados:", [str(p.get("product_id")) for p in filtered])
    except Exception as e:
        print("⚠️ No se pudo filtrar paquetes permitidos:", e)
    return resp

def _as_str(x) -> str:
    return "" if x is None else str(x)


# ====== GUARDAR EN BD ======

async def _apply_topup_to_sim_detalle(
    db: AsyncSession, *, msisdn: str, winred_product_id: str
) -> int:
    """
    Actualiza sim_detalle para la línea dada:
      - plan_asignado = código de Siigo (por winred_product_id)
      - winred_product_id = el id de Winred (como string)
      - fecha_ultima_recarga = now()
    Retorna cuántas filas fueron actualizadas.
    """
    # 1) buscar siigo_code por product_id de Winred
    q = await db.execute(
        select(PlanHomologacion.siigo_code)
        .where(PlanHomologacion.winred_product_id == str(winred_product_id))
        .limit(1)
    )
    row = q.first()
    siigo_code = row[0] if row else None
    if not siigo_code:
        # si no hay homologación, no hacemos nada para no grabar código vacío
        return 0

    # 2) normaliza msisdn (solo dígitos)
    msisdn = "".join(ch for ch in str(msisdn) if ch.isdigit())
    if len(msisdn) > 10:
        last10 = msisdn[-10:]
    else:
        last10 = msisdn

    # 3) actualiza por coincidencia exacta; si tienes números con prefijo país en DB,
    #    este OR igual intenta por últimos 10 dígitos.
    res = await db.execute(
        update(SimDetalle)
        .where(
            or_(
                SimDetalle.numero_linea == msisdn,
                SimDetalle.numero_linea == last10,
            )
        )
        .values(
            plan_asignado=siigo_code,
            winred_product_id=str(winred_product_id),
            fecha_ultima_recarga=func.now(),
            estado=SimStatus.recargado,
        )
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return res.rowcount or 0

# ====== CLIENTE ======
class WinredClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.timeout = aiohttp.ClientTimeout(total=30)

    def build_header_for_body(self) -> Dict[str, Any]:
        """
        Orden exacto (como array PHP): api_version, api_key, request_id, hash_key, request_date
        hash_key = b64(HMAC_SHA256(user_id + request_id + request_date + api_key, SECRET))
        """
        _must_have_creds()
        request_id = str(random.randint(10_000_000, 2_147_483_647))
        request_date = _now_reqdate()
        string2hash = f"{WINRED_USER_ID}{request_id}{request_date}{WINRED_API_KEY}"
        hash_key = _b64_hmac_sha256(WINRED_SECRET_KEY, string2hash)

        header = {}
        header["api_version"] = WINRED_API_VERSION
        header["api_key"]     = WINRED_API_KEY
        header["request_id"]  = request_id
        header["hash_key"]    = hash_key
        header["request_date"]= request_date
        return header

    def _payload_json_body(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea el body {"header","data","signature"} con firma:
        base64(HMAC_SHA256( json(header)+json(data)+API_KEY , SECRET ))
        """
        header = self.build_header_for_body()
        # Normaliza data a strings y en el mismo orden que PHP lo arma:
        ordered = {}
        for k in ("product_id", "amount", "suscriber", "sell_from"):
            if k in data:
                ordered[k] = _as_str(data.get(k))
        # Para querytx solo va 'suscriber'
        if "suscriber" in data and set(data.keys()) == {"suscriber"}:
            ordered = {"suscriber": _as_str(data["suscriber"])}

        hj = _compact_json(header)
        dj = _compact_json(ordered)
        signature = _b64_hmac_sha256(WINRED_SECRET_KEY, f"{hj}{dj}{WINRED_API_KEY}")
        return {"header": header, "data": ordered, "signature": signature}

    async def post_textplain_body(self, service: str, data: dict) -> dict:
        """
        Content-Type: text/plain
        Body: {"header","data","signature"}
        signature = b64(HMAC_SHA256(json(header)+json(data)+API_KEY, SECRET))
        - Orden header: api_version, api_key, request_id, hash_key, request_date
        - Orden data (topup): product_id, amount, suscriber, sell_from
        (para querytx: solo {"suscriber": "..."}).
        """
        _must_have_creds()
        auth = aiohttp.BasicAuth(WINRED_BASIC_USER, WINRED_BASIC_PASS)

        # Usa SIEMPRE el builder fiel al PHP (mismo orden, misma fecha .000)
        header_full = self.build_header_for_body()

        # Intento: querypackages usa header completo CON hash_key (como topup)
        svc_lower = service.lower()
        header_for_signature = header_full

        # Normaliza y fuerza orden de data
        if set(data.keys()) == {"suscriber"}:
            # querytx: solo suscriber
            ordered_data = {"suscriber": _as_str(data["suscriber"])}
        elif svc_lower in ("querypackages",) and set(data.keys()) == {"product_id"}:
            # querypackages: solo product_id (SIN campos vacíos)
            ordered_data = {"product_id": _as_str(data["product_id"])}
        else:
            # topup: todos los campos
            ordered_data = {
                "product_id": _as_str(data.get("product_id", "")),
                "amount":     _as_str(data.get("amount", "")),
                "suscriber":  _as_str(data.get("suscriber", "")),  # (sic)
                "sell_from":  _as_str(data.get("sell_from", "S")),
            }

        hj = json.dumps(header_for_signature, separators=(",", ":"), ensure_ascii=False)
        dj = json.dumps(ordered_data, separators=(",", ":"), ensure_ascii=False)
        signature = _b64_hmac_sha256(WINRED_SECRET_KEY, f"{hj}{dj}{WINRED_API_KEY}")

        body_str = json.dumps(
            {"header": header_full, "data": ordered_data, "signature": signature},
            separators=(",", ":"), ensure_ascii=False
        )

        # Debug log para querypackages
        if svc_lower in ("querypackages",):
            print(f"🔍 DEBUG querypackages:")
            print(f"   header_for_signature: {hj}")
            print(f"   data: {dj}")
            print(f"   concat: {hj}{dj}{WINRED_API_KEY[:10]}...")
            print(f"   signature: {signature}")

        url = f"{self.base_url}/{service.strip('/')}"
        headers = {"Accept": "text/plain", "Content-Type": "text/plain"}

        async with aiohttp.ClientSession(auth=auth, timeout=self.timeout) as s:
            async with s.post(url, headers=headers, data=body_str.encode("utf-8"), ssl=True) as r:
                text = await r.text()
                print(f"⬅️ Winred RESP {service} text/plain status={r.status} body={text[:500]}")
                if r.status in (200, 201):
                    try:
                        resp = json.loads(text)
                    except json.JSONDecodeError:
                        raise HTTPException(status_code=502, detail=f"Respuesta no JSON de Winred: {text[:200]}")
                    resp["__mode"] = "php-text/plain-body"
                    resp["__route"] = service
                    resp["__req_id"] = header_full["request_id"]
                    return resp
                raise HTTPException(status_code=502, detail=f"Winred HTTP {r.status}: {text}")


    # -------- paquetes (tu flujo original que ya funciona) ----------
    def _payload_json_mode(self, data: Dict[str, Any], include_hash: bool, sort: bool) -> Dict[str, Any]:
        header = self.build_header_for_body()
        # Para el modo "paquetes" no importa el orden exacto como en PHP, pero mantenemos consistencia
        base_hdr = {
            "api_version": header["api_version"],
            "api_key": header["api_key"],
            "request_id": header["request_id"],
            "request_date": header["request_date"],
        }
        hdr_for_sign = {**base_hdr, "hash_key": header["hash_key"]} if include_hash else base_hdr
        hj = json.dumps(hdr_for_sign, separators=(",", ":"), ensure_ascii=False, sort_keys=sort)
        dj = json.dumps(data,        separators=(",", ":"), ensure_ascii=False, sort_keys=sort)
        signature = _b64_hmac_sha256(WINRED_SECRET_KEY, f"{hj}{dj}{WINRED_API_KEY}")
        return {"header": header, "data": data, "signature": signature}

    async def post_best(self, service: Any, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estrategia flexible (la que ya te traía paquetes):
        prueba with-hash / no-hash / no-hash+sorted y rutas minúscula/camelCase.
        """
        services: List[str] = [service] if isinstance(service, str) else [s for s in (service or []) if isinstance(s, str)]
        if not services:
            raise HTTPException(status_code=500, detail="Servicio Winred no especificado")

        auth = aiohttp.BasicAuth(WINRED_BASIC_USER, WINRED_BASIC_PASS)
        last_err = None

        async with aiohttp.ClientSession(auth=auth, timeout=self.timeout) as session:
            for svc in services:
                for (include_hash, sort, tag) in ((True, False, "with-hash"), (False, False, "no-hash"), (False, True, "no-hash+sorted")):
                    payload = self._payload_json_mode(data, include_hash, sort)
                    req_id = payload["header"]["request_id"]
                    url = f"{self.base_url}/{svc.strip('/')}"
                    try:
                        print(f"➡️ Winred POST {svc} mode={tag} req_id={req_id} data={data}")
                        async with session.post(
                            url,
                            data=json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
                            ssl=True,
                            skip_auto_headers={"Content-Type", "Accept"},
                        ) as r:
                            text = await r.text()
                            print(f"⬅️ Winred RESP {svc} mode={tag} status={r.status} body={text[:500]}")
                            if r.status in (404, 415):
                                last_err = f"Winred HTTP {r.status} en {svc} (probar siguiente variante/ruta)"
                                continue
                            if r.status in (200, 201):
                                try:
                                    resp = json.loads(text)
                                except json.JSONDecodeError:
                                    raise HTTPException(status_code=502, detail=f"Respuesta no JSON de Winred: {text[:200]}")
                                resp["__mode"] = tag
                                resp["__route"] = svc
                                resp["__req_id"] = req_id
                                return resp
                            last_err = f"Winred HTTP {r.status}: {text}"
                    except Exception as e:
                        last_err = f"{type(e).__name__}: {e}"

        raise HTTPException(status_code=502, detail=last_err or "Fallo desconocido en Winred")
    
    

winred = WinredClient(WINRED_BASE_URL)

# ====== REQUEST MODELS ======
class TopupRequest(BaseModel):
    product_id: int
    amount: int = 0
    subscriber: str
    sell_from: str = "S"

class BulkTopupByLoteRequest(BaseModel):
    lote_id: str
    product_id: int
    amount: int = 0
    sell_from: str = "S"

# ====== ENDPOINTS ======
@router.get("/verify")
async def verify_basic_ip():
    _must_have_creds()
    auth = aiohttp.BasicAuth(WINRED_BASIC_USER, WINRED_BASIC_PASS)
    async with aiohttp.ClientSession(auth=auth, timeout=aiohttp.ClientTimeout(total=15)) as s:
        async with s.get(f"{WINRED_BASE_URL}/verify", ssl=True, skip_auto_headers={"Accept"}) as r:
            return {"status": r.status, "text": await r.text()}

@router.get("/packages")
async def get_packages(product_parent_id: int = Query(1, ge=0, description="0=todos, 1=Claro, 2=Movistar, 3=Tigo")):
    """
    Trae paquetes probando primero el flujo JSON (como antes) y,
    si Winred devuelve 'firma...' hace fallback a text/plain (estilo PHP), 
    probando tanto querypackages como queryPackages.
    """
    data = {"product_id": str(product_parent_id)}  # Winred exige string

    def firma_invalida(resp: dict) -> bool:
        msg = (resp or {}).get("result", {}).get("message", "") or resp.get("message", "")
        return isinstance(msg, str) and "firma" in msg.lower()

    # 1) Intento original (JSON)
    try:
        raw = await winred.post_best(["querypackages", "queryPackages"], data)
        if not firma_invalida(raw):
            # OK, siguió funcionando
            resp = _filter_allowed_packages_in_resp(raw)
        else:
            raise HTTPException(status_code=502, detail="Firma inválida en modo JSON")
    except Exception as e_json:
        print("ℹ️ /packages fallback a text/plain por:", e_json)

        # 2) Fallback text/plain (igual a topup)
        #    Probamos ambas rutas porque a veces el backend cambia el casing.
        last_err = None
        for svc in ("querypackages", "queryPackages"):
            try:
                raw = await winred.post_textplain_body(svc, data)
                resp = _filter_allowed_packages_in_resp(raw)
                break
            except Exception as e_txt:
                last_err = e_txt
                continue
        else:
            # si no rompió el bucle, fallaron ambas rutas
            raise HTTPException(status_code=502, detail=f"No se pudieron obtener paquetes (text/plain): {last_err}")

    # Post-proceso y orden, igual que antes
    try:
        pkgs = resp.get("data", {}).get("packages", []) or []
        for p in pkgs:
            p["price"] = f"{float(str(p.get('price', '0')).replace(',', '.')):.2f}"
        pkgs.sort(key=lambda x: (float(x["price"]), str(x.get("validity") or "")))
        resp["data"]["count"] = len(pkgs)
        resp.setdefault("result", {}).setdefault("success", True)
    except Exception as e:
        print("⚠️ postproc paquetes:", e)

    return JSONResponse(content=resp, headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"})

@router.get("/balance")
async def get_balance(suscriber: Optional[str] = None):
    target = suscriber or WINRED_PROBE_SUBSCRIBER
    if not target:
        return {"success": True, "data": {"balance": None, "discount": None}, "message": "No probe suscriber configured"}
    # querytx (modo PHP): data solo con 'suscriber'
    return await winred.post_textplain_body("querytx", {"suscriber": str(target)})

@router.post("/topup")
async def topup(req: TopupRequest, db: AsyncSession = Depends(get_async_session)):
    data = {
        "product_id": _as_str(req.product_id),  # id del paquete
        "amount": _as_str(req.amount),          # "0" si es paquete
        "suscriber": _as_str(req.subscriber),   # solo dígitos
        "sell_from": _as_str(req.sell_from),    # "S"
    }
    resp = await winred.post_textplain_body("topup", data)

    ok  = (resp.get("result", {}) or {}).get("success") is True or resp.get("success") is True
    msg = resp.get("result", {}).get("message") or resp.get("message")
    if not ok:
        raise HTTPException(status_code=400, detail=f"Winred rechazó la transacción: {msg or 'sin detalle'}")
    
    # confirmación rápida (mismo text/plain, solo 'suscriber')
    try:
        verify = await winred.post_textplain_body("querytx", {"suscriber": _as_str(req.subscriber)})
    except Exception:
        verify = None

        # ✅ Persistir en sim_detalle
    updated = await _apply_topup_to_sim_detalle(
        db,
        msisdn=_as_str(req.subscriber),
        winred_product_id=_as_str(req.product_id),
    )

    # (opcional) confirmación
    try:
        verify = await winred.post_textplain_body("querytx", {"suscriber": _as_str(req.subscriber)})
    except Exception:
        verify = None    

    return {
        "ok": True,
        "result": resp.get("result"),
        "data": resp.get("data"),
        "mode": resp.get("__mode"),
        "request_id": resp.get("__req_id"),
        "updated_rows": updated,
        "verify": verify,
    }

@router.post("/topup_lote")
async def topup_lote(body: BulkTopupByLoteRequest, db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(select(SimDetalle).where(SimDetalle.lote_id == body.lote_id))
    sims: List[SimDetalle] = list(res.scalars().all())
    if not sims:
        raise HTTPException(status_code=404, detail="Lote sin SIMs")

    exitosas_msisdns: List[str] = []
    fallidas: List[Dict[str, Any]] = []

    for sim in sims:
        msisdn = _as_str(sim.numero_linea)  
        data = {
            "product_id": _as_str(body.product_id),
            "amount": _as_str(body.amount),
            "suscriber": msisdn,
            "sell_from": _as_str(body.sell_from),
        }
        # LOG: Imprimir el payload antes de enviar
        try:
            # Construir el header y la firma igual que en post_textplain_body
            header = winred.build_header_for_body()
            ordered_data = {
                "product_id": _as_str(body.product_id),
                "amount": _as_str(body.amount),
                "suscriber": msisdn,
                "sell_from": _as_str(body.sell_from),
            }
            hj = json.dumps(header, separators=(",", ":"), ensure_ascii=False)
            dj = json.dumps(ordered_data, separators=(",", ":"), ensure_ascii=False)
            signature = _b64_hmac_sha256(WINRED_SECRET_KEY, f"{hj}{dj}{WINRED_API_KEY}")
            print(f"\n➡️ [LOG] Enviando a Winred: msisdn={msisdn}")
            print(f"   Payload: {{'header': {header}, 'data': {ordered_data}, 'signature': {signature}}}")
            print(f"   Concatenado para firma: {hj}{dj}{WINRED_API_KEY}")
            print(f"   Signature: {signature}\n")
        except Exception as log_exc:
            print(f"⚠️ Error generando log de firma para msisdn={msisdn}: {log_exc}")
        try:
            resp = await winred.post_textplain_body("topup", data)
            ok = (resp.get("result", {}) or {}).get("success") is True or resp.get("success") is True
            if ok:
                exitosas_msisdns.append(msisdn)
                try:
                    # Persistir inmediatamente en sim_detalle
                    await _apply_topup_to_sim_detalle(
                        db,
                        msisdn=msisdn,
                        winred_product_id=_as_str(body.product_id),
                    )
                except Exception as e:
                    # no interrumpas el lote ante un error de DB puntual; registra en 'fallidas' si quieres
                    print("⚠️ Persistencia sim_detalle fallida:", e)
            else:
                fallidas.append({"msisdn": msisdn, "resp": resp})
        except Exception as e:
            fallidas.append({"msisdn": msisdn, "error": str(e)})

    # Homologación a Siigo
    q = await db.execute(
        select(PlanHomologacion.siigo_code).where(PlanHomologacion.winred_product_id == str(body.product_id))
    )
    row = q.first()
    siigo_code = row[0] if row else None

    if exitosas_msisdns and siigo_code:
        await db.execute(
            update(SimDetalle)
            .where(SimDetalle.lote_id == body.lote_id, SimDetalle.numero_linea.in_(exitosas_msisdns))
            .values(
                plan_asignado=siigo_code,
                winred_product_id=str(body.product_id),
                fecha_ultima_recarga=func.now(),
            )
        )
    if siigo_code:
        await db.execute(update(SimLote).where(SimLote.id == body.lote_id).values(plan_asignado=siigo_code))
    await db.commit()

    return {
        "success": len(fallidas) == 0,
        "processed": len(sims),
        "successful_count": len(exitosas_msisdns),
        "failed_count": len(fallidas),
        "failed": fallidas,
    }

# ====== DEBUG ======
@router.get("/debug/sign")
async def debug_sign(product_parent_id: int = 1):
    """
    Devuelve la concatenación exacta y firma que se manda en text/plain para inspección.
    """
    header = winred.build_header_for_body()
    data = {"product_id": str(product_parent_id), "amount":"0","suscriber":"3000000000","sell_from":"S"}
    hj = _compact_json(header)
    dj = _compact_json(data)
    signature = _b64_hmac_sha256(WINRED_SECRET_KEY, f"{hj}{dj}{WINRED_API_KEY}")
    return {"header": header, "data": data, "concat": f"{hj}{dj}{WINRED_API_KEY}", "signature": signature}

@router.get("/debug/topup_signature")
async def debug_topup_signature(
    product_id: int = 0,
    amount: int = 0,
    suscriber: str = "3000000000",
    sell_from: str = "S",
):
    header = winred.build_header_for_body()
    data = {
        "product_id": str(product_id),
        "amount": str(amount),
        "suscriber": str(suscriber),
        "sell_from": str(sell_from),
    }
    hj = json.dumps(header, separators=(",", ":"), ensure_ascii=False)
    dj = json.dumps(data,   separators=(",", ":"), ensure_ascii=False)
    signature = _b64_hmac_sha256(WINRED_SECRET_KEY, f"{hj}{dj}{WINRED_API_KEY}")
    return {"header": header, "data": data, "concat": f"{hj}{dj}{WINRED_API_KEY}", "signature": signature}
