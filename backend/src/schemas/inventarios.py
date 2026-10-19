from pydantic import BaseModel, ConfigDict, field_validator

# Esquemas para inventarios
class InventarioOut(BaseModel):
    producto_id: int
    producto_nombre: str
    categoria_nombre: str
    sucursal_id: int
    sucursal_nombre: str
    existencia: int

    model_config = ConfigDict(from_attributes=True)

class InventarioUpdate(BaseModel):
    cantidad: int # cantidad es un delta (positivo suma, negativo resta)
    
    # @ es un decorador, le agrega un comportamiento a la función sin cambiar el código
    # Al llenar el campo 'cantidad', le pasa el valor a la función 'no_cero' 
    @field_validator("cantidad") 
    @classmethod # classmethod recibe cls no self, cls es InventarioUpdate (clase)
    def no_cero(cls, valor):
        if valor == 0:
            raise ValueError("La cantidad no puede ser 0") # Pydantic alcanza ValueError y lanza un 422 con el mensaje1
        return valor