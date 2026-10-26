from fastapi import status, HTTPException
from sqlalchemy.orm import Session

from src.models import Rol, Usuario
from src.schemas import UsuarioOut

# Función para obtener el rol del usuario
def obtener_rol(db: Session, nombre: str):
    rol = db.query(Rol).filter(Rol.nombre == nombre).first() # Consulta en la tabla Rol para buscar el nombre del rol que tiene el usuario
    # Si el rol es None lanza un error 500
    if rol is None:
        rol_invalido = HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falta un dato interno",
        )

        raise rol_invalido

    return rol

# El aviso de privacidad solo aplica a estos roles (el administrador queda fuera)
ROLES_CON_AVISO = {"gerente_sede", "cajero"}

def aviso_pendiente(usuario: Usuario) -> bool:
    """True si el usuario debe aceptar el aviso y todavía no lo ha hecho."""
    return usuario.rol.nombre in ROLES_CON_AVISO and usuario.aviso_aceptado_en is None

# Función para llenar UsuarioOut
def llenar_usuario_out(usuario: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol.nombre,
        sucursal_id=usuario.sucursal_id,
        activo=usuario.activo,
        foto_url=usuario.foto_url,
        aviso_pendiente=aviso_pendiente(usuario),
    )

def listar_cajeros_activos(db: Session, sucursal_id: int) -> list[Usuario]:
    """Cajeros activos de una sucursal (la sucursal de un cajero vive en usuarios.sucursal_id)."""
    rol_cajero = obtener_rol(db, "cajero")
    return (
        db.query(Usuario)
        .filter(
            Usuario.rol_id == rol_cajero.id,
            Usuario.activo == True,
            Usuario.sucursal_id == sucursal_id,
        )
        .all()
    )