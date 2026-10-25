"""
Consulta de productos para el Cajero (punto de venta). Va en su propio
archivo porque routers/productos.py exige el rol gerente_sede a nivel de
router y bloquearía al cajero.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Producto, Usuario
from src.schemas import ProductoOut
from src.services import consulta_productos

router = APIRouter(
    prefix="/cajero/productos",
    tags=["productos-cajero"],
    dependencies=[Depends(requiere_rol("cajero"))],
)


@router.get("", response_model=list[ProductoOut], status_code=status.HTTP_200_OK)
def listar_productos_cajero(
    buscar: str | None = None,
    categoria_id: int | None = None,
    usuario: Usuario = Depends(requiere_rol("cajero")),
    db: Session = Depends(get_db),
):
    """
    Productos ACTIVOS de la sucursal del cajero, con búsqueda parcial por
    nombre y filtro por categoría. Incluye los de existencia 0 (el frontend
    decide cómo mostrarlos). Solo Cajeros.
    """

    # La sucursal sale del cajero autenticado, nunca del cliente
    if usuario.sucursal_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El cajero actual no tiene una sucursal asignada",
        )

    # Misma consulta base que usa el gerente (ya filtra por sucursal);
    # aquí siempre se excluyen los inactivos
    consulta = consulta_productos(db, usuario.sucursal_id).filter(
        Producto.activo == True  # noqa: E712
    )

    # ilike = búsqueda parcial sin importar mayúsculas: "con" encuentra "Concha"
    if buscar:
        consulta = consulta.filter(Producto.nombre.ilike(f"%{buscar.strip()}%"))

    if categoria_id:
        consulta = consulta.filter(Producto.categoria_id == categoria_id)

    # Orden estable para que la lista no "salte" entre consultas
    consulta = consulta.order_by(Producto.nombre)

    return [ProductoOut.model_validate(fila) for fila in consulta]