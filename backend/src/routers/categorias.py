from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.dependencies import requiere_rol
from src.database import get_db
from src.models import Categoria
from src.schemas import CategoriaCreate, CategoriaOut

router = APIRouter(
    prefix="/categorias",
    tags=["productos"],
)

# Endpoint para listar las categorias
@router.get("", response_model=list[CategoriaOut], dependencies=[Depends(requiere_rol("admin_general", "gerente_sede"))], status_code=status.HTTP_200_OK)
def listar_categorias(
    db: Session = Depends(get_db)
):
    """Listar todas las categorías de los productos. Administrador general y Gerente Sede."""
    return db.query(Categoria).order_by(Categoria.nombre).all()
    
# Endpoint para crear una categoria
@router.post("", response_model=CategoriaOut, dependencies=[Depends(requiere_rol("admin_general"))], status_code=status.HTTP_201_CREATED)
def crear_categoria(
    categoria_in: CategoriaCreate,
    db: Session = Depends(get_db)
):
    """Crear una categoría. Solo Administrador General."""
    # Se compara la misma palabra aunque tenga mayúsculas
    existente = db.query(Categoria).filter(func.lower(Categoria.nombre) == categoria_in.nombre.lower()).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una categoría llamada '{existente.nombre}'."
        )

    categoria = Categoria(
        nombre=categoria_in.nombre
    )
    db.add(categoria)
    db.commit()

    return CategoriaOut.model_validate(categoria)

# Endpoint para editar una categoria
@router.patch("/{categoria_id}", response_model=CategoriaOut, dependencies=[Depends(requiere_rol("admin_general"))], status_code=status.HTTP_200_OK)
def editar_categoria(
    categoria_in: CategoriaCreate,
    categoria_id: int,
    db: Session = Depends(get_db)
):
    """Editar una categoría. Solo Administrador General."""

    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La categoría con ID {categoria_id} no existe."
        )

    existente = db.query(Categoria).filter(func.lower(Categoria.nombre) == categoria_in.nombre.lower(), Categoria.id != categoria_id).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una categoría llamada '{existente.nombre}'."
        )
    categoria.nombre = categoria_in.nombre

    db.commit()

    return CategoriaOut.model_validate(categoria)