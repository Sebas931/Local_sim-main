"""
Job automático para procesar vencimientos de eSIMs

Este job se ejecuta periódicamente para marcar como vencidas
las eSIMs cuya fecha de vencimiento ya pasó
"""

import asyncio
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from database import SessionLocal
from services.esim_service import ESimService

logger = logging.getLogger(__name__)


async def process_esim_expirations():
    """
    Procesa todas las eSIMs vendidas que ya vencieron

    Este job debe ejecutarse periódicamente (ej: cada hora o diariamente)
    """
    logger.info("=== Iniciando job de vencimiento de eSIMs ===")
    start_time = datetime.now()

    try:
        # Crear sesión de base de datos
        async with SessionLocal() as db:
            service = ESimService(db)

            # Procesar vencimientos
            count = await service.procesar_vencimientos_automaticos()

            # Obtener eSIMs próximas a vencer para alertar
            proximas_vencer = await service.get_esims_proximas_a_vencer(dias=3)

            elapsed = (datetime.now() - start_time).total_seconds()

            logger.info(f"=== Job de vencimiento completado ===")
            logger.info(f"eSIMs procesadas como vencidas: {count}")
            logger.info(f"eSIMs próximas a vencer (3 días): {len(proximas_vencer)}")
            logger.info(f"Tiempo de ejecución: {elapsed:.2f} segundos")

            if proximas_vencer:
                logger.warning(f"ALERTA: {len(proximas_vencer)} eSIMs vencerán en los próximos 3 días")
                for esim in proximas_vencer[:5]:  # Mostrar primeras 5
                    dias_restantes = (esim.fecha_vencimiento - datetime.utcnow()).days
                    logger.warning(
                        f"  - {esim.iccid} ({esim.numero_telefono}): "
                        f"Vence en {dias_restantes} día(s) - {esim.fecha_vencimiento.strftime('%Y-%m-%d')}"
                    )

            return {
                "success": True,
                "esims_vencidas": count,
                "proximas_a_vencer": len(proximas_vencer),
                "elapsed_seconds": elapsed
            }

    except Exception as e:
        logger.error(f"Error en job de vencimiento de eSIMs: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


def run_job_sync():
    """
    Versión síncrona del job para ejecutar desde scheduler

    Esta función puede ser llamada por APScheduler u otro scheduler
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(process_esim_expirations())
        return result
    finally:
        loop.close()


if __name__ == "__main__":
    # Permite ejecutar el job manualmente para testing
    print("Ejecutando job de vencimiento de eSIMs...")
    result = run_job_sync()
    print(f"Resultado: {result}")
