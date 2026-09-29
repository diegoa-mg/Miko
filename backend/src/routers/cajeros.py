from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies import requiere_rol
from src.services import obtener_rol, llenar_usuario_out
from src.database import get_db
from src.security import hash_password
from src.models import Usuario, Sucursal
from src.schemas import CajeroCreate, CajeroUpdate, UsuarioOut

router = APIRouter(
    prefix="/cajeros",
    tags=["cajeros"],
    dependencies=[Depends(requiere_rol("admin_general", "gerente_sede"))]
)


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_cajero(cajero_in: CajeroCreate, db: Session = Depends(get_db)):
    """Crea un usuario con rol cajero. Accesible para admin_general y gerente_sede."""

    existente = db.query(Usuario).filter(Usuario.email == cajero_in.email).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario con el email '{cajero_in.email}'",
        )

    if cajero_in.sucursal_id is not None:
        sucursal = db.query(Sucursal).filter(Sucursal.id == cajero_in.sucursal_id).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No existe la sucursal con ID {cajero_in.sucursal_id}",
            )

    rol_cajero = obtener_rol(db, "cajero")

    usuario = Usuario(
        nombre=cajero_in.nombre,
        email=cajero_in.email,
        password_hash=hash_password(cajero_in.password),
        rol=rol_cajero,
        sucursal_id=cajero_in.sucursal_id,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return llenar_usuario_out(usuario)


@router.get("", response_model=list[UsuarioOut], status_code=status.HTTP_200_OK)
def listar_cajeros(
    sucursal_id: int | None = None,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
):
    """Lista a los usuarios con rol cajero. Accesible para admin_general y gerente_sede."""

    rol_cajero = obtener_rol(db, "cajero")

    consulta = db.query(Usuario).filter(Usuario.rol_id == rol_cajero.id)
    if not incluir_inactivos:
        consulta = consulta.filter(Usuario.activo == True)

    if sucursal_id is not None:
        consulta = consulta.filter(Usuario.sucursal_id == sucursal_id)

    cajeros = consulta.all()

    return [llenar_usuario_out(cajero) for cajero in cajeros]


@router.get("/{cajero_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_cajero(cajero_id: int, db: Session = Depends(get_db)):
    """Obtiene un cajero específico."""

    rol_cajero = obtener_rol(db, "cajero")
    cajero = (
        db.query(Usuario)
        .filter(
            Usuario.id == cajero_id,
            Usuario.rol_id == rol_cajero.id,
            Usuario.activo == True,
        )
        .first()
    )

    if cajero is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cajero con ID {cajero_id} no encontrado",
        )

    return llenar_usuario_out(cajero)


@router.put("/{cajero_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def editar_cajero(
    cajero_id: int, cajero_in: CajeroUpdate, db: Session = Depends(get_db)
):
    """Edita la información de un cajero."""

    rol_cajero = obtener_rol(db, "cajero")
    cajero = (
        db.query(Usuario)
        .filter(
            Usuario.id == cajero_id,
            Usuario.rol_id == rol_cajero.id,
            Usuario.activo == True,
        )
        .first()
    )

    if cajero is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cajero con ID {cajero_id} no encontrado",
        )

    if cajero_in.email and cajero_in.email != cajero.email:
        email_ocupado = (
            db.query(Usuario)
            .filter(Usuario.email == cajero_in.email, Usuario.id != cajero.id)
            .first()
        )
        if email_ocupado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El email {cajero_in.email} ya está en uso",
            )
        cajero.email = cajero_in.email

    if cajero_in.nombre:
        cajero.nombre = cajero_in.nombre

    if cajero_in.sucursal_id is not None:
        sucursal = (
            db.query(Sucursal).filter(Sucursal.id == cajero_in.sucursal_id).first()
        )
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No existe la sucursal con ID {cajero_in.sucursal_id}",
            )
        cajero.sucursal_id = cajero_in.sucursal_id

    db.commit()
    db.refresh(cajero)

    return llenar_usuario_out(cajero)


@router.delete("/{cajero_id}", status_code=status.HTTP_200_OK)
def eliminar_cajero(cajero_id: int, db: Session = Depends(get_db)):
    """Desactiva un cajero (soft delete)."""

    rol_cajero = obtener_rol(db, "cajero")
    cajero = (
        db.query(Usuario)
        .filter(
            Usuario.id == cajero_id,
            Usuario.rol_id == rol_cajero.id,
            Usuario.activo == True,
        )
        .first()
    )

    if cajero is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cajero con ID {cajero_id} no encontrado",
        )

    cajero.activo = False
    db.commit()

    return {
        "message": "Cajero desactivado exitosamente en la base de datos.",
        "cajero_id": cajero_id,
    }
