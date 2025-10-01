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
        # Crear módulos (basados en el frontend)
        module_names = [
            "Dashboard",
            "Punto de venta",
            "Sims",
            "Recargas",
            "Devoluciones",
            "Usuarios",
            "Turnos",
            "Inventarios Sims"
        ]
        modules = [Module(name=name) for name in module_names]
        session.add_all(modules)
        await session.flush()

        # Crear roles con permisos específicos

        # Rol Admin - Acceso total
        admin_role = Role(name="Admin", modules=modules)
        session.add(admin_role)

        # Rol Vendedor - Módulos operativos (sin Usuarios ni Inventarios)
        vendedor_modules = [m for m in modules if m.name in [
            "Dashboard", "Punto de venta", "Sims", "Recargas", "Devoluciones", "Turnos"
        ]]
        vendedor_role = Role(name="Vendedor", modules=vendedor_modules)
        session.add(vendedor_role)

        # Rol Supervisor - Todos excepto Usuarios
        supervisor_modules = [m for m in modules if m.name != "Usuarios"]
        supervisor_role = Role(name="Supervisor", modules=supervisor_modules)
        session.add(supervisor_role)

        await session.flush()

        # Usuario admin por defecto
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrador",
            email="admin@example.com",
            role_id=admin_role.id
        )
        session.add(admin_user)

        await session.commit()

        print("✅ Base de datos inicializada correctamente")
        print(f"✅ Módulos creados: {len(modules)}")
        print(f"✅ Roles creados: Admin, Vendedor, Supervisor")
        print(f"✅ Usuario admin creado - username: admin, password: admin123")

if __name__ == "__main__":
    asyncio.run(init())