import os
import sys

# Asegurar que backend está en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from src.database import SessionLocal
from src.models import (
    Inventario,
    Producto,
    Rol,
    Sucursal,
    Usuario,
)
from src.schemas import (
    SucursalCreate,
    SucursalUpdate,
)
from src.routers.sucursales import (
    crear_sucursal,
    eliminar_sucursal,
    listar_sucursales,
    modificar_sucursal,
    obtener_sucursal,
)
from src.services import obtener_sucursal_del_gerente

def run_tests():
    db = SessionLocal()
    try:
        print("--- INICIANDO PRUEBAS DEL MÓDULO DE SUCURSALES ---")

        # Roles
        rol_admin = db.query(Rol).filter(Rol.nombre == "admin_general").first()
        if not rol_admin:
            rol_admin = Rol(nombre="admin_general")
            db.add(rol_admin)
            db.commit()

        rol_gerente = db.query(Rol).filter(Rol.nombre == "gerente_sede").first()
        if not rol_gerente:
            rol_gerente = Rol(nombre="gerente_sede")
            db.add(rol_gerente)
            db.commit()

        rol_cajero = db.query(Rol).filter(Rol.nombre == "cajero").first()
        if not rol_cajero:
            rol_cajero = Rol(nombre="cajero")
            db.add(rol_cajero)
            db.commit()

        # Crear usuarios de prueba
        gerente = db.query(Usuario).filter(Usuario.email == "gerente_suc_test@miko.com").first()
        if not gerente:
            gerente = Usuario(
                nombre="Gerente Sucursal Test",
                email="gerente_suc_test@miko.com",
                password_hash="pass123",
                rol_id=rol_gerente.id,
            )
            db.add(gerente)
            db.commit()
            db.refresh(gerente)

        cajero = db.query(Usuario).filter(Usuario.email == "cajero_suc_test@miko.com").first()
        if not cajero:
            cajero = Usuario(
                nombre="Cajero Sucursal Test",
                email="cajero_suc_test@miko.com",
                password_hash="pass123",
                rol_id=rol_cajero.id,
            )
            db.add(cajero)
            db.commit()
            db.refresh(cajero)

        # 1. Crear Sucursal con Gerente
        suc_in = SucursalCreate(
            nombre="Sucursal Test Correcciones",
            direccion="Calle Principal 100",
            telefono="555-1234",
            gerente_id=gerente.id,
        )
        suc_out = crear_sucursal(suc_in, db)
        suc_id = suc_out.id
        print(f"✓ Sucursal creada correctamente (ID: {suc_id}, Gerente ID: {suc_out.gerente_id})")

        # Asignar cajero a la sucursal
        cajero.sucursal_id = suc_id
        db.commit()

        # Verificar obtener_sucursal_del_gerente
        suc_gerente = obtener_sucursal_del_gerente(db, gerente.id)
        assert suc_gerente.id == suc_id
        print(f"✓ Relación gerente-sucursal resuelta correctamente con obtener_sucursal_del_gerente (Sucursal ID: {suc_gerente.id})")

        # 2. Modificar con PATCH parcial
        suc_mod = modificar_sucursal(suc_id, SucursalUpdate(telefono="555-9999"), db)
        assert suc_mod.telefono == "555-9999"
        assert suc_mod.nombre == "Sucursal Test Correcciones"
        print("✓ Edición parcial con PATCH / PUT OK (Teléfono actualizado a 555-9999)")

        # Agregar un inventario para forzar borrado lógico al desactivar
        prod = db.query(Producto).first()
        if prod:
            inv = Inventario(sucursal_id=suc_id, producto_id=prod.id, existencia=5)
            db.add(inv)
            db.commit()

        # 3. Desactivar / Eliminar sucursal (Borrado lógico)
        res_del = eliminar_sucursal(suc_id, db)
        assert res_del.estado == "inactiva"
        assert res_del.eliminada_definitivamente is False
        assert isinstance(res_del.eliminada_definitivamente, bool)
        assert res_del.sucursal_id == suc_id
        print("✓ Respuesta estructurada en DELETE OK:", res_del.model_dump())

        # Verificar desasignación automática de gerente y cajero
        db.refresh(suc_mod)
        db.refresh(cajero)
        assert suc_mod.gerente_id is None, "El gerente debió ser desasignado de la sucursal inactiva"
        assert cajero.sucursal_id is None, "El cajero debió ser desasignado de la sucursal inactiva"
        print("✓ Desasignación automática de gerente y cajero al desactivar OK (gerente_id=None, cajero.sucursal_id=None)")

        # 4. Verificar que la sucursal inactiva SE PUEDE CONSULTAR
        suc_cons = obtener_sucursal(suc_id, db)
        assert suc_cons.estado == "inactiva"
        print("✓ Consultar sucursal inactiva OK (GET /sucursales/{id} responde correctamente)")

        # 5. Verificar que SE BLOQUEAN modificaciones a la sucursal inactiva
        try:
            modificar_sucursal(suc_id, SucursalUpdate(nombre="Nuevo Nombre Bloqueado"), db)
            assert False, "Debió bloquear modificación sobre sucursal inactiva"
        except HTTPException as exc:
            assert exc.status_code == 400
            print("✓ Bloqueo de edición sobre sucursal inactiva OK:", exc.detail)

        # 6. Reactivar sucursal inactiva con estado = "activa"
        suc_reactivada = modificar_sucursal(suc_id, SucursalUpdate(estado="activa"), db)
        assert suc_reactivada.estado == "activa"
        print("✓ Reactivación de sucursal inactiva con estado='activa' OK")

        # Limpieza: eliminar inventario de prueba para permitir borrado físico
        if prod:
            db.query(Inventario).filter(Inventario.sucursal_id == suc_id).delete()
            db.commit()

        # 7. Eliminar sucursal vacía (Borrado Físico)
        res_del_fisico = eliminar_sucursal(suc_id, db)
        assert res_del_fisico.estado == "eliminada"
        assert res_del_fisico.eliminada_definitivamente is True
        print("✓ Borrado físico de sucursal sin registros OK:", res_del_fisico.model_dump())

        print("\n=== TODAS LAS CORRECCIONES DEL MÓDULO DE SUCURSALES FUNCIONAN PERFECTAMENTE ===")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
