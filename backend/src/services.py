import os
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from zoneinfo import ZoneInfo

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