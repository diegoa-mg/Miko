from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.productos import Producto
    from src.models.sucursales import Sucursal


class Inventario(Base):
    __tablename__ = "inventario"

    id: Mapped[int] = mapped_column(primary_key=True)
    sucursal_id: Mapped[int] = mapped_column(ForeignKey("sucursales.id"))
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"))
    existencia: Mapped[int] = mapped_column(default=0)

    # Evita duplicar el registro de un mismo producto en la misma sucursal
    __table_args__ = (
        UniqueConstraint("sucursal_id", "producto_id", name="uq_sucursal_producto"),
    )

    sucursal: Mapped["Sucursal"] = relationship()
    producto: Mapped["Producto"] = relationship(back_populates="inventarios")
