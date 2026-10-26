import os
import smtplib
import logging

from html import escape
from email.message import EmailMessage
from pathlib import Path

from src.security import AVISO_EXPIRE_DIAS, crear_token_aviso

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
ROLES_LEGIBLES = {"gerente_sede": "Gerente de Sede", "cajero": "Cajero"}

SMTP_HOST = os.getenv("SMTP_HOST", "mailpit")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@miko.com")

# services/correo.py -> parents[0]=services, [1]=src, [2]=backend (/app en el contenedor)
RUTA_AVISO_PDF = Path(__file__).resolve().parents[2] / "assets" / "aviso_de_privacidad.pdf"

def enviar_correo(
    destinatario: str,
    asunto: str,
    texto: str,
    html: str | None = None,
    adjunto: Path | None = None,
) -> None:
    """Envía un correo por SMTP. Lanza excepción si falla (quien lo llame decide qué hacer)."""
    mensaje = EmailMessage()
    mensaje["From"] = SMTP_FROM
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)  # versión de texto plano (siempre)
    if html:
        mensaje.add_alternative(html, subtype="html")  # versión con botón/estilos

    # El adjunto se agrega al final: EmailMessage convierte solo el mensaje
    # en multipart/mixed (cuerpo + archivo)
    if adjunto:
        mensaje.add_attachment(
            adjunto.read_bytes(),
            maintype="application",
            subtype="pdf",
            filename=adjunto.name,
        )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as servidor:
        if SMTP_USER:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
        servidor.send_message(mensaje)


def construir_correo_aviso(nombre: str, rol: str, token: str) -> tuple[str, str, str]:
    """Devuelve (asunto, texto, html) del correo del aviso de privacidad."""
    enlace = f"{FRONTEND_URL}/aviso-privacidad?token={token}"
    rol_legible = ROLES_LEGIBLES.get(rol, rol)
    asunto = "Active su cuenta de Miko: lea y acepte el aviso de privacidad"

    texto = f"""Hola, {nombre}:

Se creó una cuenta para usted en el sistema Miko (punto de venta e inventario multisucursal de Miko Panaderías) con el rol de {rol_legible}.

Antes de iniciar sesión por primera vez necesita leer y aceptar nuestro aviso de privacidad, que explica qué datos personales tratamos, para qué los usamos y cómo puede ejercer sus derechos. Adjuntamos el aviso completo en PDF.

Lea y acepte el aviso en este enlace:
{enlace}

El enlace es personal y es válido por {AVISO_EXPIRE_DIAS} días. Si vence, pida uno nuevo a la persona que registró su cuenta.

En resumen, el aviso explica:
- Qué datos tratamos: nombre, correo, contraseña (guardada cifrada), rol, sucursal, foto de perfil opcional y las ventas que usted registre.
- Para qué: crear y administrar su cuenta, verificar su identidad, controlar el acceso por rol y sucursal, y registrar ventas e inventario.
- Sus derechos: acceso, rectificación, cancelación y oposición (ARCO), escribiendo a admin@miko.com.

Hasta que acepte el aviso no podrá iniciar sesión. Si no esperaba este correo, ignórelo.

Miko Panaderías
Este correo se genera automáticamente; no responda a este mensaje.
"""

    # escape(): el nombre lo escribe un usuario, nunca se mete crudo en HTML
    html = f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222;line-height:1.5">
  <h2 style="color:#8B5A6B">Miko</h2>
  <p>Hola, <strong>{escape(nombre)}</strong>:</p>
  <p>Se creó una cuenta para usted en el sistema Miko (punto de venta e inventario multisucursal de Miko Panaderías) con el rol de <strong>{escape(rol_legible)}</strong>.</p>
  <p>Antes de iniciar sesión por primera vez necesita leer y aceptar nuestro aviso de privacidad, que explica qué datos personales tratamos, para qué los usamos y cómo puede ejercer sus derechos. Adjuntamos el aviso completo en PDF.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{enlace}" style="background:#8B5A6B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Leer y aceptar el aviso de privacidad</a>
  </p>
  <p style="font-size:13px;color:#555">El enlace es personal y es válido por {AVISO_EXPIRE_DIAS} días. Si vence, pida uno nuevo a la persona que registró su cuenta.</p>
  <p>En resumen, el aviso explica:</p>
  <ul>
    <li><strong>Qué datos tratamos:</strong> nombre, correo, contraseña (guardada cifrada), rol, sucursal, foto de perfil opcional y las ventas que usted registre.</li>
    <li><strong>Para qué:</strong> crear y administrar su cuenta, verificar su identidad, controlar el acceso por rol y sucursal, y registrar ventas e inventario.</li>
    <li><strong>Sus derechos:</strong> acceso, rectificación, cancelación y oposición (ARCO), escribiendo a admin@miko.com.</li>
  </ul>
  <p>Hasta que acepte el aviso no podrá iniciar sesión. Si no esperaba este correo, ignórelo.</p>
  <hr style="border:none;border-top:1px solid #ddd">
  <p style="font-size:12px;color:#777">Miko Panaderías. Este correo se genera automáticamente; no responda a este mensaje.</p>
</div>"""

    return asunto, texto, html


def enviar_aviso_privacidad(usuario_id: int, nombre: str, email: str, rol: str) -> None:
    """
    Envía el correo del aviso de privacidad. NUNCA lanza excepción: si el SMTP
    falla se registra en el log, pero no debe tumbar la creación del usuario
    (la cuenta ya existe; el aviso se puede reenviar después).
    """
    try:
        token = crear_token_aviso(usuario_id)
        asunto, texto, html = construir_correo_aviso(nombre, rol, token)
        enviar_correo(email, asunto, texto, html, adjunto=RUTA_AVISO_PDF)
    except Exception:
        # Se registra el id y no el correo, para no llenar el log de datos personales
        logger.exception("No se pudo enviar el aviso de privacidad al usuario %s", usuario_id)