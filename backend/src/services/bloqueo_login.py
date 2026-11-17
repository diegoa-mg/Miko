import math
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.models import Usuario
from src.repositories import incrementar_intentos_fallidos, guardar_bloqueo

# Valores del límite de intentos. Se cambian aquí y en ningún otro lugar.
MAX_INTENTOS_FALLIDOS = 5
MINUTOS_BLOQUEO = 15


def _ahora() -> datetime:
    """Hora actual en UTC y sin zona horaria, igual que el resto de columnas DateTime (aviso_aceptado_en, etc.)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def verificar_cuenta_no_bloqueada(db: Session, usuario: Usuario) -> None:
    """
    Se llama ANTES de revisar la contraseña. Si la cuenta sigue bloqueada responde 429
    sin tocar bcrypt (un atacante no puede seguir probando contraseñas). Si el bloqueo
    ya venció, reinicia el contador para empezar de cero.
    """
    if usuario.bloqueado_hasta is None:
        return

    ahora = _ahora()
    if usuario.bloqueado_hasta > ahora:
        segundos = math.ceil((usuario.bloqueado_hasta - ahora).total_seconds())
        minutos = math.ceil(segundos / 60)
        # Mismo formato de detail (codigo + mensaje) que "aviso_pendiente" en el login.
        # Retry-After es el encabezado estándar que indica cuántos segundos esperar.
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "codigo": "cuenta_bloqueada",
                "mensaje": (
                    "Demasiados intentos fallidos. Tu cuenta está bloqueada temporalmente. "
                    f"Intenta de nuevo en {minutos} minuto{'s' if minutos != 1 else ''}."
                ),
            },
            headers={"Retry-After": str(segundos)},
        )

    # El bloqueo ya venció: contador y fecha vuelven a su estado inicial
    guardar_bloqueo(db, usuario, 0, None)


def registrar_intento_fallido(db: Session, usuario: Usuario) -> None:
    """Cuenta una contraseña incorrecta. Al llegar al límite, bloquea la cuenta MINUTOS_BLOQUEO minutos."""
    intentos = incrementar_intentos_fallidos(db, usuario)
    if intentos >= MAX_INTENTOS_FALLIDOS:
        guardar_bloqueo(db, usuario, intentos, _ahora() + timedelta(minutes=MINUTOS_BLOQUEO))


def reiniciar_bloqueo(db: Session, usuario: Usuario) -> None:
    """Login exitoso: contador a 0 y sin bloqueo. Solo escribe en la base si hay algo que limpiar."""
    if usuario.intentos_fallidos or usuario.bloqueado_hasta is not None:
        guardar_bloqueo(db, usuario, 0, None)


def limpiar_bloqueo(usuario: Usuario) -> None:
    """
    Igual que reiniciar_bloqueo pero SIN commit: solo cambia el objeto. Es para quien ya va a hacer
    su propio commit (restablecer contraseña) y así todo se guarda junto, en una sola transacción.
    """
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
