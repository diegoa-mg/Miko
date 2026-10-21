from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel
from src.schemas.usuarios import UsuarioOut

# Esquemas de Dashboard (admin general, gerente de sede y cajero)
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

class SucursalInfo(BaseModel):
    nombre: str
    direccion: str
    telefono: str | None = None
    estado: str

class DashboardGerenteResponse(BaseModel):
    sucursal: SucursalInfo
    ventas_total_periodo: Decimal
    periodo_inicio: date
    periodo_fin: date
    umbral_bajo_inventario: int
    alertas_inventario: list[AlertaInventario]
    cajeros: list[UsuarioOut]

class VentaResumen(BaseModel):
    id: int
    fecha: datetime
    total: Decimal
    metodo_pago: str


class DashboardCajeroResponse(BaseModel):
    ventas_total_hoy: Decimal
    numero_ventas_hoy: int
    ultimas_ventas: list[VentaResumen]
    zona_horaria: str