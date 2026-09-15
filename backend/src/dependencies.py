from fastapi import Depends, HTTPException, status

from src.models import Usuario

# Se asume que ya existe (o existirá) una dependencia get_current_user,
# normalmente en app/auth.py, que decodifica el JWT/token de sesión y
# devuelve el objeto Usuario autenticado, con su relación .rol cargada.
from src.auth import get_current_user


def requiere_rol(*roles_permitidos: str):
    """
    Fábrica de dependencias para proteger endpoints por rol.

    Uso en un router:
        @router.post("/productos", dependencies=[Depends(requiere_rol("admin"))])
        def crear_producto(...): ...

    O si necesitas también el usuario dentro de la función:
        def crear_producto(usuario: Usuario = Depends(requiere_rol("admin", "gerente"))):
            ...
    """

    def verificar_rol(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.rol.nombre not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción",
            )
        return usuario

    return verificar_rol
