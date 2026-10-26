from src.services.usuarios import (
    obtener_rol,
    llenar_usuario_out,
    listar_cajeros_activos,
    ROLES_CON_AVISO,
    aviso_pendiente,
)
from src.services.sucursales import obtener_sucursal_del_gerente, sucursal_del_alcance
from src.services.inventarios import (
    llenar_inventario_out,
    consulta_inventario,
    crear_lista_inventario,
    calcular_alertas_inventario,
)
from src.services.productos import consulta_productos, obtener_producto_de_sucursal
from src.services.ventas import (
    calcular_ventas_total,
    contar_ventas,
    obtener_ultimas_ventas,
)
from src.services.fechas import ZONA_NEGOCIO, hoy_en_negocio, rango_del_dia_en_utc
from src.services.fotos import procesar_imagen, subir_foto, borrar_foto
from src.services.correo import enviar_correo, construir_correo_aviso, enviar_aviso_privacidad