"""
Migración: Agregar columna numero_consecutivo a la tabla sales

Este script agrega la columna numero_consecutivo a la tabla sales
y actualiza los registros existentes con números consecutivos basados
en la fecha de creación.

Ejecutar con: python migration_add_numero_consecutivo_sales.py
"""

import asyncio
from sqlalchemy import text
from database import get_async_session, engine


async def migrate():
    print("🔄 Iniciando migración: Agregar numero_consecutivo a sales")

    async with engine.begin() as conn:
        # 1. Verificar si la columna ya existe
        check_column = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='sales'
            AND column_name='numero_consecutivo'
        """)
        result = await conn.execute(check_column)
        exists = result.first()

        if exists:
            print("✅ La columna numero_consecutivo ya existe en la tabla sales")
            return

        print("📝 Agregando columna numero_consecutivo a la tabla sales...")

        # 2. Agregar la columna (sin la constraint NOT NULL todavía)
        await conn.execute(text("""
            ALTER TABLE sales
            ADD COLUMN numero_consecutivo INTEGER
        """))
        print("✅ Columna agregada exitosamente")

        # 3. Actualizar registros existentes con números consecutivos
        print("📝 Actualizando registros existentes con números consecutivos...")

        # Obtener todas las ventas ordenadas por fecha de creación
        get_sales = text("""
            SELECT id
            FROM sales
            ORDER BY created_at ASC
        """)
        sales_result = await conn.execute(get_sales)
        sales = sales_result.fetchall()

        # Asignar números consecutivos
        for idx, sale in enumerate(sales, start=1):
            await conn.execute(
                text("UPDATE sales SET numero_consecutivo = :consecutivo WHERE id = :id"),
                {"consecutivo": idx, "id": sale[0]}
            )

        print(f"✅ {len(sales)} registros actualizados con números consecutivos")

        # 4. Agregar constraints
        print("📝 Agregando constraints a la columna...")
        await conn.execute(text("""
            ALTER TABLE sales
            ALTER COLUMN numero_consecutivo SET NOT NULL
        """))

        await conn.execute(text("""
            ALTER TABLE sales
            ADD CONSTRAINT sales_numero_consecutivo_key UNIQUE (numero_consecutivo)
        """))

        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sales_numero_consecutivo
            ON sales(numero_consecutivo)
        """))

        print("✅ Constraints agregados exitosamente")

    print("🎉 Migración completada exitosamente!")
    print("\nResumen:")
    print(f"  - Columna numero_consecutivo agregada")
    print(f"  - {len(sales)} registros actualizados")
    print(f"  - Constraints y índices creados")


if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN: Agregar numero_consecutivo a sales")
    print("=" * 60)
    print()

    asyncio.run(migrate())

    print()
    print("=" * 60)
