from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Inventario, Producto, Categoria, Sucursal
from src.schemas import InventarioOut

router = APIRouter(
    prefix="/inventarios",
    tags=["inventarios"]
)

# Endpoint listar inventarios en administrador
@router.get("", response_model=list[InventarioOut], dependencies=[Depends(requiere_rol("admin_general"))])
def listar_inventario(sucursal_id: int | None = None, incluir_inactivas: bool = False, db: Session = Depends(get_db)):
    """Listar el inventario de todas las sucursales o de una en específico. Solo Administrador General"""

    # Si viene el ID de una sucursal, se verifica que sí exista (activa o inactiva pero que exista), 
    # en caso de que no, lanza el error 404
    if sucursal_id:
        existe = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
        if not existe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La sucursal no existe"
            )

    consulta = ( 
        db.query(
            # Las columnas que se requieren en el resultado y de que tabla sale cada una
            # .label() renombra cada columna: Producto, Sucursal y Categoria tienen columnas
            # con el mismo nombre (id, nombre), así se distinguen. Deben coincidir con InventarioOut.
            Producto.id.label("producto_id"), 
            Producto.nombre.label("producto_nombre"),
            Categoria.nombre.label("categoria_nombre"),
            Sucursal.id.label("sucursal_id"),
            Sucursal.nombre.label("sucursal_nombre"),
            Inventario.existencia.label("existencia"),
        )
        # Por cada fila de inventario, busca el producto cuyo id sea igual al producto_id de esa fila
        .join(Producto, Producto.id == Inventario.producto_id)
        # Asigna la sucursal a la que pertenece ese inventario
        .join(Sucursal, Sucursal.id == Inventario.sucursal_id)
        # Asigna la categoria cuyo id sea igual a categoria_id de ese producto
        .join(Categoria, Categoria.id == Producto.categoria_id) # inventario no guarda la categoría; está en el producto (inventario → producto → categoría)
    )

    # Si no se incluye los inventarios de sucursales inactivas, únicamente muestra los inventarios de las sucursales activas
    if not incluir_inactivas:
        consulta = consulta.filter(Sucursal.estado == "activa")
    # En caso de que venga el ID de una sucursal existente, únicamente muestra el inventario de esa sucursal
    if sucursal_id:
        consulta = consulta.filter(Sucursal.id == sucursal_id)
    inventarios = consulta.all()

    lista_inventarios = []

    # Guardar en una lista el inventario de todas las sucursales.
    # La variable inventario se usa para poner la fila actual, cada fila se convierte en InventarioOut
    # y se agrega a la lista lista_inventarios
    for inventario in inventarios:
        lista_inventarios.append(InventarioOut(
            producto_id=inventario.producto_id,
            producto_nombre=inventario.producto_nombre,
            categoria_nombre=inventario.categoria_nombre,
            sucursal_id=inventario.sucursal_id,
            sucursal_nombre=inventario.sucursal_nombre,
            existencia=inventario.existencia
        ))

    return lista_inventarios