from typing import Optional

from fastapi import status, HTTPException
from sqlalchemy.orm import Session

from src.models import Sucursal, Usuario

def obtener_sucursal_del_gerente(db: Session, usuario_id: int) -> Sucursal:
    """
    La sucursal de un gerente se determina por sucursales.gerente_id, NO por
    usuarios.sucursal_id (ese campo siempre es null para gerentes). Si el gerente no tiene sucursal asignada, se
    responde un error claro en vez de devolver datos de toda la empresa.
    """
    sucursal = db.query(Sucursal).filter(Sucursal.gerente_id == usuario_id).first()
    if sucursal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este gerente no tiene una sucursal asignada",
        )
    return sucursal

def sucursal_del_alcance(db: Session, usuario: Usuario) -> Optional[int]:
    """
    Sucursal a la que está limitado `usuario` al consultar o modificar datos:
    - admin_general -> None (sin restricción: ve todas las sucursales)
    - gerente_sede  -> id de su sucursal (Sucursal.gerente_id == usuario.id).
                       Si no tiene sucursal asignada responde 404, nunca
                       devuelve datos de toda la empresa.
    Cualquier otro rol responde 403 (falla cerrado: None solo significa
    "sin restricción" para el admin). Se reutiliza en cajeros, inventario
    y ventas.
    """
    rol = usuario.rol.nombre
    if rol == "admin_general":
        return None
    if rol == "gerente_sede":
        return obtener_sucursal_del_gerente(db, usuario.id).id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Tu rol no tiene acceso a esta sección",
    )