import os
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

ZONA_NEGOCIO = ZoneInfo(os.getenv("BUSINESS_TIMEZONE", "America/Mexico_City"))

def hoy_en_negocio() -> date:
    """
    Fecha actual según la zona horaria del negocio, no la del servidor (UTC).
    Usar esto en vez de date.today() para cualquier default de "hoy" que
    vea el usuario (dashboards, reportes, etc.) — si no, después de las
    6pm hora de México el servidor ya cree que es el día siguiente.
    """
    return datetime.now(ZONA_NEGOCIO).date()

def rango_del_dia_en_utc(dia: date) -> tuple[datetime, datetime]:
    """
    Convierte el inicio (00:00:00) y fin (23:59:59.999999) de `dia`,
    interpretado en la zona horaria del negocio, a datetimes en UTC.
    Las ventas se guardan en UTC, así que el filtro debe hacerse en UTC
    pero calculado a partir del día "local" del negocio.
    """
    inicio_local = datetime.combine(dia, datetime.min.time(), tzinfo=ZONA_NEGOCIO)
    fin_local = datetime.combine(dia, datetime.max.time(), tzinfo=ZONA_NEGOCIO)
    return inicio_local.astimezone(timezone.utc), fin_local.astimezone(timezone.utc)
