from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Esquemas para Sucursales
class SucursalBase(BaseModel):
    nombre: str
    direccion: str
    telefono: str | None = None
    estado: Literal["activa", "inactiva"] = "activa"
    gerente_id: int | None = None

class SucursalCreate(BaseModel):
    nombre: str = Field(min_length=1)
    direccion: str = Field(min_length=1)
    telefono: str | None = None
    gerente_id: int | None = None

    @field_validator("nombre", "direccion")
    @classmethod
    def validar_texto_no_vacio_crear(cls, v: str, info):
        if not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip()

class SucursalUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1)
    direccion: str | None = Field(default=None, min_length=1)
    telefono: str | None = None
    estado: Literal["activa", "inactiva"] | None = None
    gerente_id: int | None = None

    @field_validator("nombre", "direccion", "estado")
    @classmethod
    def validar_no_null_en_obligatorios(cls, v, info):
        if v is None:
            raise ValueError(f"El campo '{info.field_name}' no puede ser null.")
        if isinstance(v, str) and not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip() if isinstance(v, str) else v

class SucursalOut(SucursalBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SucursalEliminarResponse(BaseModel):
    sucursal_id: int
    estado: Literal["inactiva"] = "inactiva"
    eliminada_definitivamente: bool = False
    message: str