from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.models import Venta
from src.services.fechas import rango_del_dia_en_utc

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
