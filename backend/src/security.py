import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cambiar-en-produccion-nunca-usar-este-valor")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


# Función para guardar la contraseña con hash
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Función para verificar la contreseña
def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

# Función para crear el access token
def crear_access_token(usuario_id: int) -> str:
    """
    El JWT se mantiene mínimo a propósito: solo lleva lo que el backend
    necesita para identificar y autorizar al usuario en cada request
    (sub + exp). Los datos para mostrar en la UI (nombre, rol, sucursal)
    se piden aparte en GET /me — así el token no crece cada vez que
    alguien quiera mostrar un dato nuevo en el frontend.
    """
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "iat": ahora,
        "exp": ahora + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

# Función para decodificar el access token
def decodificar_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])