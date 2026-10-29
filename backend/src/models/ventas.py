import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.productos import Producto
    from src.models.sucursales import Sucursal
    from src.models.usuarios import Usuario


class NombreMetodoPago(str, enum.Enum):
    EFECTIVO = "efectivo"
    TARJETA = "tarjeta"
    TRANSFERENCIA = "transferencia"


class MetodoPago(Base):
    __tablename__ = "metodos_pago"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[NombreMetodoPago] = mapped_column(
        Enum(
            NombreMetodoPago,
            name="enum_metodos_pago",
            values_callable=lambda x: [e.value for e in x],
        ),
        unique=True,
    )

    ventas: Mapped[list["Venta"]] = relationship(back_populates="metodo_pago")


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(primary_key=True)
    sucursal_id: Mapped[int] = mapped_column(ForeignKey("sucursales.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    metodo_pago_id: Mapped[int] = mapped_column(ForeignKey("metodos_pago.id"))
    fecha: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    sucursal: Mapped["Sucursal"] = relationship()
    usuario: Mapped["Usuario"] = relationship()
    metodo_pago: Mapped["MetodoPago"] = relationship(back_populates="ventas")
    detalles: Mapped[list["DetalleVenta"]] = relationship(
        back_populates="venta", cascade="all, delete-orphan"
    )


class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id"))
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"))
    cantidad: Mapped[int]
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    venta: Mapped["Venta"] = relationship(back_populates="detalles")
    producto: Mapped["Producto"] = relationship(back_populates="detalles_venta")
