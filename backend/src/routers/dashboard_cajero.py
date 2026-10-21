"""
Dashboard del cajero (pantalla de inicio): sus ventas del día, el número de
ventas y sus últimas ventas. Va en su propio archivo, aparte de los
dashboards de admin y gerente (ver dashboard.py).
"""

from datetime import timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.schemas import DashboardCajeroResponse, VentaResumen
from src.services import (
    calcular_ventas_total,
    contar_ventas,
    hoy_en_negocio,
    obtener_ultimas_ventas,
)
from src.services.fechas import ZONA_NEGOCIO

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ULTIMAS_VENTAS = 5


@router.get("/cajero", response_model=DashboardCajeroResponse)
def obtener_dashboard_cajero(
    db: Session = Depends(get_db),
    usuario_actual=Depends(requiere_rol("cajero")),
):
    """
    Resumen para el Cajero: solo sus propias ventas. "Hoy" se calcula con la
    zona horaria del negocio, no la del servidor.
    """
    hoy = hoy_en_negocio()

    ventas_total = calcular_ventas_total(db, hoy, hoy, usuario_id=usuario_actual.id)
    numero_ventas = contar_ventas(db, hoy, hoy, usuario_id=usuario_actual.id)
    ultimas = obtener_ultimas_ventas(db, usuario_actual.id, ULTIMAS_VENTAS)

    return DashboardCajeroResponse(
        ventas_total_hoy=ventas_total,
        numero_ventas_hoy=numero_ventas,
        ultimas_ventas=[
            VentaResumen(
                id=venta.id,
                # Se guarda en UTC pero la columna no trae zona: se marca como
                # UTC para que el navegador no la lea como hora local.
                fecha=venta.fecha.replace(tzinfo=timezone.utc)
                if venta.fecha.tzinfo is None
                else venta.fecha,
                total=venta.total,
                metodo_pago=venta.metodo_pago.nombre.value,
            )
            for venta in ultimas
        ],
        zona_horaria=ZONA_NEGOCIO.key,
    )