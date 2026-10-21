from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Query, Session, joinedload

from src.models import Venta
from src.services.fechas import rango_del_dia_en_utc


def _ventas_en_rango(
    query: Query,
    fecha_inicio: date,
    fecha_fin: date,
    sucursal_id: Optional[int],
    usuario_id: Optional[int],
) -> Query:
    """Aplica el rango de días del negocio (en UTC) y los filtros opcionales."""
    inicio_utc, _ = rango_del_dia_en_utc(fecha_inicio)
    _, fin_utc = rango_del_dia_en_utc(fecha_fin)

    query = query.filter(Venta.fecha >= inicio_utc, Venta.fecha <= fin_utc)
    if sucursal_id is not None:
        query = query.filter(Venta.sucursal_id == sucursal_id)
    if usuario_id is not None:
        query = query.filter(Venta.usuario_id == usuario_id)
    return query


def calcular_ventas_total(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sucursal_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
) -> Decimal:
    """
    Suma Venta.total en el rango [fecha_inicio, fecha_fin] (días del negocio).
    Sin filtros suma todas las sucursales (admin); con sucursal_id solo esa
    sucursal (gerente); con usuario_id solo las ventas de ese usuario (cajero).
    """
    query = _ventas_en_rango(
        db.query(func.coalesce(func.sum(Venta.total), 0)),
        fecha_inicio, fecha_fin, sucursal_id, usuario_id,
    )
    resultado = query.scalar()
    return Decimal(str(resultado)) if resultado is not None else Decimal("0")


def contar_ventas(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sucursal_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
) -> int:
    """Número de ventas en el rango, con los mismos filtros que calcular_ventas_total."""
    query = _ventas_en_rango(
        db.query(func.count(Venta.id)),
        fecha_inicio, fecha_fin, sucursal_id, usuario_id,
    )
    return query.scalar() or 0


def obtener_ultimas_ventas(db: Session, usuario_id: int, limite: int = 5) -> list[Venta]:
    """Las últimas ventas registradas por un usuario (de cualquier día)."""
    return (
        db.query(Venta)
        .options(joinedload(Venta.metodo_pago))
        .filter(Venta.usuario_id == usuario_id)
        .order_by(Venta.fecha.desc(), Venta.id.desc())
        .limit(limite)
        .all()
    )