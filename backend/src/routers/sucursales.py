from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Inventario, Sucursal, Usuario, Venta
from src.schemas import SucursalCreate, SucursalOut, SucursalUpdate

router = APIRouter(
    prefix="/sucursales",
    tags=["sucursales"],
    dependencies=[Depends(requiere_rol("admin_general", "admin"))],
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
        # Verificar que el usuario no sea ya gerente de otra sucursal
        otra_sucursal = (
            db.query(Sucursal)
            .filter(Sucursal.gerente_id == sucursal_in.gerente_id)
            .first()
        )
        if otra_sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El usuario ya es gerente de la sucursal '{otra_sucursal.nombre}'",
            )

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
    """
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sucursal con ID {sucursal_id} no encontrada",
        )
    return sucursal


@router.put("/{sucursal_id}", response_model=SucursalOut)
def modificar_sucursal(
    sucursal_id: int,
    sucursal_in: SucursalUpdate,
    db: Session = Depends(get_db),
):
    """
    Modifica una sucursal existente. Solo se actualizan los campos enviados.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sucursal con ID {sucursal_id} no encontrada",
        )

    # Validar nombre único si se desea cambiar
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
        otra_sucursal = (
            db.query(Sucursal)
            .filter(
                Sucursal.gerente_id == sucursal_in.gerente_id,
                Sucursal.id != sucursal_id,
            )
            .first()
        )
        if otra_sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El usuario ya es gerente de la sucursal '{otra_sucursal.nombre}'",
            )

    # Aplicar cambios enviados
    datos_actualizar = sucursal_in.model_dump(exclude_unset=True)
    for campo, valor in datos_actualizar.items():
        setattr(sucursal, campo, valor)

    db.commit()
    db.refresh(sucursal)
    return sucursal


@router.delete("/{sucursal_id}")
def eliminar_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
):
    """
    Elimina una sucursal.
    Si tiene registros asociados (empleados, inventario o ventas), se realiza un borrado lógico
    cambiando su estado a 'inactiva' para proteger la integridad referencial.
    Si no tiene registros asociados, se elimina definitivamente.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sucursal con ID {sucursal_id} no encontrada",
        )

    # Revisar si tiene empleados, inventario o ventas asociadas
    tiene_empleados = db.query(Usuario).filter(Usuario.sucursal_id == sucursal_id).first()
    tiene_inventario = db.query(Inventario).filter(Inventario.sucursal_id == sucursal_id).first()
    tiene_ventas = db.query(Venta).filter(Venta.sucursal_id == sucursal_id).first()

    if tiene_empleados or tiene_inventario or tiene_ventas:
        # Borrado lógico: desactivar
        sucursal.estado = "inactiva"
        db.commit()
        return {
            "message": "La sucursal tiene registros asociados (empleados, inventario o ventas). Se ha desactivado (estado = 'inactiva') para mantener la integridad de los datos.",
            "sucursal_id": sucursal_id,
            "estado": "inactiva",
        }

    # Borrado físico
    db.delete(sucursal)
    db.commit()
    return {
        "message": "Sucursal eliminada exitosamente de la base de datos.",
        "sucursal_id": sucursal_id,
    }
