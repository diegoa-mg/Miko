import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cambiar-en-produccion-nunca-usar-este-valor")
JWT_ALGORITHM = "HS256" 
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480")) # 480 es el default, se usa en caso de que la variable JWT_EXPIRE_MINUTES no está definida

AVISO_EXPIRE_DIAS = 7

# Función para guardar la contraseña con hash
def hash_password(password: str) -> str:
    """
    bcrypt.gensalt() se usa para generar un valor aleatorio distinto que se mezcla con la contraseña antes de hashear. 
    Por si dos usuarios usan la misma contraseña, sus password_hash son diferentes.

    bcrypt.haspw recibe el gensalt y luego hashea la contraseña. 
    El resultado es un string que incluye ya codificados el gensalt y su costo, y el hash final
    """
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Función para verificar la contreseña
def verify_password(password: str, password_hash: str) -> bool:
    # checkpw: lee el gensalt y el costo directo del password_hash guardado. Los extrae
    # Vuelve a correr el proceso de hashing sobre el password que el usuario acaba de ingresar
    # Pero usando lo que checkpw extrajo en un principio. No genera una gensalt nueva
    # Compara el hash resultante con el hash guardado
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
    # payload contiene el JSON que el backend necesita para identificar y autorizar al usuario en cada request
    payload = {
        "sub": str(usuario_id),
        "iat": ahora,
        "exp": ahora + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    # jwt.encode codifica el JWT firmado por la JWT_SECRET_KEY
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

# Función para decodificar el access token
def decodificar_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

# Función para crear el token del enlace del aviso de privacidad
def crear_token_aviso(usuario_id: int) -> str:
    """
    Token de un solo propósito: solo sirve para aceptar el aviso de privacidad.
    A propósito NO lleva "sub": get_current_user lo exige, así que este token
    nunca se acepta como token de sesión (si no, el enlace del correo
    permitiría entrar sin contraseña).
    """
    ahora = datetime.now(timezone.utc)
    payload = {
        "uid": usuario_id,
        "tipo": "aviso_privacidad",
        "iat": ahora,
        "exp": ahora + timedelta(days=AVISO_EXPIRE_DIAS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


# Función para decodificar el token del aviso. Devuelve el id del usuario
def decodificar_token_aviso(token: str) -> int:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    # Un token de sesión también tiene firma válida: se distingue por "tipo".
    # Sin esta comprobación, cualquier token de sesión podría aceptar avisos.
    if payload.get("tipo") != "aviso_privacidad":
        raise jwt.InvalidTokenError("El token no es de aviso de privacidad")
    return int(payload["uid"])