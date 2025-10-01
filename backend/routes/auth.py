# routes/auth.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import User, Role
from database import get_async_session
from utils.auth_utils import create_access_token, get_password_hash, verify_password, get_current_user

router = APIRouter()

@router.post("/register")
async def register_user(username: str, password: str, full_name: str, email: str, role_id: int,
                        db: AsyncSession = Depends(get_async_session),
                        current_user: User = Depends(get_current_user)):
    # Solo admin puede registrar usuarios
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    hashed_password = get_password_hash(password)
    new_user = User(username=username, hashed_password=hashed_password,
                    full_name=full_name, email=email, role_id=role_id)
    db.add(new_user)
    await db.commit()
    return {"message": "Usuario creado exitosamente"}

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")

    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role.name,
        "modules": [m.name for m in current_user.role.modules]
    }

