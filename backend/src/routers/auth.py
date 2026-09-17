from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import get_current_user
from src.database import get_db
from src.models import Usuario
from src.schemas import LoginRequest, TokenResponse, UsuarioOut
from src.security import crear_access_token, verify_password

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credenciales: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == credenciales.email).first()

    # Mismo mensaje exista o no el usuario, para no revelar cuál campo
    # falló (HU-01 lo pide explícitamente).
    if usuario is None or not verify_password(credenciales.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    token = crear_access_token(usuario.id)
    return TokenResponse(token=token)


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    return UsuarioOut(
        id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol.nombre,
        sucursal_id=usuario.sucursal_id,
    )