from typing import Optional

from sqlalchemy.orm import Session, Query

from src.models import Inventario, Producto, Sucursal, Categoria
from src.schemas import InventarioOut

# Función para llenar InventarioOut
def llenar_inventario_out(inventario: Inventario) -> InventarioOut:
    return InventarioOut(
        producto_id=inventario.producto_id,
        producto_nombre=inventario.producto_nombre,
        categoria_nombre=inventario.categoria_nombre,
        sucursal_id=inventario.sucursal_id,
        sucursal_nombre=inventario.sucursal_nombre,
        existencia=inventario.existencia
    )  

# Arma (sin ejecutar) la consulta base del inventario de todas las sucursales, para que cada endpoint le agregue sus filtros
def consulta_inventario(db: Session) -> Query:
    consulta = ( 
        db.query(
            # Las columnas que se requieren en el resultado y de que tabla sale cada una
            # .label() renombra cada columna: Producto, Sucursal y Categoria tienen columnas
            # con el mismo nombre (id, nombre), así se distinguen. Deben coincidir con llenar_inventario_out (InventarioOut).
            Producto.id.label("producto_id"), 
            Producto.nombre.label("producto_nombre"),
            Categoria.nombre.label("categoria_nombre"),
            Sucursal.id.label("sucursal_id"),
            Sucursal.nombre.label("sucursal_nombre"),
            Inventario.existencia.label("existencia"),
        )
        # Por cada fila de inventario, busca el producto cuyo id sea igual al producto_id de esa fila
        .join(Producto, Producto.id == Inventario.producto_id)
        # Une la sucursal a la que pertenece esa fila de inventario
        .join(Sucursal, Sucursal.id == Inventario.sucursal_id)
        # Une la categoria cuyo id sea igual a categoria_id de ese producto
        .join(Categoria, Categoria.id == Producto.categoria_id) # inventario no guarda la categoría; está en el producto (inventario → producto → categoría)
    )

    return consulta

# Función para recorrer filas de la consulta que recibe, devuelve una lista armada
def crear_lista_inventario(inventario: Query) -> list[InventarioOut]:
    lista = []

    # El for ejecuta la consulta en la base de datos y convierte cada fila en InventarioOut,
    # y se agrega a la lista
    for fila in inventario:
        lista.append(llenar_inventario_out(fila))
    
    return lista

def calcular_alertas_inventario(
    db: Session,
    umbral: int,
    sucursal_id: Optional[int] = None,
):
    """
    Devuelve filas (producto_id, producto_nombre, sucursal_id, sucursal_nombre,
    existencia) para productos con existencia <= umbral, solo en sucursales
    activas. Si sucursal_id es None, revisa todas las sucursales activas
    (admin); si se da, solo esa sucursal (gerente).
    """
    query = (
        db.query(
            Producto.id.label("producto_id"),
            Producto.nombre.label("producto_nombre"),
            Sucursal.id.label("sucursal_id"),
            Sucursal.nombre.label("sucursal_nombre"),
            Inventario.existencia.label("existencia"),
        )
        .join(Producto, Producto.id == Inventario.producto_id)
        .join(Sucursal, Sucursal.id == Inventario.sucursal_id)
        .filter(Inventario.existencia <= umbral, Sucursal.estado == "activa")
    )
    if sucursal_id is not None:
        query = query.filter(Sucursal.id == sucursal_id)

    return query.all()