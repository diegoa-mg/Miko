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
            Producto.activo.label("activo")
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