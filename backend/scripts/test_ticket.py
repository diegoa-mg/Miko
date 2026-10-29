"""
Pruebas del endpoint GET /ventas/{id}/ticket
Sigue el mismo patrón de pruebas del proyecto (scripts/test_ventas.py).
"""
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

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
)
from src.schemas import DetalleVentaCreate, VentaCreate
from src.routers.ventas import (
    obtener_ticket_pdf,
    obtener_ticket_venta,
    obtener_venta,
    registrar_venta,
    eliminar_venta,
    listar_ventas,
)


def run_tests():
    db = SessionLocal()
    venta_id = None
    try:
        print("=" * 60)
        print("  PRUEBAS: GET /ventas/{id}/ticket")
        print("=" * 60)

        # ── Preparar datos de prueba ──────────────────────────────
        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()
        if not rol_admin:
            rol_admin = Rol(nombre="admin_general")
            db.add(rol_admin)
            db.commit()
            db.refresh(rol_admin)

        rol_cajero = db.query(Rol).filter(Rol.nombre == "cajero").first()
        if not rol_cajero:
            rol_cajero = Rol(nombre="cajero")
            db.add(rol_cajero)
            db.commit()
            db.refresh(rol_cajero)

        # Sucursal A (donde se hace la venta)
        suc_a = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Ticket A").first()
        if not suc_a:
            suc_a = Sucursal(nombre="Sucursal Ticket A", direccion="Calle Alfa #100", estado="activa")
            db.add(suc_a)
            db.commit()
            db.refresh(suc_a)

        # Sucursal B (otra sucursal para test de 403)
        suc_b = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Ticket B").first()
        if not suc_b:
            suc_b = Sucursal(nombre="Sucursal Ticket B", direccion="Calle Beta #200", estado="activa")
            db.add(suc_b)
            db.commit()
            db.refresh(suc_b)

        # Admin
        admin = db.query(Usuario).filter(Usuario.email == "admin_ticket@test.com").first()
        if not admin:
            admin = Usuario(
                nombre="Admin Ticket",
                email="admin_ticket@test.com",
                password_hash="fakehash",
                rol_id=rol_admin.id,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        admin.rol = rol_admin

        # Cajero de sucursal A
        cajero_a = db.query(Usuario).filter(Usuario.email == "cajero_a_ticket@test.com").first()
        if not cajero_a:
            cajero_a = Usuario(
                nombre="Cajero Sucursal A",
                email="cajero_a_ticket@test.com",
                password_hash="fakehash",
                rol_id=rol_cajero.id,
                sucursal_id=suc_a.id,
            )
            db.add(cajero_a)
            db.commit()
            db.refresh(cajero_a)
        cajero_a.rol = rol_cajero
        cajero_a.sucursal_id = suc_a.id
        db.commit()
        db.refresh(cajero_a)

        # Cajero de sucursal B
        cajero_b = db.query(Usuario).filter(Usuario.email == "cajero_b_ticket@test.com").first()
        if not cajero_b:
            cajero_b = Usuario(
                nombre="Cajero Sucursal B",
                email="cajero_b_ticket@test.com",
                password_hash="fakehash",
                rol_id=rol_cajero.id,
                sucursal_id=suc_b.id,
            )
            db.add(cajero_b)
            db.commit()
            db.refresh(cajero_b)
        cajero_b.rol = rol_cajero
        cajero_b.sucursal_id = suc_b.id
        db.commit()
        db.refresh(cajero_b)

        # Categoria + Producto + Inventario
        cat = db.query(Categoria).filter(Categoria.nombre == "Cat Ticket Test").first()
        if not cat:
            cat = Categoria(nombre="Cat Ticket Test")
            db.add(cat)
            db.commit()
            db.refresh(cat)

        prod = db.query(Producto).filter(
            Producto.nombre == "Producto Ticket Test",
            Producto.sucursal_id == suc_a.id,
        ).first()
        if not prod:
            prod = Producto(
                nombre="Producto Ticket Test",
                precio=Decimal("25.50"),
                categoria_id=cat.id,
                sucursal_id=suc_a.id,
            )
            db.add(prod)
            db.commit()
            db.refresh(prod)

        inv = (
            db.query(Inventario)
            .filter(Inventario.sucursal_id == suc_a.id, Inventario.producto_id == prod.id)
            .first()
        )
        if not inv:
            inv = Inventario(sucursal_id=suc_a.id, producto_id=prod.id, existencia=50)
            db.add(inv)
        else:
            inv.existencia = 50
        db.commit()
        db.refresh(inv)

        metodo = db.query(MetodoPago).first()
        if not metodo:
            metodo = MetodoPago(nombre=NombreMetodoPago.EFECTIVO)
            db.add(metodo)
            db.commit()
            db.refresh(metodo)

        # ── Registrar una venta de prueba ─────────────────────────
        venta_in = VentaCreate(
            sucursal_id=suc_a.id,
            metodo_pago_id=metodo.id,
            detalles=[
                DetalleVentaCreate(producto_id=prod.id, cantidad=4, precio_unitario=Decimal("25.50"))
            ],
        )
        venta_out = registrar_venta(venta_in=venta_in, db=db, usuario_actual=admin)
        venta_id = venta_out.id
        print(f"\n  Venta de prueba creada: ID={venta_id}, Total=${venta_out.total}")

        # ═══════════════════════════════════════════════════════════
        # TEST 1: Ticket happy path (admin, sin restricción)
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 1: Admin obtiene ticket (happy path) ---")
        ticket = obtener_ticket_venta(venta_id=venta_id, db=db, usuario_actual=admin)
        assert ticket.venta_id == venta_id, f"venta_id esperado {venta_id}, obtenido {ticket.venta_id}"
        assert ticket.sucursal == "Sucursal Ticket A", f"sucursal esperada 'Sucursal Ticket A', obtenida '{ticket.sucursal}'"
        assert ticket.direccion_sucursal == "Calle Alfa #100", f"dirección esperada 'Calle Alfa #100', obtenida '{ticket.direccion_sucursal}'"
        assert ticket.cajero == "Admin Ticket", f"cajero esperado 'Admin Ticket', obtenido '{ticket.cajero}'"
        assert ticket.total == Decimal("102.00"), f"total esperado 102.00, obtenido {ticket.total}"
        assert ticket.fecha is not None
        assert len(ticket.productos) == 1
        assert ticket.productos[0].nombre == "Producto Ticket Test"
        assert ticket.productos[0].cantidad == 4
        assert ticket.productos[0].precio_unitario == Decimal("25.50")
        assert ticket.productos[0].subtotal == Decimal("102.00")
        assert ticket.metodo_pago in ("efectivo", "tarjeta", "transferencia")
        print("  ✓ Todos los campos del ticket son correctos")
        print(f"    venta_id={ticket.venta_id}")
        print(f"    sucursal={ticket.sucursal}")
        print(f"    direccion_sucursal={ticket.direccion_sucursal}")
        print(f"    cajero={ticket.cajero}")
        print(f"    fecha={ticket.fecha}")
        productos_info = [{"nombre": p.nombre, "cantidad": p.cantidad, "precio_unitario": str(p.precio_unitario), "subtotal": str(p.subtotal)} for p in ticket.productos]
        print(f"    productos={productos_info}")
        print(f"    metodo_pago={ticket.metodo_pago}")
        print(f"    total={ticket.total}")

        # ═══════════════════════════════════════════════════════════
        # TEST 2: Cajero de la misma sucursal puede ver el ticket
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 2: Cajero de la misma sucursal ve el ticket ---")
        ticket_cajero = obtener_ticket_venta(venta_id=venta_id, db=db, usuario_actual=cajero_a)
        assert ticket_cajero.venta_id == venta_id
        assert ticket_cajero.sucursal == "Sucursal Ticket A"
        print("  ✓ Cajero A ve el ticket correctamente")

        # ═══════════════════════════════════════════════════════════
        # TEST 3: Cajero de OTRA sucursal recibe 403
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 3: Cajero de otra sucursal recibe 403 ---")
        try:
            obtener_ticket_venta(venta_id=venta_id, db=db, usuario_actual=cajero_b)
            assert False, "Debió lanzar HTTPException 403"
        except HTTPException as exc:
            assert exc.status_code == 403, f"Esperado 403, obtenido {exc.status_code}"
            assert "otra sucursal" in exc.detail.lower()
            print(f"  ✓ 403 Forbidden: {exc.detail}")

        # ═══════════════════════════════════════════════════════════
        # TEST 4: Venta inexistente devuelve 404
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 4: Venta inexistente devuelve 404 ---")
        try:
            obtener_ticket_venta(venta_id=999999, db=db, usuario_actual=admin)
            assert False, "Debió lanzar HTTPException 404"
        except HTTPException as exc:
            assert exc.status_code == 404, f"Esperado 404, obtenido {exc.status_code}"
            print(f"  ✓ 404 Not Found: {exc.detail}")

        # ═══════════════════════════════════════════════════════════
        # TEST 5: Endpoints existentes NO se rompieron
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 5: Endpoints existentes siguen funcionando ---")

        # obtener_venta
        venta_existente = obtener_venta(venta_id=venta_id, db=db, usuario_actual=admin)
        assert venta_existente.id == venta_id
        print(f"  ✓ obtener_venta({venta_id}) OK")

        # listar_ventas
        ventas = listar_ventas(db=db, usuario_actual=admin)
        assert any(v.id == venta_id for v in ventas)
        print(f"  ✓ listar_ventas OK (venta {venta_id} presente)")

        # ═══════════════════════════════════════════════════════════
        # TEST 6: Estructura del response contiene TODOS los campos requeridos
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 6: Validar estructura completa del esquema ---")
        ticket_dict = ticket.model_dump()
        campos_requeridos = ["venta_id", "sucursal", "direccion_sucursal", "cajero", "fecha", "productos", "metodo_pago", "total"]
        for campo in campos_requeridos:
            assert campo in ticket_dict, f"Campo '{campo}' falta en la respuesta"
        print(f"  ✓ Todos los campos presentes: {campos_requeridos}")

        campos_producto = ["nombre", "cantidad", "precio_unitario", "subtotal"]
        for campo in campos_producto:
            assert campo in ticket_dict["productos"][0], f"Campo '{campo}' falta en productos"
        print(f"  ✓ Campos de producto presentes: {campos_producto}")

        # ═══════════════════════════════════════════════════════════
        # TEST 7: Generar Ticket PDF (Admin - Happy path)
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 7: Admin descarga ticket en PDF (happy path) ---")
        pdf_response = obtener_ticket_pdf(venta_id=venta_id, db=db, usuario_actual=admin)
        assert pdf_response.media_type == "application/pdf"
        assert pdf_response.status_code == 200
        assert f"ticket_venta_{venta_id}.pdf" in pdf_response.headers.get("Content-Disposition", "")
        pdf_bytes = pdf_response.body
        assert len(pdf_bytes) > 0, "El PDF no debe estar vacío"
        assert pdf_bytes.startswith(b"%PDF-"), "El contenido debe comenzar con la firma %PDF-"
        print(f"  ✓ Ticket PDF generado correctamente ({len(pdf_bytes)} bytes, firma %PDF- válida)")

        # ═══════════════════════════════════════════════════════════
        # TEST 8: Cajero de la misma sucursal puede descargar el PDF
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 8: Cajero de la misma sucursal descarga ticket PDF ---")
        pdf_cajero = obtener_ticket_pdf(venta_id=venta_id, db=db, usuario_actual=cajero_a)
        assert pdf_cajero.media_type == "application/pdf"
        assert pdf_cajero.status_code == 200
        assert pdf_cajero.body.startswith(b"%PDF-")
        print("  ✓ Cajero A descarga el ticket PDF correctamente")

        # ═══════════════════════════════════════════════════════════
        # TEST 9: Cajero de OTRA sucursal recibe 403 al pedir PDF
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 9: Cajero de otra sucursal recibe 403 al pedir PDF ---")
        try:
            obtener_ticket_pdf(venta_id=venta_id, db=db, usuario_actual=cajero_b)
            assert False, "Debió lanzar HTTPException 403"
        except HTTPException as exc:
            assert exc.status_code == 403, f"Esperado 403, obtenido {exc.status_code}"
            assert "otra sucursal" in exc.detail.lower()
            print(f"  ✓ 403 Forbidden para PDF: {exc.detail}")

        # ═══════════════════════════════════════════════════════════
        # TEST 10: Venta inexistente devuelve 404 al pedir PDF
        # ═══════════════════════════════════════════════════════════
        print("\n--- Test 10: Venta inexistente devuelve 404 al pedir PDF ---")
        try:
            obtener_ticket_pdf(venta_id=999999, db=db, usuario_actual=admin)
            assert False, "Debió lanzar HTTPException 404"
        except HTTPException as exc:
            assert exc.status_code == 404, f"Esperado 404, obtenido {exc.status_code}"
            print(f"  ✓ 404 Not Found para PDF: {exc.detail}")

        # ═══════════════════════════════════════════════════════════
        # Limpieza: eliminar la venta de prueba
        # ═══════════════════════════════════════════════════════════
        print("\n--- Limpieza ---")
        eliminar_venta(venta_id=venta_id, db=db, usuario_actual=admin)
        venta_id = None  # ya no necesita limpieza
        print("  ✓ Venta de prueba eliminada")

        print("\n" + "=" * 60)
        print("  ✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE")
        print("=" * 60)

    except Exception as e:
        print(f"\n  ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        # Limpiar la venta de prueba si se creó
        if venta_id is not None:
            try:
                eliminar_venta(venta_id=venta_id, db=db, usuario_actual=admin)
                print(f"  (Limpieza: venta {venta_id} eliminada)")
            except Exception:
                pass
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
