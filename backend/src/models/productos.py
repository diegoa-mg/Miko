from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.categorias import Categoria
    from src.models.inventarios import Inventario
    from src.models.sucursales import Sucursal
    from src.models.ventas import DetalleVenta


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    # NUMERIC(10,2) para evitar pérdida de centavos
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id"))
    sucursal_id: Mapped[int] = mapped_column(ForeignKey("sucursales.id"))
    activo: Mapped[bool] = mapped_column(server_default="true")

    __table_args__ = (
        UniqueConstraint("sucursal_id", "nombre", name="uq_producto_nombre_sucursal"),
    )

    categoria: Mapped["Categoria"] = relationship(back_populates="productos")
    inventarios: Mapped[list["Inventario"]] = relationship(back_populates="producto")
    detalles_venta: Mapped[list["DetalleVenta"]] = relationship(back_populates="producto")
    sucursal: Mapped["Sucursal"] = relationship()
