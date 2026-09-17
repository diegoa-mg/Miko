"""
Provisional, solo para probar login/JWT mientras no existe el endpoint
de registro. Ejecutar dentro del contenedor:

    docker compose exec backend python scripts/crear_usuario_prueba.py
"""
from src.database import SessionLocal
from src.models import Rol, Usuario
from src.security import hash_password

db = SessionLocal()

rol = db.query(Rol).filter(Rol.nombre == "admin_general").first()
if rol is None:
    rol = Rol(nombre="admin_general")
    db.add(rol)
    db.commit()
    db.refresh(rol)

if not db.query(Usuario).filter(Usuario.email == "admin@miko.test").first():
    usuario = Usuario(
        nombre="Admin de prueba",
        email="admin@miko.test",
        password_hash=hash_password("admin123"),
        rol_id=rol.id,
    )
    db.add(usuario)
    db.commit()
    print("Usuario admin@miko.test / admin123 creado.")
else:
    print("Ya existía.")

db.close()