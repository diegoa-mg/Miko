from datetime import datetime, timezone
import jwt
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from src.auth import get_current_user
from src.database import get_db
from src.models import Usuario
from src.services import (
    llenar_usuario_out,
    subir_foto,
    borrar_foto,
    procesar_imagen,
    enviar_confirmacion_cambio_email,
)
from src.schemas import (
    CuentaUpdateData,
    CuentaUpdatePassword,
    CuentaUpdateResponse,
    ConfirmarEmailRequest,
    UsuarioOut,
)
from src.security import (
    verify_password,
    hash_password,
    crear_access_token,
    decodificar_token_confirmar_email,
)

TAMANO_MAXIMO_FOTO = 10 * 1024 * 1024  # 10 MB

router = APIRouter(
    prefix="/cuenta",
    tags=["cuenta"]
)

@router.patch("", response_model=CuentaUpdateResponse, status_code=status.HTTP_200_OK)
def editar_datos(
    usuario_in: CuentaUpdateData,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Editar nombre o solicitar cambio de correo en los ajustes de cuenta."""
    mensaje = None
    email_pendiente = None

    # Agregar nuevo nombre si se requiere. Ignora None y tambien si viene vacio
    if usuario_in.nombre:
        usuario.nombre = usuario_in.nombre.strip()

    # Si hay cambios en el correo pasa a la validación
    if usuario_in.email:
        nuevo_correo = usuario_in.email.strip().lower()
        if nuevo_correo != usuario.email.lower():
            # Consulta para verificar si otro usuario ya tiene ese correo
            email_ocupado = (
                db.query(Usuario)
                .filter(Usuario.email == nuevo_correo, Usuario.id != usuario.id)
                .first()
            )

            if email_ocupado:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El email {nuevo_correo} ya está en uso",
                )

            # Enviar correo de confirmación con token firmado a la nueva dirección
            try:
                enviar_confirmacion_cambio_email(
                    usuario_id=usuario.id,
                    nombre=usuario.nombre,
                    nuevo_email=nuevo_correo,
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se pudo enviar el correo de confirmación. Intente más tarde.",
                ) from e

            email_pendiente = nuevo_correo
            mensaje = (
                f"Hemos enviado un enlace de confirmación a {nuevo_correo}. "
                "El cambio se aplicará una vez que confirmes el enlace."
            )

    db.commit()
    db.refresh(usuario)

    usuario_out = llenar_usuario_out(usuario)
    return CuentaUpdateResponse(
        id=usuario_out.id,
        nombre=usuario_out.nombre,
        email=usuario_out.email,
        rol=usuario_out.rol,
        sucursal_id=usuario_out.sucursal_id,
        activo=usuario_out.activo,
        foto_url=usuario_out.foto_url,
        aviso_pendiente=usuario_out.aviso_pendiente,
        correo_verificado=usuario_out.correo_verificado,
        mensaje=mensaje,
        email_pendiente=email_pendiente,
    )


@router.post("/confirmar-email", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def confirmar_cambio_email(
    datos: ConfirmarEmailRequest,
    db: Session = Depends(get_db),
):
    """
    Confirma el cambio de correo electrónico utilizando un token firmado.
    Aplica el cambio en la base de datos si el token es válido y el correo no fue tomado.
    """
    try:
        usuario_id, nuevo_email = decodificar_token_confirmar_email(datos.token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de confirmación ha expirado",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de confirmación es inválido",
        )

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario no existe o se encuentra inactivo",
        )

    # Verificar que el nuevo correo no haya sido asignado a otra cuenta en el ínterin
    email_ocupado = (
        db.query(Usuario)
        .filter(Usuario.email == nuevo_email, Usuario.id != usuario.id)
        .first()
    )
    if email_ocupado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El email {nuevo_email} ya está en uso",
        )

    usuario.email = nuevo_email
    usuario.correo_verificado_en = datetime.now(timezone.utc).replace(tzinfo=None)
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
    usuario.token_version += 1 # Cambia la versión del token: invalida todos los tokens emitidos antes del cambio, en todos los dispositivos
    db.commit()
    db.refresh(usuario)

    # Token nuevo con la versión nueva, los demás dispositivos cierran la sesión menos la sesión actual
    token_nuevo = crear_access_token(usuario.id, usuario.token_version)

    return {
        "message": "La contraseña fue cambiada exitosamente en la base de datos.",
        "usuario_id": usuario.id,
        "token": token_nuevo,
        "token_type": "bearer",
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


@router.post("/cerrar-sesiones", status_code=status.HTTP_200_OK)
def cerrar_sesiones(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    usuario.token_version += 1 # Cambia la versión del token: invalida todos los tokens emitidos antes del cambio, en todos los dispositivos
    db.commit()

    return {
        "message": "Se cerró la sesión en todos los dispositivos"
    }