# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, ListFlowable, ListItem, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs" / "COTIZACION-OSCAR-VILLARROEL.pdf"

ORANGE = HexColor("#f2642e")
BROWN = HexColor("#5a2b11")
DARK = HexColor("#1e293b")
MUTED = HexColor("#475569")
LINE = HexColor("#e2e8f0")
BG = HexColor("#fff7ed")
ROW = HexColor("#f8fafc")


def header_footer(canvas, doc):
    canvas.saveState()
    w, h = letter
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 8, w, 8, fill=1, stroke=0)
    canvas.rect(0, 0, w, 18, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 6, "DP Sistemas  ·  Cotización N° 001-2026")
    canvas.drawRightString(w - 18 * mm, 6, f"Página {doc.page}")
    canvas.restoreState()


def p(text, style):
    return Paragraph(text, style)


def bullets(items, styles):
    flow = []
    for item in items:
        flow.append(p(f"•  {item}", styles["body"]))
        flow.append(Spacer(1, 2))
    return flow


def section_title(n, title, styles):
    return KeepTogether([
        Spacer(1, 8),
        p(f"{n}.  {title}", styles["h"]),
        HRFlowable(width="100%", thickness=1, color=ORANGE, spaceAfter=8, spaceBefore=2),
    ])


def make_table(data, col_widths, header=True):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    cmds = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), DARK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [white, ROW]),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), ORANGE),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
        ]
    else:
        cmds += [
            ("BACKGROUND", (0, 0), (0, -1), BG),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), BROWN),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ]
    t.setStyle(TableStyle(cmds))
    return t


