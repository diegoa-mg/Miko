import sys
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import app
from src.database import SessionLocal
from src.models import Usuario, Rol
from src.security import (
    hash_password,
    crear_access_token,
    crear_token_aviso,
    crear_token_restablecer,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    TIPO_TOKEN_RESTABLECER,
)
import src.services.recuperacion_password as svc_recuperacion
from src.services.recuperacion_password import MENSAJE_OLVIDE

client = TestClient(app)

PASSWORD = "Miko.12345"
PASSWORD_NUEVA = "Miko.54321"
ENLACE_INVALIDO = "El enlace no es válido."

# Se reemplaza el envío real: el service importó el nombre en su propio módulo,
# por eso se sustituye ahí. Cada "envío" solo se anota en la lista.
enviados = []


def enviar_falso(usuario_id, nombre, email, token_version):
    enviados.append({"id": usuario_id, "nombre": nombre, "email": email, "version": token_version})


svc_recuperacion.enviar_restablecimiento = enviar_falso


def preparar_usuario(db, email, nombre, rol="admin_general", activo=True, aviso_pendiente=False):
    """Crea el usuario de prueba si no existe y lo deja en un estado conocido en cada corrida."""
    rol_obj = db.query(Rol).filter(Rol.nombre == rol).first()
    aviso = None if aviso_pendiente else datetime.now(timezone.utc).replace(tzinfo=None)
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if not u:
        u = Usuario(nombre=nombre, email=email, rol_id=rol_obj.id)
        db.add(u)
    u.password_hash = hash_password(PASSWORD)
    u.token_version = 0
    u.activo = activo
    u.aviso_aceptado_en = aviso if rol != "admin_general" else None
    db.commit()
    db.refresh(u)
    return u


def login(email, password):
    return client.post("/login", json={"email": email, "password": password})


def olvide(email):
    enviados.clear()
    return client.post("/olvide-password", json={"email": email})


def restablecer(token, password_nueva=PASSWORD_NUEVA):
    return client.post("/restablecer-password", json={"token": token, "password_nueva": password_nueva})


