"""
Provisional, solo para probar login/JWT mientras no existe el endpoint
de registro. Ejecutar dentro del contenedor:

    
    
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

if not db.query(Usuario).filter(Usuario.email == "admintest@miko.com").first():
    usuario = Usuario(
        nombre="Admin de prueba",
        email="admintest@miko.com",
        password_hash=hash_password("admin123"),
        rol_id=rol.id,
    )
    db.add(usuario)
    db.commit()
    print("Usuario admintest@miko.com / admin123 creado.")
else:
    print("Ya existía.")

db.close()