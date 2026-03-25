"""
Migración: Cambiar tipo de columna numero_consecutivo de INTEGER a VARCHAR

Este script cambia el tipo de datos de la columna numero_consecutivo
de INTEGER a VARCHAR(50) para soportar números de factura alfanuméricos de Siigo.

Ejecutar con: python migration_change_consecutivo_to_varchar.py
"""

import asyncio
from sqlalchemy import text
from database import get_async_session, engine


async def migrate():
    print("🔄 Iniciando migración: Cambiar numero_consecutivo de INTEGER a VARCHAR")

    async with engine.begin() as conn:
        # 1. Verificar el tipo actual de la columna
        check_type = text("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name='sales'
            AND column_name='numero_consecutivo'
        """)
        result = await conn.execute(check_type)
        current_type = result.scalar()

        if current_type and 'varchar' in current_type.lower():
            print(f"✅ La columna numero_consecutivo ya es de tipo {current_type}")
            return

        print(f"📝 Tipo actual de numero_consecutivo: {current_type}")
        print("📝 Cambiando tipo de columna a VARCHAR(50)...")

        # 2. Eliminar la constraint UNIQUE primero
        try:
            await conn.execute(text("""
                ALTER TABLE sales
                DROP CONSTRAINT IF EXISTS sales_numero_consecutivo_key
            """))
            print("✅ Constraint UNIQUE eliminada")
        except Exception as e:
            print(f"⚠️ No se pudo eliminar la constraint: {e}")

        # 3. Eliminar el índice regular existente
        try:
            await conn.execute(text("""
                DROP INDEX IF EXISTS idx_sales_numero_consecutivo
            """))
            print("✅ Índice regular eliminado")
        except Exception as e:
            print(f"⚠️ No se pudo eliminar el índice regular: {e}")

        # 4. Cambiar el tipo de columna
        await conn.execute(text("""
            ALTER TABLE sales
            ALTER COLUMN numero_consecutivo TYPE VARCHAR(50)
        """))
        print("✅ Tipo de columna cambiado a VARCHAR(50)")

        # 5. Recrear las constraints
        await conn.execute(text("""
            ALTER TABLE sales
            ADD CONSTRAINT sales_numero_consecutivo_key UNIQUE (numero_consecutivo)
        """))
        print("✅ Constraint UNIQUE recreada")

        await conn.execute(text("""
            CREATE INDEX idx_sales_numero_consecutivo
            ON sales(numero_consecutivo)
        """))
        print("✅ Índice recreado")

        # 6. Verificar los datos
        count_result = await conn.execute(text("""
            SELECT COUNT(*) FROM sales WHERE numero_consecutivo IS NOT NULL
        """))
        total = count_result.scalar()
        print(f"✅ {total} registros verificados")

    print("🎉 Migración completada exitosamente!")
    print("\nResumen:")
    print("  - Columna numero_consecutivo cambiada de INTEGER a VARCHAR(50)")
    print("  - Ahora soporta números alfanuméricos (ej: 'SIIGO-12345', '45201', etc.)")
    print("  - Constraints y índices recreados")


if __name__ == "__main__":
    print("=" * 70)
    print("MIGRACIÓN: Cambiar numero_consecutivo de INTEGER a VARCHAR(50)")
    print("=" * 70)
    print()

    asyncio.run(migrate())

    print()
    print("=" * 70)
