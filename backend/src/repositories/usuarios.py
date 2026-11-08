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