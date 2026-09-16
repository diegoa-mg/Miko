from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload

# Importaciones locales de tu proyecto
from src.database import get_db
from src.models import Usuario

SECRET_KEY = "MI_CLAVE_SECRETA_SUPER_SEGURA_CAMBIAR_EN_PRODUCCION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

router = APIRouter(tags=["Autenticación"])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Valida la contraseña plana contra su hash en base de datos."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash bcrypt de una contraseña."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Genera y firma un token JWT con tiempo de expiración."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Autentica al usuario usando email (form_data.username) y password.
    Retorna el Token JWT de acceso si las credenciales son válidas.
    """
    # 1. Buscar usuario por su correo electrónico
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    # 2. Verificar existencia y coincidencia de contraseña hash
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Correo electrónico o contraseña incorrectos"
        )

    # 3. Generar token JWT incorporando el id del usuario (sub)
    access_token = create_access_token(data={"sub": str(usuario.id)})

    # 4. Responder con el estándar OAuth2 Bearer Token
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Decodifica el JWT entregado en los headers, busca el usuario en BD
    y carga automáticamente la relación .rol requerida por el equipo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # joinedload realiza el JOIN directo en SQL para tener .rol pre-cargado
    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.rol))
        .filter(Usuario.id == int(user_id))
        .first()
    )

    if usuario is None:
        raise credentials_exception

    return usuario