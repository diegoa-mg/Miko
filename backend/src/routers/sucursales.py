from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Sucursal, Usuario
from src.schemas import (
    SucursalCreate,
    SucursalEliminarResponse,
    SucursalOut,
    SucursalUpdate,
)

router = APIRouter(
    prefix="/sucursales",
    tags=["sucursales"],
    dependencies=[Depends(requiere_rol("admin_general"))],
)


def _validar_gerente(
    db: Session, gerente_id: int, sucursal_id_actual: int | None = None
) -> Usuario:
    """
    Valida que el gerente exista, tenga rol 'gerente_sede', esté activo
    y no esté asignado ya a otra sucursal.
    """
    gerente = db.query(Usuario).filter(Usuario.id == gerente_id).first()
    if not gerente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún usuario con el ID {gerente_id}",
        )

    if gerente.rol.nombre != "gerente_sede":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario asignado debe tener el rol 'gerente_sede'",
        )

    if not gerente.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El gerente seleccionado no está activo",
        )

    # Revisar si ya tiene otra sucursal asignada
    query = db.query(Sucursal).filter(Sucursal.gerente_id == gerente_id)
    if sucursal_id_actual is not None:
        query = query.filter(Sucursal.id != sucursal_id_actual)
    otra_sucursal = query.first()
    if otra_sucursal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El usuario ya es gerente de la sucursal '{otra_sucursal.nombre}'",
        )

    return gerente


def _desasignar_personal_sucursal(sucursal: Sucursal, db: Session):
    """
    Desasigna el gerente y los cajeros/empleados vinculados a la sucursal.
    """
    # 1. Desasignar gerente
    sucursal.gerente_id = None

    # 2. Desasignar cajeros/empleados que apuntaban a esta sucursal
    db.query(Usuario).filter(Usuario.sucursal_id == sucursal.id).update(
        {Usuario.sucursal_id: None}, synchronize_session=False
    )


@router.post("", response_model=SucursalOut, status_code=status.HTTP_201_CREATED)
def crear_sucursal(
    sucursal_in: SucursalCreate,
    db: Session = Depends(get_db),
):
    """
    Crea una nueva sucursal.
    Solo accesible para administradores.
    """
    # Verificar si ya existe una sucursal con el mismo nombre
    existente = db.query(Sucursal).filter(Sucursal.nombre == sucursal_in.nombre).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una sucursal con el nombre '{sucursal_in.nombre}'",
        )

    # Validar gerente si se proporcionó
    if sucursal_in.gerente_id is not None:
        _validar_gerente(db, sucursal_in.gerente_id)

    nueva_sucursal = Sucursal(
        nombre=sucursal_in.nombre,
        direccion=sucursal_in.direccion,
        telefono=sucursal_in.telefono,
        gerente_id=sucursal_in.gerente_id,
        estado="activa",
    )
    db.add(nueva_sucursal)
    db.commit()
    db.refresh(nueva_sucursal)
    return nueva_sucursal


@router.get("", response_model=list[SucursalOut])
def listar_sucursales(
    incluir_inactivas: bool = Query(
        False, description="Incluir sucursales inactivas en el listado"
    ),
    db: Session = Depends(get_db),
):
    """
    Lista las sucursales registradas.
    Por defecto solo muestra las activas; con incluir_inactivas=True devuelve todas.
    """
    query = db.query(Sucursal)
    if not incluir_inactivas:
        query = query.filter(Sucursal.estado == "activa")
    return query.all()


@router.get("/{sucursal_id}", response_model=SucursalOut)
def obtener_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
):
    """
    Obtiene los detalles de una sucursal específica por su ID.
    Permitido tanto para sucursales activas como inactivas.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sucursal con ID {sucursal_id} no encontrada",
        )
    return sucursal


@router.patch("/{sucursal_id}", response_model=SucursalOut)
@router.put("/{sucursal_id}", response_model=SucursalOut)
def modificar_sucursal(
    sucursal_id: int,
    sucursal_in: SucursalUpdate,
    db: Session = Depends(get_db),
):
    """
    Modifica parcialmente una sucursal existente (vía PATCH o PUT para compatibilidad).
    Si la sucursal está inactiva, bloquea cualquier edición salvo la reactivación (estado='activa').
    Si se desactiva (estado='inactiva'), desasigna automáticamente al gerente y a los cajeros.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sucursal con ID {sucursal_id} no encontrada",
        )

    # Bloquear toda modificación si la sucursal está inactiva, a menos que se solicite reactivarla
    if sucursal.estado == "inactiva":
        if sucursal_in.estado != "activa":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La sucursal está inactiva. Solo se permite consultarla o reactivarla (estado='activa').",
            )

    # Validar nombre único si se envía para cambio
    if sucursal_in.nombre is not None and sucursal_in.nombre != sucursal.nombre:
        nombre_repetido = (
            db.query(Sucursal)
            .filter(Sucursal.nombre == sucursal_in.nombre, Sucursal.id != sucursal_id)
            .first()
        )
        if nombre_repetido:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otra sucursal con el nombre '{sucursal_in.nombre}'",
            )

    # Validar gerente si se actualiza
    if (
        sucursal_in.gerente_id is not None
        and sucursal_in.gerente_id != sucursal.gerente_id
    ):
        _validar_gerente(
            db, sucursal_in.gerente_id, sucursal_id_actual=sucursal_id
        )

    # Aplicar cambios enviados
    datos_actualizar = sucursal_in.model_dump(exclude_unset=True)
    for campo, valor in datos_actualizar.items():
        # Prevenir asignar null en campos requeridos en la base de datos
        if campo in ("nombre", "direccion", "estado") and valor is None:
            continue
        setattr(sucursal, campo, valor)

    # Si el estado cambió a 'inactiva', desasignar automáticamente al gerente y cajeros
    if sucursal_in.estado == "inactiva":
        _desasignar_personal_sucursal(sucursal, db)

    db.commit()
    db.refresh(sucursal)
    return sucursal


@router.delete("/{sucursal_id}", response_model=SucursalEliminarResponse)
def eliminar_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
):
    """
    Desactiva una sucursal (borrado lógico uniforme).
    Si la sucursal ya está inactiva, bloquea la acción.
    Al desactivarla, desasigna automáticamente al gerente y a los cajeros.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sucursal con ID {sucursal_id} no encontrada",
        )

    if sucursal.estado == "inactiva":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sucursal ya se encuentra inactiva. Solo se permite consultarla o reactivarla.",
        )

    # Borrado lógico: desactivar y desasignar personal
    sucursal.estado = "inactiva"
    _desasignar_personal_sucursal(sucursal, db)
    db.commit()

    return SucursalEliminarResponse(
        sucursal_id=sucursal_id,
        estado="inactiva",
        eliminada_definitivamente=False,
        message="La sucursal ha sido desactivada (estado='inactiva') y su personal desasignado.",
    )
