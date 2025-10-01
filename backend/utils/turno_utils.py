from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Turno
from typing import Optional


async def get_turno_activo(db: AsyncSession, user_id: int) -> Optional[Turno]:
    """Obtener el turno activo del usuario"""
    try:
        query = select(Turno).where(
            Turno.user_id == user_id,
            Turno.estado == "abierto"
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
    except Exception:
        return None