from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from src.database import Base


class Rol(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    rol_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    # Nota: la FK a sucursales se crea "diferida" (use_alter) porque
    # Sucursal.gerente_id también apunta a usuarios.id → dependencia circular
    # entre las dos tablas. use_alter le dice a Alembic que la agregue con un
    # ALTER TABLE aparte, después de crear ambas tablas.
    sucursal_id = Column(
        Integer,
        ForeignKey("sucursales.id", use_alter=True, name="fk_usuarios_sucursal_id"),
        nullable=True,
    )

    rol = relationship("Rol", back_populates="usuarios")
    sucursal = relationship(
        "Sucursal", back_populates="empleados", foreign_keys=[sucursal_id]
    )


class Sucursal(Base):
    __tablename__ = "sucursales"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    direccion = Column(String(200), nullable=False)
    telefono = Column(String(20), nullable=True)
    estado = Column(String(20), nullable=False, server_default="activa")
    gerente_id = Column(
        Integer, ForeignKey("usuarios.id"), nullable=True, unique=True
    )

    gerente = relationship("Usuario", foreign_keys=[gerente_id])
    empleados = relationship(
        "Usuario", back_populates="sucursal", foreign_keys=[Usuario.sucursal_id]
    )
