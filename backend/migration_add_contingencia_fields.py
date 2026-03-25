"""
Migration: Add contingency fields to sales table and make turno_id nullable in movimientos_caja.

Run: python migration_add_contingencia_fields.py
"""
import asyncio
from database import engine
from sqlalchemy import text


async def migrate():
    async with engine.begin() as conn:
        # 1. Add es_contingencia to sales
        await conn.execute(text("""
            ALTER TABLE sales
            ADD COLUMN IF NOT EXISTS es_contingencia BOOLEAN NOT NULL DEFAULT FALSE
        """))
        print("Added es_contingencia to sales")

        # 2. Add siigo_pendiente to sales
        await conn.execute(text("""
            ALTER TABLE sales
            ADD COLUMN IF NOT EXISTS siigo_pendiente BOOLEAN NOT NULL DEFAULT FALSE
        """))
        print("Added siigo_pendiente to sales")

        # 3. Add observaciones to sales
        await conn.execute(text("""
            ALTER TABLE sales
            ADD COLUMN IF NOT EXISTS observaciones TEXT
        """))
        print("Added observaciones to sales")

        # 4. Make turno_id nullable in movimientos_caja
        await conn.execute(text("""
            ALTER TABLE movimientos_caja
            ALTER COLUMN turno_id DROP NOT NULL
        """))
        print("Made turno_id nullable in movimientos_caja")

        # 5. Add "Contingencia" module and assign to admin role(s)
        await conn.execute(text("""
            INSERT INTO modules (name) VALUES ('Contingencia')
            ON CONFLICT (name) DO NOTHING
        """))
        # Assign to all admin roles
        await conn.execute(text("""
            INSERT INTO role_modules (role_id, module_id)
            SELECT r.id, m.id
            FROM roles r, modules m
            WHERE LOWER(r.name) IN ('admin', 'administrador')
              AND m.name = 'Contingencia'
              AND NOT EXISTS (
                SELECT 1 FROM role_modules rm WHERE rm.role_id = r.id AND rm.module_id = m.id
              )
        """))
        print("Added Contingencia module and assigned to admin roles")

    print("Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate())
