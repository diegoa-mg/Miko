"""
Carga datos de prueba completos para desarrollo: admin, sucursales, gerentes,
cajeros, categorías, productos, inventario y ventas.

Ejecutar dentro del contenedor (con las migraciones ya aplicadas):

    docker compose exec backend python -m scripts.datos_de_prueba

Todas las cuentas creadas usan la contraseña: Miko.12345

El script es idempotente: se puede correr varias veces sin duplicar nada.
Cada registro se busca por su dato único (email, nombre de sucursal,
nombre de producto dentro de su sucursal, etc.) y solo se crea si no existe.
Las ventas solo se generan la primera vez (si los cajeros de prueba todavía
no tienen ventas).

Cada sucursal tiene sus propios productos (productos.sucursal_id), con
precios que varían un poco entre sucursales, como pide el protocolo.

Solo para desarrollo local. NO correr contra la base de producción.
"""
import random
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from src.database import SessionLocal
from src.models import (
    Categoria,
    DetalleVenta,
    Inventario,
    MetodoPago,
    Producto,
    Rol,
    Sucursal,
    Usuario,
    Venta,
)
from src.security import hash_password
from src.services import ZONA_NEGOCIO, hoy_en_negocio

PASSWORD = "Miko.12345"
DIAS_DE_VENTAS = 30
UMBRAL_BAJO = 5  # mismo default que el dashboard

# Semilla fija: cada corrida genera exactamente los mismos números
# (existencias, ventas), así todo el equipo ve los mismos datos.
rng = random.Random(42)


# ----------------------------------------------------------------------------
# Datos
# ----------------------------------------------------------------------------

SUCURSALES = [
    # nombre, direccion, telefono, estado
    ("Miko Centro", "Av. Juárez 120, Centro", "3121000001", "activa"),
    ("Miko Norte", "Blvd. Camino Real 845", "3121000002", "activa"),
    ("Miko Sur", "Av. Tecnológico 310", "3121000003", "activa"),
    ("Miko Poniente", "Calle Constitución 77", "3121000004", "inactiva"),
]

GERENTES = [
    # nombre, email, sucursal que dirige (None = sin asignar), activo
    ("Laura Méndez", "gerente.centro@miko.com", "Miko Centro", True),
    ("Jorge Ramírez", "gerente.norte@miko.com", "Miko Norte", True),
    ("Sofía Herrera", "gerente.sur@miko.com", "Miko Sur", True),
    # Para probar asignar un gerente a una sucursal / el 404 de "sin sucursal"
    ("Ricardo Torres", "gerente.libre@miko.com", None, True),
    # Para probar que no se puede asignar un gerente inactivo
    ("Patricia Ruiz", "gerente.inactivo@miko.com", None, False),
]

CAJEROS = [
    # nombre, email, sucursal, activo
    ("Ana López", "cajero1.centro@miko.com", "Miko Centro", True),
    ("Luis García", "cajero2.centro@miko.com", "Miko Centro", True),
    ("María Pérez", "cajero1.norte@miko.com", "Miko Norte", True),
    ("Carlos Díaz", "cajero2.norte@miko.com", "Miko Norte", True),
    ("Fernanda Cruz", "cajero1.sur@miko.com", "Miko Sur", True),
    ("Diego Morales", "cajero2.sur@miko.com", "Miko Sur", True),
    # Cajero dado de baja: sus ventas históricas deben seguir apareciendo
    ("Valeria Ortiz", "cajero.baja@miko.com", "Miko Sur", False),
    # Trabajaba en Poniente; al desactivar la sucursal quedó sin asignar
    ("Andrés Navarro", "cajero.poniente@miko.com", None, True),
]

# Precios base con dos decimales como string → Decimal exacto (sin errores
# de float). Cada sucursal los ajusta con su factor de PRECIO_POR_SUCURSAL.
PRODUCTOS = {
    "Pan dulce": [
        ("Concha", "12.00"),
        ("Cuerno", "14.00"),
        ("Oreja", "13.00"),
        ("Dona glaseada", "16.00"),
        ("Rol de canela", "22.00"),
    ],
    "Pan salado": [
        ("Bolillo", "3.50"),
        ("Telera", "4.00"),
        ("Baguette", "28.00"),
    ],
    "Pasteles": [
        ("Pastel de chocolate", "350.00"),
        ("Pay de queso", "280.00"),
        ("Rebanada de tres leches", "55.00"),
    ],
    "Galletas": [
        ("Galleta de avena", "10.00"),
        ("Polvorón", "9.00"),
    ],
    "Bebidas": [
        ("Café americano", "25.00"),
        ("Chocolate caliente", "30.00"),
        ("Jugo de naranja", "28.00"),
    ],
}

