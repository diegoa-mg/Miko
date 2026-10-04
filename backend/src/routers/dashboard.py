from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Sucursal
from src.schemas import AlertaInventario, DashboardAdminResponse, DashboardGerenteResponse
from src.services import (
    calcular_alertas_inventario,
    calcular_ventas_total,
    hoy_en_negocio,
    obtener_sucursal_del_gerente,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _resolver_periodo(fecha_inicio: date | None, fecha_fin: date | None) -> tuple[date, date]:
    """Aplica los defaults (hoy, según la zona del negocio) y valida el rango."""
    hoy = hoy_en_negocio()
    inicio = fecha_inicio or hoy
    fin = fecha_fin or hoy
    if inicio > fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_inicio no puede ser posterior a fecha_fin",
        )
    return inicio, fin


def _construir_alertas(filas) -> list[AlertaInventario]:
    return [
        AlertaInventario(
            producto_id=fila.producto_id,
            producto_nombre=fila.producto_nombre,
            sucursal_id=fila.sucursal_id,
            sucursal_nombre=fila.sucursal_nombre,
            existencia=fila.existencia,
        )
        for fila in filas
    ]


@router.get(
    "/admin",
    response_model=DashboardAdminResponse,
    dependencies=[Depends(requiere_rol("admin_general"))],
)
def obtener_dashboard_admin(
    fecha_inicio: date | None = Query(None, description="Inicio del período (default: hoy)"),
    fecha_fin: date | None = Query(None, description="Fin del período (default: hoy)"),
    umbral_bajo_inventario: int = Query(
        5, ge=0, description="Existencia igual o menor a este número genera alerta"
    ),
    db: Session = Depends(get_db),
):
    """
    Resumen para el Administrador General: todas las sucursales.
    """
    inicio, fin = _resolver_periodo(fecha_inicio, fecha_fin)

    sucursales_activas = (
        db.query(func.count(Sucursal.id)).filter(Sucursal.estado == "activa").scalar() or 0
    )
    ventas_total = calcular_ventas_total(db, inicio, fin)
    filas_bajo_stock = calcular_alertas_inventario(db, umbral_bajo_inventario)

    return DashboardAdminResponse(
        sucursales_activas=sucursales_activas,
        ventas_total_periodo=ventas_total,
        periodo_inicio=inicio,
        periodo_fin=fin,
        umbral_bajo_inventario=umbral_bajo_inventario,
        alertas_inventario=_construir_alertas(filas_bajo_stock),
    )


@router.get("/gerente", response_model=DashboardGerenteResponse)
def obtener_dashboard_gerente(
    fecha_inicio: date | None = Query(None, description="Inicio del período (default: hoy)"),
    fecha_fin: date | None = Query(None, description="Fin del período (default: hoy)"),
    umbral_bajo_inventario: int = Query(
        5, ge=0, description="Existencia igual o menor a este número genera alerta"
    ),
    db: Session = Depends(get_db),
    usuario_actual=Depends(requiere_rol("gerente_sede")),
):
    """
    Resumen para el Gerente de sede: solo su propia sucursal.
    La sucursal se resuelve por Sucursal.gerente_id, no por
    usuario_actual.sucursal_id (ese campo es null para gerentes).
    """
    sucursal = obtener_sucursal_del_gerente(db, usuario_actual.id)
    inicio, fin = _resolver_periodo(fecha_inicio, fecha_fin)

    ventas_total = calcular_ventas_total(db, inicio, fin, sucursal_id=sucursal.id)
    filas_bajo_stock = calcular_alertas_inventario(
        db, umbral_bajo_inventario, sucursal_id=sucursal.id
    )

    return DashboardGerenteResponse(
        ventas_total_periodo=ventas_total,
        periodo_inicio=inicio,
        periodo_fin=fin,
        umbral_bajo_inventario=umbral_bajo_inventario,
        alertas_inventario=_construir_alertas(filas_bajo_stock),
    )