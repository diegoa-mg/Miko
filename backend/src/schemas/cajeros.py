from pydantic import BaseModel, EmailStr

from src.schemas.usuarios import PasswordSegura

"""
EmailStr valida el formato del correo electrónico (requiere el paquete email-validator).
Se usa solo en los esquemas de entrada que crean o modifican correos (Ej: CajeroCreate, CajeroUpdate,).
"""

# Esquemas de Cajeros
class CajeroCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: PasswordSegura
    sucursal_id: int | None = None

class CajeroUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    sucursal_id: int | None = None