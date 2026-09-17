from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Numeric,
    Boolean,
    DateTime,
    Enum,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import relationship
import enum

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

class Categoria(Base):
    __tablename__ = "categorias"
    
    id = Column(Integer, primary_key=True)
    nombre = Column(String(80), nullable = False, unique=True)

    productos = relationship("Producto", back_populates="categoria")

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    # NUMERIC(10,2) para evitar pérdida de centavos
    precio = Column(Numeric(10, 2), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)

    categoria = relationship("Categoria", back_populates="productos")
    inventarios = relationship("Inventario", back_populates="producto")
    detalles_venta = relationship("DetalleVenta", back_populates="producto")

class Inventario(Base):
    __tablename__ = "inventario"

    id = Column(Integer, primary_key=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    existencia = Column(Integer, nullable=False, default=0)

    # Evita duplicar el registro de un mismo producto en la misma sucursal
    __table_args__ = (
        UniqueConstraint("sucursal_id", "producto_id", name="uq_sucursal_producto"),
    )

    sucursal = relationship("Sucursal")
    producto = relationship("Producto", back_populates="inventarios")

class NombreMetodoPago(str, enum.Enum):
    EFECTIVO = "efectivo"
    TARJETA = "tarjeta"
    TRANSFERENCIA = "transferencia"


class MetodoPago(Base):
    __tablename__ = "metodos_pago"

    id = Column(Integer, primary_key=True)
    nombre = Column(
        Enum(NombreMetodoPago, name="enum_metodos_pago"),
        nullable=False,
        unique=True,
    )

    ventas = relationship("Venta", back_populates="metodo_pago")

class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    metodo_pago_id = Column(Integer, ForeignKey("metodos_pago.id"), nullable=False)
    
    
    fecha = Column(DateTime, nullable=False, server_default=func.now())
    total = Column(Numeric(10, 2), nullable=False)

    sucursal = relationship("Sucursal")
    usuario = relationship("Usuario")
    metodo_pago = relationship("MetodoPago", back_populates="ventas")
    detalles = relationship("DetalleVenta", back_populates="venta", cascade="all, delete-orphan")

class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id = Column(Integer, primary_key=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_venta")