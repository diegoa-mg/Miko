from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import requiere_rol
from src.models import (
    DetalleVenta,
    Inventario,
    MetodoPago,
    Producto,
    Sucursal,
    Usuario,
    Venta,
)
from src.schemas import (
    DetalleVentaOut,
    MetodoPagoOut,
    VentaCreate,
    VentaOut,
    VentaUpdate,
)
from src.services import (
    obtener_sucursal_del_gerente,
    rango_del_dia_en_utc,
)

router = APIRouter(prefix="/ventas", tags=["ventas"])


def _construir_venta_out(venta: Venta) -> VentaOut:
    """Helper para transformar un objeto Venta ORM en su esquema VentaOut."""
    metodo_nombre = (
        venta.metodo_pago.nombre.value
        if hasattr(venta.metodo_pago.nombre, "value")
        else str(venta.metodo_pago.nombre)
    )

    detalles_out = []
    for d in venta.detalles:
        detalles_out.append(
            DetalleVentaOut(
                id=d.id,
                producto_id=d.producto_id,
                producto_nombre=d.producto.nombre if d.producto else f"Producto #{d.producto_id}",
                cantidad=d.cantidad,
                precio_unitario=Decimal(str(d.precio_unitario)),
                subtotal=Decimal(str(d.cantidad * d.precio_unitario)),
            )
        )

    return VentaOut(
        id=venta.id,
        sucursal_id=venta.sucursal_id,
        sucursal_nombre=venta.sucursal.nombre if venta.sucursal else None,
        usuario_id=venta.usuario_id,
        usuario_nombre=venta.usuario.nombre if venta.usuario else None,
        metodo_pago_id=venta.metodo_pago_id,
        metodo_pago_nombre=metodo_nombre,
        fecha=venta.fecha,
        total=Decimal(str(venta.total)),
        detalles=detalles_out,
    )


@router.get("/metodos-pago", response_model=list[MetodoPagoOut])
def listar_metodos_pago(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(
        requiere_rol("admin_general", "gerente_sede", "cajero")
    ),
):
    """Obtiene la lista de métodos de pago disponibles."""
    metodos = db.query(MetodoPago).all()
    resultado = []
    for m in metodos:
        nombre_str = m.nombre.value if hasattr(m.nombre, "value") else str(m.nombre)
        resultado.append(MetodoPagoOut(id=m.id, nombre=nombre_str))
    return resultado


@router.post("", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(
    venta_in: VentaCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(
        requiere_rol("admin_general", "gerente_sede", "cajero")
    ),
):
    """
    Registra una nueva venta con su detalle.
    Calcula automáticamente los subtotales/total y actualiza las existencias en inventario.
    """
    rol_nombre = usuario_actual.rol.nombre

    # 1. Resolver sucursal a la que se le asignará la venta
    if rol_nombre == "cajero":
        if usuario_actual.sucursal_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El cajero actual no tiene una sucursal asignada",
            )
        sucursal_id = usuario_actual.sucursal_id
    elif rol_nombre == "gerente_sede":
        sucursal = obtener_sucursal_del_gerente(db, usuario_actual.id)
        sucursal_id = sucursal.id
    else:  # admin_general
        if venta_in.sucursal_id is not None:
            sucursal_id = venta_in.sucursal_id
        elif usuario_actual.sucursal_id is not None:
            sucursal_id = usuario_actual.sucursal_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe especificar 'sucursal_id' para registrar la venta como Administrador",
            )

    # Validar sucursal activa
    sucursal = db.query(Sucursal).filter(Sucursal.id == sucursal_id).first()
    if not sucursal or sucursal.estado != "activa":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La sucursal con ID {sucursal_id} no existe o no está activa",
        )

    # 2. Validar método de pago
    metodo_pago = (
        db.query(MetodoPago).filter(MetodoPago.id == venta_in.metodo_pago_id).first()
    )
    if not metodo_pago:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el método de pago con ID {venta_in.metodo_pago_id}",
        )

    # 3. Validar inventario y preparar detalles
    if not venta_in.detalles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La venta debe contener al menos un detalle de producto",
        )

    total_general = Decimal("0.00")
    detalles_db = []

    for item in venta_in.detalles:
        # Verificar producto
        producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El producto con ID {item.producto_id} no existe",
            )

        # Consultar registro de inventario con bloqueo si aplica
        inv = (
            db.query(Inventario)
            .filter(
                Inventario.sucursal_id == sucursal_id,
                Inventario.producto_id == item.producto_id,
            )
            .with_for_update()
            .first()
        )

        existencia_actual = inv.existencia if inv else 0

        if existencia_actual < item.cantidad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Stock insuficiente para el producto '{producto.nombre}'. "
                    f"Existencia disponible: {existencia_actual}, Solicitado: {item.cantidad}"
                ),
            )

        # Determinar precio unitario
        precio_unitario = (
            item.precio_unitario
            if item.precio_unitario is not None
            else Decimal(str(producto.precio))
        )
        subtotal = Decimal(str(item.cantidad)) * precio_unitario
        total_general += subtotal

        # Descontar existencias del inventario
        inv.existencia -= item.cantidad

        # Crear objeto de detalle
        detalle = DetalleVenta(
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=precio_unitario,
        )
        detalles_db.append(detalle)

    # 4. Guardar la venta en la base de datos (Transacción atómica)
    nueva_venta = Venta(
        sucursal_id=sucursal_id,
        usuario_id=usuario_actual.id,
        metodo_pago_id=venta_in.metodo_pago_id,
        total=total_general,
        detalles=detalles_db,
    )

    db.add(nueva_venta)
    db.commit()
    db.refresh(nueva_venta)

    return _construir_venta_out(nueva_venta)