# Código de barras por producto (el mismo código se puede repetir entre
# sucursales; solo debe ser único dentro de cada una). "Jugo de naranja" y
# "Café americano" quedan sin código a propósito, para probar que es opcional.
CODIGOS = {
    "Concha": "7501000000011",
    "Cuerno": "7501000000028",
    "Oreja": "7501000000035",
    "Dona glaseada": "7501000000042",
    "Rol de canela": "7501000000059",
    "Bolillo": "7501000000066",
    "Telera": "7501000000073",
    "Baguette": "7501000000080",
    "Pastel de chocolate": "7501000000097",
    "Pay de queso": "7501000000103",
    "Rebanada de tres leches": "7501000000110",
    "Galleta de avena": "7501000000127",
    "Polvorón": "7501000000134",
    "Chocolate caliente": "7501000000141",
}

# Cada sucursal fija sus precios: mismo producto, precio distinto
PRECIO_POR_SUCURSAL = {
    "Miko Centro": Decimal("1.00"),
    "Miko Norte": Decimal("1.10"),
    "Miko Sur": Decimal("0.90"),
    "Miko Poniente": Decimal("1.00"),
}

# Productos dados de baja (activo=False) para probar el borrado lógico.
# Conservan sus ventas históricas.
PRODUCTOS_INACTIVOS = [
    ("Miko Norte", "Polvorón"),
    ("Miko Sur", "Baguette"),
]


# ----------------------------------------------------------------------------
# Helpers "buscar o crear"
# ----------------------------------------------------------------------------

def obtener_rol(db, nombre):
    rol = db.query(Rol).filter(Rol.nombre == nombre).first()
    if rol is None:
        raise SystemExit(
            f"No existe el rol '{nombre}'. Corre primero: "
            "docker compose exec backend alembic upgrade head"
        )
    return rol


def obtener_o_crear_usuario(
    db, nombre, email, rol, activo=True, sucursal_id=None, aviso_aceptado=True
):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    fecha_aviso = (
        datetime.now(timezone.utc).replace(tzinfo=None) if aviso_aceptado else None
    )
    if usuario is None:
        usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=hash_password(PASSWORD),
            rol_id=rol.id,
            activo=activo,
            sucursal_id=sucursal_id,
            aviso_aceptado_en=fecha_aviso,
        )
        db.add(usuario)
        db.flush()  # asigna el id sin cerrar la transacción
    return usuario


def obtener_o_crear_sucursal(db, nombre, direccion, telefono, estado):
    sucursal = db.query(Sucursal).filter(Sucursal.nombre == nombre).first()
    if sucursal is None:
        sucursal = Sucursal(
            nombre=nombre, direccion=direccion, telefono=telefono, estado=estado
        )
        db.add(sucursal)
        db.flush()
    return sucursal


def fecha_venta_utc(dia, hora_local):
    """
    Combina un día y una hora en la zona del negocio y la convierte a UTC
    sin tzinfo, que es como se guardan las ventas (ver rango_del_dia_en_utc).
    """
    local = datetime.combine(dia, hora_local, tzinfo=ZONA_NEGOCIO)
    return local.astimezone(timezone.utc).replace(tzinfo=None)


# ----------------------------------------------------------------------------
# Secciones
# ----------------------------------------------------------------------------

def crear_usuarios_y_sucursales(db):
    rol_admin = obtener_rol(db, "admin_general")
    rol_gerente = obtener_rol(db, "gerente_sede")
    rol_cajero = obtener_rol(db, "cajero")

    obtener_o_crear_usuario(db, "Administrador Miko", "admin@miko.com", rol_admin)

    sucursales = {
        nombre: obtener_o_crear_sucursal(db, nombre, direccion, telefono, estado)
        for nombre, direccion, telefono, estado in SUCURSALES
    }

    # La sucursal de un gerente se define con sucursales.gerente_id
    # (ver obtener_sucursal_del_gerente), no con usuarios.sucursal_id.
    for nombre, email, nombre_sucursal, activo in GERENTES:
        gerente = obtener_o_crear_usuario(db, nombre, email, rol_gerente, activo)
        if nombre_sucursal is not None:
            sucursal = sucursales[nombre_sucursal]
            if sucursal.gerente_id is None:
                sucursal.gerente_id = gerente.id

    # La sucursal de un cajero sí se define con usuarios.sucursal_id
    cajeros = {}
    for nombre, email, nombre_sucursal, activo in CAJEROS:
        sucursal_id = sucursales[nombre_sucursal].id if nombre_sucursal else None
        # Dejamos un cajero con aviso pendiente a propósito para demostrar el flujo
        aviso_aceptado = (email != "cajero2.centro@miko.com")
        cajeros[email] = obtener_o_crear_usuario(
            db, nombre, email, rol_cajero, activo, sucursal_id, aviso_aceptado=aviso_aceptado
        )

    db.commit()
    return sucursales, cajeros


