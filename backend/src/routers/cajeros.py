from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from src.dependencies import requiere_rol
from src.services import obtener_rol, llenar_usuario_out, sucursal_del_alcance, enviar_aviso_privacidad
from src.database import get_db
from src.security import hash_password
from src.models import Usuario, Sucursal
from src.schemas import CajeroCreate, CajeroUpdate, UsuarioOut

# Se define una sola vez para usarla a nivel de router y en cada endpoint:
# FastAPI reutiliza el resultado dentro de la misma petición (misma función
# = una sola ejecución), así que el usuario no se consulta dos veces.
admin_o_gerente = requiere_rol("admin_general", "gerente_sede")

router = APIRouter(
    prefix="/cajeros",
    tags=["cajeros"],
    dependencies=[Depends(admin_o_gerente)],
)


def _buscar_cajero(
    db: Session, cajero_id: int, alcance: int | None, solo_activos: bool = True
) -> Usuario:
    """
    Busca un cajero por id. `alcance` es la sucursal a la que está limitado
    quien consulta (None = admin, sin restricción; ver sucursal_del_alcance).
    Responde 404 si el id no existe, no es de un cajero, está desactivado
    (cuando solo_activos) o, para un gerente, pertenece a otra sucursal.
    Siempre 404: un 403 revelaría que el id existe.
    """
    rol_cajero = obtener_rol(db, "cajero")
    consulta = db.query(Usuario).filter(
        Usuario.id == cajero_id, Usuario.rol_id == rol_cajero.id
    )
    if solo_activos:
        consulta = consulta.filter(Usuario.activo == True)
    if alcance is not None:
        consulta = consulta.filter(Usuario.sucursal_id == alcance)

    cajero = consulta.first()
    if cajero is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cajero con ID {cajero_id} no encontrado",
        )
    return cajero


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_cajero(
    cajero_in: CajeroCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario_actual=Depends(admin_o_gerente),
):
    """Crea un usuario con rol cajero. Accesible para admin_general y gerente_sede
    (el gerente solo puede crearlos en su propia sucursal)."""

    alcance = sucursal_del_alcance(db, usuario_actual)
    sucursal_id = cajero_in.sucursal_id
    if alcance is not None:
        if sucursal_id is not None and sucursal_id != alcance:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes registrar cajeros en tu sucursal",
            )
        sucursal_id = alcance

    existente = db.query(Usuario).filter(Usuario.email == cajero_in.email).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario con el email '{cajero_in.email}'",
        )

    if sucursal_id is not None:
        sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
        if not sucursal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No existe la sucursal con ID {sucursal_id}",
            )

    rol_cajero = obtener_rol(db, "cajero")

    usuario = Usuario(
        nombre=cajero_in.nombre,
        email=cajero_in.email,
        password_hash=hash_password(cajero_in.password),
        rol=rol_cajero,
        sucursal_id=sucursal_id,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    background_tasks.add_task(
        enviar_aviso_privacidad, usuario.id, usuario.nombre, usuario.email, "cajero"
    )

    return llenar_usuario_out(usuario)


@router.get("", response_model=list[UsuarioOut], status_code=status.HTTP_200_OK)
def listar_cajeros(
    sucursal_id: int | None = None,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    usuario_actual=Depends(admin_o_gerente),
):
    """Lista a los usuarios con rol cajero. Accesible para admin_general y gerente_sede
    (el gerente solo ve los de su sucursal, sin importar el filtro sucursal_id)."""

    alcance = sucursal_del_alcance(db, usuario_actual)
    if alcance is not None:
        sucursal_id = alcance

    rol_cajero = obtener_rol(db, "cajero")

    consulta = db.query(Usuario).filter(Usuario.rol_id == rol_cajero.id)
    if not incluir_inactivos:
        consulta = consulta.filter(Usuario.activo == True)

    if sucursal_id is not None:
        consulta = consulta.filter(Usuario.sucursal_id == sucursal_id)

    cajeros = consulta.all()

    return [llenar_usuario_out(cajero) for cajero in cajeros]


@router.get("/{cajero_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_cajero(
    cajero_id: int,
    db: Session = Depends(get_db),
    usuario_actual=Depends(admin_o_gerente),
):
    """Obtiene un cajero específico."""

    alcance = sucursal_del_alcance(db, usuario_actual)
    cajero = _buscar_cajero(db, cajero_id, alcance)

    return llenar_usuario_out(cajero)


@router.put("/{cajero_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def editar_cajero(
    cajero_id: int,
    cajero_in: CajeroUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(admin_o_gerente),
):
    """Edita la información de un cajero."""

    alcance = sucursal_del_alcance(db, usuario_actual)
    cajero = _buscar_cajero(db, cajero_id, alcance)

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
        if alcance is not None and cajero_in.sucursal_id != alcance:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes mover cajeros a otra sucursal",
            )
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
def eliminar_cajero(
    cajero_id: int,
    db: Session = Depends(get_db),
    usuario_actual=Depends(admin_o_gerente),
):
    """Desactiva un cajero (soft delete)."""

    alcance = sucursal_del_alcance(db, usuario_actual)
    cajero = _buscar_cajero(db, cajero_id, alcance)

    cajero.activo = False
    db.commit()

    return {
        "message": "Cajero desactivado exitosamente en la base de datos.",
        "cajero_id": cajero_id,
    }


@router.patch("/{cajero_id}/reactivar", status_code=status.HTTP_200_OK)
def reactivar_cajero(
    cajero_id: int,
    db: Session = Depends(get_db),
    usuario_actual=Depends(admin_o_gerente),
):
    """Reactiva un cajero desactivado. Accesible para admin_general y gerente_sede
    (el gerente solo puede reactivar los de su sucursal)."""

    alcance = sucursal_del_alcance(db, usuario_actual)
    cajero = _buscar_cajero(db, cajero_id, alcance, solo_activos=False)

    if cajero.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cajero con ID {cajero_id} ya está activo",
        )

    cajero.activo = True
    db.commit()

    return {
        "message": "Cajero activado exitosamente en la base de datos.",
        "cajero_id": cajero_id,
    }