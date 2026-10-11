"""
Carga datos de prueba completos para desarrollo: admin, sucursales, gerentes,
cajeros, categorías, productos, inventario y ventas.
 
Ejecutar dentro del contenedor (con las migraciones ya aplicadas):
 
    docker compose exec backend python -m scripts.datos_de_prueba
 
Todas las cuentas creadas usan la contraseña: Miko12345
 
El script es idempotente: se puede correr varias veces sin duplicar nada.
Cada registro se busca por su dato único (email, nombre de sucursal, nombre
de producto, etc.) y solo se crea si no existe. Las ventas solo se generan
la primera vez (si los cajeros de prueba todavía no tienen ventas).
 
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
 
PASSWORD = "Miko12345"
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
 
# Precios con dos decimales como string → Decimal exacto (sin errores de float)
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
 
 
def obtener_o_crear_usuario(db, nombre, email, rol, activo=True, sucursal_id=None):
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if usuario is None:
        usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=hash_password(PASSWORD),
            rol_id=rol.id,
            activo=activo,
            sucursal_id=sucursal_id,
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
        cajeros[email] = obtener_o_crear_usuario(
            db, nombre, email, rol_cajero, activo, sucursal_id
        )
 
    db.commit()
    return sucursales, cajeros
 
 
def crear_catalogo(db):
    productos = []
    for nombre_categoria, lista in PRODUCTOS.items():
        categoria = db.query(Categoria).filter(Categoria.nombre == nombre_categoria).first()
        if categoria is None:
            categoria = Categoria(nombre=nombre_categoria)
            db.add(categoria)
            db.flush()
 
        for nombre_producto, precio in lista:
            producto = db.query(Producto).filter(Producto.nombre == nombre_producto).first()
            if producto is None:
                producto = Producto(
                    nombre=nombre_producto,
                    precio=Decimal(precio),
                    categoria_id=categoria.id,
                )
                db.add(producto)
                db.flush()
            productos.append(producto)
 
    db.commit()
    return productos
 
 
def crear_inventario(db, sucursales, productos):
    """
    Cada producto en cada sucursal. La mayoría con existencia normal (10-60)
    y unos cuantos en bajo inventario (0-5) para que salgan alertas.
    """
    for sucursal in sucursales.values():
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
 
 
def crear_ventas(db, sucursales, cajeros, productos):
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
 
                total = Decimal("0.00")
                for producto in rng.sample(productos, rng.randint(1, 4)):
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
        productos = crear_catalogo(db)
        print(f"  Productos: {len(productos)} en {len(PRODUCTOS)} categorías")
        crear_inventario(db, sucursales, productos)
        print("  Inventario: cada producto en cada sucursal")
        n = crear_ventas(db, sucursales, cajeros, productos)
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