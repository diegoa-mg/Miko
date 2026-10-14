from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies import requiere_rol
# from src.services import

from src.database import get_db
from src.models import Producto, Sucursal, Inventario, Usuario, Categoria
from src.schemas import ProductoOut, ProductoCreate, ProductoUpdate
from src.services import llenar_producto_out, obtener_sucursal_del_gerente

router = APIRouter(
    prefix="/productos",
    tags=["productos"],
    dependencies=[
        Depends(requiere_rol("gerente_sede"))
    ],  # Solo accesible para gerentes
)

# Endpoint crear producto
@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(producto_in: ProductoCreate, usuario: Usuario = Depends(requiere_rol("gerente_sede")), db: Session = Depends(get_db)):
    """Crear un producto en la sucursal del gerente. Solo gerentes."""

    # La sucursal sale del gerente que lanza la peticion
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # Verificar que la categoria exista
    categoria = db.query(Categoria).filter(Categoria.id == producto_in.categoria_id).first()
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La categoría no existe",
        )

    # Verificar que no se repita el nombre
    existente = db.query(Producto).filter(
        Producto.nombre == producto_in.nombre,
        Producto.sucursal_id == sucursal.id,
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un producto llamado '{producto_in.nombre}' en tu sucursal",
        )

    # Crear el producto. flush() lo manda la db para obtener su id
    producto = Producto(
        nombre=producto_in.nombre,
        precio=producto_in.precio,
        categoria_id=producto_in.categoria_id,
        sucursal_id=sucursal.id
    )
    db.add(producto)
    db.flush()

    # Se crea su fila en el inventario, con la existencia inicial
    inventario = Inventario(
        sucursal_id=sucursal.id,
        producto_id=producto.id,
        existencia=producto_in.existencia_inicial,
    )
    db.add(inventario)

    db.commit()
    db.refresh(producto)

    return llenar_producto_out(producto)

    

# Endpoint listar productos


# Endpoint actualizar producto


# Endpoint eliminar producto
