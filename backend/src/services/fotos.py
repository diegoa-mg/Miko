import os
from PIL import Image, ImageOps, UnidentifiedImageError
from io import BytesIO
import uuid
import logging

from pillow_heif import register_heif_opener
register_heif_opener()

from supabase import create_client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key) if (supabase_url and supabase_key) else None
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "fotos-perfil-dev")

from fastapi import status, HTTPException

# Funciones para la foto de perfil
def procesar_imagen(imagen: bytes) -> bytes:
    archivo = BytesIO(imagen)
    try:
        # Abrir los bytes como imagen para verificar que sea una imagen (jpg, png, heic)
        img = Image.open(archivo)

        # Arreglarla
        img = ImageOps.exif_transpose(img) # Endereza la foto
        img = img.convert("RGB") # Cambia el modo de color a RGB
        img.thumbnail((512, 512)) # Reduce el la imagen en un cuadro 512 x 512 px

    # Si cualquier cosa del try falla con uno de estos errores, se ejecuta el error 400
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es una imagen"
        )
    
    # Crea otro archivo en memoria (vacío) para guardar ahí el resultado
    salida = BytesIO() 
    # Guarda la imagen arreglada dentro de salida, en formato JPEG, quality=85 equilibra calidad y peso.
    img.save(salida, format="JPEG", quality=85) 
    # Saca los bytes dentro de salida y los devuelve
    return salida.getvalue() 

def subir_foto(imagen: bytes, usuario_id: int) -> str:
    # Se crea la ruta que se usará en el bucket
    # uuid.uuid4: genera un identificador unico universal aleatorio, 32 caracteres hexadecimales
    ruta = f"usuarios/{usuario_id}/{uuid.uuid4()}.jpg"

    # Subir la imagen al bucket en la ruta creada. Se le dice a supabase el formato de imagen utilizado, el bucket solo acepta jpeg
    supabase.storage.from_(SUPABASE_BUCKET).upload(ruta, imagen, file_options={"content-type": "image/jpeg"})
    # Obtener la url pública de la imagen
    url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(ruta)
    return url

def borrar_foto(foto_url: str | None) -> None:
    if foto_url is None:
        return

    try:
        # .split("/") divide un texto por diagonal.Ej: "hola/mundo".split("/") → ["hola", "mundo"]
        # .split(f"/{SUPABASE_BUCKET}/") divide en dos pedazos,
        # lo que hay antes de fotos-perfil-dev y lo que hay despues (la ruta dentro del bucket)
        partes = foto_url.split(f"/{SUPABASE_BUCKET}/")
        ruta = partes[1] # Se guarda en ruta la segunda parte
        supabase.storage.from_(SUPABASE_BUCKET).remove([ruta]) # elimina la imagen en la ruta dentro del bucket
    except Exception:
        logging.warning(f"No se pudo borrar la foto anterior: {foto_url}") # Warning por si falla la eliminacion de la foto