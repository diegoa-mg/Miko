import os
import sys
from decimal import Decimal

# Asegurar que backend está en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from src.database import SessionLocal
from src.models import Categoria, Inventario, Producto, Rol, Sucursal, Usuario
from src.schemas import InventarioUpdate, ProductoCreate
from src.routers.dashboard import obtener_dashboard_admin, obtener_dashboard_gerente
from src.routers.inventarios import (
    actualizar_existencias,
    listar_inventario_mi_sucursal,
    listar_inventarios,
)
from src.routers.productos import crear_producto, eliminar_producto, reactivar_producto

NOMBRE_SUCURSAL = "Sucursal Inactivos Test"
NOMBRE_CATEGORIA = "Categoria Inactivos Test"
NOMBRE_PRODUCTO = "Producto Inactivos Test"
EMAIL_GERENTE = "gerente_inactivos@miko.com"
EXISTENCIA = 3  # por debajo del umbral de alertas (5)
UMBRAL = 5


def limpiar_datos(db):
    """Borra todo lo que este script crea (también restos de una corrida anterior)."""
    db.rollback()
    sucursal = db.query(Sucursal).filter(Sucursal.nombre == NOMBRE_SUCURSAL).first()
    if sucursal:
        sucursal.gerente_id = None
        db.flush()
        db.query(Inventario).filter(Inventario.sucursal_id == sucursal.id).delete()
        db.query(Producto).filter(Producto.sucursal_id == sucursal.id).delete()
        db.delete(sucursal)
        db.flush()
    db.query(Categoria).filter(Categoria.nombre == NOMBRE_CATEGORIA).delete()
    db.query(Usuario).filter(Usuario.email == EMAIL_GERENTE).delete()
    db.commit()


def ids(lista, campo="producto_id"):
    return [getattr(x, campo) for x in lista]


