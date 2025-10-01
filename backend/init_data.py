# init_data.py
import asyncio
from database import engine, get_async_session
from models import Base, Role, Module, User, RoleModule
from utils.auth_utils import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Abrimos sesión
    async for session in get_async_session():
        # Verificar si ya existen datos
        result = await session.execute(select(Module))
        existing_modules = result.scalars().all()

        if existing_modules:
            print("⚠️  Ya existen datos en la base de datos")
            print("⚠️  Actualizando módulos...")

            # Eliminar módulos antiguos que ya no existen
            module_names_set = {
                "Dashboard",
                "Punto de venta",
                "Sims",
                "Recargas",
                "Devoluciones",
                "Usuarios",
                "Turnos",
                "Inventarios Sims"
            }

            # Eliminar módulos que ya no están en la lista
            for mod in existing_modules:
                if mod.name not in module_names_set:
                    await session.delete(mod)
                    print(f"  ❌ Eliminado módulo obsoleto: {mod.name}")

            # Crear solo los módulos que no existen
            existing_names = {mod.name for mod in existing_modules}
            new_module_names = module_names_set - existing_names

            if new_module_names:
                new_modules = [Module(name=name) for name in new_module_names]
                session.add_all(new_modules)
                await session.flush()
                print(f"  ✅ Agregados {len(new_module_names)} módulos nuevos")

            # Obtener todos los módulos actualizados
            result = await session.execute(select(Module))
            modules = list(result.scalars().all())
        else:
            print("✅ Inicializando base de datos desde cero...")
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

        # Gestionar roles (eliminar y recrear para evitar problemas de async)
        result = await session.execute(select(Role))
        existing_roles = list(result.scalars().all())

        # Eliminar roles existentes para recrearlos con los módulos correctos
        for role in existing_roles:
            await session.delete(role)
            print(f"  🔄 Eliminando rol existente: {role.name}")

        await session.flush()

        # Configuración de roles
        roles_config = {
            "Admin": modules,  # Acceso total
            "Vendedor": [m for m in modules if m.name in [
                "Dashboard", "Punto de venta", "Sims", "Recargas", "Devoluciones", "Turnos"
            ]],  # Módulos operativos
            "Supervisor": [m for m in modules if m.name != "Usuarios"]  # Todos excepto Usuarios
        }

        # Crear roles con sus módulos
        roles_dict = {}
        for role_name, role_modules in roles_config.items():
            role = Role(name=role_name, modules=role_modules)
            session.add(role)
            roles_dict[role_name] = role
            print(f"  ✅ Creado rol: {role_name} con {len(role_modules)} módulos")

        await session.flush()

        # Crear usuario admin si no existe
        result = await session.execute(select(User).where(User.username == "admin"))
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrador",
                email="admin@example.com",
                role_id=roles_dict["Admin"].id
            )
            session.add(admin_user)
            print("  ✅ Usuario admin creado - username: admin, password: admin123")
        else:
            # Asegurar que el admin tenga el rol Admin
            admin_user.role_id = roles_dict["Admin"].id
            print("  ✅ Usuario admin ya existe, rol actualizado")

        await session.commit()

        print("\n✅ Base de datos sincronizada correctamente")
        print(f"✅ Módulos totales: {len(modules)}")
        print(f"✅ Roles: {', '.join(roles_config.keys())}")

if __name__ == "__main__":
    asyncio.run(init())