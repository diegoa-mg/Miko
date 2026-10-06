import os
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from zoneinfo import ZoneInfo
from PIL import Image, ImageOps, UnidentifiedImageError
from io import BytesIO
import uuid
import logging

from pillow_heif import register_heif_opener
register_heif_opener()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key) if (supabase_url and supabase_key) else None
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "fotos-perfil-dev")

from fastapi import status, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.models import Inventario, Producto, Rol, Sucursal, Usuario, Venta
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
        foto_url=usuario.foto_url,
    )

ZONA_NEGOCIO = ZoneInfo(os.getenv("BUSINESS_TIMEZONE", "America/Mexico_City"))

def hoy_en_negocio() -> date:
    """
    Fecha actual según la zona horaria del negocio, no la del servidor (UTC).
    Usar esto en vez de date.today() para cualquier default de "hoy" que
    vea el usuario (dashboards, reportes, etc.) — si no, después de las
    6pm hora de México el servidor ya cree que es el día siguiente.
    """
    return datetime.now(ZONA_NEGOCIO).date()

def rango_del_dia_en_utc(dia: date) -> tuple[datetime, datetime]:
    """
    Convierte el inicio (00:00:00) y fin (23:59:59.999999) de `dia`,
    interpretado en la zona horaria del negocio, a datetimes en UTC.
    Las ventas se guardan en UTC, así que el filtro debe hacerse en UTC
    pero calculado a partir del día "local" del negocio.
    """
    inicio_local = datetime.combine(dia, datetime.min.time(), tzinfo=ZONA_NEGOCIO)
    fin_local = datetime.combine(dia, datetime.max.time(), tzinfo=ZONA_NEGOCIO)
    return inicio_local.astimezone(timezone.utc), fin_local.astimezone(timezone.utc)


def calcular_ventas_total(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sucursal_id: Optional[int] = None,
) -> Decimal:
    """
    Suma Venta.total en el rango [fecha_inicio, fecha_fin] (días del negocio).
    Si sucursal_id es None, suma todas las sucursales (vista del admin);
    si se da, solo esa sucursal (vista del gerente).
    """
    inicio_utc, _ = rango_del_dia_en_utc(fecha_inicio)
    _, fin_utc = rango_del_dia_en_utc(fecha_fin)

    query = db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
        Venta.fecha >= inicio_utc, Venta.fecha <= fin_utc
    )
    if sucursal_id is not None:
        query = query.filter(Venta.sucursal_id == sucursal_id)

    resultado = query.scalar()
    return Decimal(str(resultado)) if resultado is not None else Decimal("0")


def calcular_alertas_inventario(
    db: Session,
    umbral: int,
    sucursal_id: Optional[int] = None,
):
    """
    Devuelve filas (producto_id, producto_nombre, sucursal_id, sucursal_nombre,
    existencia) para productos con existencia <= umbral, solo en sucursales
    activas. Si sucursal_id es None, revisa todas las sucursales activas
    (admin); si se da, solo esa sucursal (gerente).
    """
    query = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto_nombre"),
            Sucursal.id.label("sucursal_id"),
            Sucursal.nombre.label("sucursal_nombre"),
            Inventario.existencia.label("existencia"),
        )
        .join(Producto, Producto.id == Inventario.producto_id)
        .join(Sucursal, Sucursal.id == Inventario.sucursal_id)
        .filter(Inventario.existencia <= umbral, Sucursal.estado == "activa")
    )
    if sucursal_id is not None:
        query = query.filter(Sucursal.id == sucursal_id)

    return query.all()

def obtener_sucursal_del_gerente(db: Session, usuario_id: int) -> Sucursal:
    """
    La sucursal de un gerente se determina por sucursales.gerente_id, NO por
    usuarios.sucursal_id (ese campo siempre es null para gerentes). Si el gerente no tiene sucursal asignada, se
    responde un error claro en vez de devolver datos de toda la empresa.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.gerente_id == usuario_id).first()
    if sucursal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este gerente no tiene una sucursal asignada",
        )
    return sucursal

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