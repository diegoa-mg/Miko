from datetime import datetime

from sqlalchemy.orm import Session
from src.models import Usuario

def obtener_usuario_por_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()

def obtener_usuario_por_id(db: Session, usuario_id: int) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()

def actualizar_password(db: Session, usuario: Usuario, password_hash: str) -> Usuario | None:
    """
    Guarda la contraseña nueva y sube token_version en un solo commit:
    invalida los tokens de sesión y también el enlace de restablecimiento usado.
    """
    usuario.password_hash = password_hash
    usuario.token_version += 1
    db.commit()
    return usuario

def incrementar_intentos_fallidos(db: Session, usuario: Usuario) -> int:
    """
    Suma 1 al contador y devuelve el valor nuevo. El +1 lo hace la base en un solo UPDATE
    (intentos_fallidos = intentos_fallidos + 1), no Python: así, si dos logins fallidos
    llegan al mismo tiempo, no se pisan y ninguno se pierde.
    """
    db.query(Usuario).filter(Usuario.id == usuario.id).update(
        {Usuario.intentos_fallidos: Usuario.intentos_fallidos + 1},
        synchronize_session=False,
    )
    db.commit()
    db.refresh(usuario)
    return usuario.intentos_fallidos

def guardar_bloqueo(db: Session, usuario: Usuario, intentos_fallidos: int, bloqueado_hasta: datetime | None) -> Usuario:
    """Guarda el estado del bloqueo de login (contador y fecha) en un solo commit."""
    usuario.intentos_fallidos = intentos_fallidos
    usuario.bloqueado_hasta = bloqueado_hasta
    db.commit()
    return usuario
