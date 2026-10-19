from pydantic import BaseModel, EmailStr

"""
EmailStr valida el formato del correo electrónico (requiere el paquete email-validator).
Se usa solo en los esquemas de entrada que crean o modifican correos (Ej: GerenteCreate, GerenteUpdate,).
"""

# Esquemas de Gerentes
class GerenteCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str

class GerenteUpdate(BaseModel):
    nombre: str
    email: EmailStr