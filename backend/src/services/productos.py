from fastapi import status, HTTPException
from sqlalchemy.orm import Session, Query

from src.models import Inventario, Producto, Categoria

# Regresa una fila de solo lectura
def consulta_productos(db: Session, sucursal_id: int) -> Query:
    return (
        db.query(
            Producto.id.label("id"),
            Producto.nombre.label("nombre"),
            Producto.precio.label("precio"),
            Categoria.id.label("categoria_id"),
            Categoria.nombre.label("categoria_nombre"),
            Inventario.existencia.label("existencia"),
            Producto.activo.label("activo"),
            Producto.codigo.label("codigo"),
        )
        .join(Categoria, Categoria.id == Producto.categoria_id)
        .join(Inventario, Inventario.producto_id == Producto.id)
        .filter(Producto.sucursal_id == sucursal_id)
    )

def obtener_producto_de_sucursal(db: Session, sucursal_id: int, producto_id: int) -> Producto:
    # Consulta para obtener el producto deseado
    producto = db.query(Producto).filter(Producto.id == producto_id, Producto.sucursal_id == sucursal_id).first()

    # Si producto está vacío (no existe o no es de esa sucursal)
    if producto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El producto con ID {producto_id} no fue encontrado.",
        )
    return producto

# Error que se devuelve cuando el código de barras ya lo usa otro producto de la sucursal
def codigo_duplicado(codigo: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Ya existe un producto con el código de barras '{codigo}' en tu sucursal.",
    )

# Verifica que el código no lo tenga otro producto de la sucursal.
# excluir_producto_id sirve al editar, para no chocar con el propio producto.
def verificar_codigo_disponible(
    db: Session, sucursal_id: int, codigo: str, excluir_producto_id: int | None = None
) -> None:
    consulta = db.query(Producto.id).filter(
        Producto.sucursal_id == sucursal_id,
        Producto.codigo == codigo,
    )
    if excluir_producto_id is not None:
        consulta = consulta.filter(Producto.id != excluir_producto_id)
    if consulta.first() is not None:
        raise codigo_duplicado(codigo)