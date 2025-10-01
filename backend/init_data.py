# init_data.py
import asyncio
from database import engine, get_async_session
from models import Base, Role, Module, User
from utils.auth_utils import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Abrimos sesión
    async for session in get_async_session():
        # Crear módulos
        module_names = ["Dashboard", "Punto de Venta", "SIMs", "Productos", "Usuarios"]
        modules = [Module(name=name) for name in module_names]
        session.add_all(modules)
        await session.flush()

        # Rol Admin con todos los módulos
        admin_role = Role(name="Admin", modules=modules)
        session.add(admin_role)
        await session.flush()

        # Usuario admin
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrador",
            email="admin@example.com",
            role_id=admin_role.id
        )
        session.add(admin_user)

        await session.commit()

if __name__ == "__main__":
    asyncio.run(init())