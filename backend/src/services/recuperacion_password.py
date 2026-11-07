import jwt
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from src.repositories import obtener_usuario_por_email, obtener_usuario_por_id, actualizar_password
from src.security import hash_password, decodificar_token_restablecer
from src.services.usuarios import aviso_pendiente
from src.services.correo import enviar_restablecimiento

MENSAJE_OLVIDE = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."


def _enlace_invalido() -> HTTPException:
    """Mismo error para cualquier token malo, así no se revela por qué falló."""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El enlace no es válido.",
    )


def restablecer_password(db: Session, token: str, password_nueva: str) -> dict:
    # 1. Token: firma, vencimiento, tipo y que traiga uid y ver
    try:
        usuario_id, version = decodificar_token_restablecer(token)
    # ExpiredSignatureError va primero: es subclase de PyJWTError
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace venció. Solicita uno nuevo.",
        )
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _enlace_invalido()

    # 2. Usuario: existe, está activo, ya aceptó el aviso y la versión coincide
    usuario = obtener_usuario_por_id(db, usuario_id)
    # El orden importa: "usuario is None" va primero. Si fuera None, evaluar
    # usuario.activo daría error; con "or", Python se detiene en el primer True.
    if (
        usuario is None
        or not usuario.activo
        or aviso_pendiente(usuario)
        or version != usuario.token_version
    ):
        raise _enlace_invalido()

    # 3. Guardar: hash nuevo y token_version += 1 (lo hace el repository)
    actualizar_password(db, usuario, hash_password(password_nueva))

    return {"message": "Tu contraseña fue restablecida. Ya puedes iniciar sesión."}


def solicitar_restablecimiento(db: Session, email: str, background_tasks: BackgroundTasks) -> None:
    usuario = obtener_usuario_por_email(db, email)

    # No existe, está desactivado o aún no acepta el aviso de privacidad: no se envía nada.
    # No se lanza error ni se devuelve nada distinto: el router responde siempre lo mismo.
    if usuario is None or not usuario.activo or aviso_pendiente(usuario):
        return

    # Se pasan datos simples (no el objeto Usuario): cuando la tarea corre, la sesión de BD ya se cerró.
    # background_tasks hace que el envío ocurra DESPUÉS de responder, así el tiempo de respuesta
    # no delata si el correo existe (el SMTP es lo lento).
    background_tasks.add_task(
        enviar_restablecimiento,
        usuario.id,
        usuario.nombre,
        usuario.email,
        usuario.token_version,
    )