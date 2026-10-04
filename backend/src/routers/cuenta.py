from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from src.auth import get_current_user
from src.database import get_db
from src.models import Usuario
from src.services import llenar_usuario_out, subir_foto, borrar_foto, procesar_imagen
from src.schemas import CuentaUpdateData, CuentaUpdatePassword, UsuarioOut
from src.security import verify_password, hash_password

TAMANO_MAXIMO_FOTO = 10 * 1024 * 1024  # 10 MB

router = APIRouter(
    prefix="/cuenta",
    tags=["cuenta"]
)

@router.patch("", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def editar_datos(usuario_in: CuentaUpdateData, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Editar nombre o email en los ajustes de cuenta."""
    
    # Agregar nuevo nombre si se requiere. Ignora None y tambien si viene vacio
    if usuario_in.nombre:
        usuario.nombre = usuario_in.nombre

    # Si hay cambios en el correo pasa a la validación
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

@router.put("/password")
def editar_password(password_in: CuentaUpdatePassword, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Editar la contraseña en los ajustes de cuenta."""

    # Con la función verify_password, se valida que la contraseña actual ingresada sea correcta
    # Si la contraseña actual es incorrecta lanza el error 400
    if not verify_password(password_in.password_actual, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )

    # Se valida que las contraseñas actual y nueva sean diferentes, 
    # en caso de sean igual lanza el error 400.
    # se compara con password_in.password_actual debido a que en este punto ya se verificó que sea correcta
    if password_in.password_nueva == password_in.password_actual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña ingresada es igual a la contraseña actual"
        )

    # Se guarda la contraseña ya hasheada utilizando la función hash_password
    usuario.password_hash = hash_password(password_in.password_nueva)
    db.commit()

    return {
        "message": "La contraseña fue cambiada exitosamente en la base de datos.",
        "usuario_id": usuario.id
    }

@router.put("/foto", response_model=UsuarioOut)
def editar_foto(foto: UploadFile, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Editar la foto de perfil en los ajustes de cuenta."""
    # Guardar la url de la foto vieja
    url_vieja = usuario.foto_url

    # Leer los bytes (el contenido) de la nueva foto y guardarlos en la variable img_bytes
    # Se lee un byte más que el límite para saber si lo excede, sin cargar archivos grandes en memoria
    img_bytes = foto.file.read(TAMANO_MAXIMO_FOTO + 1)

    # Verificar que la foto no pese más de 10MB
    if len(img_bytes) > TAMANO_MAXIMO_FOTO:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="La imagen subida es muy pesada"
        )

    # Orden: primero se sube y se guarda la nueva foto, al final se borra
    # De este modo, si algo falla, el usuario no se queda sin foto

    # Procesar la imagen con la función procesar_imagen() y guardarla en imagen_procesada
    imagen_procesada = procesar_imagen(img_bytes)
    # Subir la foto al bucket de supabase y guardar la URL nueva
    url = subir_foto(imagen_procesada, usuario.id)

    # Actualizar la URL en la base de datos
    usuario.foto_url = url
    db.commit()
    db.refresh(usuario)

    # Eliminar la foto anterior en el bucket de supabase
    borrar_foto(url_vieja)

    return llenar_usuario_out(usuario)