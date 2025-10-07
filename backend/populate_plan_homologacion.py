"""
Script para poblar la tabla plan_homologacion con los planes de Claro

Ejecutar: python backend/populate_plan_homologacion.py
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models import PlanHomologacion
import os
from dotenv import load_dotenv

load_dotenv()

# Obtener URL de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/dbname")

# Datos exactos de los planes
PLANES = [
    # (winred_product_id, operador, nombre_winred, siigo_code, activo)
    ("1067", "CLARO", "RECARGA / 5 DIAS / CLARO", "R5D", True),
    ("1163", "CLARO", "RECARGA / 7 DIAS / CLARO", "R7D", True),
    ("1188", "CLARO", "RECARGA / 15 DIAS / CLARO", "R15D", True),
    ("1189", "CLARO", "RECARGA / 30 DIAS / CLARO", "R30D", True),
]


async def populate_plan_homologacion():
    # Crear engine y session
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("\n" + "="*70)
        print("POBLANDO TABLA plan_homologacion")
        print("="*70)

        for winred_id, operador, nombre, siigo_code, activo in PLANES:
            # Verificar si ya existe
            result = await session.execute(
                select(PlanHomologacion).where(
                    PlanHomologacion.winred_product_id == winred_id
                )
            )
            existing = result.scalars().first()

            if existing:
                print(f"⚠️  Ya existe: {winred_id} → {siigo_code} ({nombre})")
                # Actualizar por si cambió algo
                existing.operador = operador
                existing.nombre_winred = nombre
                existing.siigo_code = siigo_code
                existing.activo = activo
                print(f"   ✓ Actualizado")
                continue

            # Crear nuevo registro
            plan = PlanHomologacion(
                winred_product_id=winred_id,
                operador=operador,
                nombre_winred=nombre,
                siigo_code=siigo_code,
                activo=activo
            )
            session.add(plan)
            print(f"✅ Agregado: {winred_id} → {siigo_code} ({nombre})")

        await session.commit()
        print("\n" + "="*70)
        print("✅ TABLA POBLADA CORRECTAMENTE")
        print("="*70)

        # Mostrar todos los registros
        print("\n📋 Registros en plan_homologacion:")
        print("-" * 70)
        print(f"{'ID Winred':<12} {'Operador':<10} {'Siigo Code':<12} {'Nombre':<40}")
        print("-" * 70)

        result = await session.execute(select(PlanHomologacion).order_by(PlanHomologacion.winred_product_id))
        all_plans = result.scalars().all()

        for plan in all_plans:
            activo_str = "✓" if plan.activo else "✗"
            print(f"{plan.winred_product_id:<12} {plan.operador:<10} {plan.siigo_code:<12} {plan.nombre_winred:<40} {activo_str}")

        print("-" * 70)
        print(f"\nTotal registros: {len(all_plans)}")

    await engine.dispose()


if __name__ == "__main__":
    print("\n🚀 Iniciando población de tabla plan_homologacion...")
    print("   Verifica que DATABASE_URL esté configurada en .env\n")

    asyncio.run(populate_plan_homologacion())

    print("\n✅ Proceso completado.")
    print("   Ahora las recargas se guardarán correctamente en la base de datos.\n")
