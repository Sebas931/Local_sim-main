# routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_async_session
from models import User, Role
from utils.auth_utils import get_current_user, get_password_hash
from pydantic import BaseModel, Field
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from typing import Optional

router = APIRouter()

# --- Schemas ---
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    role_id: int

class UserUpdate(BaseModel):
    full_name: str
    email: str
    role_id: int

class ResetPasswordBody(BaseModel):
    new_password: str = Field(..., min_length=6)

@router.get("/")
async def list_users(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver usuarios")

    result = await db.execute(
        select(User)
        .options(selectinload(User.role)) 
    )
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.name if u.role else None
        }
        for u in users
    ]

@router.post("/")
async def create_user(user_data: UserCreate, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para crear usuarios")

    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        email=user_data.email,
        role_id=user_data.role_id
    )
    db.add(new_user)
    await db.commit()
    return {"message": "Usuario creado exitosamente"}

@router.put("/{user_id}")
async def update_user(user_id: int, user_data: UserUpdate, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para actualizar usuarios")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.full_name = user_data.full_name
    user.email = user_data.email
    user.role_id = user_data.role_id
    await db.commit()
    return {"message": "Usuario actualizado exitosamente"}

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_user)):
    # Verificar permisos
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar usuarios")
    
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    await db.delete(user)
    await db.commit()
    return {"message": "Usuario eliminado correctamente"}


@router.post("/{user_id}/reset_password")
async def reset_user_password(
    user_id: int,
    body: ResetPasswordBody,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Permisos: requiere módulo "Usuarios"
    if "Usuarios" not in [m.name for m in current_user.role.modules]:
        raise HTTPException(status_code=403, detail="No tienes permiso para cambiar contraseñas")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.hashed_password = get_password_hash(body.new_password)
    await db.commit()
    return {"message": "Contraseña actualizada correctamente"}