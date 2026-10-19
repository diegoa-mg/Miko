from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.sucursales import Sucursal


class Rol(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    rol_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    # (conserva aquí tu comentario sobre use_alter)
    sucursal_id: Mapped[int | None] = mapped_column(
        ForeignKey("sucursales.id", use_alter=True, name="fk_usuarios_sucursal_id")
    )
    activo: Mapped[bool] = mapped_column(server_default="true")
    foto_url: Mapped[str | None] = mapped_column(String(255))

    rol: Mapped["Rol"] = relationship(back_populates="usuarios")
    sucursal: Mapped[Optional["Sucursal"]] = relationship(
        back_populates="empleados", foreign_keys=[sucursal_id]
    )