from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
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
    estado: Literal["activa", "inactiva"] = "activa"
    gerente_id: int | None = None

class SucursalCreate(BaseModel):
    nombre: str = Field(min_length=1)
    direccion: str = Field(min_length=1)
    telefono: str | None = None
    gerente_id: int | None = None

    @field_validator("nombre", "direccion")
    @classmethod
    def validar_texto_no_vacio_crear(cls, v: str, info):
        if not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip()

class SucursalUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1)
    direccion: str | None = Field(default=None, min_length=1)
    telefono: str | None = None
    estado: Literal["activa", "inactiva"] | None = None
    gerente_id: int | None = None

    @field_validator("nombre", "direccion", "estado")
    @classmethod
    def validar_no_null_en_obligatorios(cls, v, info):
        if v is None:
            raise ValueError(f"El campo '{info.field_name}' no puede ser null.")
        if isinstance(v, str) and not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip() if isinstance(v, str) else v

class SucursalOut(SucursalBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SucursalEliminarResponse(BaseModel):
    sucursal_id: int
    estado: Literal["inactiva"] = "inactiva"
    eliminada_definitivamente: bool = False
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

    model_config = ConfigDict(from_attributes=True)

class InventarioUpdate(BaseModel):
    cantidad: int # cantidad es un delta (positivo suma, negativo resta)
    
    # @ es un decorador, le agrega un comportamiento a la función sin cambiar el código
    # Al llenar el campo 'cantidad', le pasa el valor a la función 'no_cero' 
    @field_validator("cantidad") 
    @classmethod # classmethod recibe cls no self, cls es InventarioUpdate (clase)
    def no_cero(cls, valor):
        if valor == 0:
            raise ValueError("La cantidad no puede ser 0") # Pydantic alcanza ValueError y lanza un 422 con el mensaje1
        return valor

# Esquemas para categorias
class CategoriaOut(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)

class CategoriaCreate(BaseModel): # También se usa para editar la categoría
    nombre: str = Field(min_length=1, max_length=80)

    @field_validator("nombre")
    @classmethod
    def validar_texto_no_vacio_crear(cls, v: str, info):
        if not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip()

# Esquemas para productos
class ProductoOut(BaseModel):
    id: int
    nombre: str
    precio: Decimal
    categoria_id: int
    categoria_nombre: str
    existencia: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)

class ProductoCreate(BaseModel):
    nombre: str = Field(min_length=1)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    categoria_id: int
    existencia_inicial: int = Field(ge=0)

    @field_validator("nombre")
    @classmethod
    def validar_texto_no_vacio_crear(cls, v: str, info):
        if not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip()

class ProductoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1)
    precio: Decimal | None = Field(default= None, gt=0, max_digits=10, decimal_places=2)
    categoria_id: int | None = None

    # Los tres campos son opcionales (puedes mandar solo uno),
    # pero si los mandas, no pueden ser null.
    @field_validator("nombre", "precio", "categoria_id")
    @classmethod
    def validar_no_null(cls, v, info):
        if v is None:
            raise ValueError(f"El campo '{info.field_name}' no puede ser null.")
        # strip solo si es texto; precio y categoria_id son números
        if isinstance(v, str):
            if not v.strip():
                raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
            return v.strip()
        return v

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


class DashboardGerenteResponse(BaseModel):
    ventas_total_periodo: Decimal
    periodo_inicio: date
    periodo_fin: date
    umbral_bajo_inventario: int
    alertas_inventario: list[AlertaInventario]
    cajeros: list[UsuarioOut]