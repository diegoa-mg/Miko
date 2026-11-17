import os
import sys
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import app
from src.database import SessionLocal
from src.models import Usuario, Rol
from src.security import hash_password, crear_token_restablecer
import src.routers.auth as router_auth
from src.services import MAX_INTENTOS_FALLIDOS, MINUTOS_BLOQUEO

client = TestClient(app)

PASSWORD = "Miko.12345"
PASSWORD_NUEVA = "Miko.54321"
CORREOS = [
    "test_bloqueo1@miko.com",
    "test_bloqueo2@miko.com",
    "test_bloqueo_inactivo@miko.com",
    "test_bloqueo_aviso@miko.com",
]

# Se cuenta cuántas veces se llama a bcrypt en el login: con la cuenta bloqueada debe ser 0
llamadas_bcrypt = []
_verify_original = router_auth.verify_password


def verify_con_conteo(password, password_hash):
    llamadas_bcrypt.append(1)
    return _verify_original(password, password_hash)


router_auth.verify_password = verify_con_conteo


def ahora():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def preparar_usuario(db, email, nombre, rol="admin_general", activo=True, aviso_pendiente=False):
    """Crea el usuario si no existe y lo deja en un estado conocido (sin intentos ni bloqueo) en cada corrida."""
    rol_obj = db.query(Rol).filter(Rol.nombre == rol).first()
    u = db.query(Usuario).filter(Usuario.email == email).first()
    if not u:
        u = Usuario(nombre=nombre, email=email, rol_id=rol_obj.id)
        db.add(u)
    u.password_hash = hash_password(PASSWORD)
    u.token_version = 0
    u.activo = activo
    u.aviso_aceptado_en = None if (aviso_pendiente or rol == "admin_general") else ahora()
    u.intentos_fallidos = 0
    u.bloqueado_hasta = None
    db.commit()
    db.refresh(u)
    return u


def login(email, password):
    return client.post("/login", json={"email": email, "password": password})


def estado(db, email):
    """Lee el estado real en la base (no el objeto en memoria)."""
    db.expire_all()
    u = db.query(Usuario).filter(Usuario.email == email).first()
    return u.intentos_fallidos, u.bloqueado_hasta


