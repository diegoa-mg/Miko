from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import Inventario, Producto, Categoria, Sucursal, Usuario
from src.schemas import InventarioOut, InventarioUpdate
from src.services import llenar_inventario_out, consulta_inventario, crear_lista_inventario, obtener_sucursal_del_gerente, calcular_alertas_inventario

router = APIRouter(
    prefix="/inventarios",
    tags=["inventarios"]
)

# Endpoint listar inventarios en administrador
@router.get("", response_model=list[InventarioOut], dependencies=[Depends(requiere_rol("admin_general"))])
def listar_inventarios(sucursal_id: int | None = None, incluir_inactivas: bool = False, db: Session = Depends(get_db)):
    """Listar el inventario de todas las sucursales o de una en específico. Solo Administrador General"""

    # Si viene el ID de una sucursal, se verifica que sí exista (activa o inactiva pero que exista), 
    # en caso de que no, lanza el error 404
    if sucursal_id:
        existe = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
        if not existe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La sucursal no existe"
            )

    # Consulta para obtener todos los productos de las sucursales
    consulta = consulta_inventario(db)

    # Si no se incluye los inventarios de sucursales inactivas, únicamente muestra los inventarios de las sucursales activas
    if not incluir_inactivas:
        consulta = consulta.filter(Sucursal.estado == "activa")
    # En caso de que venga el ID de una sucursal existente, únicamente muestra el inventario de esa sucursal
    if sucursal_id:
        consulta = consulta.filter(Sucursal.id == sucursal_id)

    # Se devuelve una lista con todos los productos y sus datos con los filtros aplicados
    return crear_lista_inventario(consulta)

# Endpoint para mostrar el inventario de la sucursal del gerente
@router.get("/mi-sucursal", response_model=list[InventarioOut])
def listar_inventario_mi_sucursal(usuario: Usuario = Depends(requiere_rol("gerente_sede")), db: Session = Depends(get_db)):
    """Mostrar el inventario de la sucursal del gerente. Solo Gerente Sede."""

    # Se obtiene la sucursal del gerente para saber que inventario mostrar
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # Se realiza una consulta de los productos (con sus datos) y luego se filtra para que sean solo los del id de la sucursal del gerente
    consulta = consulta_inventario(db) 
    consulta = consulta.filter(Sucursal.estado == "activa", Sucursal.id == sucursal.id) # El filtro Sucursal.estado == "activa", en el flujo normal no hace falta (desactivar la sucursal desasigna al gerente), es protección extra

    # Se devuelve una lista con todos los productos y sus datos de la sucursal del gerente
    return crear_lista_inventario(consulta)

# Endpoint para actualizar existencias de un producto en el inventario
@router.patch("/mi-sucursal/{producto_id}", response_model=InventarioOut)
def actualizar_existencias(producto_id: int, datos: InventarioUpdate, usuario: Usuario = Depends(requiere_rol("gerente_sede")), db: Session = Depends(get_db)):
    """Actualizar (sumar o restar) la existencia de un producto en la sucursal del gerente. Solo Gerente Sede."""

    # Se obtiene la sucursal del gerente para saber que inventario mostrar
    sucursal = obtener_sucursal_del_gerente(db, usuario.id)

    # Verificar que el producto tenga fila en el inventario de la sucursal
    fila = db.query(Inventario).filter(Inventario.sucursal_id == sucursal.id, Inventario.producto_id == producto_id).first()
    if fila is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El producto no existe en el inventario de tu sucursal"
        )

    # La base suma/resta en un solo paso, solo si el resultado no queda negativo.
    # .update() regresa cuántas filas cambió (0 o 1).
    numero = db.query(Inventario).filter(
        Inventario.sucursal_id == sucursal.id, 
        Inventario.producto_id == producto_id, 
        Inventario.existencia + datos.cantidad >= 0 # Verificar que con la actualización de la existencia, el inventario no quede en negativo 
        ).update(
        {Inventario.existencia: Inventario.existencia + datos.cantidad}
    )

    # Si la fila existe pero no se actualizó, es que no alcanzaba la existenia
    if numero == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Existencia insuficiente. Disponible: {fila.existencia}, se intentó restar: {abs(datos.cantidad)}",
        )
    
    db.commit()

    # Regresar fila actualizada
    resultado = consulta_inventario(db).filter(Inventario.sucursal_id == sucursal.id, Inventario.producto_id == producto_id).first()
    return llenar_inventario_out(resultado)