def run_tests():
    db = SessionLocal()
    try:
        print("--- INICIANDO PRUEBAS: PRODUCTOS INACTIVOS EN INVENTARIO Y ALERTAS ---")
        limpiar_datos(db)

        # 1. Datos de prueba: gerente con sucursal activa y una categoría
        rol_gerente = db.query(Rol).filter(Rol.nombre == "gerente_sede").first()
        if not rol_gerente:
            rol_gerente = Rol(nombre="gerente_sede")
            db.add(rol_gerente)
            db.commit()
            db.refresh(rol_gerente)

        gerente = Usuario(
            nombre="Gerente Inactivos Test",
            email=EMAIL_GERENTE,
            password_hash="fakehash",
            rol_id=rol_gerente.id,
        )
        db.add(gerente)
        db.commit()
        db.refresh(gerente)

        sucursal = Sucursal(
            nombre=NOMBRE_SUCURSAL,
            direccion="Av. Test 123",
            estado="activa",
            gerente_id=gerente.id,
        )
        db.add(sucursal)
        categoria = Categoria(nombre=NOMBRE_CATEGORIA)
        db.add(categoria)
        db.commit()
        db.refresh(sucursal)
        db.refresh(categoria)

        # Se crea con el mismo endpoint que usa el gerente (también crea su fila de inventario)
        creado = crear_producto(
            producto_in=ProductoCreate(
                nombre=NOMBRE_PRODUCTO,
                precio=Decimal("25.50"),
                categoria_id=categoria.id,
                existencia_inicial=EXISTENCIA,
            ),
            usuario=gerente,
            db=db,
        )
        producto_id = creado.id
        print(f"Sucursal ID: {sucursal.id}, Producto ID: {producto_id}, Existencia: {EXISTENCIA}")

        def inventario_admin():
            return listar_inventarios(sucursal_id=sucursal.id, incluir_inactivas=False, db=db)

        def inventario_gerente():
            return listar_inventario_mi_sucursal(usuario=gerente, db=db)

        def alertas_admin():
            r = obtener_dashboard_admin(
                fecha_inicio=None, fecha_fin=None, umbral_bajo_inventario=UMBRAL, db=db
            )
            return [a for a in r.alertas_inventario if a.sucursal_id == sucursal.id]

        def alertas_gerente():
            r = obtener_dashboard_gerente(
                fecha_inicio=None, fecha_fin=None, umbral_bajo_inventario=UMBRAL,
                db=db, usuario_actual=gerente,
            )
            return r.alertas_inventario

        def existencia_en_bd():
            db.expire_all()
            return (
                db.query(Inventario.existencia)
                .filter(Inventario.sucursal_id == sucursal.id, Inventario.producto_id == producto_id)
                .scalar()
            )

        # ---------------------------------------------------------------
        # Caso 1: producto activo con existencia baja -> aparece en todo
        # ---------------------------------------------------------------
        fila_admin = [f for f in inventario_admin() if f.producto_id == producto_id]
        fila_gerente = [f for f in inventario_gerente() if f.producto_id == producto_id]
        assert len(fila_admin) == 1 and fila_admin[0].existencia == EXISTENCIA
        assert len(fila_gerente) == 1 and fila_gerente[0].existencia == EXISTENCIA
        assert producto_id in ids(alertas_admin())
        assert producto_id in ids(alertas_gerente())
        print("✓ 1. Producto activo aparece en GET /inventarios, /inventarios/mi-sucursal y en las alertas de ambos dashboards")

        # ---------------------------------------------------------------
        # Caso 2: desactivar -> desaparece de inventario y alertas
        # ---------------------------------------------------------------
        eliminar_producto(producto_id=producto_id, usuario=gerente, db=db)
        assert producto_id not in ids(inventario_admin())
        assert producto_id not in ids(inventario_gerente())
        assert producto_id not in ids(alertas_admin())
        assert producto_id not in ids(alertas_gerente())
        print("✓ 2. Producto inactivo ya no aparece en inventarios (admin y gerente) ni en las alertas de ambos dashboards")

        # ---------------------------------------------------------------
        # Caso 3: PATCH sobre el inactivo -> 404 y la existencia no cambia
        # ---------------------------------------------------------------
        try:
            actualizar_existencias(
                producto_id=producto_id,
                datos=InventarioUpdate(cantidad=10),
                usuario=gerente,
                db=db,
            )
            raise AssertionError("Se esperaba HTTPException 404 al ajustar un producto inactivo")
        except HTTPException as e:
            assert e.status_code == 404, f"Se esperaba 404 y fue {e.status_code}"
            assert "inactivo" in e.detail
        assert existencia_en_bd() == EXISTENCIA, "La existencia no debe cambiar para un producto inactivo"
        print(f"✓ 3. PATCH /inventarios/mi-sucursal/{producto_id} sobre un inactivo devuelve 404 y la existencia sigue en {EXISTENCIA}")

        # ---------------------------------------------------------------
        # Caso 4: reactivar -> vuelve con la misma existencia
        # ---------------------------------------------------------------
        reactivar_producto(producto_id=producto_id, usuario=gerente, db=db)
        fila_admin = [f for f in inventario_admin() if f.producto_id == producto_id]
        fila_gerente = [f for f in inventario_gerente() if f.producto_id == producto_id]
        assert len(fila_admin) == 1 and fila_admin[0].existencia == EXISTENCIA
        assert len(fila_gerente) == 1 and fila_gerente[0].existencia == EXISTENCIA
        assert producto_id in ids(alertas_admin())
        assert producto_id in ids(alertas_gerente())
        # Y ya se puede ajustar de nuevo con normalidad
        actualizado = actualizar_existencias(
            producto_id=producto_id, datos=InventarioUpdate(cantidad=1), usuario=gerente, db=db
        )
        assert actualizado.existencia == EXISTENCIA + 1
        print("✓ 4. Producto reactivado vuelve a aparecer con la misma existencia (y el PATCH vuelve a funcionar)")

        print("\n=== LOS PRODUCTOS INACTIVOS SE OCULTAN CORRECTAMENTE DEL INVENTARIO Y LAS ALERTAS ===")

    finally:
        # ---------------------------------------------------------------
        # Caso 5: limpieza de los datos creados por el script
        # ---------------------------------------------------------------
        try:
            limpiar_datos(db)
            restos = (
                db.query(Sucursal).filter(Sucursal.nombre == NOMBRE_SUCURSAL).count()
                + db.query(Categoria).filter(Categoria.nombre == NOMBRE_CATEGORIA).count()
                + db.query(Usuario).filter(Usuario.email == EMAIL_GERENTE).count()
                + db.query(Producto).filter(Producto.nombre == NOMBRE_PRODUCTO).count()
            )
            assert restos == 0, "Quedaron residuos de la prueba en la base"
            print("✓ 5. Datos de prueba eliminados (sin residuos en la base)")
        finally:
            db.close()


if __name__ == "__main__":
    run_tests()
