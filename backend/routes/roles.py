# routes/roles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from database import get_async_session
from models import Role, User, Module, RoleModule
from utils.auth_utils import get_current_user
from pydantic import BaseModel

router = APIRouter()

# 🔹 Helper para validar permisos
def ensure_user_admin(current_user: User):
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para realizar esta acción")


# 📌 Listar todos los roles con sus módulos
@router.get("/")
async def list_roles(db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    ensure_user_admin(current_user)
    result = await db.execute(select(Role).options(selectinload(Role.modules)))
    roles = result.scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "modules": [m.name for m in r.modules]
        }
        for r in roles
    ]


# 📌 Modelo para crear rol
class RoleCreate(BaseModel):
    name: str


# 📌 Crear un nuevo rol
@router.post("/")
async def create_role(role_data: RoleCreate, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    ensure_user_admin(current_user)

    new_role = Role(name=role_data.name)
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)
    return {"message": "Rol creado exitosamente", "id": new_role.id}


# 📌 Listar todos los módulos disponibles
@router.get("/modules")
async def list_modules(db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    ensure_user_admin(current_user)

    result = await db.execute(select(Module))
    modules = result.scalars().all()
    return [{"id": m.id, "name": m.name} for m in modules]


# 📌 Modelo para asignar módulos a un rol
class RoleModulesAssign(BaseModel):
    module_ids: list[int]


# 📌 Asignar módulos a un rol
@router.post("/{role_id}/modules")
async def assign_modules_to_role(
    role_id: int,
    data: RoleModulesAssign,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Solo admin o usuarios con permiso para gestionar roles
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para asignar módulos")

    # 1️⃣ Validar que el rol existe
    role = await db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # 2️⃣ Validar que los módulos existen
    result = await db.execute(select(Module).where(Module.id.in_(data.module_ids)))
    modules_found = result.scalars().all()

    if len(modules_found) != len(data.module_ids):
        raise HTTPException(status_code=400, detail="Uno o más módulos no existen")

    # 3️⃣ Eliminar relaciones anteriores
    await db.execute(
        RoleModule.__table__.delete().where(RoleModule.role_id == role_id)
    )

    # 4️⃣ Insertar nuevos módulos
    for module_id in data.module_ids:
        db.add(RoleModule(role_id=role_id, module_id=module_id))

    await db.commit()

    return {
        "message": f"Módulos asignados correctamente al rol '{role.name}'",
        "modules": [m.name for m in modules_found]
    }