def redondear_precio(precio):
    """Redondea al múltiplo de 0.50 más cercano (precios "de mostrador")."""
    return (precio * 2).quantize(Decimal("1")) / 2


def crear_catalogo(db, sucursales):
    """
    Cada sucursal tiene sus propios productos (productos.sucursal_id).
    Devuelve {nombre_sucursal: [productos de esa sucursal]}.
    """
    categorias = {}
    for nombre_categoria in PRODUCTOS:
        categoria = db.query(Categoria).filter(Categoria.nombre == nombre_categoria).first()
        if categoria is None:
            categoria = Categoria(nombre=nombre_categoria)
            db.add(categoria)
            db.flush()
        categorias[nombre_categoria] = categoria

    productos_por_sucursal = {}
    for nombre_sucursal, sucursal in sucursales.items():
        factor = PRECIO_POR_SUCURSAL[nombre_sucursal]
        productos_por_sucursal[nombre_sucursal] = []

        for nombre_categoria, lista in PRODUCTOS.items():
            for nombre_producto, precio_base in lista:
                # El nombre solo es único dentro de la sucursal
                # (UniqueConstraint uq_producto_nombre_sucursal)
                producto = (
                    db.query(Producto)
                    .filter(
                        Producto.nombre == nombre_producto,
                        Producto.sucursal_id == sucursal.id,
                    )
                    .first()
                )
                if producto is None:
                    producto = Producto(
                        nombre=nombre_producto,
                        precio=redondear_precio(Decimal(precio_base) * factor),
                        categoria_id=categorias[nombre_categoria].id,
                        sucursal_id=sucursal.id,
                        activo=(nombre_sucursal, nombre_producto) not in PRODUCTOS_INACTIVOS,
                        codigo=CODIGOS.get(nombre_producto),
                    )
                    db.add(producto)
                    db.flush()
                elif producto.codigo is None and nombre_producto in CODIGOS:
                    # Producto de una carga anterior (sin código): se le asigna
                    producto.codigo = CODIGOS[nombre_producto]
                productos_por_sucursal[nombre_sucursal].append(producto)

    db.commit()
    return productos_por_sucursal


def crear_inventario(db, sucursales, productos_por_sucursal):
    """
    Cada producto tiene inventario solo en su propia sucursal. La mayoría
    con existencia normal (10-60) y unos cuantos en bajo inventario (0-5)
    para que salgan alertas.
    """
    for nombre_sucursal, sucursal in sucursales.items():
        productos = productos_por_sucursal[nombre_sucursal]
        bajos = set(rng.sample(range(len(productos)), 3))
        for i, producto in enumerate(productos):
            existe = (
                db.query(Inventario)
                .filter(
                    Inventario.sucursal_id == sucursal.id,
                    Inventario.producto_id == producto.id,
                )
                .first()
            )
            if existe is not None:
                continue
            existencia = rng.randint(0, UMBRAL_BAJO) if i in bajos else rng.randint(10, 60)
            db.add(
                Inventario(
                    sucursal_id=sucursal.id,
                    producto_id=producto.id,
                    existencia=existencia,
                )
            )
    db.commit()


