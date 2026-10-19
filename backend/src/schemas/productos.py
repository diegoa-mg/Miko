from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Esquemas para productos
class ProductoOut(BaseModel):
    id: int
    nombre: str
    precio: Decimal
    categoria_id: int
    categoria_nombre: str
    existencia: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)

class ProductoCreate(BaseModel):
    nombre: str = Field(min_length=1)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    categoria_id: int
    existencia_inicial: int = Field(ge=0)

    @field_validator("nombre")
    @classmethod
    def validar_texto_no_vacio_crear(cls, v: str, info):
        if not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip()

class ProductoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1)
    precio: Decimal | None = Field(default= None, gt=0, max_digits=10, decimal_places=2)
    categoria_id: int | None = None

    # Los tres campos son opcionales (puedes mandar solo uno),
    # pero si los mandas, no pueden ser null.
    @field_validator("nombre", "precio", "categoria_id")
    @classmethod
    def validar_no_null(cls, v, info):
        if v is None:
            raise ValueError(f"El campo '{info.field_name}' no puede ser null.")
        # strip solo si es texto; precio y categoria_id son números
        if isinstance(v, str):
            if not v.strip():
                raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
            return v.strip()
        return v