from datetime import date
from decimal import Decimal

from pydantic import BaseModel
from src.schemas.usuarios import UsuarioOut

# Esquemas de Dashboard (admin general y gerente de sede)
# ventas_total_periodo usa Decimal, no float, por precisión en centavos
# (ver convención del equipo: dinero siempre con Decimal/NUMERIC, nunca FLOAT).
class AlertaInventario(BaseModel):
    producto_id: int
    producto_nombre: str
    sucursal_id: int
    sucursal_nombre: str
    existencia: int

class DashboardAdminResponse(BaseModel):
    sucursales_activas: int
    ventas_total_periodo: Decimal
    periodo_inicio: date
    periodo_fin: date
    umbral_bajo_inventario: int
    alertas_inventario: list[AlertaInventario]

class DashboardGerenteResponse(BaseModel):
    ventas_total_periodo: Decimal
    periodo_inicio: date
    periodo_fin: date
    umbral_bajo_inventario: int
    alertas_inventario: list[AlertaInventario]
    cajeros: list[UsuarioOut]