from pydantic import BaseModel, ConfigDict, Field, field_validator

# Esquemas para categorias
class CategoriaOut(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)

class CategoriaCreate(BaseModel): # También se usa para editar la categoría
    nombre: str = Field(min_length=1, max_length=80)

    @field_validator("nombre")
    @classmethod
    def validar_texto_no_vacio_crear(cls, v: str, info):
        if not v.strip():
            raise ValueError(f"El campo '{info.field_name}' no puede estar vacío.")
        return v.strip()