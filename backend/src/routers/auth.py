from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from src.auth import get_current_user
from src.database import get_db
from src.models import Usuario
from src.schemas import LoginRequest, TokenResponse, UsuarioOut, OlvidePasswordRequest, RestablecerPasswordRequest
from src.security import crear_access_token, verify_password
from src.services import (
    llenar_usuario_out,
    aviso_pendiente,
    MENSAJE_OLVIDE,
    restablecer_password,
    solicitar_restablecimiento,
    verificar_cuenta_no_bloqueada,
    registrar_intento_fallido,
    reiniciar_bloqueo,
)

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

    # Si la cuenta está bloqueada responde 429 aquí mismo, sin verificar la contraseña.
    # Si el correo no existe no hay nada que bloquear y sigue el 401 genérico de abajo.
    if usuario is not None:
        verificar_cuenta_no_bloqueada(db, usuario)

    # Mismo mensaje exista o no el usuario, para no revelar cuál campo falló.
    # activo va al final para que un usuario desactivado también pase por bcrypt
    # y tarde lo mismo que uno activo: así el tiempo de respuesta no revela su estado.
    # Limitación conocida: si el email no existe, responde más rápido (no llega a bcrypt).
    password_correcta = usuario is not None and verify_password(credenciales.password, usuario.password_hash)
    if usuario is None or not password_correcta or not usuario.activo:
        # Solo la contraseña incorrecta cuenta como intento fallido (y solo en correos que existen)
        if usuario is not None and not password_correcta:
            registrar_intento_fallido(db, usuario)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    # Contraseña correcta y cuenta activa: el contador de intentos fallidos vuelve a 0
    # (aunque después falte aceptar el aviso, la contraseña sí fue la correcta)
    reiniciar_bloqueo(db, usuario)

    if aviso_pendiente(usuario):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "codigo": "aviso_pendiente",
                "mensaje": "Debes aceptar el aviso de privacidad. Revisa tu correo.",
            },
        )

    # Se conecta con security.py. crear_access_token lleva el id y la version del token. Filosofía de token mínimo.
    token = crear_access_token(usuario.id, usuario.token_version)
    return TokenResponse(token=token)

# response_model=UsuarioOut: se valida la salida contra la clase declarada (UsuarioOut), además de la entrada.
@router.get("/me", response_model=UsuarioOut)
# Se llama al endpoint me y se ejecuta
def me(usuario: Usuario = Depends(get_current_user)): # usuario es un parametro que llega resuelto por Depends(get_current_user), es el que valida el usuario
    return llenar_usuario_out(usuario)


@router.post("/restablecer-password", status_code=status.HTTP_200_OK)
def restablecer_password_endpoint(datos: RestablecerPasswordRequest, db: Session = Depends(get_db)):
    return restablecer_password(db, datos.token, datos.password_nueva)

@router.post("/olvide-password", status_code=status.HTTP_200_OK)
def olvide_password(datos: OlvidePasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    solicitar_restablecimiento(db, datos.email, background_tasks)
    return {"message": MENSAJE_OLVIDE}