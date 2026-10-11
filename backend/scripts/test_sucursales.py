import os
import sys

# Asegurar que backend está en sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pydantic import ValidationError
from fastapi import HTTPException
from src.database import SessionLocal
from src.security import hash_password
from src.models import (
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

def run_tests():
    db = SessionLocal()
    try:
        print("==================================================")
        print("VERIFICACIÓN COMPLETA DE SUCURSALES (8 PUNTOS)")
        print("==================================================")

        # --------------------------------------------------
        # Roles necesarios
        # --------------------------------------------------
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

        # Limpiar datos previos de prueba si existen
        db.query(Sucursal).filter(Sucursal.nombre.in_([
            "Sucursal Test 1", "Sucursal Test 2", "Sucursal Test A"
        ])).delete()
        db.commit()

        # Usuarios de prueba con hash bcrypt válido
        pw_hash = hash_password("pass123")

        gerente_activo = db.query(Usuario).filter(Usuario.email == "gerente_activo_test@miko.com").first()
        if not gerente_activo:
            gerente_activo = Usuario(
                nombre="Gerente Activo",
                email="gerente_activo_test@miko.com",
                password_hash=pw_hash,
                rol_id=rol_gerente.id,
                activo=True
            )
            db.add(gerente_activo)
            db.commit()
            db.refresh(gerente_activo)

        gerente_inactivo = db.query(Usuario).filter(Usuario.email == "gerente_inactivo_test@miko.com").first()
        if not gerente_inactivo:
            gerente_inactivo = Usuario(
                nombre="Gerente Inactivo",
                email="gerente_inactivo_test@miko.com",
                password_hash=pw_hash,
                rol_id=rol_gerente.id,
                activo=False
            )
            db.add(gerente_inactivo)
            db.commit()
            db.refresh(gerente_inactivo)

        cajero_test = db.query(Usuario).filter(Usuario.email == "cajero_invalido_test@miko.com").first()
        if not cajero_test:
            cajero_test = Usuario(
                nombre="Cajero Invalido",
                email="cajero_invalido_test@miko.com",
                password_hash=pw_hash,
                rol_id=rol_cajero.id,
                activo=True
            )
            db.add(cajero_test)
            db.commit()
            db.refresh(cajero_test)

        # --------------------------------------------------
        # PUNTO 1: estado acepta solo Literal["activa", "inactiva"]
        # Y rechazo de null en campos obligatorios
        # --------------------------------------------------
        try:
            SucursalUpdate(estado="Inactiva")
            assert False, "Debió fallar con 'Inactiva' (mayúscula)"
        except ValidationError:
            pass

        try:
            SucursalUpdate(nombre=None)
            assert False, "Debió fallar con nombre=None explícito"
        except ValidationError:
            pass

        try:
            SucursalUpdate(direccion="")
            assert False, "Debió fallar con dirección vacía"
        except ValidationError:
            pass

        # Válidos deben funcionar
        assert SucursalUpdate(estado="activa").estado == "activa"
        assert SucursalUpdate(estado="inactiva").estado == "inactiva"
        print("✓ PUNTO 1 & Validación de campos: Literal y rechazo de null/vacíos superado.")

        # --------------------------------------------------
        # PUNTO 2: Validar el gerente al asignarlo
        # --------------------------------------------------
        try:
            crear_sucursal(SucursalCreate(nombre="Sucursal Test A", direccion="Dir 1", gerente_id=cajero_test.id), db)
            assert False, "Debió rechazar cajero como gerente"
        except HTTPException as e:
            assert e.status_code == 400
            assert "rol 'gerente_sede'" in e.detail

        try:
            crear_sucursal(SucursalCreate(nombre="Sucursal Test A", direccion="Dir 1", gerente_id=gerente_inactivo.id), db)
            assert False, "Debió rechazar gerente inactivo"
        except HTTPException as e:
            assert e.status_code == 400
            assert "no está activo" in e.detail

        suc1 = crear_sucursal(SucursalCreate(nombre="Sucursal Test 1", direccion="Dir 1", gerente_id=gerente_activo.id), db)

        try:
            crear_sucursal(SucursalCreate(nombre="Sucursal Test 2", direccion="Dir 2", gerente_id=gerente_activo.id), db)
            assert False, "Debió rechazar gerente duplicado en otra sucursal"
        except HTTPException as e:
            assert e.status_code == 400
            assert "ya es gerente de la sucursal" in e.detail

        print("✓ PUNTO 2: Validación completa de gerente (rol, activo, sin duplicar sucursal) superada.")

        # --------------------------------------------------
        # PUNTO 8: Relación gerente <-> sucursal y desasignación
        # --------------------------------------------------
        cajero_test.sucursal_id = suc1.id
        db.commit()
        db.refresh(suc1)
        assert suc1.gerente_id == gerente_activo.id
        assert cajero_test.sucursal_id == suc1.id
        print("✓ PUNTO 8: Relación gerente <-> sucursal confirmada.")

        # --------------------------------------------------
        # PUNTO 5: DELETE uniforme (solo borrado lógico)
        # --------------------------------------------------
        del_res = eliminar_sucursal(suc1.id, db)
        assert del_res.estado == "inactiva"
        assert del_res.eliminada_definitivamente is False
        db.refresh(suc1)
        db.refresh(cajero_test)
        assert suc1.estado == "inactiva"
        assert suc1.gerente_id is None, "El gerente debió ser desasignado"
        assert cajero_test.sucursal_id is None, "El cajero debió ser desasignado"
        print("✓ PUNTO 5: DELETE realiza borrado lógico uniforme y desasigna personal.")

        # --------------------------------------------------
        # PUNTO 3: El listado excluye las inactivas por defecto
        # --------------------------------------------------
        listado_defecto = listar_sucursales(incluir_inactivas=False, db=db)
        assert not any(s.id == suc1.id for s in listado_defecto), "Sucursal inactiva no debe aparecer por defecto"

        listado_con_inactivas = listar_sucursales(incluir_inactivas=True, db=db)
        assert any(s.id == suc1.id for s in listado_con_inactivas), "Sucursal inactiva debe aparecer si incluir_inactivas=True"
        print("✓ PUNTO 3: Listado excluye inactivas por defecto y las incluye con incluir_inactivas=True.")

        # --------------------------------------------------
        # PUNTO 7: Qué se puede hacer con una sucursal inactiva
        # --------------------------------------------------
        suc_inactiva = obtener_sucursal(suc1.id, db)
        assert suc_inactiva.id == suc1.id

        try:
            modificar_sucursal(suc1.id, SucursalUpdate(nombre="Nuevo Nombre"), db)
            assert False, "Debió bloquear modificación de sucursal inactiva"
        except HTTPException as e:
            assert e.status_code == 400
            assert "Solo se permite consultarla o reactivarla" in e.detail

        print("✓ PUNTO 7: Operaciones sobre sucursal inactiva correctamente restringidas.")

        # --------------------------------------------------
        # PUNTO 4 & 6: Reactivar y editar con PATCH / PUT
        # --------------------------------------------------
        suc_reactivada = modificar_sucursal(suc1.id, SucursalUpdate(estado="activa"), db)
        assert suc_reactivada.estado == "activa"
        print("✓ PUNTO 4: Reactivación mediante PATCH con estado='activa' superada.")

        suc_parcial = modificar_sucursal(suc1.id, SucursalUpdate(telefono="1234567890"), db)
        assert suc_parcial.telefono == "1234567890"
        print("✓ PUNTO 6: PATCH / PUT para actualización parcial superado.")

        # Limpieza final
        db.delete(suc1)
        db.delete(gerente_activo)
        db.delete(gerente_inactivo)
        db.delete(cajero_test)
        db.commit()

        print("\n==================================================")
        print("¡TODAS LAS VALIDACIONES Y PRUEBAS COMPLETADAS CON ÉXITO!")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
