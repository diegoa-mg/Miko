from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.usuarios import Usuario


class Sucursal(Base):
    __tablename__ = "sucursales"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    direccion: Mapped[str] = mapped_column(String(200))
    telefono: Mapped[str | None] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(String(20), server_default="activa")
    gerente_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), unique=True)

    gerente: Mapped[Optional["Usuario"]] = relationship(foreign_keys=[gerente_id])
    empleados: Mapped[list["Usuario"]] = relationship(
        back_populates="sucursal", foreign_keys="Usuario.sucursal_id"
    )