def test_bloqueo_login():
    db = SessionLocal()
    try:
        print("\n--- INICIANDO PRUEBAS DE BLOQUEO DE LOGIN ---")
        assert MAX_INTENTOS_FALLIDOS == 5 and MINUTOS_BLOQUEO == 15

        u1 = preparar_usuario(db, CORREOS[0], "Bloqueo 1")
        u2 = preparar_usuario(db, CORREOS[1], "Bloqueo 2")
        u_inactivo = preparar_usuario(db, CORREOS[2], "Bloqueo Inactivo", activo=False)
        u_aviso = preparar_usuario(db, CORREOS[3], "Bloqueo Aviso", rol="gerente_sede", aviso_pendiente=True)

        # 1. Intentos 1 a 4 con contraseña incorrecta: 401 genérico, el contador sube y aún no hay bloqueo
        for n in range(1, MAX_INTENTOS_FALLIDOS):
            resp = login(u1.email, "incorrecta")
            assert resp.status_code == 401 and resp.json()["detail"] == "Correo o contraseña incorrectos", resp.text
            assert estado(db, u1.email) == (n, None), f"Tras {n} fallos: {estado(db, u1.email)}"
        print("✓ 1. Los intentos 1 a 4 dan 401 genérico y suben el contador sin bloquear")

        # 2. El intento 5 también da 401, pero ahora la cuenta queda bloqueada 15 minutos
        resp = login(u1.email, "incorrecta")
        assert resp.status_code == 401
        intentos, hasta = estado(db, u1.email)
        assert intentos == MAX_INTENTOS_FALLIDOS and hasta is not None
        faltan = (hasta - ahora()).total_seconds()
        assert MINUTOS_BLOQUEO * 60 - 30 < faltan <= MINUTOS_BLOQUEO * 60, f"bloqueado_hasta fuera de rango: {faltan}s"
        print("✓ 2. El 5.º fallo bloquea la cuenta por 15 minutos")

        # 3. Cuenta bloqueada: 429 (con contraseña incorrecta y también con la correcta), sin llamar a bcrypt
        llamadas_bcrypt.clear()
        for password in ("incorrecta", PASSWORD):
            resp = login(u1.email, password)
            assert resp.status_code == 429, f"Esperaba 429, obtuve {resp.status_code}: {resp.text}"
            detail = resp.json()["detail"]
            assert detail["codigo"] == "cuenta_bloqueada" and "bloqueada" in detail["mensaje"] and "15 minutos" in detail["mensaje"]
            assert 0 < int(resp.headers["Retry-After"]) <= MINUTOS_BLOQUEO * 60
        assert len(llamadas_bcrypt) == 0, "Con la cuenta bloqueada no se debe verificar la contraseña"
        assert estado(db, u1.email) == (MAX_INTENTOS_FALLIDOS, hasta), "El 429 no debe cambiar el contador ni la fecha"
        print("✓ 3. Bloqueada: 429 con mensaje y Retry-After, no verifica la contraseña (ni la correcta) y no cambia nada")

        # 4. El bloqueo es por cuenta: otro usuario sigue entrando normal
        assert login(u2.email, PASSWORD).status_code == 200
        print("✓ 4. Otra cuenta no se ve afectada")

        # 5. Bloqueo vencido + contraseña correcta: entra y todo se reinicia
        u1.bloqueado_hasta = ahora() - timedelta(seconds=1)
        db.commit()
        resp = login(u1.email, PASSWORD)
        assert resp.status_code == 200 and "token" in resp.json(), resp.text
        assert estado(db, u1.email) == (0, None)
        print("✓ 5. Con el bloqueo vencido y la contraseña correcta entra y se reinician los campos")

        # 6. Bloqueo vencido + contraseña incorrecta: 401 y el contador empieza de nuevo (1, no 6)
        for _ in range(MAX_INTENTOS_FALLIDOS):
            login(u1.email, "incorrecta")
        u1.bloqueado_hasta = ahora() - timedelta(seconds=1)
        db.commit()
        resp = login(u1.email, "incorrecta")
        assert resp.status_code == 401
        assert estado(db, u1.email) == (1, None), f"Esperaba (1, None), obtuve {estado(db, u1.email)}"
        print("✓ 6. Con el bloqueo vencido se reinicia el contador antes de contar el nuevo fallo")

        # 7. Un login exitoso reinicia el contador (fallos NO consecutivos no acumulan)
        for _ in range(MAX_INTENTOS_FALLIDOS - 2):
            login(u2.email, "incorrecta")
        assert estado(db, u2.email)[0] == MAX_INTENTOS_FALLIDOS - 2
        assert login(u2.email, PASSWORD).status_code == 200
        assert estado(db, u2.email) == (0, None)
        for _ in range(MAX_INTENTOS_FALLIDOS - 1):
            assert login(u2.email, "incorrecta").status_code == 401
        assert login(u2.email, PASSWORD).status_code == 200, "Con 4 fallos tras un éxito la cuenta no debe estar bloqueada"
        print("✓ 7. El login exitoso reinicia el contador (solo cuentan los fallos consecutivos)")

        # 8. Correo inexistente: 401 genérico, no se guarda nada y no hay 429
        usuarios_antes = db.query(Usuario).count()
        for _ in range(MAX_INTENTOS_FALLIDOS + 2):
            resp = login("noexiste_bloqueo@miko.com", "incorrecta")
            assert resp.status_code == 401 and resp.json()["detail"] == "Correo o contraseña incorrectos"
        assert db.query(Usuario).count() == usuarios_antes
        print("✓ 8. Correo inexistente: siempre 401 genérico y sin guardar nada")

        # 9. Usuario desactivado: sigue dando el mismo 401 genérico, incluso con la contraseña correcta
        resp = login(u_inactivo.email, PASSWORD)
        assert resp.status_code == 401 and resp.json()["detail"] == "Correo o contraseña incorrectos"
        assert estado(db, u_inactivo.email) == (0, None), "Contraseña correcta de un desactivado no cuenta como fallo"
        print("✓ 9. Usuario desactivado: mismo 401 genérico (comportamiento anterior intacto)")

        # 10. Aviso pendiente: sigue el 401 con codigo aviso_pendiente (y la contraseña correcta limpia el contador)
        login(u_aviso.email, "incorrecta")
        assert estado(db, u_aviso.email)[0] == 1
        resp = login(u_aviso.email, PASSWORD)
        assert resp.status_code == 401 and resp.json()["detail"]["codigo"] == "aviso_pendiente", resp.text
        assert estado(db, u_aviso.email) == (0, None)
        print("✓ 10. Aviso pendiente: mismo 401 con 'aviso_pendiente' (comportamiento anterior intacto)")

        # 11. Restablecer contraseña con éxito quita el bloqueo y el contador
        for _ in range(MAX_INTENTOS_FALLIDOS):
            login(u1.email, "incorrecta")
        assert estado(db, u1.email)[1] is not None
        assert login(u1.email, PASSWORD).status_code == 429
        db.refresh(u1)
        token = crear_token_restablecer(u1.id, u1.token_version)
        resp = client.post("/restablecer-password", json={"token": token, "password_nueva": PASSWORD_NUEVA})
        assert resp.status_code == 200, resp.text
        assert estado(db, u1.email) == (0, None)
        assert login(u1.email, PASSWORD_NUEVA).status_code == 200
        print("✓ 11. Restablecer la contraseña desbloquea la cuenta y reinicia el contador")

        print("\nTODAS LAS PRUEBAS DE BLOQUEO DE LOGIN PASARON EXITOSAMENTE.")
    finally:
        db.rollback()
        db.query(Usuario).filter(Usuario.email.in_(CORREOS)).delete(synchronize_session=False)
        db.commit()
        db.close()


if __name__ == "__main__":
    test_bloqueo_login()
