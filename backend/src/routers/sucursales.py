from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Inventario, Sucursal, Usuario, Venta
from src.schemas import (
    SucursalCreate,
    SucursalEliminarResponse,
    SucursalOut,
    SucursalUpdate,
)
from src.services import obtener_sucursal_del_gerente

router = APIRouter(
    prefix="/sucursales",
    tags=["sucursales"],
    dependencies=[Depends(requiere_rol("admin_general", "admin"))],
)


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
        gerente = db.query(Usuario).filter(Usuario.id == sucursal_in.gerente_id).first()
        if not gerente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró ningún usuario con el ID {sucursal_in.gerente_id}",
            )
        # Verificar si el usuario ya es gerente de otra sucursal
        try:
            otra_sucursal = obtener_sucursal_del_gerente(db, sucursal_in.gerente_id)
            if otra_sucursal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El usuario ya es gerente de la sucursal '{otra_sucursal.nombre}'",
                )
        except HTTPException as e:
            if e.status_code != status.HTTP_404_NOT_FOUND:
                raise e

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
    estado: str | None = Query(None, description="Filtrar por estado (ej. activa, inactiva)"),
    db: Session = Depends(get_db),
):
    """
    Lista todas las sucursales registradas, con filtro opcional por estado.
    """
    query = db.query(Sucursal)
    if estado:
        query = query.filter(Sucursal.estado == estado)
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
    Modifica una sucursal existente (vía PATCH o PUT).
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
    if sucursal_in.gerente_id is not None and sucursal_in.gerente_id != sucursal.gerente_id:
        gerente = db.query(Usuario).filter(Usuario.id == sucursal_in.gerente_id).first()
        if not gerente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró ningún usuario con el ID {sucursal_in.gerente_id}",
            )
        try:
            otra_sucursal = obtener_sucursal_del_gerente(db, sucursal_in.gerente_id)
            if otra_sucursal and otra_sucursal.id != sucursal_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El usuario ya es gerente de la sucursal '{otra_sucursal.nombre}'",
                )
        except HTTPException as e:
            if e.status_code != status.HTTP_404_NOT_FOUND:
                raise e

    # Aplicar cambios enviados
    datos_actualizar = sucursal_in.model_dump(exclude_unset=True)
    for campo, valor in datos_actualizar.items():
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
    Elimina o desactiva una sucursal.
    Si la sucursal ya está inactiva, bloquea la acción.
    Si tiene registros asociados (empleados, inventario o ventas), realiza un borrado lógico (inactiva)
    y desasigna al gerente y cajeros.
    Si no tiene registros asociados, la elimina físicamente.
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

    # Revisar si tiene empleados, inventario o ventas asociadas
    tiene_empleados = db.query(Usuario).filter(Usuario.sucursal_id == sucursal_id).first()
    tiene_inventario = db.query(Inventario).filter(Inventario.sucursal_id == sucursal_id).first()
    tiene_ventas = db.query(Venta).filter(Venta.sucursal_id == sucursal_id).first()

    if tiene_empleados or tiene_inventario or tiene_ventas or sucursal.gerente_id is not None:
        # Borrado lógico: desactivar y desasignar personal
        sucursal.estado = "inactiva"
        _desasignar_personal_sucursal(sucursal, db)
        db.commit()

        return SucursalEliminarResponse(
            sucursal_id=sucursal_id,
            estado="inactiva",
            eliminada_definitivamente=False,
            message="La sucursal tiene registros asociados. Se ha desactivado (estado='inactiva') y desasignado su personal.",
        )

    # Borrado físico
    db.delete(sucursal)
    db.commit()

    return SucursalEliminarResponse(
        sucursal_id=sucursal_id,
        estado="eliminada",
        eliminada_definitivamente=True,
        message="Sucursal eliminada exitosamente de la base de datos.",
    )
