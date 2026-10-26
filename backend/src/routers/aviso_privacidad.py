from datetime import datetime, timezone
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Usuario
from src.schemas import AceptarAvisoRequest
from src.security import decodificar_token_aviso
from src.services.correo import RUTA_AVISO_PDF

router = APIRouter(prefix="/aviso-privacidad", tags=["aviso-privacidad"])


@router.post("/aceptar", status_code=status.HTTP_200_OK)
def aceptar_aviso(datos: AceptarAvisoRequest, db: Session = Depends(get_db)):
    try:
        usuario_id = decodificar_token_aviso(datos.token)
    # ExpiredSignatureError va primero: es subclase de PyJWTError
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace venció. Pide que te reenvíen el aviso de privacidad.",
        )
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido.",
        )

    usuario = db.get(Usuario, usuario_id)
    # Mismo mensaje que un token malo: no revela si el usuario existe o fue dado de baja
    if usuario is None or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido.",
        )

    # Idempotente: no se sobrescribe la fecha de la primera aceptación
    if usuario.aviso_aceptado_en is None:
        # Columna DateTime sin zona (UTC), igual que Venta.fecha
        usuario.aviso_aceptado_en = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

    return {"message": "Aviso de privacidad aceptado. Ya puedes iniciar sesión."}


@router.get("/pdf")
def descargar_aviso_pdf():
    """Descarga o visualización pública del PDF del aviso de privacidad."""
    if not RUTA_AVISO_PDF.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo del aviso de privacidad no está disponible.",
        )
    return FileResponse(
        path=RUTA_AVISO_PDF,
        media_type="application/pdf",
        filename="aviso_de_privacidad.pdf",
    )
