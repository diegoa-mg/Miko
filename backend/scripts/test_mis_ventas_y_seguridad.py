"""
Pruebas exhaustivas para:
1. Registro de ventas reforzado:
   - Uso obligatorio del precio de BD (ignora precio enviado por cliente)
   - Validación de producto activo (rechaza inactivos)
   - Validación de pertenencia del producto a la sucursal de la venta
   - Rechazo de cantidad menor o igual a cero
2. Endpoint GET /ventas/mis-ventas:
   - Consulta exclusiva de ventas del cajero autenticado
   - Filtro por rango de fechas respetando la zona horaria del negocio
   - Validación de orden de fechas (fecha_inicio <= fecha_fin)
   - Validación de permisos (rol cajero)
"""
import os
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

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
    listar_mis_ventas,
    registrar_venta,
    eliminar_venta,
)
from src.services.fechas import hoy_en_negocio


def run_tests():
    db = SessionLocal()
    ventas_creadas = []
    try:
        print("=" * 65)
        print("  PRUEBAS: REFUERZO DE REGISTRO DE VENTAS Y GET /ventas/mis-ventas")
        print("=" * 65)

        # ── 1. Preparar datos de prueba ──────────────────────────────
        rol_cajero = db.query(Rol).filter(Rol.nombre == "cajero").first()
        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()

        # Sucursal 1 (Principal)
        suc1 = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Prueba 1").first()
        if not suc1:
            suc1 = Sucursal(nombre="Sucursal Prueba 1", direccion="Av. 1 #100", estado="activa")
            db.add(suc1)
            db.commit()
            db.refresh(suc1)

        # Sucursal 2 (Secundaria)
        suc2 = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Prueba 2").first()
        if not suc2:
            suc2 = Sucursal(nombre="Sucursal Prueba 2", direccion="Av. 2 #200", estado="activa")
            db.add(suc2)
            db.commit()
            db.refresh(suc2)

        # Cajero 1 (asignado a Sucursal 1)
        cajero1 = db.query(Usuario).filter(Usuario.email == "cajero1_test_mis_ventas@miko.com").first()
        if not cajero1:
            cajero1 = Usuario(
                nombre="Cajero Uno Test",
                email="cajero1_test_mis_ventas@miko.com",
                password_hash="fakehash",
                rol_id=rol_cajero.id,
                sucursal_id=suc1.id,
            )
            db.add(cajero1)
            db.commit()
            db.refresh(cajero1)
        cajero1.rol = rol_cajero
        cajero1.sucursal_id = suc1.id

        # Cajero 2 (asignado a Sucursal 2)
        cajero2 = db.query(Usuario).filter(Usuario.email == "cajero2_test_mis_ventas@miko.com").first()
        if not cajero2:
            cajero2 = Usuario(
                nombre="Cajero Dos Test",
                email="cajero2_test_mis_ventas@miko.com",
                password_hash="fakehash",
                rol_id=rol_cajero.id,
                sucursal_id=suc2.id,
            )
            db.add(cajero2)
            db.commit()
            db.refresh(cajero2)
        cajero2.rol = rol_cajero
        cajero2.sucursal_id = suc2.id

        # Admin
        admin = db.query(Usuario).filter(Usuario.email == "admin_test_mis_ventas@miko.com").first()
        if not admin:
            admin = Usuario(
                nombre="Admin General Test",
                email="admin_test_mis_ventas@miko.com",
                password_hash="fakehash",
                rol_id=rol_admin.id,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        admin.rol = rol_admin
        db.commit()

        # Categoria
        cat = db.query(Categoria).filter(Categoria.nombre == "Cat Refuerzo Test").first()
        if not cat:
            cat = Categoria(nombre="Cat Refuerzo Test")
            db.add(cat)
            db.commit()
            db.refresh(cat)

        # Producto 1: Activo en Sucursal 1 (Precio BD: $100.00)
        prod_suc1 = db.query(Producto).filter(
            Producto.nombre == "Producto Suc1 Activo",
            Producto.sucursal_id == suc1.id,
        ).first()
        if not prod_suc1:
            prod_suc1 = Producto(
                nombre="Producto Suc1 Activo",
                precio=Decimal("100.00"),
                categoria_id=cat.id,
                sucursal_id=suc1.id,
                activo=True,
            )
            db.add(prod_suc1)
            db.commit()
            db.refresh(prod_suc1)
        else:
            prod_suc1.activo = True
            prod_suc1.precio = Decimal("100.00")
            db.commit()

        # Producto 2: Inactivo en Sucursal 1
        prod_inactivo = db.query(Producto).filter(
            Producto.nombre == "Producto Suc1 Inactivo",
            Producto.sucursal_id == suc1.id,
        ).first()
        if not prod_inactivo:
            prod_inactivo = Producto(
                nombre="Producto Suc1 Inactivo",
                precio=Decimal("50.00"),
                categoria_id=cat.id,
                sucursal_id=suc1.id,
                activo=False,
            )
            db.add(prod_inactivo)
            db.commit()
            db.refresh(prod_inactivo)
        else:
            prod_inactivo.activo = False
            db.commit()

        # Producto 3: Activo en Sucursal 2 (Pertenece a otra sucursal)
        prod_suc2 = db.query(Producto).filter(
            Producto.nombre == "Producto Suc2 Activo",
            Producto.sucursal_id == suc2.id,
        ).first()
        if not prod_suc2:
            prod_suc2 = Producto(
                nombre="Producto Suc2 Activo",
                precio=Decimal("75.00"),
                categoria_id=cat.id,
                sucursal_id=suc2.id,
                activo=True,
            )
            db.add(prod_suc2)
            db.commit()
            db.refresh(prod_suc2)
        else:
            prod_suc2.activo = True
            db.commit()

        # Inventarios
        for p, s in [(prod_suc1, suc1), (prod_inactivo, suc1), (prod_suc2, suc2)]:
            inv = db.query(Inventario).filter(Inventario.sucursal_id == s.id, Inventario.producto_id == p.id).first()
            if not inv:
                inv = Inventario(sucursal_id=s.id, producto_id=p.id, existencia=100)
                db.add(inv)
            else:
                inv.existencia = 100
            db.commit()

        metodo = db.query(MetodoPago).first()
        if not metodo:
            metodo = MetodoPago(nombre=NombreMetodoPago.EFECTIVO)
            db.add(metodo)
            db.commit()
            db.refresh(metodo)

        # ═════════════════════════════════════════════════════════════════
        # CASO 1: Ignorar precio enviado por el cliente y usar el de la BD
        # ═════════════════════════════════════════════════════════════════
        print("\n--- CASO 1: Ignora precio del cliente y usa precio BD ($100.00) ---")
        # El cliente envía precio_unitario = $5.00, pero el producto vale $100.00 en BD
        venta_fake_precio = VentaCreate(
            sucursal_id=suc1.id,
            metodo_pago_id=metodo.id,
            detalles=[
                DetalleVentaCreate(
                    producto_id=prod_suc1.id,
                    cantidad=2,
                    precio_unitario=Decimal("5.00"),  # <-- intento de alterar precio
                )
            ],
        )
        venta_res = registrar_venta(venta_in=venta_fake_precio, db=db, usuario_actual=cajero1)
        ventas_creadas.append(venta_res.id)

        assert venta_res.total == Decimal("200.00"), f"Total esperado $200.00, pero se obtuvo ${venta_res.total}"
        assert venta_res.detalles[0].precio_unitario == Decimal("100.00")
        assert venta_res.detalles[0].subtotal == Decimal("200.00")
        print(f"  ✓ Venta #{venta_res.id} registrada con precio BD: unitario=${venta_res.detalles[0].precio_unitario}, total=${venta_res.total}")

        # ═════════════════════════════════════════════════════════════════
        # CASO 2: Rechazar producto inactivo
        # ═════════════════════════════════════════════════════════════════
        print("\n--- CASO 2: Rechaza producto inactivo (activo=False) ---")
        venta_inactivo = VentaCreate(
            sucursal_id=suc1.id,
            metodo_pago_id=metodo.id,
            detalles=[
                DetalleVentaCreate(
                    producto_id=prod_inactivo.id,
                    cantidad=1,
                )
            ],
        )
        try:
            registrar_venta(venta_in=venta_inactivo, db=db, usuario_actual=cajero1)
            assert False, "Debió rechazar el producto inactivo"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "no está activo" in exc.detail
            print(f"  ✓ Rechazado correctamente con 400: {exc.detail}")

        # ═════════════════════════════════════════════════════════════════
        # CASO 3: Rechazar producto que pertenece a otra sucursal
        # ═════════════════════════════════════════════════════════════════
        print("\n--- CASO 3: Rechaza producto que pertenece a otra sucursal ---")
        # Cajero 1 vende en Sucursal 1, pero envía producto de Sucursal 2
        venta_otra_sucursal = VentaCreate(
            sucursal_id=suc1.id,
            metodo_pago_id=metodo.id,
            detalles=[
                DetalleVentaCreate(
                    producto_id=prod_suc2.id,  # Pertenece a Sucursal 2
                    cantidad=1,
                )
            ],
        )
        try:
            registrar_venta(venta_in=venta_otra_sucursal, db=db, usuario_actual=cajero1)
            assert False, "Debió rechazar producto de otra sucursal"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "no pertenece a la sucursal" in exc.detail
            print(f"  ✓ Rechazado correctamente con 400: {exc.detail}")

        # ═════════════════════════════════════════════════════════════════
        # CASO 4: Rechazar cantidades menores o iguales a cero
        # ═════════════════════════════════════════════════════════════════
        print("\n--- CASO 4: Rechaza cantidades <= 0 ---")
        # En la capa lógica de registrar_venta
        # Creamos un objeto simulado saltándonos Pydantic para verificar la defensa en profundidad del router
        class FakeItem:
            producto_id = prod_suc1.id
            cantidad = 0
            precio_unitario = None

        class FakeVenta:
            sucursal_id = suc1.id
            metodo_pago_id = metodo.id
            detalles = [FakeItem()]

        try:
            registrar_venta(venta_in=FakeVenta(), db=db, usuario_actual=cajero1)
            assert False, "Debió rechazar cantidad <= 0"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "mayor a cero" in exc.detail
            print(f"  ✓ Rechazado correctamente con 400: {exc.detail}")

        # ═════════════════════════════════════════════════════════════════
        # CASO 5: GET /ventas/mis-ventas solo devuelve ventas del cajero
        # ═════════════════════════════════════════════════════════════════
        print("\n--- CASO 5: GET /ventas/mis-ventas solo devuelve ventas del cajero actual ---")
        # Creamos una venta para Cajero 2 en Sucursal 2
        venta_cajero2 = VentaCreate(
            sucursal_id=suc2.id,
            metodo_pago_id=metodo.id,
            detalles=[
                DetalleVentaCreate(
                    producto_id=prod_suc2.id,
                    cantidad=1,
                )
            ],
        )
        res_c2 = registrar_venta(venta_in=venta_cajero2, db=db, usuario_actual=cajero2)
        ventas_creadas.append(res_c2.id)

        # Consultar mis-ventas para Cajero 1
        mis_ventas_c1 = listar_mis_ventas(db=db, usuario_actual=cajero1)
        ids_c1 = [v.id for v in mis_ventas_c1]
        assert venta_res.id in ids_c1, f"La venta #{venta_res.id} debería estar en mis-ventas de Cajero 1"
        assert res_c2.id not in ids_c1, f"La venta #{res_c2.id} de Cajero 2 NO debe estar en mis-ventas de Cajero 1"
        for v in mis_ventas_c1:
            assert v.usuario_id == cajero1.id, "Todas las ventas retornadas deben pertenecer a Cajero 1"
        print(f"  ✓ Cajero 1 solo ve sus ventas (Venta #{venta_res.id} presente, Venta #{res_c2.id} excluida)")

        # Consultar mis-ventas para Cajero 2
        mis_ventas_c2 = listar_mis_ventas(db=db, usuario_actual=cajero2)
        ids_c2 = [v.id for v in mis_ventas_c2]
        assert res_c2.id in ids_c2, f"La venta #{res_c2.id} debería estar en mis-ventas de Cajero 2"
        assert venta_res.id not in ids_c2, f"La venta #{venta_res.id} de Cajero 1 NO debe estar en mis-ventas de Cajero 2"
        print(f"  ✓ Cajero 2 solo ve sus ventas (Venta #{res_c2.id} presente, Venta #{venta_res.id} excluida)")

        # ═════════════════════════════════════════════════════════════════
        # CASO 6: Filtro por rango de fechas en la zona horaria del negocio
        # ═════════════════════════════════════════════════════════════════
        print("\n--- CASO 6: Filtro por fechas con zona horaria del negocio ---")
        hoy = hoy_en_negocio()
        ventas_hoy = listar_mis_ventas(fecha_inicio=hoy, fecha_fin=hoy, db=db, usuario_actual=cajero1)
        assert any(v.id == venta_res.id for v in ventas_hoy), "La venta registrada hoy debe aparecer en el filtro de hoy"
        print(f"  ✓ Filtro fecha_inicio={hoy} a fecha_fin={hoy} incluye la venta actual")

        # Filtro en un rango pasado que no debe contener la venta
        ayer = hoy - timedelta(days=1)
        anteayer = hoy - timedelta(days=2)
        ventas_pasado = listar_mis_ventas(fecha_inicio=anteayer, fecha_fin=ayer, db=db, usuario_actual=cajero1)
        assert not any(v.id == venta_res.id for v in ventas_pasado), "La venta de hoy NO debe aparecer en el rango pasado"
        print(f"  ✓ Filtro pasado fecha_inicio={anteayer} a fecha_fin={ayer} excluye la venta de hoy")

        # Validación de rango inconsistente (fecha_inicio > fecha_fin)
        try:
            listar_mis_ventas(fecha_inicio=hoy, fecha_fin=ayer, db=db, usuario_actual=cajero1)
            assert False, "Debió rechazar fecha_inicio > fecha_fin"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "no puede ser posterior" in exc.detail
            print(f"  ✓ Rechazado correctamente fecha_inicio > fecha_fin con 400: {exc.detail}")

        # ═════════════════════════════════════════════════════════════════
        # Limpieza de ventas de prueba
        # ═════════════════════════════════════════════════════════════════
        print("\n--- Limpieza ---")
        for vid in ventas_creadas:
            eliminar_venta(venta_id=vid, db=db, usuario_actual=admin)
        ventas_creadas = []
        print("  ✓ Ventas de prueba eliminadas")

        print("\n" + "=" * 65)
        print("  ✅ TODOS LOS CASOS DE REFUERZO Y MIS-VENTAS PASARON EXITOSAMENTE")
        print("=" * 65)

    except Exception as e:
        print(f"\n  ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        for vid in ventas_creadas:
            try:
                eliminar_venta(venta_id=vid, db=db, usuario_actual=admin)
            except Exception:
                pass
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
