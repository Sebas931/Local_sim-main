"""
Rutas API para gestión de eSIMs
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from database import get_async_session
from models import ESim, ESimStatus
from services.esim_service import ESimService
# Usar versión con OpenCV (compatible con Windows sin zbar)
from services.qr_extractor_opencv import extract_qrs_from_uploaded_pdf

router = APIRouter()


# ============================================================
# Schemas de Request/Response
# ============================================================

class ESimCreate(BaseModel):
    iccid: str
    numero_telefono: str
    qr_code_data: Optional[str] = None
    operador: Optional[str] = None
    observaciones: Optional[str] = None


class ESimBulkCreate(BaseModel):
    esims: List[ESimCreate]


class ESimVenta(BaseModel):
    esim_id: str
    sale_id: str
    plan_dias: int
    plan_nombre: str


class ESimRegeneracion(BaseModel):
    esim_id: str
    qr_data: str


class ESimRegeneracionBulk(BaseModel):
    regeneraciones: List[ESimRegeneracion]


class ESimUpdate(BaseModel):
    operador: Optional[str] = None
    observaciones: Optional[str] = None
    estado: Optional[str] = None


class QRExtractedResponse(BaseModel):
    qr_data: str
    qr_image_base64: str
    page: int
    position: int
    is_valid: bool
    validation_message: Optional[str] = None


# ============================================================
# Utilidades
# ============================================================

def esim_to_dict(esim: ESim) -> dict:
    """Serializa una eSIM a diccionario"""
    return {
        "id": str(esim.id),
        "iccid": esim.iccid,
        "numero_telefono": esim.numero_telefono,
        "estado": esim.estado.value if hasattr(esim.estado, 'value') else esim.estado,
        "qr_code_data": esim.qr_code_data,
        "qr_code_url": esim.qr_code_url,
        "fecha_venta": esim.fecha_venta.isoformat() if esim.fecha_venta else None,
        "fecha_vencimiento": esim.fecha_vencimiento.isoformat() if esim.fecha_vencimiento else None,
        "plan_dias": esim.plan_dias,
        "plan_nombre": esim.plan_nombre,
        "sale_id": str(esim.sale_id) if esim.sale_id else None,
        "historial_regeneraciones": esim.historial_regeneraciones,
        "ultima_regeneracion": esim.ultima_regeneracion.isoformat() if esim.ultima_regeneracion else None,
        "operador": esim.operador,
        "created_at": esim.created_at.isoformat() if esim.created_at else None,
        "updated_at": esim.updated_at.isoformat() if esim.updated_at else None,
        "observaciones": esim.observaciones,
        # Campos calculados
        "dias_restantes": (esim.fecha_vencimiento - datetime.utcnow()).days if esim.fecha_vencimiento else None,
        "esta_por_vencer": (
            (esim.fecha_vencimiento - datetime.utcnow()).days <= 3
            if esim.fecha_vencimiento and esim.estado == ESimStatus.vendida
            else False
        )
    }


# ============================================================
# Endpoints
# ============================================================

@router.get("/esims")
async def get_esims(
    estado: Optional[str] = None,
    operador: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Obtiene todas las eSIMs con filtros opcionales

    - **estado**: Filtrar por estado (disponible, vendida, vencida, inactiva)
    - **operador**: Filtrar por operador
    - **search**: Buscar por ICCID o número de teléfono
    - **skip**: Paginación - registros a saltar
    - **limit**: Paginación - límite de registros
    """
    service = ESimService(db)

    # Convertir string de estado a enum si existe
    estado_enum = None
    if estado:
        try:
            estado_enum = ESimStatus(estado)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Estado inválido: {estado}")

    esims = await service.get_all_esims(
        estado=estado_enum,
        operador=operador,
        search=search,
        skip=skip,
        limit=limit
    )

    return {
        "esims": [esim_to_dict(esim) for esim in esims],
        "count": len(esims)
    }


@router.get("/esims/stats")
async def get_estadisticas(
    db: AsyncSession = Depends(get_async_session)
):
    """Obtiene estadísticas del inventario de eSIMs"""
    service = ESimService(db)
    stats = await service.get_estadisticas()
    return stats


@router.get("/esims/proximas-vencer")
async def get_proximas_vencer(
    dias: int = Query(3, description="Días hacia adelante"),
    db: AsyncSession = Depends(get_async_session)
):
    """Obtiene eSIMs que vencerán en los próximos N días"""
    service = ESimService(db)
    esims = await service.get_esims_proximas_a_vencer(dias)

    return {
        "esims": [esim_to_dict(esim) for esim in esims],
        "count": len(esims)
    }


