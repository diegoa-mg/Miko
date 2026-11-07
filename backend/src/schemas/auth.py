from pydantic import BaseModel, EmailStr

from src.schemas.usuarios import PasswordSegura

# Es lo que el cliente manda para el login
class LoginRequest(BaseModel):
    email: str
    password: str

# Es lo que el servidor responde tras un login exitoso
class TokenResponse(BaseModel):
    token: str # token
    token_type: str = "bearer" # tipo del token

class RestablecerPasswordRequest(BaseModel):
    token: str
    password_nueva: PasswordSegura

class OlvidePasswordRequest(BaseModel):
    email: EmailStr