@router.get("", response_model=list[VentaOut])
def listar_ventas(
    sucursal_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    usuario_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(
        requiere_rol("admin_general", "gerente_sede", "cajero")
    ),
):
    """
    Lista las ventas registradas.
    Permite filtrar por sucursal, rango de fechas y usuario.
    Administradores pueden ver todas; gerentes y cajeros ven automáticamente su sucursal.
    """
    rol_nombre = usuario_actual.rol.nombre
    query = db.query(Venta)

    # Restricciones por rol sobre la sucursal
    if rol_nombre == "cajero":
        query = query.filter(Venta.sucursal_id == usuario_actual.sucursal_id)
    elif rol_nombre == "gerente_sede":
        sucursal = obtener_sucursal_del_gerente(db, usuario_actual.id)
        query = query.filter(Venta.sucursal_id == sucursal.id)
    else:  # admin_general
        if sucursal_id is not None:
            query = query.filter(Venta.sucursal_id == sucursal_id)

    # Filtros adicionales
    if usuario_id is not None:
        query = query.filter(Venta.usuario_id == usuario_id)

    if fecha_inicio is not None or fecha_fin is not None:
        inicio = fecha_inicio or date(2000, 1, 1)
        fin = fecha_fin or date(2099, 12, 31)
        inicio_utc, _ = rango_del_dia_en_utc(inicio)
        _, fin_utc = rango_del_dia_en_utc(fin)
        query = query.filter(Venta.fecha >= inicio_utc, Venta.fecha <= fin_utc)

    ventas = (
        query.order_by(Venta.fecha.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_construir_venta_out(v) for v in ventas]


@router.get("/{venta_id}", response_model=VentaOut)
def obtener_venta(
    venta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(
        requiere_rol("admin_general", "gerente_sede", "cajero")
    ),
):
    """Obtiene los detalles de una venta específica por su ID."""
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con ID {venta_id} no encontrada",
        )

    # Validar pertenencia por rol
    rol_nombre = usuario_actual.rol.nombre
    if rol_nombre == "cajero" and venta.sucursal_id != usuario_actual.sucursal_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver ventas de otra sucursal",
        )
    elif rol_nombre == "gerente_sede":
        sucursal = obtener_sucursal_del_gerente(db, usuario_actual.id)
        if venta.sucursal_id != sucursal.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver ventas de otra sucursal",
            )

    return _construir_venta_out(venta)


@router.put("/{venta_id}", response_model=VentaOut)
def actualizar_venta(
    venta_id: int,
    venta_in: VentaUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(
        requiere_rol("admin_general", "gerente_sede")
    ),
):
    """
    Actualiza la información general de una venta (ej. método de pago).
    """
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con ID {venta_id} no encontrada",
        )

    if usuario_actual.rol.nombre == "gerente_sede":
        sucursal = obtener_sucursal_del_gerente(db, usuario_actual.id)
        if venta.sucursal_id != sucursal.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para editar ventas de otra sucursal",
            )

    if venta_in.metodo_pago_id is not None:
        metodo = (
            db.query(MetodoPago)
            .filter(MetodoPago.id == venta_in.metodo_pago_id)
            .first()
        )
        if not metodo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Método de pago con ID {venta_in.metodo_pago_id} no encontrado",
            )
        venta.metodo_pago_id = venta_in.metodo_pago_id

    db.commit()
    db.refresh(venta)

    return _construir_venta_out(venta)


@router.delete("/{venta_id}")
def eliminar_venta(
    venta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(
        requiere_rol("admin_general", "gerente_sede")
    ),
):
    """
    Anula/Elimina una venta y reincorpora automáticamente las cantidades al inventario de la sucursal.
    """
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con ID {venta_id} no encontrada",
        )

    if usuario_actual.rol.nombre == "gerente_sede":
        sucursal = obtener_sucursal_del_gerente(db, usuario_actual.id)
        if venta.sucursal_id != sucursal.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para anular ventas de otra sucursal",
            )

    # Devolver productos al inventario
    for detalle in venta.detalles:
        inv = (
            db.query(Inventario)
            .filter(
                Inventario.sucursal_id == venta.sucursal_id,
                Inventario.producto_id == detalle.producto_id,
            )
            .with_for_update()
            .first()
        )

        if inv:
            inv.existencia += detalle.cantidad
        else:
            # En caso raro de que no existiera la fila en inventario, se vuelve a crear
            nuevo_inv = Inventario(
                sucursal_id=venta.sucursal_id,
                producto_id=detalle.producto_id,
                existencia=detalle.cantidad,
            )
            db.add(nuevo_inv)

    db.delete(venta)
    db.commit()

    return {
        "message": f"Venta {venta_id} anulada exitosamente y productos devueltos al inventario.",
        "venta_id": venta_id,
    }
