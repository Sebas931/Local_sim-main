"""
Migración para agregar el estado 'devuelta' al enum SimStatus en PostgreSQL.

Este script debe ejecutarse una sola vez para agregar el nuevo valor del enum.
Las SIMs devueltas con devolución de dinero se marcarán con este estado y
NO aparecerán como disponibles para venta nuevamente.

Ejecutar: python migration_add_devuelta_status.py
"""

import asyncio
from sqlalchemy import text
from database import engine

async def add_devuelta_status():
    """Agregar el valor 'devuelta' al enum simstatus si no existe."""

    async with engine.begin() as conn:
        # Verificar si el valor ya existe
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'devuelta'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'simstatus')
            );
        """))
        exists = result.scalar()

        if exists:
            print("El valor 'devuelta' ya existe en el enum simstatus.")
            return

        # Agregar el nuevo valor al enum
        try:
            await conn.execute(text("""
                ALTER TYPE simstatus ADD VALUE IF NOT EXISTS 'devuelta';
            """))
            print("Valor 'devuelta' agregado exitosamente al enum simstatus.")
        except Exception as e:
            print(f"Error al agregar el valor: {e}")
            raise

async def main():
    print("=" * 60)
    print("Migración: Agregar estado 'devuelta' al enum SimStatus")
    print("=" * 60)
    print()
    print("Este estado se usa para SIMs devueltas con devolución de dinero.")
    print("Estas SIMs NO estarán disponibles para venta nuevamente.")
    print()

    await add_devuelta_status()

    print()
    print("=" * 60)
    print("Migración completada.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
