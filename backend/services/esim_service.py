"""
Servicio de lógica de negocio para gestión de eSIMs
"""

from typing import List, Optional, Dict
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
import logging

from models import ESim, ESimStatus, Sale
from uuid import UUID

logger = logging.getLogger(__name__)


class ESimService:
    """Servicio para gestión de eSIMs"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_esims(
        self,
        estado: Optional[ESimStatus] = None,
        operador: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ESim]:
        """
        Obtiene todas las eSIMs con filtros opcionales

        Args:
            estado: Filtrar por estado
            operador: Filtrar por operador
            search: Búsqueda por ICCID o número de teléfono
            skip: Paginación - saltar registros
            limit: Paginación - límite de registros

        Returns:
            Lista de eSIMs
        """
        query = select(ESim)

        # Aplicar filtros
        conditions = []
        if estado:
            conditions.append(ESim.estado == estado)
        if operador:
            conditions.append(ESim.operador == operador)
        if search:
            conditions.append(
                or_(
                    ESim.iccid.ilike(f"%{search}%"),
                    ESim.numero_telefono.ilike(f"%{search}%")
                )
            )

        if conditions:
            query = query.where(and_(*conditions))

        # Ordenar por fecha de creación descendente
        query = query.order_by(ESim.created_at.desc())

        # Paginación
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        esims = result.scalars().all()

        return list(esims)

    async def get_esim_by_id(self, esim_id: UUID) -> Optional[ESim]:
        """Obtiene una eSIM por ID"""
        query = select(ESim).where(ESim.id == esim_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_esim_by_iccid(self, iccid: str) -> Optional[ESim]:
        """Obtiene una eSIM por ICCID"""
        query = select(ESim).where(ESim.iccid == iccid)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_esim_by_numero(self, numero: str) -> Optional[ESim]:
        """Obtiene una eSIM por número de teléfono"""
        query = select(ESim).where(ESim.numero_telefono == numero)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_esim(
        self,
        iccid: str,
        numero_telefono: str,
        qr_code_data: Optional[str] = None,
        operador: Optional[str] = None,
        observaciones: Optional[str] = None
    ) -> ESim:
        """
        Crea una nueva eSIM

        Args:
            iccid: ICCID único
            numero_telefono: Número de teléfono
            qr_code_data: Datos del QR code
            operador: Nombre del operador
            observaciones: Observaciones adicionales

        Returns:
            eSIM creada
        """
        esim = ESim(
            iccid=iccid,
            numero_telefono=numero_telefono,
            qr_code_data=qr_code_data,
            operador=operador,
            estado=ESimStatus.disponible,
            observaciones=observaciones
        )

        self.db.add(esim)
        await self.db.commit()
        await self.db.refresh(esim)

        logger.info(f"eSIM creada: {iccid}")
        return esim

    async def create_esims_bulk(self, esims_data: List[Dict]) -> List[ESim]:
        """
        Crea múltiples eSIMs en una operación

        Args:
            esims_data: Lista de diccionarios con datos de eSIMs

        Returns:
            Lista de eSIMs creadas
        """
        esims = []
        for data in esims_data:
            esim = ESim(
                iccid=data['iccid'],
                numero_telefono=data['numero_telefono'],
                qr_code_data=data.get('qr_code_data'),
                operador=data.get('operador'),
                estado=ESimStatus.disponible,
                observaciones=data.get('observaciones')
            )
            esims.append(esim)
            self.db.add(esim)

        await self.db.commit()

        # Refresh all
        for esim in esims:
            await self.db.refresh(esim)

        logger.info(f"{len(esims)} eSIMs creadas en bulk")
        return esims

    async def vender_esim(
        self,
        esim_id: UUID,
        sale_id: UUID,
        plan_dias: int,
        plan_nombre: str
    ) -> ESim:
        """
        Marca una eSIM como vendida

        Args:
            esim_id: ID de la eSIM
            sale_id: ID de la venta
            plan_dias: Duración del plan en días
            plan_nombre: Nombre del plan

        Returns:
            eSIM actualizada
        """
        esim = await self.get_esim_by_id(esim_id)

        if not esim:
            raise ValueError(f"eSIM {esim_id} no encontrada")

        if esim.estado != ESimStatus.disponible:
            raise ValueError(f"eSIM {esim.iccid} no está disponible para venta (estado: {esim.estado})")

        # Actualizar estado de venta
        esim.estado = ESimStatus.vendida
        esim.sale_id = sale_id
        esim.fecha_venta = datetime.utcnow()
        esim.plan_dias = plan_dias
        esim.plan_nombre = plan_nombre
        esim.fecha_vencimiento = datetime.utcnow() + timedelta(days=plan_dias)

        await self.db.commit()
        await self.db.refresh(esim)

        logger.info(f"eSIM vendida: {esim.iccid}, vence: {esim.fecha_vencimiento}")
        return esim

    async def regenerar_qr(
        self,
        esim_id: UUID,
        nuevo_qr_data: str
    ) -> ESim:
        """
        Regenera el código QR de una eSIM y la marca como disponible

        Args:
            esim_id: ID de la eSIM
            nuevo_qr_data: Nuevos datos del QR

        Returns:
            eSIM actualizada
        """
        esim = await self.get_esim_by_id(esim_id)

        if not esim:
            raise ValueError(f"eSIM {esim_id} no encontrada")

        # Actualizar QR y estado
        esim.qr_code_data = nuevo_qr_data
        esim.estado = ESimStatus.disponible
        esim.historial_regeneraciones += 1
        esim.ultima_regeneracion = datetime.utcnow()

        # Limpiar información de venta anterior
        esim.sale_id = None
        esim.fecha_venta = None
        esim.fecha_vencimiento = None
        esim.plan_dias = None
        esim.plan_nombre = None

        await self.db.commit()
        await self.db.refresh(esim)

        logger.info(f"QR regenerado para eSIM: {esim.iccid} (regeneración #{esim.historial_regeneraciones})")
        return esim

    async def regenerar_qrs_bulk(self, regeneraciones: List[Dict]) -> List[ESim]:
        """
        Regenera múltiples QRs en una operación

        Args:
            regeneraciones: Lista de dicts con {esim_id, qr_data}

        Returns:
            Lista de eSIMs actualizadas
        """
        esims_actualizadas = []

        for reg in regeneraciones:
            esim_id = reg['esim_id']
            nuevo_qr = reg['qr_data']

            esim = await self.get_esim_by_id(esim_id)
            if esim:
                esim.qr_code_data = nuevo_qr
                esim.estado = ESimStatus.disponible
                esim.historial_regeneraciones += 1
                esim.ultima_regeneracion = datetime.utcnow()

                # Limpiar información de venta
                esim.sale_id = None
                esim.fecha_venta = None
                esim.fecha_vencimiento = None
                esim.plan_dias = None
                esim.plan_nombre = None

                esims_actualizadas.append(esim)

        await self.db.commit()

        for esim in esims_actualizadas:
            await self.db.refresh(esim)

        logger.info(f"{len(esims_actualizadas)} eSIMs regeneradas en bulk")
        return esims_actualizadas

    async def marcar_vencida(self, esim_id: UUID) -> ESim:
        """
        Marca una eSIM como vencida

        Args:
            esim_id: ID de la eSIM

        Returns:
            eSIM actualizada
        """
        esim = await self.get_esim_by_id(esim_id)

        if not esim:
            raise ValueError(f"eSIM {esim_id} no encontrada")

        esim.estado = ESimStatus.vencida

        await self.db.commit()
        await self.db.refresh(esim)

        logger.info(f"eSIM marcada como vencida: {esim.iccid}")
        return esim

    async def procesar_vencimientos_automaticos(self) -> int:
        """
        Procesa todas las eSIMs vendidas que ya vencieron
        y las marca como vencidas

        Returns:
            Número de eSIMs procesadas
        """
        now = datetime.utcnow()

        # Buscar eSIMs vendidas con fecha de vencimiento <= ahora
        query = select(ESim).where(
            and_(
                ESim.estado == ESimStatus.vendida,
                ESim.fecha_vencimiento <= now
            )
        )

        result = await self.db.execute(query)
        esims_vencidas = result.scalars().all()

        count = 0
        for esim in esims_vencidas:
            esim.estado = ESimStatus.vencida
            count += 1
            logger.info(f"eSIM auto-vencida: {esim.iccid}")

        if count > 0:
            await self.db.commit()

        logger.info(f"Procesamiento automático: {count} eSIMs marcadas como vencidas")
        return count

    async def get_esims_proximas_a_vencer(self, dias: int = 3) -> List[ESim]:
        """
        Obtiene eSIMs que vencerán en los próximos N días

        Args:
            dias: Número de días hacia adelante

        Returns:
            Lista de eSIMs próximas a vencer
        """
        now = datetime.utcnow()
        fecha_limite = now + timedelta(days=dias)

        query = select(ESim).where(
            and_(
                ESim.estado == ESimStatus.vendida,
                ESim.fecha_vencimiento.between(now, fecha_limite)
            )
        ).order_by(ESim.fecha_vencimiento.asc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_estadisticas(self) -> Dict:
        """
        Obtiene estadísticas del inventario de eSIMs

        Returns:
            Diccionario con estadísticas
        """
        # Contar por estado
        query_disponibles = select(func.count(ESim.id)).where(ESim.estado == ESimStatus.disponible)
        query_vendidas = select(func.count(ESim.id)).where(ESim.estado == ESimStatus.vendida)
        query_vencidas = select(func.count(ESim.id)).where(ESim.estado == ESimStatus.vencida)
        query_inactivas = select(func.count(ESim.id)).where(ESim.estado == ESimStatus.inactiva)
        query_total = select(func.count(ESim.id))

        disponibles = (await self.db.execute(query_disponibles)).scalar()
        vendidas = (await self.db.execute(query_vendidas)).scalar()
        vencidas = (await self.db.execute(query_vencidas)).scalar()
        inactivas = (await self.db.execute(query_inactivas)).scalar()
        total = (await self.db.execute(query_total)).scalar()

        # eSIMs próximas a vencer
        proximas_vencer = await self.get_esims_proximas_a_vencer(3)

        return {
            'total': total,
            'disponibles': disponibles,
            'vendidas': vendidas,
            'vencidas': vencidas,
            'inactivas': inactivas,
            'proximas_a_vencer': len(proximas_vencer)
        }

    async def update_esim(
        self,
        esim_id: UUID,
        **campos
    ) -> ESim:
        """
        Actualiza campos específicos de una eSIM

        Args:
            esim_id: ID de la eSIM
            **campos: Campos a actualizar

        Returns:
            eSIM actualizada
        """
        esim = await self.get_esim_by_id(esim_id)

        if not esim:
            raise ValueError(f"eSIM {esim_id} no encontrada")

        # Actualizar solo los campos proporcionados
        for campo, valor in campos.items():
            if hasattr(esim, campo):
                setattr(esim, campo, valor)

        await self.db.commit()
        await self.db.refresh(esim)

        logger.info(f"eSIM actualizada: {esim.iccid}")
        return esim

    async def delete_esim(self, esim_id: UUID) -> bool:
        """
        Elimina una eSIM (soft delete marcando como inactiva)

        Args:
            esim_id: ID de la eSIM

        Returns:
            True si se eliminó correctamente
        """
        esim = await self.get_esim_by_id(esim_id)

        if not esim:
            raise ValueError(f"eSIM {esim_id} no encontrada")

        # En lugar de eliminar, marcar como inactiva
        esim.estado = ESimStatus.inactiva

        await self.db.commit()

        logger.info(f"eSIM marcada como inactiva: {esim.iccid}")
        return True
