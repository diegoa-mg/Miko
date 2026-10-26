import sys
import os
from datetime import datetime, timezone
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import app
from src.database import SessionLocal
from src.models import Usuario, Rol, Sucursal
from src.security import hash_password, crear_access_token, crear_token_aviso

client = TestClient(app)

def test_aviso_completo():
    db = SessionLocal()
    try:
        print("\n--- INICIANDO PRUEBAS DE AVISO DE PRIVACIDAD ---")

        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()
        rol_gerente = db.query(Rol).filter(Rol.nombre == "gerente_sede").first()
        rol_cajero = db.query(Rol).filter(Rol.nombre == "cajero").first()

        # Sucursales de prueba
        suc1 = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Aviso 1").first()
        if not suc1:
            suc1 = Sucursal(nombre="Sucursal Aviso 1", direccion="Calle 1", telefono="111", estado="activa")
            db.add(suc1)
            db.commit()
            db.refresh(suc1)

        suc2 = db.query(Sucursal).filter(Sucursal.nombre == "Sucursal Aviso 2").first()
        if not suc2:
            suc2 = Sucursal(nombre="Sucursal Aviso 2", direccion="Calle 2", telefono="222", estado="activa")
            db.add(suc2)
            db.commit()
            db.refresh(suc2)

        # Admin
        admin = db.query(Usuario).filter(Usuario.email == "test_admin_aviso@miko.com").first()
        if not admin:
            admin = Usuario(
                nombre="Admin Aviso",
                email="test_admin_aviso@miko.com",
                password_hash=hash_password("Miko12345"),
                rol_id=rol_admin.id,
                activo=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Gerente en suc 1
        gerente1 = db.query(Usuario).filter(Usuario.email == "test_gerente1_aviso@miko.com").first()
        if not gerente1:
            gerente1 = Usuario(
                nombre="Gerente Suc 1",
                email="test_gerente1_aviso@miko.com",
                password_hash=hash_password("Miko12345"),
                rol_id=rol_gerente.id,
                activo=True,
                aviso_aceptado_en=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            db.add(gerente1)
            db.commit()
            db.refresh(gerente1)
        suc1.gerente_id = gerente1.id
        db.commit()

        # Cajero en suc 1 (pendiente)
        cajero_suc1 = db.query(Usuario).filter(Usuario.email == "test_cajero1_aviso@miko.com").first()
        if not cajero_suc1:
            cajero_suc1 = Usuario(
                nombre="Cajero Pendiente Suc 1",
                email="test_cajero1_aviso@miko.com",
                password_hash=hash_password("Miko12345"),
                rol_id=rol_cajero.id,
                sucursal_id=suc1.id,
                activo=True,
                aviso_aceptado_en=None,
            )
            db.add(cajero_suc1)
            db.commit()
            db.refresh(cajero_suc1)
        else:
            cajero_suc1.aviso_aceptado_en = None
            db.commit()

        # Cajero en suc 2 (pendiente)
        cajero_suc2 = db.query(Usuario).filter(Usuario.email == "test_cajero2_aviso@miko.com").first()
        if not cajero_suc2:
            cajero_suc2 = Usuario(
                nombre="Cajero Pendiente Suc 2",
                email="test_cajero2_aviso@miko.com",
                password_hash=hash_password("Miko12345"),
                rol_id=rol_cajero.id,
                sucursal_id=suc2.id,
                activo=True,
                aviso_aceptado_en=None,
            )
            db.add(cajero_suc2)
            db.commit()
            db.refresh(cajero_suc2)
        else:
            cajero_suc2.aviso_aceptado_en = None
            db.commit()

        # 1. Login con usuario admin (no requiere aviso)
        resp = client.post("/login", json={"email": "test_admin_aviso@miko.com", "password": "Miko12345"})
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        admin_token = resp.json()["token"]
        print("✓ 1. Login de admin da 200")

        # 2. Login con contraseña incorrecta de usuario pendiente: 401 genérico
        resp = client.post("/login", json={"email": "test_cajero1_aviso@miko.com", "password": "PasswordIncorrecto"})
        assert resp.status_code == 401
        assert resp.json().get("detail") == "Correo o contraseña incorrectos", f"Error en 401 generico: {resp.text}"
        print("✓ 2. Contraseña incorrecta para usuario pendiente da 401 genérico")

        # 3. Login con contraseña correcta de usuario pendiente: 401 con código aviso_pendiente
        resp = client.post("/login", json={"email": "test_cajero1_aviso@miko.com", "password": "Miko12345"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        detail = resp.json().get("detail", {})
        assert detail.get("codigo") == "aviso_pendiente", f"Expected codigo aviso_pendiente, got {detail}"
        print("✓ 3. Login de usuario pendiente da 401 con codigo aviso_pendiente")

        # 4. POST /aviso-privacidad/aceptar con token basura: 400
        resp = client.post("/aviso-privacidad/aceptar", json={"token": "basura"})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert resp.json().get("detail") == "El enlace no es válido."
        print("✓ 4. Aceptar con token basura da 400 'El enlace no es válido.'")

        # 5. POST /aviso-privacidad/aceptar con token de sesión (JWT normal): 400
        resp = client.post("/aviso-privacidad/aceptar", json={"token": admin_token})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert resp.json().get("detail") == "El enlace no es válido."
        print("✓ 5. Aceptar con token de sesión da 400 'El enlace no es válido.'")

        # 6. POST /aviso-privacidad/aceptar con token de aviso válido
        token_aviso = crear_token_aviso(cajero_suc1.id)
        resp = client.post("/aviso-privacidad/aceptar", json={"token": token_aviso})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        db.refresh(cajero_suc1)
        fecha_primera = cajero_suc1.aviso_aceptado_en
        assert fecha_primera is not None, "Fecha aviso_aceptado_en no se guardó"
        print("✓ 6. Aceptar con token de aviso válido da 200 y guarda fecha")

        # 7. Repetir aceptación (idempotente: no sobrescribe fecha)
        resp = client.post("/aviso-privacidad/aceptar", json={"token": token_aviso})
        assert resp.status_code == 200
        db.refresh(cajero_suc1)
        assert cajero_suc1.aviso_aceptado_en == fecha_primera, "Idempotencia falló: fecha cambió"
        print("✓ 7. Repetir aceptación es idempotente (200 sin cambiar fecha)")

        # 8. Login con usuario después de aceptar: 200
        resp = client.post("/login", json={"email": "test_cajero1_aviso@miko.com", "password": "Miko12345"})
        assert resp.status_code == 200, f"Expected 200 after accept, got {resp.status_code}: {resp.text}"
        print("✓ 8. Login de usuario tras aceptar aviso da 200")

        # 9. GET /me muestra aviso_pendiente = False
        cajero_token = resp.json()["token"]
        resp_me = client.get("/me", headers={"Authorization": f"Bearer {cajero_token}"})
        assert resp_me.status_code == 200
        assert resp_me.json()["aviso_pendiente"] is False
        print("✓ 9. GET /me refleja aviso_pendiente == False")

        # 10. Reenviar aviso a cajero que ya aceptó: 400
        resp = client.post(
            f"/cajeros/{cajero_suc1.id}/reenviar-aviso",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert resp.json().get("detail") == "El cajero ya aceptó el aviso de privacidad"
        print("✓ 10. Reenviar aviso a cajero ya aceptado da 400")

        # 11. Reenviar aviso a cajero pendiente (cajero_suc2): 200
        resp = client.post(
            f"/cajeros/{cajero_suc2.id}/reenviar-aviso",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert "Se reenviará el aviso" in resp.json().get("message", "")
        print("✓ 11. Reenviar aviso como admin a cajero pendiente da 200")

        # 12. Login de gerente 1
        resp_ger = client.post("/login", json={"email": "test_gerente1_aviso@miko.com", "password": "Miko12345"})
        assert resp_ger.status_code == 200
        gerente_token = resp_ger.json()["token"]

        # 13. Gerente 1 reenvía aviso a cajero_suc2 (que es de suc 2): 404
        resp = client.post(
            f"/cajeros/{cajero_suc2.id}/reenviar-aviso",
            headers={"Authorization": f"Bearer {gerente_token}"},
        )
        assert resp.status_code == 404, f"Expected 404 for other branch cajero, got {resp.status_code}"
        print("✓ 12. Gerente no puede reenviar aviso a cajero de otra sucursal (404)")

        # 14. Descarga de PDF pública /aviso-privacidad/pdf
        resp = client.get("/aviso-privacidad/pdf")
        assert resp.status_code == 200, f"Expected 200 for PDF, got {resp.status_code}"
        assert resp.headers.get("content-type") == "application/pdf"
        print("✓ 13. GET /aviso-privacidad/pdf devuelve 200 con application/pdf")

        print("\nTODAS LAS PRUEBAS DE AVISO DE PRIVACIDAD PASARON EXITOSAMENTE.")

    finally:
        db.close()

if __name__ == "__main__":
    test_aviso_completo()
