from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

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