def crear_ventas(db, sucursales, cajeros, productos_por_sucursal):
    """
    Ventas de los últimos DIAS_DE_VENTAS días, incluido hoy, para que el
    dashboard y el historial tengan datos.

    No descuentan inventario: las existencias de arriba representan el
    stock ACTUAL, ya después de estas ventas.
    """
    ids_cajeros = [c.id for c in cajeros.values()]
    if db.query(Venta).filter(Venta.usuario_id.in_(ids_cajeros)).first() is not None:
        print("  Ventas: ya existían, no se generan otra vez.")
        return 0

    metodos = db.query(MetodoPago).all()
    if not metodos:
        raise SystemExit("No hay métodos de pago. Corre: alembic upgrade head")

    # Quién vende en cada sucursal
    vendedores = {
        "Miko Centro": [cajeros["cajero1.centro@miko.com"], cajeros["cajero2.centro@miko.com"]],
        "Miko Norte": [cajeros["cajero1.norte@miko.com"], cajeros["cajero2.norte@miko.com"]],
        "Miko Sur": [
            cajeros["cajero1.sur@miko.com"],
            cajeros["cajero2.sur@miko.com"],
            cajeros["cajero.baja@miko.com"],
        ],
        "Miko Poniente": [cajeros["cajero.poniente@miko.com"]],
    }

    hoy = hoy_en_negocio()
    ahora_local = datetime.now(ZONA_NEGOCIO)
    total_ventas = 0

    for nombre_sucursal, sucursal in sucursales.items():
        for dias_atras in range(DIAS_DE_VENTAS - 1, -1, -1):
            dia = hoy - timedelta(days=dias_atras)

            # Poniente cerró hace 10 días: solo tiene ventas anteriores
            if nombre_sucursal == "Miko Poniente" and dias_atras < 10:
                continue
            # La cajera dada de baja dejó de vender hace 15 días
            lista_vendedores = [
                c for c in vendedores[nombre_sucursal]
                if c.activo or dias_atras >= 15
            ]

            for _ in range(rng.randint(3, 8)):
                # Horario de la panadería: 7:00 a 21:00 (hora local)
                minutos = rng.randint(7 * 60, 21 * 60 - 1)
                hora = time(minutos // 60, minutos % 60)
                if dias_atras == 0 and hora > ahora_local.time():
                    continue  # no crear ventas "en el futuro" de hoy

                venta = Venta(
                    sucursal_id=sucursal.id,
                    usuario_id=rng.choice(lista_vendedores).id,
                    metodo_pago_id=rng.choice(metodos).id,
                    fecha=fecha_venta_utc(dia, hora),
                    total=Decimal("0.00"),
                )

                # Solo productos de ESTA sucursal. Los dados de baja solo
                # aparecen en ventas de hace más de 7 días.
                disponibles = [
                    p for p in productos_por_sucursal[nombre_sucursal]
                    if p.activo or dias_atras > 7
                ]

                total = Decimal("0.00")
                for producto in rng.sample(disponibles, rng.randint(1, 4)):
                    cantidad = 1 if producto.precio >= 100 else rng.randint(1, 6)
                    venta.detalles.append(
                        DetalleVenta(
                            producto_id=producto.id,
                            cantidad=cantidad,
                            precio_unitario=producto.precio,
                        )
                    )
                    total += producto.precio * cantidad

                venta.total = total
                db.add(venta)
                total_ventas += 1

    db.commit()
    return total_ventas


# ----------------------------------------------------------------------------

def main():
    db = SessionLocal()
    try:
        print("Cargando datos de prueba...")
        sucursales, cajeros = crear_usuarios_y_sucursales(db)
        print(f"  Sucursales: {len(sucursales)} (1 inactiva)")
        productos_por_sucursal = crear_catalogo(db, sucursales)
        total_productos = sum(len(p) for p in productos_por_sucursal.values())
        print(
            f"  Productos: {total_productos} ({total_productos // len(sucursales)} por sucursal, "
            f"{len(PRODUCTOS_INACTIVOS)} dados de baja)"
        )
        crear_inventario(db, sucursales, productos_por_sucursal)
        print("  Inventario: cada producto en su sucursal")
        n = crear_ventas(db, sucursales, cajeros, productos_por_sucursal)
        if n:
            print(f"  Ventas: {n} en los últimos {DIAS_DE_VENTAS} días")

        print("\nCuentas (contraseña para todas: " + PASSWORD + ")")
        print("  admin@miko.com                  Admin general")
        for nombre, email, suc, activo in GERENTES:
            extra = suc or "sin sucursal"
            if not activo:
                extra += ", INACTIVO"
            print(f"  {email:<32}Gerente ({extra})")
        for nombre, email, suc, activo in CAJEROS:
            extra = suc or "sin sucursal"
            if not activo:
                extra += ", INACTIVO"
            print(f"  {email:<32}Cajero ({extra})")
        print("\nListo.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()