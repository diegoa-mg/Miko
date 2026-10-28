import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pydantic import ValidationError

from src.schemas import LoginRequest
from src.schemas.gerentes import GerenteCreate
from src.schemas.cajeros import CajeroCreate
from src.schemas.usuarios import CuentaUpdatePassword, validar_password

# (nombre del caso, contraseña, fragmentos que DEBEN aparecer en el error; [] = debe pasar)
CASOS = [
    ("válida", "Hola1234!", []),
    ("el punto cuenta como especial", "Hola1234.", []),
    ("72 bytes exactos", "A1a!" + "x" * 68, []),
    ("72 bytes exactos con ñ (38 caracteres)", "Aa1!" + "ñ" * 34, []),
    ("corta", "Ab1!", ["8 caracteres"]),
    ("sin mayúscula", "hola1234!", ["mayúscula"]),
    ("sin minúscula", "HOLA1234!", ["minúscula"]),
    ("sin número", "Holaaaa!!", ["número"]),
    ("sin especial", "Hola1234", ["especial"]),
    ("espacio no cuenta como especial", "Hola 1234", ["especial"]),
    ("73 bytes", "A1a!" + "x" * 69, ["72 bytes"]),
    ("multibyte: pocos caracteres pero 74 bytes", "Aa1!" + "ñ" * 35, ["72 bytes"]),
    ("incumple varias reglas a la vez", "abc", ["8 caracteres", "mayúscula", "número", "especial"]),
]


def test_validador():
    print("\n--- PRUEBAS DEL VALIDADOR DE CONTRASEÑA ---")
    for i, (nombre, password, esperados) in enumerate(CASOS, start=1):
        if not esperados:
            assert validar_password(password) == password, f"'{nombre}' debía pasar"
            print(f"✓ {i}. {nombre}: pasa")
            continue

        try:
            validar_password(password)
        except ValueError as e:
            mensaje = str(e).lower()
            for fragmento in esperados:
                assert fragmento.lower() in mensaje, (
                    f"'{nombre}': falta '{fragmento}' en el mensaje: {e}"
                )
            print(f"✓ {i}. {nombre}: rechazada con los mensajes esperados")
        else:
            raise AssertionError(f"'{nombre}' debía fallar y pasó")


def test_schemas():
    print("\n--- PRUEBAS EN LOS SCHEMAS ---")
    debil = "abc"
    fuerte = "Hola1234!"

    # Los tres schemas rechazan una contraseña débil y aceptan una fuerte
    constructores = {
        "GerenteCreate": lambda pw: GerenteCreate(nombre="Ana", email="ana@miko.com", password=pw),
        "CajeroCreate": lambda pw: CajeroCreate(nombre="Ana", email="ana@miko.com", password=pw),
        "CuentaUpdatePassword": lambda pw: CuentaUpdatePassword(password_actual="cualquiera", password_nueva=pw),
    }
    for nombre, crear in constructores.items():
        crear(fuerte)
        try:
            crear(debil)
        except ValidationError:
            print(f"✓ {nombre} rechaza una contraseña débil y acepta una fuerte")
        else:
            raise AssertionError(f"{nombre} aceptó una contraseña débil")

    # El login y la contraseña ACTUAL no se validan: cuentas viejas con contraseñas débiles deben poder entrar
    LoginRequest(email="viejo@miko.com", password=debil)
    CuentaUpdatePassword(password_actual=debil, password_nueva=fuerte)
    print("✓ LoginRequest y password_actual no validan la fortaleza")

    print("\nTODAS LAS PRUEBAS DE CONTRASEÑA PASARON EXITOSAMENTE.")


if __name__ == "__main__":
    test_validador()
    test_schemas()