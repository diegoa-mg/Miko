"""
Placeholder temporal. Si algún compañero ya está implementando el login/JWT,
reemplacen este archivo por el suyo — lo único que importa es que exponga
una función get_current_user(...) usable como Depends() y que devuelva un
objeto Usuario con su relación .rol ya disponible.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Usuario


def get_current_user(db: Session = Depends(get_db)) -> Usuario:
    # TODO: reemplazar por la lógica real de decodificación de token (JWT).
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="get_current_user aún no está implementado (pendiente de login/JWT)",
    )
