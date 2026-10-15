from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies import requiere_rol
# from src.services import

from src.database import get_db
from src.models import Producto, Sucursal, Inventario, Usuario, Categoria
from src.schemas import ProductoOut, ProductoCreate, ProductoUpdate
from src.services import llenar_producto_out, obtener_sucursal_del_gerente, consulta_productos, obtener_producto_de_sucursal

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
    """Crear un producto en la sucursal del gerente. Solo Gerentes."""

    # La sucursal sale del gerente que lanza la petición
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # Verificar que la categoria exista
    categoria = db.query(Categoria).filter(Categoria.id == producto_in.categoria_id).first()
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La categoría no existe",
        )

    # Verificar que no se repita el nombre
    existente = db.query(Producto).filter(Producto.nombre == producto_in.nombre, Producto.sucursal_id == sucursal.id).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un producto llamado '{producto_in.nombre}' en tu sucursal.",
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
@router.get("", response_model=list[ProductoOut], status_code=status.HTTP_200_OK)
def listar_productos(
    buscar: str | None = None,
    categoria_id: int | None = None,
    incluir_inactivos:bool = False,
    usuario: Usuario = Depends(requiere_rol("gerente_sede")),
    db: Session = Depends(get_db)
):
    """Lista todos los productos de la sucursal del gerente, con búsqueda por nombre o categoría. Solo Gerentes."""

    
    # La sucursal sale del gerente que lanza la petición
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # Consulta los productos con la función
    consulta = consulta_productos(db, sucursal.id)

    # Por si solo se requieren los activos
    if not incluir_inactivos:
        consulta = consulta.filter(Producto.activo == True)

    # ilike = búsqueda parcial sin importar mayúsculas: "con" encuentra "Concha"
    if buscar:
        consulta = consulta.filter(Producto.nombre.ilike(f"%{buscar}%"))

    if categoria_id:
        consulta = consulta.filter(Producto.categoria_id == categoria_id)

    # Cada fila trae las columnas con los nombres de ProductoOut, Pydantic la convierte directo
    return [ProductoOut.model_validate(fila) for fila in consulta]

# Endpoint para obtener un producto
@router.get("/{producto_id}", response_model=ProductoOut, status_code=status.HTTP_200_OK)
def obtener_producto(
    producto_id: int,
    usuario: Usuario = Depends(requiere_rol("gerente_sede")),
    db: Session = Depends(get_db)
):
    """Obtiene un producto específico. Solo Gerentes."""

    # La sucursal sale del g(erente que lanza la petición
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # Se filtra la consulta de los productos por el id del producto de la petición
    consulta = consulta_productos(db, sucursal.id).filter(Producto.id == producto_id).first()
    if consulta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El producto con ID {producto_id} no fue encontrado."
        )

    return ProductoOut.model_validate(consulta)

# Endpoint actualizar producto
@router.patch("/{producto_id}", response_model=ProductoOut, status_code=status.HTTP_200_OK)
def editar_producto(
    producto_in: ProductoUpdate,
    producto_id: int,
    usuario: Usuario = Depends(requiere_rol("gerente_sede")),
    db: Session = Depends(get_db)
):
    """Editar un producto de la sucursal del gerente. Solo Gerentes."""

    # La sucursal sale del gerente que lanza la petición
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    producto = obtener_producto_de_sucursal(db, sucursal.id, producto_id)

    if not producto.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El producto con ID {producto_id} no puede ser editado debido a que está inactivo."
        )

    # Si viene nombre
    if producto_in.nombre:
        consulta_nombre = db.query(Producto).filter(
            Producto.nombre == producto_in.nombre,
            Producto.sucursal_id == sucursal.id,
            Producto.id != producto.id,
        ).first()
        if consulta_nombre:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un producto llamado '{producto_in.nombre}' en tu sucursal."
            )
        producto.nombre = producto_in.nombre

    # Si viene precio
    if producto_in.precio:
        producto.precio = producto_in.precio

    # Si viene categoria
    if producto_in.categoria_id:
        consulta_categoria = db.query(Categoria).filter(Categoria.id == producto_in.categoria_id).first()
        if consulta_categoria is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La categoría no existe"
            )
        producto.categoria_id = producto_in.categoria_id

    db.commit()

    producto_actualizado = consulta_productos(db, sucursal.id).filter(Producto.id == producto.id).first()

    return ProductoOut.model_validate(producto_actualizado)
    

# Endpoint eliminar producto
@router.delete("/{producto_id}", status_code=status.HTTP_200_OK)
def eliminar_producto(
    producto_id: int,
    usuario: Usuario = Depends(requiere_rol("gerente_sede")),
    db: Session = Depends(get_db)  
):
    """Eliminar un producto de la sucursal del gerente. Solo Gerentes."""

    # La sucursal sale del gerente que lanza la petición
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # El producto sale de la sucursal del gerente y el id del producto de la petición.
    producto = obtener_producto_de_sucursal(db, sucursal.id, producto_id)

    if not producto.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El producto con ID {producto_id} ya estaba inactivo."
        )

    producto.activo = False
    db.commit()

    return {
        "message": f"Producto con ID {producto_id} desactivado exitosamente.",
        "estado": "inactivo"
    }

# Endpoint reactivar producto
@router.patch("/{producto_id}/reactivar", status_code=status.HTTP_200_OK)
def reactivar_producto(
    producto_id: int,
    usuario: Usuario = Depends(requiere_rol("gerente_sede")),
    db: Session = Depends(get_db)
):
    """Reactivar un producto de la sucursal del gerente. Solo Gerentes."""

    # La sucursal sale del gerente que lanza la petición
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)
    
    # El producto sale de la sucursal del gerente y el id del producto de la petición.
    producto = obtener_producto_de_sucursal(db, sucursal.id, producto_id)

    if producto.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El producto con ID {producto_id} ya estaba activo."
        )
    
    producto.activo = True
    db.commit()
    
    return {
        "message": f"Producto con ID {producto_id} activado exitosamente.",
        "estado": "activo"
    }