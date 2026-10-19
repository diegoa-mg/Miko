from pydantic import BaseModel, EmailStr

"""
EmailStr valida el formato del correo electrónico (requiere el paquete email-validator).
Se usa solo en los esquemas de entrada que crean o modifican correos (Ej: CajeroCreate, CajeroUpdate,).
"""

# Esquemas de Cajeros
class CajeroCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    sucursal_id: int | None = None

class CajeroUpdate(BaseModel):
    nombre: str | None = None
    email: EmailStr | None = None
    sucursal_id: int | None = None