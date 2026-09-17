from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import get_current_user
from src.database import get_db
from src.models import Usuario
from src.schemas import LoginRequest, TokenResponse, UsuarioOut
from src.security import crear_access_token, verify_password

"""
APIRouter es un mini FastAPI, agrupa rutas relaciones para no meterlas en main.py. 
Se conecta al final con app.include_router(router) en main.py, y en ese punto sus rutas se vuelven rutas reales de la app.

tags=["auth"] no afecta el comportamiento del endpoint, es unicamente cosmetico para la documentacion automatica en /docs: agrupa visualmente /login y /me bajo una seccion llamada "auth" en el Swagger UI.
"""

router = APIRouter(tags=["auth"])

# response_model=TokenResponse: se valida la salida contra la clase declarada (TokenResponse), además de la entrada.
@router.post("/login", response_model=TokenResponse)
# Se llama al endpoint login y se ejecuta
def login(credenciales: LoginRequest, db: Session = Depends(get_db)): # db: Session = Depends(get_bd): es donde se obtiene la sesión de bd por request
    # credenciales: es el LoginRequest que manda el usuario
    # Se usa credenciales.email para buscar al usuario en la BD, y luego
    # credenciales.password se compara contra usuario.password_hash.
    usuario = db.query(Usuario).filter(Usuario.email == credenciales.email).first()

    """
    Mismo mensaje exista o no el usuario, para no revelar cuál campo
    falló.
    El orden del or no es casualidad. Python evalúa or de izquierda a derecha y se detiene en cuanto encuentra algo verdadero (short-circuit evaluation).
    Si usuario is None es True y no se evalúa la otra parte de la condición.
    """
    if usuario is None or not verify_password(credenciales.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    # Se conecta con security.py. crear_access_token lleva únicamente el id ya que el JWT solo lleva el id dentro de sub. Filosofía de token mínimo.
    token = crear_access_token(usuario.id)
    return TokenResponse(token=token)

# response_model=UsuarioOut: se valida la salida contra la clase declarada (UsuarioOut), además de la entrada.
@router.get("/me", response_model=UsuarioOut)
# Se llama al endpoint me y se ejecuta
def me(usuario: Usuario = Depends(get_current_user)): # usuario es un parametro que llega resuelto por Depends(get_current_user), es el que valida el usuario
    return UsuarioOut(
        id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol.nombre,
        sucursal_id=usuario.sucursal_id,
    )