def test_recuperar_password():
    db = SessionLocal()
    try:
        print("\n--- INICIANDO PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA ---")

        u = preparar_usuario(db, "test_recuperar1@miko.com", "Recuperar 1")
        u_inactivo = preparar_usuario(db, "test_recuperar_inactivo@miko.com", "Recuperar Inactivo", activo=False)
        u_aviso = preparar_usuario(db, "test_recuperar_aviso@miko.com", "Recuperar Aviso",
                                   rol="gerente_sede", aviso_pendiente=True)

        # 1. Correo existente: 200, mensaje genérico y se programa UN correo con los datos correctos
        resp = olvide(u.email)
        assert resp.status_code == 200, f"Esperaba 200, obtuve {resp.status_code}: {resp.text}"
        assert resp.json()["message"] == MENSAJE_OLVIDE
        assert len(enviados) == 1, f"Esperaba 1 correo, hubo {len(enviados)}"
        assert enviados[0]["id"] == u.id and enviados[0]["email"] == u.email and enviados[0]["version"] == 0
        mensaje_existente = resp.json()["message"]
        print("✓ 1. Correo existente da 200 y se envía el enlace")

        # 2. Correo inexistente: misma respuesta exacta y NO se envía nada
        resp = olvide("noexiste_recuperar@miko.com")
        assert resp.status_code == 200
        assert resp.json()["message"] == mensaje_existente, "La respuesta no debe cambiar si el correo no existe"
        assert len(enviados) == 0
        print("✓ 2. Correo inexistente da la misma respuesta y no envía correo")

        # 3. Usuario desactivado: misma respuesta y NO se envía nada
        resp = olvide(u_inactivo.email)
        assert resp.status_code == 200 and resp.json()["message"] == mensaje_existente
        assert len(enviados) == 0
        print("✓ 3. Usuario desactivado da la misma respuesta y no envía correo")

        # 4. Usuario con aviso de privacidad pendiente: misma respuesta y NO se envía nada
        resp = olvide(u_aviso.email)
        assert resp.status_code == 200 and resp.json()["message"] == mensaje_existente
        assert len(enviados) == 0
        print("✓ 4. Aviso de privacidad pendiente: misma respuesta y no envía correo")

        # 5. Restablecer con token válido: 200, el login con la contraseña nueva funciona,
        #    la vieja ya no, y la sesión abierta antes del cambio deja de servir
        token_sesion = login(u.email, PASSWORD).json()["token"]
        assert client.get("/me", headers={"Authorization": f"Bearer {token_sesion}"}).status_code == 200
        token = crear_token_restablecer(u.id, u.token_version)
        resp = restablecer(token)
        assert resp.status_code == 200, f"Esperaba 200, obtuve {resp.status_code}: {resp.text}"
        assert login(u.email, PASSWORD_NUEVA).status_code == 200, "Con la contraseña nueva debería entrar"
        assert login(u.email, PASSWORD).status_code == 401, "Con la contraseña vieja ya no debería entrar"
        assert client.get("/me", headers={"Authorization": f"Bearer {token_sesion}"}).status_code == 401, \
            "La sesión abierta antes del restablecimiento debería cerrarse"
        print("✓ 5. Restablecer da 200, cambia la contraseña y cierra las sesiones abiertas")

        # 6. Token reutilizado: el mismo enlace ya no sirve
        resp = restablecer(token, "Miko.99999Otra")
        assert resp.status_code == 400 and resp.json()["detail"] == ENLACE_INVALIDO, resp.text
        assert login(u.email, PASSWORD_NUEVA).status_code == 200, "La contraseña no debería cambiar con un token reutilizado"
        print("✓ 6. Token reutilizado da 400 y no cambia la contraseña")

        # 7. Token vencido: 400 con mensaje propio
        u = preparar_usuario(db, u.email, u.nombre)
        ahora = datetime.now(timezone.utc)
        token_vencido = jwt.encode(
            {"uid": u.id, "ver": u.token_version, "tipo": TIPO_TOKEN_RESTABLECER,
             "iat": ahora - timedelta(hours=1), "exp": ahora - timedelta(minutes=30)},
            JWT_SECRET_KEY, algorithm=JWT_ALGORITHM,
        )
        resp = restablecer(token_vencido)
        assert resp.status_code == 400 and resp.json()["detail"] == "El enlace venció. Solicita uno nuevo.", resp.text
        print("✓ 7. Token vencido da 400 'El enlace venció'")

        # 8. Contraseña inválida: 422 y la contraseña no cambia
        token = crear_token_restablecer(u.id, u.token_version)
        resp = restablecer(token, "abc")
        assert resp.status_code == 422, f"Esperaba 422, obtuve {resp.status_code}: {resp.text}"
        assert login(u.email, PASSWORD).status_code == 200, "La contraseña no debería haber cambiado"
        resp = restablecer(token)  # el mismo token sigue sirviendo: el rechazo no lo consumió
        assert resp.status_code == 200, f"El token debería seguir válido tras un 422: {resp.status_code}"
        print("✓ 8. Contraseña inválida da 422, no cambia la contraseña ni gasta el token")

        # 9. Tokens de otro tipo o basura no sirven
        u = preparar_usuario(db, u.email, u.nombre)
        for nombre, falso in [
            ("token de sesión", crear_access_token(u.id, u.token_version)),
            ("token de aviso de privacidad", crear_token_aviso(u.id)),
            ("texto basura", "basura"),
        ]:
            resp = restablecer(falso)
            assert resp.status_code == 400 and resp.json()["detail"] == ENLACE_INVALIDO, f"{nombre}: {resp.text}"
        print("✓ 9. Tokens de sesión, de aviso y basura dan 400")

        # 10. Un token válido de un usuario desactivado o con aviso pendiente no sirve
        for otro in (u_inactivo, u_aviso):
            token_otro = crear_token_restablecer(otro.id, otro.token_version)
            resp = restablecer(token_otro)
            assert resp.status_code == 400 and resp.json()["detail"] == ENLACE_INVALIDO, resp.text
        print("✓ 10. Token de usuario desactivado o con aviso pendiente da 400")

        print("\nTODAS LAS PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA PASARON EXITOSAMENTE.")
    finally:
        db.close()


if __name__ == "__main__":
    test_recuperar_password()