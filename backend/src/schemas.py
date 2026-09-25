from pydantic import BaseModel, ConfigDict

# Es lo que el cliente manda para el login
class LoginRequest(BaseModel):
    email: str
    password: str

# Es lo que el servidor responde tras un login exitoso
class TokenResponse(BaseModel):
    token: str # token
    token_type: str = "bearer" # tipo del token

# Se declaran los unicos campos que se quieren exponer, evita poner la password_hash
# Se usa tambien para gerente
class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    sucursal_id: int | None = None # Puede venir vacio

    model_config = ConfigDict(from_attributes=True)

# Esquemas para Sucursales
class SucursalBase(BaseModel):
    nombre: str
    direccion: str
    telefono: str | None = None
    estado: str = "activa"
    gerente_id: int | None = None

class SucursalCreate(BaseModel):
    nombre: str
    direccion: str
    telefono: str | None = None
    gerente_id: int | None = None

class SucursalUpdate(BaseModel):
    nombre: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    estado: str | None = None
    gerente_id: int | None = None

class SucursalOut(SucursalBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# Esquemas de Gerentes
class GerenteCreate(BaseModel):
    nombre: str
    email: str
    password: str

class GerenteUpdate(BaseModel):
    nombre: str
    email: str