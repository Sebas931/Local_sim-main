"""
Migración: Agregar columna numero_consecutivo a la tabla turnos

Este script agrega la columna numero_consecutivo a la tabla turnos
y actualiza los registros existentes con números consecutivos.

Ejecutar con: python migration_add_numero_consecutivo.py
"""

import asyncio
from sqlalchemy import text
from database import get_async_session, engine


async def migrate():
    print("🔄 Iniciando migración: Agregar numero_consecutivo a turnos")

    async with engine.begin() as conn:
        # 1. Verificar si la columna ya existe
        check_column = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='turnos'
            AND column_name='numero_consecutivo'
        """)
        result = await conn.execute(check_column)
        exists = result.first()

        if exists:
            print("✅ La columna numero_consecutivo ya existe en la tabla turnos")
            return

        print("📝 Agregando columna numero_consecutivo a la tabla turnos...")

        # 2. Agregar la columna (sin la constraint NOT NULL todavía)
        await conn.execute(text("""
            ALTER TABLE turnos
            ADD COLUMN numero_consecutivo INTEGER
        """))
        print("✅ Columna agregada exitosamente")

        # 3. Actualizar registros existentes con números consecutivos
        print("📝 Actualizando registros existentes con números consecutivos...")

        # Obtener todos los turnos ordenados por fecha de apertura
        get_turnos = text("""
            SELECT id
            FROM turnos
            ORDER BY fecha_apertura ASC
        """)
        turnos_result = await conn.execute(get_turnos)
        turnos = turnos_result.fetchall()

        # Asignar números consecutivos
        for idx, turno in enumerate(turnos, start=1):
            await conn.execute(
                text("UPDATE turnos SET numero_consecutivo = :consecutivo WHERE id = :id"),
                {"consecutivo": idx, "id": turno[0]}
            )

        print(f"✅ {len(turnos)} registros actualizados con números consecutivos")

        # 4. Agregar constraints
        print("📝 Agregando constraints a la columna...")
        await conn.execute(text("""
            ALTER TABLE turnos
            ALTER COLUMN numero_consecutivo SET NOT NULL
        """))

        await conn.execute(text("""
            ALTER TABLE turnos
            ADD CONSTRAINT turnos_numero_consecutivo_key UNIQUE (numero_consecutivo)
        """))

        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_turnos_numero_consecutivo
            ON turnos(numero_consecutivo)
        """))

        print("✅ Constraints agregados exitosamente")

    print("🎉 Migración completada exitosamente!")
    print("\nResumen:")
    print(f"  - Columna numero_consecutivo agregada")
    print(f"  - {len(turnos)} registros actualizados")
    print(f"  - Constraints y índices creados")


if __name__ == "__main__":
    print("=" * 60)
    print("MIGRACIÓN: Agregar numero_consecutivo a turnos")
    print("=" * 60)
    print()

    asyncio.run(migrate())

    print()
    print("=" * 60)