def build():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="brand", fontName="Helvetica-Bold", fontSize=18, textColor=ORANGE,
        leading=22, spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name="subtitle", fontName="Helvetica", fontSize=9, textColor=MUTED, leading=12, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="h", fontName="Helvetica-Bold", fontSize=11, textColor=BROWN, leading=14,
    ))
    styles.add(ParagraphStyle(
        name="hsec", fontName="Helvetica-Bold", fontSize=9.5, textColor=DARK, leading=13,
        spaceBefore=8, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="body", fontName="Helvetica", fontSize=9, textColor=DARK, leading=13, alignment=TA_JUSTIFY,
        spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name="small", fontName="Helvetica", fontSize=8, textColor=MUTED, leading=11,
    ))
    styles.add(ParagraphStyle(
        name="cell", fontName="Helvetica", fontSize=8.5, textColor=DARK, leading=11,
    ))
    styles.add(ParagraphStyle(
        name="cellb", fontName="Helvetica-Bold", fontSize=8.5, textColor=DARK, leading=11,
    ))
    styles.add(ParagraphStyle(
        name="footbrand", fontName="Helvetica-Bold", fontSize=10, textColor=ORANGE, alignment=TA_CENTER,
        spaceBefore=16,
    ))

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Cotización 001-2026 — Lo Más Rico",
        author="DP Sistemas",
        subject="Adaptación del sistema al local con salón de 5 mesas",
    )

    story = []
    story.append(p("LO MÁS RICO", styles["brand"]))
    story.append(p("Cotización de adaptación operativa  ·  Sistema de gestión y tienda online", styles["subtitle"]))

    meta = [
        [p("<b>N°</b>", styles["cell"]), p("001-2026", styles["cell"]),
         p("<b>Fecha</b>", styles["cell"]), p("17 de septiembre de 2026", styles["cell"])],
        [p("<b>Validez</b>", styles["cell"]), p("30 días", styles["cell"]),
         p("<b>Proveedor</b>", styles["cell"]), p("DP Sistemas", styles["cell"])],
        [p("<b>Cliente</b>", styles["cell"]), p("Lo Más Rico — Oscar Villarroel", styles["cell"]),
         p("<b>Objeto</b>", styles["cell"]),
         p("Adaptación del sistema actual al local con salón de 5 mesas", styles["cell"])],
    ]
    mt = Table(meta, colWidths=[28 * mm, 62 * mm, 28 * mm, 62 * mm])
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), BG),
        ("BACKGROUND", (2, 0), (2, -1), BG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(mt)
    story.append(Spacer(1, 10))

    # 1
    story.append(section_title("1", "Alcance", styles))
    story.append(p(
        "Adaptación del sistema existente (tienda online y panel de gestión) al funcionamiento de un local con "
        "<b>salón de 5 mesas</b>, <b>para llevar</b>, <b>caja</b>, <b>cocina</b> y <b>pedidos por internet</b>. "
        "No incluye desarrollo de un sistema nuevo. Se reutiliza la plataforma actual.",
        styles["body"],
    ))

    story.append(p("1.1  Interfaz de garzón y caja", styles["hsec"]))
    story.extend(bullets([
        "Toma de pedido desde caja o desde el celular del garzón.",
        "<b>Mesa:</b> se envía a cocina; la mesa permanece abierta; se puede enviar más de una vez; el cobro se realiza al solicitar la cuenta.",
        "<b>Para llevar:</b> se envía a cocina y se cobra de inmediato.",
        "Cobro en efectivo, transferencia o máquina de Mercado Pago. El cliente paga en la máquina; el sistema marca el pedido como pagado.",
        "La boleta del SII la emite la máquina de cobro. El sistema es el registro operativo del local (pedidos, mesas, cocina, pagos, caja del día y reportes).",
    ], styles))

    story.append(p("1.2  Comandas", styles["hsec"]))
    story.append(p("Ajuste de lo que visualiza cada puesto:", styles["body"]))
    story.extend(bullets([
        "<b>Cocina:</b> preparación, origen del pedido (mesa, retiro o web) e impresión de comanda.",
        "<b>Garzón / caja:</b> mesa, cuenta y precuenta.",
    ], styles))

    story.append(p("1.3  Carta virtual por QR de mesa", styles["hsec"]))
    story.append(p(
        "QR físico en cada mesa. Al escanearlo, el cliente accede a la carta virtual asociada a esa mesa, "
        "puede realizar pedidos (llegan a cocina) y solicitar la cuenta. No requiere instalar una aplicación.",
        styles["body"],
    ))

    story.append(p("1.4  Tienda online", styles["hsec"]))
    story.extend(bullets([
        "Se mantiene el pedido y el pago con Mercado Pago.",
        "Los pedidos web llegan a cocina identificados como canal web.",
        "Los pagos con tarjeta a través de Mercado Pago son informados al SII por Mercado Pago. El comprobante puede valer como boleta según el modelo de emisión declarado por el contribuyente. Este trabajo no incluye emisión de boletas desde el sistema.",
    ], styles))

    # 2
    story.append(section_title("2", "Módulos en pausa", styles))
    story.append(p("Quedan fuera de la operación diaria. No se eliminan. La reactivación está incluida en la mantención mensual.", styles["body"]))
    story.append(Spacer(1, 4))
    story.append(make_table(
        [
            [p("<b>Módulo</b>", styles["cellb"]), p("<b>Condición de reactivación</b>", styles["cellb"])],
            [p("Uber Eats", styles["cell"]), p("Cuando el local disponga de cuenta nueva", styles["cell"])],
            [p("Inventario", styles["cell"]), p("Cuando exista un ritmo de trabajo para mantenerlo al día", styles["cell"])],
        ],
        [50 * mm, 130 * mm],
    ))

    # 3
    story.append(section_title("3", "Base que se adapta", styles))
    story.append(make_table(
        [
            [p("<b>Componente actual</b>", styles["cellb"]), p("<b>Adaptación incluida</b>", styles["cellb"])],
            [p("Tienda online", styles["cell"]), p("Carta virtual y QR por mesa", styles["cell"])],
            [p("Caja", styles["cell"]), p("Mesas, para llevar y cuenta abierta", styles["cell"])],
            [p("Cocina", styles["cell"]), p("Origen del pedido y comanda", styles["cell"])],
            [p("Catálogo, personal y reportes", styles["cell"]), p("Sin cambio de alcance", styles["cell"])],
            [p("Impresión", styles["cell"]), p("Comanda de cocina y precuenta", styles["cell"])],
            [p("Uber Eats e inventario", styles["cell"]), p("Pausa operativa", styles["cell"])],
        ],
        [70 * mm, 110 * mm],
    ))

    # 4
    story.append(section_title("4", "Valores", styles))
    story.append(make_table(
        [
            [
                p("<b>Ítem</b>", styles["cellb"]),
                p("<b>Descripción</b>", styles["cellb"]),
                p("<b>Neto</b>", styles["cellb"]),
                p("<b>IVA (19%)</b>", styles["cellb"]),
                p("<b>Total</b>", styles["cellb"]),
            ],
            [
                p("<b>Adaptación al salón</b>", styles["cellb"]),
                p("Ítems 1.1 a 1.4. Pago único.", styles["cell"]),
                p("$120.000", styles["cell"]),
                p("$22.800", styles["cell"]),
                p("<b>$142.800</b>", styles["cellb"]),
            ],
            [
                p("<b>Mantención mensual</b>", styles["cellb"]),
                p("Mientras el sistema esté en uso.", styles["cell"]),
                p("$60.000", styles["cell"]),
                p("$11.400", styles["cell"]),
                p("<b>$71.400</b>", styles["cellb"]),
            ],
        ],
        [42 * mm, 58 * mm, 26 * mm, 28 * mm, 26 * mm],
    ))

    # 5
    story.append(section_title("5", "Mantención mensual — incluido", styles))
    story.extend(bullets([
        "Continuidad de la tienda online y del panel de gestión.",
        "Corrección de fallas del software.",
        "Ajustes menores (textos, productos, detalles de pantalla).",
        "Reactivación de Uber Eats al contar con cuenta nueva.",
        "Reactivación de inventario cuando el local pueda mantenerlo.",
        "Soporte operativo en horario acordado.",
    ], styles))

    # 6
    story.append(section_title("6", "Mantención mensual — no incluido", styles))
    story.extend(bullets([
        "Hardware, internet, máquina de cobro ni impresión de QRs.",
        "Carga manual de inventario (operación del local).",
        "Campañas, producción fotográfica o cambio mayor de carta.",
        "Emisión de boletas o facturas electrónicas desde el sistema.",
        "Integración para enviar el cobro de forma automática a la máquina de Mercado Pago.",
        "Rediseño completo de la tienda online.",
    ], styles))
    story.append(p("Ítems no incluidos se cotizan por separado.", styles["small"]))

    # 7
    story.append(section_title("7", "Entrega", styles))
    story.extend(bullets([
        "Pausa de Uber Eats e inventario.",
        "Interfaz de garzón, mesas, para llevar y comandas.",
        "QR por mesa y carta virtual.",
        "Prueba en local (mesa, cocina, ticket, cobro).",
    ], styles))
    story.append(p(
        "Dominio de la tienda, Uber Eats e inventario se activan cuando el cliente lo solicite, dentro de la mantención.",
        styles["body"],
    ))

    # 8
    story.append(section_title("8", "Condiciones", styles))
    story.extend(bullets([
        "Cotización válida 30 días.",
        "Adaptación: pago único según ítem de valores.",
        "Mantención: mensual, mientras el servicio esté activo.",
        "El modelo de emisión de boletas ante el SII es de cargo del cliente y su contador.",
    ], styles))

    story.append(p("DP Sistemas", styles["footbrand"]))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUT)


if __name__ == "__main__":
    build()
