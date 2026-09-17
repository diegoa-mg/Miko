from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt

# Importaciones locales de tu proyecto
from src.database import get_db
from src.models import Usuario
from src.security import decodificar_access_token


"""
Toma el header Authoriation que llega en cada request, y lo convierte en un objeto Usuario real de la BD, 
o rechaza el request si algo no cuadra.

auto_error=False: por defecto, si el header Authorization no viene, lanza un 403 el mismo, antes de que la función get_current_user se ejecute. En realidad este es un 401 (Unauthorized).

rol incorrecto = 403, sin sesion = 401.
"""
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credenciales: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    # error 401
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o sesión expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Si no hay header, esto hace que no falle solo y devuelve None para poder lanzar el error que queremos realmente
    if credenciales is None:
        raise credenciales_invalidas

    """
    jwt.PyJWTError: cubre un token con firma inválida (alterado o con otra clave) y un token expirado. PyJWT revisa el campo exp al decodificar y lanza la excepción si ya pasó.

    KeyError: si el payload no lleva la llave "sub".

    ValueError: si payload["sub"] existe pero no se puede convertir a entero con int(...).

    Todas devuelven el mismo mensaje: credenciales_invalidas
    """

    try:
        payload = decodificar_access_token(credenciales.credentials)
        usuario_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise credenciales_invalidas

    usuario = db.get(Usuario, usuario_id) # Consulta el id del usuario
    #         db.get(Modelo, id)
    """
    Este chequeo es importante debido a que el JWT puede ser válido (firma correcta, no expirado) y aun así apuntar a un usuario que ya no existe, por ejemplo, si un admin elimina a un gerente mientras ese gerente todavía tiene una sesión activa con un token de 8 horas. 
    Sin este chequeo, usuario sería None y la siguiente linea tendría un error 500 feo, en lugar del error 401 limpio que el front maneja.
    """
    if usuario is None:
        raise credenciales_invalidas

    return usuario