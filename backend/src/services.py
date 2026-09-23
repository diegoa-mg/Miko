from fastapi import status, HTTPException
from sqlalchemy.orm import Session

from src.models import Rol

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