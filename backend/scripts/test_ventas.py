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
                categoria_id=categoria.id
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
