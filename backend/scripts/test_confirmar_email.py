"""
Pruebas de verificación de correo al cambiarlo desde Configuración (PATCH /cuenta y POST /cuenta/confirmar-email)
"""
import os
import sys
from datetime import datetime, timezone, timedelta
import jwt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configuración por defecto para ejecución local en pruebas
os.environ.setdefault("SMTP_HOST", "localhost")

from src.database import SessionLocal
from src.models import Usuario, Rol
from src.security import (
    crear_access_token,
    crear_token_confirmar_email,
    decodificar_token_confirmar_email,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    TIPO_TOKEN_CONFIRMAR_EMAIL,
    hash_password,
)
from src.routers.cuenta import editar_datos, confirmar_cambio_email
from src.schemas import CuentaUpdateData, ConfirmarEmailRequest
from fastapi import HTTPException


def run_tests():
    print("=" * 65)
    print("  PRUEBAS: VERIFICACIÓN DE CORREO (PATCH /cuenta)")
    print("=" * 65)

    db = SessionLocal()
    try:
        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()
        if not rol_admin:
            print("Error: Se requiere el rol admin_general en la base de datos.")
            return

        # Limpiar usuarios previos de pruebas si existen
        email_base = "usuario_test_email@miko.com"
        email_nuevo_1 = "nuevo_email_1@miko.com"
        email_nuevo_2 = "nuevo_email_2@miko.com"
        email_otro = "otro_usuario_email@miko.com"

        db.query(Usuario).filter(Usuario.email.in_([email_base, email_nuevo_1, email_nuevo_2, email_otro])).delete(synchronize_session=False)
        db.commit()

        # Crear usuarios de prueba
        usuario_principal = Usuario(
            nombre="Usuario Verif",
            email=email_base,
            password_hash=hash_password("Pass123!"),
            rol_id=rol_admin.id,
            activo=True,
            token_version=1,
            aviso_aceptado_en=datetime.now(timezone.utc),
        )
        otro_usuario = Usuario(
            nombre="Otro Usuario",
            email=email_otro,
            password_hash=hash_password("Pass123!"),
            rol_id=rol_admin.id,
            activo=True,
            token_version=1,
            aviso_aceptado_en=datetime.now(timezone.utc),
        )
        db.add_all([usuario_principal, otro_usuario])
        db.commit()
        db.refresh(usuario_principal)
        db.refresh(otro_usuario)

        print("\n--- Test 1: Cambiar solo nombre se aplica de inmediato ---")
        res1 = editar_datos(
            usuario_in=CuentaUpdateData(nombre="Usuario Verif Renombrado"),
            usuario=usuario_principal,
            db=db,
        )
        assert res1.nombre == "Usuario Verif Renombrado"
        assert res1.email == email_base
        assert res1.email_pendiente is None
        assert usuario_principal.nombre == "Usuario Verif Renombrado"
        print("  ✓ Nombre actualizado de inmediato sin alterar email")

        print("\n--- Test 2: Solicitar email ya usado por otro usuario devuelve 400 ---")
        try:
            editar_datos(
                usuario_in=CuentaUpdateData(email=email_otro),
                usuario=usuario_principal,
                db=db,
            )
            assert False, "Debió rechazar correo ocupado con 400"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "ya está en uso" in exc.detail
            print("  ✓ 400 Correcto: correo ya en uso")

        print("\n--- Test 3: Solicitar cambio a nuevo correo envía enlace y no altera la BD ---")
        res3 = editar_datos(
            usuario_in=CuentaUpdateData(email=email_nuevo_1),
            usuario=usuario_principal,
            db=db,
        )
        # La BD debe mantener el correo base hasta confirmar
        db.refresh(usuario_principal)
        assert usuario_principal.email == email_base
        assert res3.email == email_base
        assert res3.email_pendiente == email_nuevo_1
        assert "enlace de confirmación" in res3.mensaje
        print("  ✓ Correo no modificado aún en BD; respuesta incluye email_pendiente y aviso de confirmación")

        print("\n--- Test 4: Token firmado creado y decodificado correctamente ---")
        token_valido = crear_token_confirmar_email(usuario_principal.id, email_nuevo_1)
        uid_dec, email_dec = decodificar_token_confirmar_email(token_valido)
        assert uid_dec == usuario_principal.id
        assert email_dec == email_nuevo_1
        print("  ✓ Token firmado generado y decodificado con uid y nuevo correo")

        print("\n--- Test 5: Confirmar con token válido aplica el cambio en BD ---")
        res_conf = confirmar_cambio_email(
            datos=ConfirmarEmailRequest(token=token_valido),
            db=db,
        )
        db.refresh(usuario_principal)
        assert usuario_principal.email == email_nuevo_1
        assert res_conf.email == email_nuevo_1
        print(f"  ✓ Correo confirmado exitosamente en BD: {usuario_principal.email}")

        print("\n--- Test 6: Token expirado devuelve 400 ---")
        token_expirado = jwt.encode(
            {
                "uid": usuario_principal.id,
                "email": email_nuevo_2,
                "tipo": TIPO_TOKEN_CONFIRMAR_EMAIL,
                "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
            },
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )
        try:
            confirmar_cambio_email(datos=ConfirmarEmailRequest(token=token_expirado), db=db)
            assert False, "Debió rechazar token expirado"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "expirado" in exc.detail
            print("  ✓ 400 Correcto: token expirado rechazado")

        print("\n--- Test 7: Token con tipo incorrecto o alterado devuelve 400 ---")
        token_invalido = jwt.encode(
            {
                "uid": usuario_principal.id,
                "email": email_nuevo_2,
                "tipo": "otro_tipo",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
            },
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )
        try:
            confirmar_cambio_email(datos=ConfirmarEmailRequest(token=token_invalido), db=db)
            assert False, "Debió rechazar token de tipo incorrecto"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "inválido" in exc.detail
            print("  ✓ 400 Correcto: token de tipo incorrecto rechazado")

        print("\n--- Test 8: Si el email fue ocupado antes de confirmar, devuelve 400 ---")
        token_ocupado = crear_token_confirmar_email(usuario_principal.id, email_otro)
        try:
            confirmar_cambio_email(datos=ConfirmarEmailRequest(token=token_ocupado), db=db)
            assert False, "Debió rechazar si el email ya fue tomado"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "ya está en uso" in exc.detail
            print("  ✓ 400 Correcto: rechaza confirmación si el email ya fue tomado")

        print("\n--- Limpieza ---")
        db.query(Usuario).filter(Usuario.email.in_([email_base, email_nuevo_1, email_nuevo_2, email_otro])).delete(synchronize_session=False)
        db.commit()
        print("  ✓ Datos de prueba eliminados")

        print("\n" + "=" * 65)
        print("  ✅ TODAS LAS PRUEBAS DE VERIFICACIÓN DE EMAIL PASARON")
        print("=" * 65)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