@router.get("/esims/{esim_id}")
async def get_esim(
    esim_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Obtiene una eSIM por ID"""
    service = ESimService(db)

    try:
        esim_uuid = UUID(esim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de eSIM inválido")

    esim = await service.get_esim_by_id(esim_uuid)

    if not esim:
        raise HTTPException(status_code=404, detail="eSIM no encontrada")

    return esim_to_dict(esim)


@router.post("/esims")
async def create_esim(
    esim_data: ESimCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """Crea una nueva eSIM"""
    service = ESimService(db)

    # Verificar que no exista ya
    existe_iccid = await service.get_esim_by_iccid(esim_data.iccid)
    if existe_iccid:
        raise HTTPException(status_code=400, detail=f"Ya existe una eSIM con ICCID {esim_data.iccid}")

    existe_numero = await service.get_esim_by_numero(esim_data.numero_telefono)
    if existe_numero:
        raise HTTPException(status_code=400, detail=f"Ya existe una eSIM con número {esim_data.numero_telefono}")

    try:
        esim = await service.create_esim(
            iccid=esim_data.iccid,
            numero_telefono=esim_data.numero_telefono,
            qr_code_data=esim_data.qr_code_data,
            operador=esim_data.operador,
            observaciones=esim_data.observaciones
        )
        return {
            "message": "eSIM creada exitosamente",
            "esim": esim_to_dict(esim)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando eSIM: {str(e)}")


@router.post("/esims/bulk")
async def create_esims_bulk(
    data: ESimBulkCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """Crea múltiples eSIMs en una operación"""
    service = ESimService(db)

    esims_data = [esim.dict() for esim in data.esims]

    try:
        esims = await service.create_esims_bulk(esims_data)
        return {
            "message": f"{len(esims)} eSIMs creadas exitosamente",
            "esims": [esim_to_dict(esim) for esim in esims]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando eSIMs: {str(e)}")


@router.post("/esims/venta")
async def vender_esim(
    venta_data: ESimVenta,
    db: AsyncSession = Depends(get_async_session)
):
    """Marca una eSIM como vendida"""
    service = ESimService(db)

    try:
        esim_uuid = UUID(venta_data.esim_id)
        sale_uuid = UUID(venta_data.sale_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="IDs inválidos")

    try:
        esim = await service.vender_esim(
            esim_id=esim_uuid,
            sale_id=sale_uuid,
            plan_dias=venta_data.plan_dias,
            plan_nombre=venta_data.plan_nombre
        )
        return {
            "message": "eSIM vendida exitosamente",
            "esim": esim_to_dict(esim)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error vendiendo eSIM: {str(e)}")


@router.post("/esims/{esim_id}/regenerar")
async def regenerar_qr(
    esim_id: str,
    regeneracion: ESimRegeneracion,
    db: AsyncSession = Depends(get_async_session)
):
    """Regenera el código QR de una eSIM"""
    service = ESimService(db)

    try:
        esim_uuid = UUID(esim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de eSIM inválido")

    try:
        esim = await service.regenerar_qr(
            esim_id=esim_uuid,
            nuevo_qr_data=regeneracion.qr_data
        )
        return {
            "message": "QR regenerado exitosamente",
            "esim": esim_to_dict(esim)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error regenerando QR: {str(e)}")


@router.post("/esims/regenerar-bulk")
async def regenerar_qrs_bulk(
    data: ESimRegeneracionBulk,
    db: AsyncSession = Depends(get_async_session)
):
    """Regenera múltiples QRs en una operación"""
    service = ESimService(db)

    regeneraciones = []
    for reg in data.regeneraciones:
        try:
            esim_uuid = UUID(reg.esim_id)
            regeneraciones.append({
                'esim_id': esim_uuid,
                'qr_data': reg.qr_data
            })
        except ValueError:
            raise HTTPException(status_code=400, detail=f"ID inválido: {reg.esim_id}")

    try:
        esims = await service.regenerar_qrs_bulk(regeneraciones)
        return {
            "message": f"{len(esims)} eSIMs regeneradas exitosamente",
            "esims": [esim_to_dict(esim) for esim in esims]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error regenerando QRs: {str(e)}")


@router.post("/esims/extract-qrs")
async def extract_qrs_from_pdf(
    file: UploadFile = File(...),
):
    """
    Extrae códigos QR de un archivo PDF subido

    Retorna lista de QRs encontrados con sus imágenes
    """
    # Validar que sea PDF
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    try:
        # Leer contenido del archivo
        contents = await file.read()

        # Extraer QRs
        qr_codes = await extract_qrs_from_uploaded_pdf(contents)

        return {
            "message": f"{len(qr_codes)} códigos QR extraídos exitosamente",
            "filename": file.filename,
            "qr_codes": qr_codes,
            "count": len(qr_codes)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando PDF: {str(e)}")


@router.put("/esims/{esim_id}")
async def update_esim(
    esim_id: str,
    update_data: ESimUpdate,
    db: AsyncSession = Depends(get_async_session)
):
    """Actualiza campos de una eSIM"""
    service = ESimService(db)

    try:
        esim_uuid = UUID(esim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de eSIM inválido")

    # Preparar campos a actualizar (solo los que no son None)
    campos = {k: v for k, v in update_data.dict().items() if v is not None}

    # Convertir estado a enum si existe
    if 'estado' in campos:
        try:
            campos['estado'] = ESimStatus(campos['estado'])
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Estado inválido: {campos['estado']}")

    try:
        esim = await service.update_esim(esim_uuid, **campos)
        return {
            "message": "eSIM actualizada exitosamente",
            "esim": esim_to_dict(esim)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando eSIM: {str(e)}")


@router.delete("/esims/{esim_id}")
async def delete_esim(
    esim_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Elimina (marca como inactiva) una eSIM"""
    service = ESimService(db)

    try:
        esim_uuid = UUID(esim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de eSIM inválido")

    try:
        await service.delete_esim(esim_uuid)
        return {
            "message": "eSIM marcada como inactiva exitosamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando eSIM: {str(e)}")


@router.post("/esims/procesar-vencimientos")
async def procesar_vencimientos(
    db: AsyncSession = Depends(get_async_session)
):
    """
    Procesa automáticamente eSIMs vencidas

    Este endpoint puede ser llamado manualmente o por un job programado
    """
    service = ESimService(db)

    try:
        count = await service.procesar_vencimientos_automaticos()
        return {
            "message": f"{count} eSIMs procesadas como vencidas",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando vencimientos: {str(e)}")
