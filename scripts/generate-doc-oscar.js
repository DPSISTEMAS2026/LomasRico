const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType, PageOrientation } = require('docx');
const fs = require('fs');
const path = require('path');

async function generateDoc() {
    const PRIMARY = '2E4057';
    const ACCENT = 'E85D04';
    const LIGHT_BG = 'F0F0F0';
    const WHITE = 'FFFFFF';
    const BLACK = '000000';
    const WARNING_BG = 'FFF3CD';
    const INFO_BG = 'D1ECF1';
    const DANGER_BG = 'F8D7DA';

    function cell(text, opts = {}) {
        return new TableCell({
            children: [new Paragraph({
                children: [new TextRun({
                    text,
                    bold: opts.bold,
                    font: 'Calibri',
                    size: opts.size || 22,
                    color: opts.color || BLACK,
                })],
                alignment: opts.align || AlignmentType.LEFT,
                spacing: { before: 80, after: 80 },
            })],
            shading: { fill: opts.bg || WHITE, type: ShadingType.CLEAR },
            width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
            verticalAlign: 'center',
        });
    }

    function spacer(size = 200) {
        return new Paragraph({ spacing: { before: size }, children: [new TextRun({ text: '', size: 2 })] });
    }

    function heading(text, level = 2) {
        return new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', size: 28, bold: true, color: PRIMARY })],
            spacing: { before: 300, after: 150 },
        });
    }

    function subheading(text) {
        return new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', size: 24, bold: true, color: ACCENT })],
            spacing: { before: 200, after: 80 },
        });
    }

    function para(text) {
        return new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', size: 22, color: BLACK })],
            spacing: { after: 100 },
        });
    }

    function step(num, text) {
        return new Paragraph({
            children: [new TextRun({ text: `${num}.  ${text}`, font: 'Calibri', size: 22, color: BLACK })],
            spacing: { after: 80 },
            indent: { left: 400 },
        });
    }

    function alertBox(text, bgColor, textColor) {
        return new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', size: 22, bold: true, color: textColor })],
            spacing: { before: 150, after: 150 },
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            indent: { left: 200, right: 200 },
        });
    }

    function separator() {
        return new Paragraph({
            children: [new TextRun({ text: '─────────────────────────────────────────────────────', font: 'Calibri', size: 16, color: 'CCCCCC' })],
            spacing: { before: 200, after: 200 },
            alignment: AlignmentType.CENTER,
        });
    }

    const doc = new Document({
        background: { color: WHITE },
        styles: {
            default: {
                document: {
                    run: { font: 'Calibri', size: 22, color: BLACK },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
                    background: { color: WHITE },
                },
            },
            children: [
                // ===== HEADER =====
                new Paragraph({
                    children: [new TextRun({ text: 'Lo Más Rico', font: 'Calibri', size: 40, bold: true, color: PRIMARY })],
                    spacing: { after: 80 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: 'Credenciales y API Keys Necesarias', font: 'Calibri', size: 28, color: ACCENT, bold: true })],
                    spacing: { after: 250 },
                }),

                // META
                para('Para: Oscar (Dueño)'),
                para('De: Equipo de Desarrollo (Daniel)'),
                para('Fecha: 28 de abril, 2026'),

                separator(),

                // INTRO
                new Paragraph({
                    children: [new TextRun({ text: 'Hola Oscar!', font: 'Calibri', size: 24, bold: true, color: BLACK })],
                    spacing: { after: 100 },
                }),
                para('Para que el sistema de Lo Más Rico pueda cobrar pedidos online y despachar con delivery, necesitamos que nos proporciones las credenciales de producción de dos servicios.'),
                para('Este documento explica qué necesitamos y cómo obtenerlo paso a paso.'),

                separator(),

                // ===== RESUMEN =====
                heading('Resumen'),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                cell('#', { bold: true, bg: PRIMARY, color: WHITE, width: 8 }),
                                cell('Servicio', { bold: true, bg: PRIMARY, color: WHITE, width: 30 }),
                                cell('¿Para qué?', { bold: true, bg: PRIMARY, color: WHITE, width: 42 }),
                                cell('Prioridad', { bold: true, bg: PRIMARY, color: WHITE, width: 20 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('1', { bg: LIGHT_BG, width: 8 }),
                                cell('MercadoPago', { bold: true, bg: LIGHT_BG, width: 30 }),
                                cell('Cobrar pedidos online (tarjeta, débito, MercadoPago)', { bg: LIGHT_BG, width: 42 }),
                                cell('URGENTE', { bg: LIGHT_BG, color: 'CC0000', bold: true, width: 20 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('2', { bg: WHITE, width: 8 }),
                                cell('PedidosYa Envíos', { bold: true, bg: WHITE, width: 30 }),
                                cell('Cotizar y despachar delivery con motoristas', { bg: WHITE, width: 42 }),
                                cell('URGENTE', { color: 'CC0000', bold: true, bg: WHITE, width: 20 }),
                            ],
                        }),
                    ],
                }),

                separator(),

                // ===== SECCIÓN 1: MERCADOPAGO =====
                heading('1.  MercadoPago (Pagos Online)'),

                subheading('¿Para qué sirve?'),
                para('Permite que los clientes paguen sus pedidos desde la web de Lo Más Rico con tarjeta de crédito, débito o saldo de MercadoPago.'),

                subheading('¿Qué necesitamos?'),
                para('Dos claves de la cuenta de PRODUCCIÓN (no de prueba):'),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                cell('Clave', { bold: true, bg: PRIMARY, color: WHITE, width: 35 }),
                                cell('Para qué', { bold: true, bg: PRIMARY, color: WHITE, width: 65 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('Access Token', { bold: true, bg: LIGHT_BG, width: 35 }),
                                cell('El servidor procesa los pagos', { bg: LIGHT_BG, width: 65 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('Public Key', { bold: true, bg: WHITE, width: 35 }),
                                cell('La web muestra el botón de pago', { bg: WHITE, width: 65 }),
                            ],
                        }),
                    ],
                }),

                subheading('Pasos para obtenerlo:'),
                step(1, 'Ir a mercadopago.cl e iniciar sesión con la cuenta del negocio'),
                step(2, 'Ir a mercadopago.cl/developers/panel/app'),
                step(3, 'Si no hay una aplicación creada, click en "Crear aplicación":'),
                new Paragraph({
                    children: [new TextRun({ text: '     • Nombre: Lo Más Rico Web', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 40 },
                    indent: { left: 600 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: '     • Tipo: Pagos online', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 40 },
                    indent: { left: 600 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: '     • Producto: Checkout Pro', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 80 },
                    indent: { left: 600 },
                }),
                step(4, 'Dentro de la aplicación → click en "Credenciales de producción"'),
                step(5, 'Copiar las dos claves:'),
                new Paragraph({
                    children: [new TextRun({ text: '     ✅ Access Token (empieza con APP_USR-)', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 40 },
                    indent: { left: 600 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: '     ✅ Public Key (empieza con APP_USR-)', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 80 },
                    indent: { left: 600 },
                }),
                step(6, 'Enviármelas por WhatsApp'),

                spacer(),
                alertBox('⚠️  IMPORTANTE: Actualmente el sistema tiene credenciales de prueba que no cobran dinero real. Sin las de producción, ningún cliente puede pagar online.', WARNING_BG, '856404'),

                separator(),

                // ===== SECCIÓN 2: PEDIDOSYA =====
                heading('2.  PedidosYa Envíos (Delivery)'),

                subheading('¿Para qué sirve?'),
                para('Permite cotizar el costo de envío automáticamente cuando un cliente pone su dirección, y despachar el pedido con un motorista de PedidosYa.'),

                subheading('¿Qué necesitamos?'),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                cell('Clave', { bold: true, bg: PRIMARY, color: WHITE, width: 35 }),
                                cell('Para qué', { bold: true, bg: PRIMARY, color: WHITE, width: 65 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('Token de API', { bold: true, bg: LIGHT_BG, width: 35 }),
                                cell('Conectar el sistema con PedidosYa Envíos', { bg: LIGHT_BG, width: 65 }),
                            ],
                        }),
                    ],
                }),

                subheading('Pasos para obtenerlo:'),
                step(1, 'Ir a envios.pedidosya.com'),
                step(2, 'Si el negocio no está registrado, registrarse o contactar al ejecutivo comercial de PedidosYa'),
                step(3, 'Una vez dentro del portal → Configuración → API / Integraciones'),
                step(4, 'Generar un token de API de producción'),
                step(5, 'Enviármelo por WhatsApp'),

                spacer(),
                alertBox('ℹ️  Si ya tienen un ejecutivo asignado de PedidosYa, pueden pedirle directamente las credenciales de API para integración con sistema propio. Él sabrá qué entregarles.', INFO_BG, '0C5460'),

                separator(),

                // ===== CÓMO ENVIAR =====
                heading('¿Cómo enviarme las credenciales?'),

                alertBox('⛔  No enviar credenciales por email público, Facebook ni Instagram. Son claves sensibles que dan acceso a cobros y envíos.', DANGER_BG, '721C24'),

                spacer(100),
                para('La forma segura:'),
                new Paragraph({
                    children: [new TextRun({ text: '    ✅  WhatsApp directo a Daniel', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 40 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: '    ✅  Llamada telefónica', font: 'Calibri', size: 22, color: BLACK })],
                    spacing: { after: 200 },
                }),

                separator(),

                // ===== RESUMEN FINAL =====
                heading('Resumen Final'),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                cell('Servicio', { bold: true, bg: PRIMARY, color: WHITE, width: 30 }),
                                cell('Qué enviar', { bold: true, bg: PRIMARY, color: WHITE, width: 45 }),
                                cell('Cuántas claves', { bold: true, bg: PRIMARY, color: WHITE, width: 25 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('MercadoPago', { bold: true, bg: LIGHT_BG, width: 30 }),
                                cell('Access Token + Public Key', { bg: LIGHT_BG, width: 45 }),
                                cell('2 claves', { bg: LIGHT_BG, width: 25, align: AlignmentType.CENTER }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                cell('PedidosYa Envíos', { bold: true, bg: WHITE, width: 30 }),
                                cell('Token de API', { bg: WHITE, width: 45 }),
                                cell('1 clave', { bg: WHITE, width: 25, align: AlignmentType.CENTER }),
                            ],
                        }),
                    ],
                }),

                spacer(),
                new Paragraph({
                    children: [new TextRun({
                        text: 'Total: 3 claves y el sistema queda 100% operativo para cobros y delivery.',
                        font: 'Calibri', size: 24, bold: true, color: PRIMARY,
                    })],
                    spacing: { after: 400 },
                    alignment: AlignmentType.CENTER,
                }),

                // FOOTER
                new Paragraph({
                    children: [new TextRun({
                        text: '¿Dudas? Escríbeme directamente. — Daniel',
                        font: 'Calibri', size: 22, italics: true, color: '666666',
                    })],
                    alignment: AlignmentType.CENTER,
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, '..', 'docs', 'Credenciales-LoMasRico-Oscar.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Documento Word generado: ${outputPath}`);
    console.log(`   Tamaño: ${(buffer.length / 1024).toFixed(1)} KB`);
}

generateDoc().catch(console.error);
