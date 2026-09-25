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

# Función para llenar UsuarioOut
def llenar_usuario_out(usuario: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=usuario.rol.nombre,
        sucursal_id=usuario.sucursal_id,
        activo=usuario.activo,
    )