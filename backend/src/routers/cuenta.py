from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth import get_current_user
from src.database import get_db
from src.models import Usuario
from src.services import llenar_usuario_out
from src.schemas import CuentaUpdate, UsuarioOut

router = APIRouter(
    prefix="/cuenta",
    tags=["cuenta"]
)

@router.patch("", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def editar_cuenta(usuario_in: CuentaUpdate, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Editar nombre o email en los ajustes de cuenta."""
    
    # Agregar nuevo nombre si se requiere. Ignora None y tambien si viene vacio
    if usuario_in.nombre:
        usuario.nombre = usuario_in.nombre

    # Si hay cambios en el correo pasa a la validacion
    if usuario_in.email:
        # Consulta para obtener un usuario mediante el correo ingresado.
        # Si el correo ingresado mediante usuario_in coincide con un correo ya existente
        # significa que otro usuario ya tiene ese correo y se responde con 400
        email_nuevo = db.query(Usuario).filter(Usuario.email == usuario_in.email, Usuario.id != usuario.id).first()
        
        if email_nuevo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El email {usuario_in.email} ya está en uso"
            ) 
        usuario.email = usuario_in.email

    db.commit()
    db.refresh(usuario)

    return llenar_usuario_out(usuario)