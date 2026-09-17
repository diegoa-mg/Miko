from pydantic import BaseModel

# Es lo que el cliente manda para el login
class LoginRequest(BaseModel):
    email: str
    password: str

# Es lo que el servidor responde tras un login exitoso
class TokenResponse(BaseModel):
    token: str # token
    token_type: str = "bearer" # tipo del token

# Se declaran los unicos campos que se quieren exponer, evita poner la password_hash
class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    sucursal_id: int | None = None # Puede venir vacio