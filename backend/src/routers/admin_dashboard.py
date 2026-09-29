"""
HU-10: Dashboard de Administrador General
Endpoint que resume: sucursales activas, ventas del período y alertas de bajo inventario.

MODELOS REALES USADOS (confirmados en src/models.py):
- Sucursal: id, nombre, direccion, telefono, estado (String, "activa"/otro), gerente_id
- Venta: id, sucursal_id, usuario_id, metodo_pago_id, fecha, total
- Producto: id, nombre, precio, categoria_id
- Inventario: id, sucursal_id, producto_id, existencia (Integer)
  -> el stock vive aquí, no en Producto. NO hay campo de stock mínimo en ningún modelo,
     así que "bajo inventario" se define con un umbral configurable (default 5).
"""

from datetime import date, datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Sucursal, Venta, Producto, Inventario

router = APIRouter(prefix="/admin", tags=["Admin - Dashboard"])


# ---------- Schemas ----------

class AlertaInventario(BaseModel):
    producto_id: int
    producto_nombre: str
    sucursal_id: int
    sucursal_nombre: str
    existencia: int

    class Config:
        from_attributes = True


class DashboardAdminResponse(BaseModel):
    sucursales_activas: int
    ventas_total_periodo: float
    periodo_inicio: date
    periodo_fin: date
    umbral_bajo_inventario: int
    alertas_inventario: List[AlertaInventario]


# ---------- Endpoint ----------

@router.get("/dashboard", response_model=DashboardAdminResponse)
def obtener_dashboard_admin(
    fecha_inicio: Optional[date] = Query(
        None, description="Inicio del período (default: hoy)"
    ),
    fecha_fin: Optional[date] = Query(
        None, description="Fin del período (default: hoy)"
    ),
    umbral_bajo_inventario: int = Query(
        5, ge=0, description="Existencia igual o menor a este número genera alerta"
    ),
    db: Session = Depends(get_db),
    usuario_actual=Depends(requiere_rol("admin_general")),
):
    """
    Resumen general del sistema para el Administrador General (HU-10):
    - Número de sucursales activas
    - Total de ventas del período (todas las sucursales)
    - Alertas de productos con bajo inventario (existencia <= umbral)
    """
    hoy = date.today()
    inicio = fecha_inicio or hoy
    fin = fecha_fin or hoy

    inicio_dt = datetime.combine(inicio, time.min)
    fin_dt = datetime.combine(fin, time.max)

    # 1) Sucursales activas
    sucursales_activas = (
        db.query(func.count(Sucursal.id))
        .filter(Sucursal.estado == "activa")
        .scalar()
        or 0
    )

    # 2) Total de ventas del período (todas las sucursales)
    ventas_total = (
        db.query(func.coalesce(func.sum(Venta.total), 0))
        .filter(Venta.fecha >= inicio_dt, Venta.fecha <= fin_dt)
        .scalar()
        or 0
    )

    # 3) Alertas de bajo inventario: join Inventario -> Producto y Sucursal
    filas_bajo_stock = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto_nombre"),
            Sucursal.id.label("sucursal_id"),
            Sucursal.nombre.label("sucursal_nombre"),
            Inventario.existencia.label("existencia"),
        )
        .join(Producto, Producto.id == Inventario.producto_id)
        .join(Sucursal, Sucursal.id == Inventario.sucursal_id)
        .filter(Inventario.existencia <= umbral_bajo_inventario)
        .all()
    )

    alertas = [
        AlertaInventario(
            producto_id=fila.producto_id,
            producto_nombre=fila.producto_nombre,
            sucursal_id=fila.sucursal_id,
            sucursal_nombre=fila.sucursal_nombre,
            existencia=fila.existencia,
        )
        for fila in filas_bajo_stock
    ]

    return DashboardAdminResponse(
        sucursales_activas=sucursales_activas,
        ventas_total_periodo=float(ventas_total),
        periodo_inicio=inicio,
        periodo_fin=fin,
        umbral_bajo_inventario=umbral_bajo_inventario,
        alertas_inventario=alertas,
    )