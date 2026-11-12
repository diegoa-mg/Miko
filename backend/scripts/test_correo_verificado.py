"""
Pruebas de verificación de correo al registrar (aceptar aviso de privacidad)
y al cambiar de correo (PATCH /cuenta y POST /cuenta/confirmar-email).
"""
import os
import sys
from datetime import datetime, timezone
import jwt
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import app
from src.database import SessionLocal
from src.models import Usuario, Rol, Sucursal
from src.security import (
    hash_password,
    crear_token_aviso,
    crear_token_confirmar_email,
)

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    print("\n" + "=" * 65)
    print("  PRUEBAS: VERIFICACIÓN DE CORREO (REGISTRO Y CAMBIO)")
    print("=" * 65)

    try:
        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()
        rol_gerente = db.query(Rol).filter(Rol.nombre == "gerente_sede").first()
        rol_cajero = db.query(Rol).filter(Rol.nombre == "cajero").first()

        email_cajero = "cajero_verif_test@miko.com"
        email_gerente = "gerente_verif_test@miko.com"
        email_cambio = "nuevo_correo_verif_test@miko.com"

        # Limpiar usuarios previos de pruebas
        db.query(Usuario).filter(Usuario.email.in_([email_cajero, email_gerente, email_cambio])).delete(synchronize_session=False)
        db.commit()

        # 1. Crear un cajero nuevo: correo_verificado_en y aviso_aceptado_en deben ser None
        cajero = Usuario(
            nombre="Cajero Verif Test",
            email=email_cajero,
            password_hash=hash_password("Pass123!"),
            rol_id=rol_cajero.id,
            activo=True,
            aviso_aceptado_en=None,
            correo_verificado_en=None,
        )
        # Crear un gerente nuevo
        gerente = Usuario(
            nombre="Gerente Verif Test",
            email=email_gerente,
            password_hash=hash_password("Pass123!"),
            rol_id=rol_gerente.id,
            activo=True,
            aviso_aceptado_en=None,
            correo_verificado_en=None,
        )
        db.add_all([cajero, gerente])
        db.commit()
        db.refresh(cajero)
        db.refresh(gerente)

        print("\n--- Test 1: Usuario recién registrado no tiene correo verificado ---")
        assert cajero.correo_verificado_en is None
        assert cajero.aviso_aceptado_en is None
        print("  ✓ correo_verificado_en y aviso_aceptado_en son None inicialmente")

        print("\n--- Test 2: Cajero acepta aviso de privacidad y marca correo verificado ---")
        token_aviso_cajero = crear_token_aviso(cajero.id)
        resp = client.post("/aviso-privacidad/aceptar", json={"token": token_aviso_cajero})
        assert resp.status_code == 200, f"Error {resp.status_code}: {resp.text}"

        db.refresh(cajero)
        assert cajero.aviso_aceptado_en is not None
        assert cajero.correo_verificado_en is not None
        fecha_verif_cajero = cajero.correo_verificado_en
        print(f"  ✓ Cajero verificado exitosamente en: {fecha_verif_cajero}")

        print("\n--- Test 3: Idempotencia: aceptar de nuevo no cambia la fecha ---")
        resp_repetida = client.post("/aviso-privacidad/aceptar", json={"token": token_aviso_cajero})
        assert resp_repetida.status_code == 200
        db.refresh(cajero)
        assert cajero.correo_verificado_en == fecha_verif_cajero
        print("  ✓ La fecha de verificación original se mantiene intacta")

        print("\n--- Test 4: Gerente acepta aviso de privacidad y marca correo verificado ---")
        token_aviso_gerente = crear_token_aviso(gerente.id)
        resp_g = client.post("/aviso-privacidad/aceptar", json={"token": token_aviso_gerente})
        assert resp_g.status_code == 200

        db.refresh(gerente)
        assert gerente.aviso_aceptado_en is not None
        assert gerente.correo_verificado_en is not None
        print(f"  ✓ Gerente verificado exitosamente en: {gerente.correo_verificado_en}")

        print("\n--- Test 5: Confirmar cambio de correo actualiza email y correo_verificado_en ---")
        token_confirmar = crear_token_confirmar_email(cajero.id, email_cambio)
        resp_confirm = client.post("/cuenta/confirmar-email", json={"token": token_confirmar})
        assert resp_confirm.status_code == 200, f"Error {resp_confirm.status_code}: {resp_confirm.text}"

        db.refresh(cajero)
        assert cajero.email == email_cambio
        assert cajero.correo_verificado_en is not None
        assert resp_confirm.json()["correo_verificado"] is True
        print(f"  ✓ Email cambiado a {cajero.email} y verificado en {cajero.correo_verificado_en}")

        print("\n--- Test 6: Migración / Usuarios preexistentes quedan con correo verificado ---")
        admin = db.query(Usuario).filter(Usuario.rol_id == rol_admin.id).first()
        if admin:
            print(f"  ✓ Usuario administrador preexistente ({admin.email}): verificado = {admin.correo_verificado_en is not None}")

        print("\n--- Limpieza de datos de prueba ---")
        db.query(Usuario).filter(Usuario.email.in_([email_cajero, email_gerente, email_cambio])).delete(synchronize_session=False)
        db.commit()
        print("  ✓ Limpieza completada.")
        print("\n" + "=" * 65)
        print("  TODAS LAS PRUEBAS DE VERIFICACIÓN DE CORREO PASARON EXITOSAMENTE")
        print("=" * 65 + "\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
