from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field
"""
EmailStr valida el formato del correo electrónico (requiere el paquete email-validator).
Se usa solo en los esquemas de entrada que crean o modifican correos (Ej: GerenteCreate, GerenteUpdate,).

- LoginRequest no lo usa: un correo mal formado simplemente no coincide con ningún usuario
  y recibe el 401 genérico. Con EmailStr respondería 422 y cambiaría el contrato con el frontend.
- UsuarioOut no lo usa: es de salida. Si en la BD existiera un correo que EmailStr considere
  inválido, la respuesta fallaría con un error 500.
"""

# Es lo que el cliente manda para el login
class LoginRequest(BaseModel):
    email: str
    password: str

# Es lo que el servidor responde tras un login exitoso
class TokenResponse(BaseModel):
    token: str # token
    token_type: str = "bearer" # tipo del token

# Se declaran los unicos campos que se quieren exponer, evita poner la password_hash
# Se usa tambien para gerente
class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    sucursal_id: int | None = None # Puede venir vacio
    activo: bool
    foto_url: str | None = None

    model_config = ConfigDict(from_attributes=True)

# Esquemas para la configuración de cuenta
class CuentaUpdateData(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None

class CuentaUpdatePassword(BaseModel):
    password_actual: str
    password_nueva: str

# Esquemas para Sucursales
class SucursalBase(BaseModel):
    nombre: str
    direccion: str
    telefono: str | None = None
    estado: str = "activa"
    gerente_id: int | None = None

class SucursalCreate(BaseModel):
    nombre: str
    direccion: str
    telefono: str | None = None
    gerente_id: int | None = None

class SucursalUpdate(BaseModel):
    nombre: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    estado: str | None = None
    gerente_id: int | None = None

class SucursalOut(SucursalBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SucursalEliminarResponse(BaseModel):
    sucursal_id: int
    estado: str
    eliminada_definitivamente: bool
    message: str


# Esquemas de Gerentes
class GerenteCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str

class GerenteUpdate(BaseModel):
    nombre: str
    email: EmailStr

# Esquemas de Cajeros
class CajeroCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    sucursal_id: int | None = None

class CajeroUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    sucursal_id: int | None = None

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

# Esquemas para inventarios
class InventarioOut(BaseModel):
    producto_id: int
    producto_nombre: str
    categoria_nombre: str
    sucursal_id: int
    sucursal_nombre: str
    existencia: int


# Esquemas para Ventas y Métodos de Pago
class MetodoPagoOut(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class DetalleVentaCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0, description="Cantidad del producto (debe ser mayor a 0)")
    precio_unitario: Decimal | None = Field(
        default=None,
        gt=0,
        description="Precio unitario opcional. Si no se especifica, se toma el precio actual del producto.",
    )


class VentaCreate(BaseModel):
    sucursal_id: int | None = Field(
        default=None,
        description="Opcional. Si no se especifica, se infiere automáticamente de la sucursal del usuario.",
    )
    metodo_pago_id: int
    detalles: list[DetalleVentaCreate] = Field(
        min_length=1, description="Lista de productos y cantidades a vender"
    )


class DetalleVentaOut(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class VentaOut(BaseModel):
    id: int
    sucursal_id: int
    sucursal_nombre: str | None = None
    usuario_id: int
    usuario_nombre: str | None = None
    metodo_pago_id: int
    metodo_pago_nombre: str | None = None
    fecha: datetime
    total: Decimal
    detalles: list[DetalleVentaOut]

    model_config = ConfigDict(from_attributes=True)


class VentaUpdate(BaseModel):
    metodo_pago_id: int | None = None