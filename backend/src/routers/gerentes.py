from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies import requiere_rol
from src.services import obtener_rol, llenar_usuario_out
from src.database import get_db
from src.security import hash_password
from src.models import Usuario, Sucursal
from src.schemas import GerenteCreate, GerenteUpdate, UsuarioOut

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

    # Regresar el usuario con el esquema UsuarioOut mediante la funcion llenar_usuario_out
    return llenar_usuario_out(usuario)

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
    # llenar_usuario_out llena el esquema UsuarioOut y lista_gerentes.append agrega cada gerente a la lista

    for gerente in gerentes:
        lista_gerentes.append(llenar_usuario_out(gerente))

    return lista_gerentes

# Obtener un Gerente
@router.get("/{gerente_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_gerente(gerente_id: int, db: Session = Depends(get_db),): # FastAPI valida el tipo antes de ejecutar la función: si no es entero, responde 422
    """Obtiene un gerente especifico. Solo Administrador General."""

    # Obtiene el rol de gerente_sede para usarlo en la consulta
    rol_gerente = obtener_rol(db, "gerente_sede")
    # Consulta con dos condiciones para obtener el usuario con el id deseado y asegurandose de que el rol sea gerente_sede
    gerente = db.query(Usuario).filter(Usuario.id == gerente_id, Usuario.rol_id == rol_gerente.id).first()

    # Si el id no existe o no es de un gerente, se responde 404 en ambos casos:
    # un 403 revelaría que el id existe pero pertenece a otro tipo de usuario
    if gerente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gerente con ID {gerente_id} no encontrado",
        )

    # Muestra el usuario con el id deseado con el esquema UsuarioOut mediante la funcion llenar_usuario_out
    return llenar_usuario_out(gerente)

@router.put("/{gerente_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def editar_gerente(gerente_id: int, gerente_in: GerenteUpdate, db:Session = Depends(get_db),):
    """Edita un gerente. Solo Administrador General"""

    # Obtener el rol de gerente_sede para usarlo en la consulta
    rol_gerente = obtener_rol(db, "gerente_sede")

    # Consulta usada para encontrar al usuario con el id deseado y asegurandose de que el rol sea gerente_sede
    gerente = db.query(Usuario).filter(Usuario.id == gerente_id, Usuario.rol_id == rol_gerente.id).first()

    # Si el id no existe o no es de un gerente, se responde 404 en ambos casos:
    # un 403 revelaría que el id existe pero pertenece a otro tipo de usuario
    if gerente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gerente con ID {gerente_id} no encontrado",
        )

    # Consulta para obtener un usuario mediante el correo ingresado.
    # Si el correo ingresado mediante gerente_in coincide con un correo ya existente,
    # y su id no es el del gerente que estamos editando, significa que otro usuario ya tiene ese correo
    email_nuevo = db.query(Usuario).filter(Usuario.email == gerente_in.email, Usuario.id != gerente.id).first()
    # Si el email utilizado en la consulta ya existe, se responde con 400
    if email_nuevo:
       raise HTTPException(
           status_code=status.HTTP_400_BAD_REQUEST,
           detail=f"El email {gerente_in.email} ya está en uso"
       ) 

    # Guardar los datos en la db
    gerente.nombre = gerente_in.nombre
    gerente.email = gerente_in.email
    
    db.commit()
    db.refresh(gerente)

    return llenar_usuario_out(gerente)

