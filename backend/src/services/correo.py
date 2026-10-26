import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.getenv("SMTP_HOST", "mailpit")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@miko.com")


def enviar_correo(destinatario: str, asunto: str, texto: str, html: str | None = None) -> None:
    """Envía un correo por SMTP. Lanza excepción si falla (quien lo llame decide qué hacer)."""
    mensaje = EmailMessage()
    mensaje["From"] = SMTP_FROM
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)  # versión de texto plano (siempre)
    if html:
        mensaje.add_alternative(html, subtype="html")  # versión con botón/estilos

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as servidor:
        # Con SMTP real (puerto 587) se cifra la conexión y se inicia sesión;
        # con Mailpit no hay usuario, así que se omite.
        if SMTP_USER:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
        servidor.send_message(mensaje)