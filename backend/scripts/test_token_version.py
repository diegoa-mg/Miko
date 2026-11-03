import sys
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import app
from src.database import SessionLocal
from src.models import Usuario, Rol
from src.security import hash_password, JWT_SECRET_KEY, JWT_ALGORITHM

client = TestClient(app)

PASSWORD = "Miko.12345"
PASSWORD_NUEVA = "Miko.54321"


def preparar_usuario(db, email, nombre):
    """
    Crea el usuario de prueba si no existe y lo deja en un estado conocido en cada corrida
    (contraseña original y token_version = 0), porque las pruebas cambian ambas cosas.
    """
    rol = db.query(Rol).filter(Rol.nombre == "admin_general").first()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=hash_password(PASSWORD),
            rol_id=rol.id,
            activo=True,
        )
        db.add(usuario)
    else:
        usuario.password_hash = hash_password(PASSWORD)
        usuario.token_version = 0
    db.commit()
    db.refresh(usuario)
    return usuario


def login(email, password=PASSWORD):
    resp = client.post("/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login falló: {resp.status_code} {resp.text}"
    return resp.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_token_version():
    db = SessionLocal()
    try:
        print("\n--- INICIANDO PRUEBAS DE TOKEN_VERSION ---")

        u1 = preparar_usuario(db, "test_tokenver1@miko.com", "Token Ver 1")
        u2 = preparar_usuario(db, "test_tokenver2@miko.com", "Token Ver 2")

        # 1. Token con la versión vigente: 200
        token = login(u1.email)
        resp = client.get("/me", headers=auth(token))
        assert resp.status_code == 200, f"Esperaba 200, obtuve {resp.status_code}: {resp.text}"
        print("✓ 1. Token con versión vigente da 200")

        # 2. Token con versión vieja: se sube la versión en la BD y el mismo token deja de servir
        u1.token_version += 1
        db.commit()
        resp = client.get("/me", headers=auth(token))
        assert resp.status_code == 401, f"Esperaba 401, obtuve {resp.status_code}"
        print("✓ 2. Token con versión vieja da 401")

        # 3. Token sin la clave "ver" (de antes de token_version): 401
        ahora = datetime.now(timezone.utc)
        token_sin_ver = jwt.encode(
            {"sub": str(u1.id), "iat": ahora, "exp": ahora + timedelta(minutes=5)},
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )
        resp = client.get("/me", headers=auth(token_sin_ver))
        assert resp.status_code == 401, f"Esperaba 401, obtuve {resp.status_code}"
        print("✓ 3. Token sin la clave 'ver' da 401")

        # 4. Cambio de contraseña: el token viejo da 401 y el token nuevo de la respuesta da 200
        token_viejo = login(u1.email)  # lleva la versión actual (1)
        resp = client.put(
            "/cuenta/password",
            headers=auth(token_viejo),
            json={"password_actual": PASSWORD, "password_nueva": PASSWORD_NUEVA},
        )
        assert resp.status_code == 200, f"Cambio de contraseña falló: {resp.status_code} {resp.text}"
        token_nuevo = resp.json()["token"]

        resp = client.get("/me", headers=auth(token_viejo))
        assert resp.status_code == 401, f"El token viejo debería dar 401, obtuve {resp.status_code}"
        resp = client.get("/me", headers=auth(token_nuevo))
        assert resp.status_code == 200, f"El token nuevo debería dar 200, obtuve {resp.status_code}"
        print("✓ 4. Cambiar contraseña invalida el token viejo y el token nuevo funciona")

        # 5. Cerrar sesiones: el mismo token usado deja de servir, pero un login nuevo sí funciona
        resp = client.post("/cuenta/cerrar-sesiones", headers=auth(token_nuevo))
        assert resp.status_code == 200, f"Cerrar sesiones falló: {resp.status_code} {resp.text}"
        resp = client.get("/me", headers=auth(token_nuevo))
        assert resp.status_code == 401, f"Tras cerrar sesiones esperaba 401, obtuve {resp.status_code}"
        token_relogin = login(u1.email, PASSWORD_NUEVA)
        resp = client.get("/me", headers=auth(token_relogin))
        assert resp.status_code == 200, f"Un login nuevo debería dar 200, obtuve {resp.status_code}"
        print("✓ 5. Cerrar sesiones invalida el token usado y un login nuevo funciona")

        # 6. El cierre de sesiones de un usuario no afecta a otro
        token_u1 = login(u1.email, PASSWORD_NUEVA)
        token_u2 = login(u2.email)
        resp = client.post("/cuenta/cerrar-sesiones", headers=auth(token_u1))
        assert resp.status_code == 200
        assert client.get("/me", headers=auth(token_u1)).status_code == 401
        assert client.get("/me", headers=auth(token_u2)).status_code == 200, \
            "El token del otro usuario no debería verse afectado"
        print("✓ 6. Cerrar sesiones de un usuario no afecta a otro")

        # 7. Sin token, el endpoint de cerrar sesiones da 401
        resp = client.post("/cuenta/cerrar-sesiones")
        assert resp.status_code == 401, f"Esperaba 401, obtuve {resp.status_code}"
        print("✓ 7. Cerrar sesiones sin token da 401")

        print("\nTODAS LAS PRUEBAS DE TOKEN_VERSION PASARON EXITOSAMENTE.")
    finally:
        db.close()


if __name__ == "__main__":
    test_token_version()