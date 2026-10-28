from pydantic import BaseModel, ConfigDict, EmailStr, AfterValidator

from typing import Annotated


def validar_password(v: str) -> str:
    errores = []

    if len(v) < 8:  # el mínimo se mide en caracteres
        errores.append("Debe tener al menos 8 caracteres.")
    
    tiene_mayuscula = any(char.isupper() for char in v)
    if not tiene_mayuscula: # al menos una mayúscula
        errores.append("Debe tener al menos una mayúscula.")

    tiene_minuscula = any(char.islower() for char in v)
    if not tiene_minuscula: # al menos una minúscula
        errores.append("Debe tener al menos una minúscula.")

    tiene_numero = any(char.isdigit() for char in v)
    if not tiene_numero: # al menos un número
        errores.append("Debe tener al menos un número.")

    tiene_especial = any(not char.isalnum() and not char.isspace() for char in v)
    if not tiene_especial:  # al menos un carácter especial
        errores.append("Debe tener al menos un carácter especial (por ejemplo . _ ! # $ % & @).")

    datos = v.encode('utf-8')
    if len(datos) > 72: # máximo 72 bytes (OJO: bytes, no caracteres)
        errores.append("No debe pesar más de 72 Bytes (los acentos, la ñ y los emojis ocupan más de uno).")

    if errores:
        raise ValueError(" ".join(errores))
    return v


PasswordSegura = Annotated[str, AfterValidator(validar_password)]

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
    aviso_pendiente: bool = False

    model_config = ConfigDict(from_attributes=True)

# Esquemas para la configuración de cuenta
class CuentaUpdateData(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None

class CuentaUpdatePassword(BaseModel):
    password_actual: str
    password_nueva: PasswordSegura