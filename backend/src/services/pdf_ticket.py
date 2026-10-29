"""
Servicio para la generación de comprobantes de venta (tickets) en formato PDF.
Diseñado para formato de impresora térmica de punto de venta (80 mm).
"""
import io
from datetime import datetime
from decimal import Decimal

from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib import colors

from src.schemas import TicketOut


def generar_pdf_ticket(ticket: TicketOut) -> bytes:
    """
    Genera un archivo PDF en memoria con el diseño de un ticket de punto de venta (80 mm).
    Retorna los bytes del PDF generado.
    """
    ancho_pagina = 80 * mm
    margen = 4 * mm
    ancho_util = ancho_pagina - (2 * margen)

    # Estimación de altura dinámica para que no sobre ni falte espacio en una sola hoja
    altura_base = 110 * mm
    altura_por_item = 8 * mm * max(1, len(ticket.productos))
    altura_total = max(150 * mm, altura_base + altura_por_item)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(ancho_pagina, altura_total),
        leftMargin=margen,
        rightMargin=margen,
        topMargin=margen,
        bottomMargin=margen,
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos compactos para ticket
    style_titulo = ParagraphStyle(
        "TicketTitulo",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=15,
        alignment=1,  # Centrado
        textColor=colors.HexColor("#1A1A1A"),
    )

    style_subtitulo = ParagraphStyle(
        "TicketSubtitulo",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        alignment=1,
        textColor=colors.HexColor("#333333"),
    )

    style_folio = ParagraphStyle(
        "TicketFolio",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor("#555555"),
    )

    style_info = ParagraphStyle(
        "TicketInfo",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        alignment=0,  # Izquierda
        textColor=colors.HexColor("#222222"),
    )

    style_info_bold = ParagraphStyle(
        "TicketInfoBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        alignment=0,
        textColor=colors.HexColor("#222222"),
    )

    style_header_tabla = ParagraphStyle(
        "TicketHeaderTabla",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=8,
        textColor=colors.black,
    )

    style_prod_nombre = ParagraphStyle(
        "TicketProdNombre",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor("#222222"),
    )

    style_footer = ParagraphStyle(
        "TicketFooter",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=9.5,
        alignment=1,
        textColor=colors.HexColor("#444444"),
    )

    elementos = []

    # 1. Encabezado
    elementos.append(Paragraph("MIKO POS", style_titulo))
    elementos.append(Paragraph("COMPROBANTE DE VENTA", style_subtitulo))
    elementos.append(Paragraph(f"Ticket #{ticket.venta_id}", style_folio))
    elementos.append(Spacer(1, 2 * mm))
    elementos.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#888888"), spaceBefore=1, spaceAfter=2))

    # 2. Datos de sucursal, cajero y fecha
    elementos.append(Paragraph(f"<b>Sucursal:</b> {ticket.sucursal}", style_info))
    if ticket.direccion_sucursal:
        elementos.append(Paragraph(f"<b>Dirección:</b> {ticket.direccion_sucursal}", style_info))
    elementos.append(Paragraph(f"<b>Cajero:</b> {ticket.cajero}", style_info))

    # Formateo de fecha y hora
    if isinstance(ticket.fecha, datetime):
        fecha_str = ticket.fecha.strftime("%Y-%m-%d %H:%M:%S")
    else:
        fecha_str = str(ticket.fecha)
    elementos.append(Paragraph(f"<b>Fecha:</b> {fecha_str}", style_info))

    elementos.append(Spacer(1, 1.5 * mm))
    elementos.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceBefore=1, spaceAfter=2))

    # 3. Detalle de productos (Tabla)
    # Anchos: Cant (8mm), Producto (34mm), P.Unit (14mm), Total (16mm) = 72mm
    col_widths = [8 * mm, 34 * mm, 14 * mm, 16 * mm]

    tabla_data = [
        [
            Paragraph("<b>Cant</b>", style_header_tabla),
            Paragraph("<b>Producto</b>", style_header_tabla),
            Paragraph("<b>P.Unit</b>", ParagraphStyle("TH_R1", parent=style_header_tabla, alignment=2)),
            Paragraph("<b>Total</b>", ParagraphStyle("TH_R2", parent=style_header_tabla, alignment=2)),
        ]
    ]

    for p in ticket.productos:
        p_unit = f"${Decimal(str(p.precio_unitario)):,.2f}"
        subtot = f"${Decimal(str(p.subtotal)):,.2f}"
        tabla_data.append([
            Paragraph(str(p.cantidad), style_prod_nombre),
            Paragraph(p.nombre, style_prod_nombre),
            Paragraph(p_unit, ParagraphStyle("TD_R1", parent=style_prod_nombre, alignment=2)),
            Paragraph(subtot, ParagraphStyle("TD_R2", parent=style_prod_nombre, alignment=2)),
        ])

    tabla = Table(tabla_data, colWidths=col_widths, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#888888")),
    ]))
    elementos.append(tabla)

    elementos.append(Spacer(1, 1.5 * mm))
    elementos.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#888888"), spaceBefore=1, spaceAfter=2))

    # 4. Resumen: Método de Pago y Total
    metodo_str = ticket.metodo_pago.capitalize() if ticket.metodo_pago else "N/A"
    total_str = f"${Decimal(str(ticket.total)):,.2f}"

    resumen_data = [
        [
            Paragraph("<b>Método de Pago:</b>", style_info),
            Paragraph(metodo_str, ParagraphStyle("MetodoR", parent=style_info, alignment=2)),
        ],
        [
            Paragraph("<b>TOTAL:</b>", ParagraphStyle("TotL", parent=style_info_bold, fontSize=10, leading=12)),
            Paragraph(f"<b>{total_str}</b>", ParagraphStyle("TotR", parent=style_info_bold, fontSize=10, leading=12, alignment=2)),
        ],
    ]

    tabla_resumen = Table(resumen_data, colWidths=[36 * mm, 36 * mm])
    tabla_resumen.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    elementos.append(tabla_resumen)

    # 5. Pie de página
    elementos.append(Spacer(1, 4 * mm))
    elementos.append(Paragraph("¡Gracias por su compra!", style_footer))
    elementos.append(Paragraph("Conserve este comprobante para cualquier aclaración.", ParagraphStyle("FootSub", parent=style_footer, fontSize=6, leading=8)))

    # Construir el documento
    doc.build(elementos)

    buffer.seek(0)
    return buffer.getvalue()
