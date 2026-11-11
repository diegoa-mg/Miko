import os
import sys
from decimal import Decimal
from datetime import datetime

# Asegurar que backend está en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from src.database import SessionLocal
from src.models import (
    Categoria,
    Inventario,
    MetodoPago,
    NombreMetodoPago,
    Producto,
    Rol,
    Sucursal,
    Usuario,
    Venta,
)
from src.schemas import DetalleVentaCreate, VentaCreate
from src.routers.ventas import (
    contar_ventas_listado,
    eliminar_venta,
    listar_metodos_pago,
    listar_ventas,
    obtener_venta,
    registrar_venta,
)

def run_tests():
    db = SessionLocal()
    try:
        print("--- INICIANDO PRUEBAS UNITARIAS Y DE INTEGRACIÓN DE VENTAS ---")

        # 1. Preparar datos de prueba
        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()
        if not rol_admin:
            rol_admin = Rol(nombre="admin_general")
            db.add(rol_admin)
            db.commit()
            db.refresh(rol_admin)

        usuario = db.query(Usuario).filter(Usuario.email == "test_ventas@miko.com").first()
        if not usuario:
            usuario = Usuario(
                nombre="Admin Ventas Test",
                email="test_ventas@miko.com",
                password_hash="fakehash",
                rol_id=rol_admin.id,
                rol=rol_admin
            )
            db.add(usuario)
            db.commit()
            db.refresh(usuario)
        else:
            usuario.rol = rol_admin

        sucursal = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Ventas Test").first()
        if not sucursal:
            sucursal = Sucursal(
                nombre="Sucursal Ventas Test",
                direccion="Av. Test 123",
                estado="activa"
            )
            db.add(sucursal)
            db.commit()
            db.refresh(sucursal)

        categoria = db.query(Categoria).filter(Categoria.nombre == "Electrónica Test").first()
        if not categoria:
            categoria = Categoria(nombre="Electrónica Test")
            db.add(categoria)
            db.commit()
            db.refresh(categoria)

        producto = db.query(Producto).filter(Producto.nombre == "Audífonos Bluetooth Test").first()
        if not producto:
            producto = Producto(
                nombre="Audífonos Bluetooth Test",
                precio=Decimal("50.00"),
                categoria_id=categoria.id,
                sucursal_id=sucursal.id,
            )
            db.add(producto)
            db.commit()
            db.refresh(producto)

        inv = (
            db.query(Inventario)
            .filter(Inventario.sucursal_id == sucursal.id, Inventario.producto_id == producto.id)
            .first()
        )
        if not inv:
            inv = Inventario(
                sucursal_id=sucursal.id,
                producto_id=producto.id,
                existencia=10
            )
            db.add(inv)
        else:
            inv.existencia = 10
        db.commit()
        db.refresh(inv)

        metodo_pago = db.query(MetodoPago).first()
        if not metodo_pago:
            metodo_pago = MetodoPago(nombre=NombreMetodoPago.EFECTIVO)
            db.add(metodo_pago)
            db.commit()
            db.refresh(metodo_pago)

        print(f"Sucursal ID: {sucursal.id}, Producto ID: {producto.id}, Stock Inicial: {inv.existencia}")

        # 2. Test listar_metodos_pago
        metodos = listar_metodos_pago(db=db, usuario_actual=usuario)
        assert len(metodos) > 0
        print("✓ listar_metodos_pago OK:", [m.nombre for m in metodos])

        # 3. Test registrar_venta (Venta Exitosa: pedir 3 unidades a $50)
        venta_in = VentaCreate(
            sucursal_id=sucursal.id,
            metodo_pago_id=metodo_pago.id,
            detalles=[
                DetalleVentaCreate(
                    producto_id=producto.id,
                    cantidad=3,
                    precio_unitario=Decimal("50.00")
                )
            ]
        )
        venta_out = registrar_venta(venta_in=venta_in, db=db, usuario_actual=usuario)
        venta_id = venta_out.id
        assert venta_out.total == Decimal("150.00")
        assert len(venta_out.detalles) == 1
        assert venta_out.detalles[0].subtotal == Decimal("150.00")
        print(f"✓ registrar_venta exitosa (ID: {venta_id}, Total: ${venta_out.total})")

        # Verificar reducción de inventario (10 - 3 = 7)
        db.refresh(inv)
        assert inv.existencia == 7, f"Esperado stock 7, pero es {inv.existencia}"
        print(f"✓ Inventario actualizado automáticamente: de 10 a {inv.existencia}")

        # 4. Test registrar_venta con Stock Insuficiente (pedir 20 unidades cuando quedan 7)
        venta_invalida = VentaCreate(
            sucursal_id=sucursal.id,
            metodo_pago_id=metodo_pago.id,
            detalles=[
                DetalleVentaCreate(
                    producto_id=producto.id,
                    cantidad=20
                )
            ]
        )
        try:
            registrar_venta(venta_in=venta_invalida, db=db, usuario_actual=usuario)
            assert False, "Debió lanzar HTTPException por stock insuficiente"
        except HTTPException as exc:
            assert exc.status_code == 400
            print("✓ Rechazo por stock insuficiente OK:", exc.detail)

        # Verificar que el stock no cambió y sigue en 7
        db.refresh(inv)
        assert inv.existencia == 7

        # 5. Test listar_ventas
        ventas_list = listar_ventas(sucursal_id=sucursal.id, db=db, usuario_actual=usuario)
        assert any(v.id == venta_id for v in ventas_list)
        print(f"✓ listar_ventas OK (venta ID {venta_id} presente)")

        # 5.1 Test contar_ventas_listado: el conteo y el monto cubren TODAS las ventas
        # que cumplen los filtros, no solo una página
        conteo = contar_ventas_listado(sucursal_id=sucursal.id, db=db, usuario_actual=usuario)
        todas = listar_ventas(sucursal_id=sucursal.id, limit=100000, db=db, usuario_actual=usuario)
        suma_todas = sum((v.total for v in todas), Decimal("0"))
        assert conteo["total"] == len(todas), (conteo["total"], len(todas))
        assert Decimal(str(conteo["monto_total"])) == suma_todas, (conteo["monto_total"], suma_todas)
        print(f"✓ contar_ventas_listado OK ({conteo['total']} ventas, monto ${conteo['monto_total']})")

        # 5.2 Con una página más chica que el total, el conteo sigue siendo el real
        pagina = listar_ventas(sucursal_id=sucursal.id, limit=1, db=db, usuario_actual=usuario)
        assert len(pagina) == 1
        assert conteo["total"] >= len(pagina)
        print("✓ El conteo no depende del limit de la página")

        # 5.3 Filtro por método de pago (listado y conteo deben coincidir)
        nombre_pago = metodo_pago.nombre.value
        filtradas = listar_ventas(
            sucursal_id=sucursal.id, metodo_pago=nombre_pago, limit=100000,
            db=db, usuario_actual=usuario,
        )
        conteo_filtrado = contar_ventas_listado(
            sucursal_id=sucursal.id, metodo_pago=nombre_pago, db=db, usuario_actual=usuario,
        )
        assert any(v.id == venta_id for v in filtradas)
        assert all(v.metodo_pago_nombre == nombre_pago for v in filtradas)
        assert conteo_filtrado["total"] == len(filtradas)
        assert Decimal(str(conteo_filtrado["monto_total"])) == sum((v.total for v in filtradas), Decimal("0"))
        # Mayúsculas y minúsculas no importan
        conteo_mayus = contar_ventas_listado(
            sucursal_id=sucursal.id, metodo_pago=nombre_pago.upper(), db=db, usuario_actual=usuario,
        )
        assert conteo_mayus["total"] == conteo_filtrado["total"]
        # Un método inexistente no devuelve ventas
        conteo_nada = contar_ventas_listado(
            sucursal_id=sucursal.id, metodo_pago="no_existe", db=db, usuario_actual=usuario,
        )
        assert conteo_nada["total"] == 0 and Decimal(str(conteo_nada["monto_total"])) == 0
        print(f"✓ Filtro por método de pago OK ('{nombre_pago}': {conteo_filtrado['total']} ventas)")

        # 5.4 Con otro método de pago, el conteo cambia solo para ese método
        otro_metodo = db.query(MetodoPago).filter(MetodoPago.id != metodo_pago.id).first()
        if otro_metodo:
            nombre_otro = otro_metodo.nombre.value
            antes_otro = contar_ventas_listado(
                sucursal_id=sucursal.id, metodo_pago=nombre_otro, db=db, usuario_actual=usuario,
            )
            venta_otro = registrar_venta(
                venta_in=VentaCreate(
                    sucursal_id=sucursal.id,
                    metodo_pago_id=otro_metodo.id,
                    detalles=[DetalleVentaCreate(producto_id=producto.id, cantidad=1)],
                ),
                db=db,
                usuario_actual=usuario,
            )
            despues_otro = contar_ventas_listado(
                sucursal_id=sucursal.id, metodo_pago=nombre_otro, db=db, usuario_actual=usuario,
            )
            despues_original = contar_ventas_listado(
                sucursal_id=sucursal.id, metodo_pago=nombre_pago, db=db, usuario_actual=usuario,
            )
            assert despues_otro["total"] == antes_otro["total"] + 1
            assert Decimal(str(despues_otro["monto_total"])) == Decimal(str(antes_otro["monto_total"])) + venta_otro.total
            assert despues_original["total"] == conteo_filtrado["total"]  # el otro método no lo afecta
            # Se anula la venta de prueba para no alterar el inventario de los pasos siguientes
            eliminar_venta(venta_id=venta_otro.id, db=db, usuario_actual=usuario)
            print(f"✓ El conteo cambia solo para el método '{nombre_otro}'")
        else:
            print("- Solo existe un método de pago; se omite la comparación entre métodos")

        # 6. Test obtener_venta
        venta_res = obtener_venta(venta_id=venta_id, db=db, usuario_actual=usuario)
        assert venta_res.id == venta_id
        assert venta_res.total == Decimal("150.00")
        print(f"✓ obtener_venta ID {venta_id} OK")

        # 7. Test eliminar_venta (Anular venta y verificar restauración de existencias)
        del_res = eliminar_venta(venta_id=venta_id, db=db, usuario_actual=usuario)
        assert del_res["venta_id"] == venta_id
        print("✓ eliminar_venta OK:", del_res["message"])

        # Verificar que existencias en inventario volvieron a 10 (7 + 3)
        db.refresh(inv)
        assert inv.existencia == 10, f"Esperado stock 10 tras anulación, pero es {inv.existencia}"
        print(f"✓ Inventario restaurado tras anulación OK: stock en {inv.existencia}")

        print("\n=== TODOS LOS ENDPOINTS Y LA LÓGICA DE INVENTARIO FUNCIONAN CORRECTAMENTE ===")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
