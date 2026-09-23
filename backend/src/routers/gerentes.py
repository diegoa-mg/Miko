from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies import requiere_rol
from src.services import obtener_rol
from src.database import get_db
from src.security import hash_password
from src.models import Usuario
from src.schemas import GerenteCreate, GerenteBase, UsuarioOut

router = APIRouter(
    prefix="/gerentes",
    tags=["gerentes"],
    dependencies=[Depends(requiere_rol("admin_general"))] # Solo accesible para administradores
)

# Endpoint Crear Gerente
@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_gerente(gerente_in: GerenteCreate, db: Session = Depends(get_db),):
    """Crea un usuario con rol gerente_sede. Solo Administrador General."""

    # Validar si ya existe un usuario con el mismo correo, ya que no se permiten correos duplicados
    existente = db.query(Usuario).filter(Usuario.email == gerente_in.email).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario con el email '{gerente_in.email}'",
        )

    # Obtener el rol que se le va a asignar, lo asigna el servidor
    rol_gerente = obtener_rol(db, "gerente_sede")

    # Guardar los datos en la db
    usuario = Usuario(
        nombre=gerente_in.nombre,
        email=gerente_in.email,
        password_hash=hash_password(gerente_in.password),
        rol=rol_gerente,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    # Regresar el usuario con el esquema UsuarioOut, excluyendo el password_hash y convirtiendo el rol a texto
    return UsuarioOut(
        id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        rol=rol_gerente.nombre,
        sucursal_id=usuario.sucursal_id,
    )

# Endpoint Listar Gerentes
@router.get("", response_model=list[UsuarioOut], status_code=status.HTTP_200_OK)
def listar_gerentes(db: Session = Depends(get_db),):
    """Lista a todos los usuarios con rol gerente_sede. Solo Administrador General."""

    # Guardar en "gerentes" todos los usuarios con el rol "gerente_sede"
    rol_gerente = obtener_rol(db, "gerente_sede")
    gerentes = db.query(Usuario).filter(Usuario.rol_id == rol_gerente.id).all()

    lista_gerentes = []

    # Guardar en una lista a todos los gerentes
    # gerente: usuario que viene de la db
    # gerente_out: usuario que sale del esquema UsuarioOut, el cual se agrega a la lista_gerentes

    for gerente in gerentes:
        gerente_out = UsuarioOut(
            id=gerente.id,
            nombre=gerente.nombre,
            email=gerente.email,
            rol=rol_gerente.nombre,
            sucursal_id=gerente.sucursal_id,
        )
        lista_gerentes.append(gerente_out)

    return lista_gerentes

# Listar un Gerente