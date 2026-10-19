from pydantic import BaseModel, ConfigDict, EmailStr

# Se declaran los unicos campos que se quieren exponer, evita poner la password_hash
# Se usa tambien para gerente
# No usa EmailStr a propósito: un correo mal formado debe dar el 401 genérico, no un 422.
class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    sucursal_id: int | None = None # Puede venir vacio
    activo: bool
    foto_url: str | None = None

    model_config = ConfigDict(from_attributes=True)

# Esquemas para la configuración de cuenta
class CuentaUpdateData(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None

class CuentaUpdatePassword(BaseModel):
    password_actual: str
    password_nueva: str