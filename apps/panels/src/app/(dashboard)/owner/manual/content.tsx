import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

function H2({ id, children }: { id: string; children: React.ReactNode }) {
    return <h2 id={id} className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mt-16 mb-6 pb-3 border-b-2 border-orange-500 scroll-mt-6 first:mt-0">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
    return <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-700 mt-10 mb-3">{children}</h3>;
}
function H4({ children }: { children: React.ReactNode }) {
    return <h4 className="text-sm font-black uppercase tracking-tight text-slate-600 mt-6 mb-2">{children}</h4>;
}
function P({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-slate-600 leading-relaxed mb-4">{children}</p>;
}
function Tip({ children }: { children: React.ReactNode }) {
    return <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-xl mb-4 text-sm text-orange-800 font-medium italic">{children}</div>;
}
function Warn({ children }: { children: React.ReactNode }) {
    return <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl mb-4 text-sm text-red-700 font-medium italic">{children}</div>;
}
function Go({ href, children }: { href: string; children: React.ReactNode }) {
    const isExt = href.startsWith('http');
    if (isExt) return <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 font-bold underline underline-offset-2 decoration-orange-200 inline-flex items-center gap-1">{children} <ExternalLink size={10} /></a>;
    return <Link href={href} className="text-orange-600 hover:text-orange-700 font-bold underline underline-offset-2 decoration-orange-200 inline-flex items-center gap-1">{children} <ExternalLink size={10} /></Link>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50"><tr>{headers.map((h, i) => <th key={i} className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? 'font-bold' : ''}`} dangerouslySetInnerHTML={{ __html: c }} />)}</tr>)}</tbody>
            </table>
        </div>
    );
}
function Flow({ steps }: { steps: string[] }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 font-mono text-xs text-slate-600 space-y-1">
            {steps.map((s, i) => <div key={i}>{i > 0 && <span className="text-slate-300 ml-8">↓</span>}{i > 0 && <br />}{s}</div>)}
        </div>
    );
}

export function ManualContent() {
    return (
        <>
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900 mb-1">
                    Manual <span className="text-orange-500">Operativo</span>
                </h1>
                <p className="text-xs text-slate-400 font-bold italic">Lo Más Rico V3 · Versión 2.3.0 · Mayo 2026</p>
                <p className="text-xs text-slate-400 mt-1"><strong>Para:</strong> Oscar (Dueño) · <strong>De:</strong> Daniel (Soporte Técnico)</p>
            </div>

            {/* 1 */}
            <H2 id="acceso">1. Acceso al Sistema</H2>
            <H3>1.1 URLs del Sistema</H3>
            <Table headers={['Plataforma', 'URL', 'Para quién']} rows={[
                ['Web Tienda', '<a href="https://lomasrico.cl" target="_blank" class="text-orange-600 underline">lomasrico.cl</a>', 'Clientes'],
                ['Panel de Gestión', '<a href="https://lomasrico-panels.netlify.app" target="_blank" class="text-orange-600 underline break-all">lomasrico-panels.netlify.app</a>', 'Dueño, Admin, Cajeros, Cocina'],
            ]} />
            <H3>1.2 Roles de Usuario</H3>
            <Table headers={['Rol', 'Acceso', 'Para quién']} rows={[
                ['OWNER', 'Todo el sistema sin restricciones', 'Oscar'],
                ['ADMIN', 'Todo el sistema', 'Encargado de turno'],
                ['CASHIER', 'POS + Cocina', 'Personal de caja'],
                ['KITCHEN', 'Solo panel de cocina', 'Personal de preparación'],
            ]} />
            <P>Cada usuario puede tener <strong>módulos individuales</strong> asignados para controlar qué secciones puede ver.</P>
            <H3>1.3 Cómo Ingresar</H3>
            <ol className="list-decimal pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li>Ir a <Go href="https://lomasrico-panels.netlify.app/login">lomasrico-panels.netlify.app</Go></li>
                <li>Ingresar <strong>usuario</strong> y <strong>contraseña</strong></li>
                <li>El sistema redirige al panel según su rol</li>
            </ol>
            <Tip>Si olvida su contraseña, el administrador puede resetearla desde <Go href="/owner/cashiers">Personal</Go>.</Tip>

            {/* 2 */}
            <H2 id="web">2. Web E-commerce</H2>
            <P>La web pública donde los clientes ven el menú, arman su pedido, eligen delivery o retiro, y pagan online.</P>
            <H3>2.1 Flujo de Compra</H3>
            <Flow steps={['Cliente ingresa a lomasrico.cl', 'Navega catálogo por categorías', 'Selecciona producto → personaliza (proteínas, extras)', 'Agrega al carrito', 'Ingresa dirección → cotización de envío automática (PedidosYa)', 'Paga con MercadoPago (tarjeta/débito)', 'Pedido aparece en Panel Cocina automáticamente']} />
            <H3>2.2 Lo que el Cliente Ve</H3>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Banners</strong> promocionales (administrables desde <Go href="/owner/banners">Marketing</Go>)</li>
                <li><strong>Catálogo</strong> por categorías dinámicas con fotos y precios</li>
                <li><strong>Constructor de Ceviche</strong>: proteínas, quitar ingredientes, extras</li>
                <li><strong>Carrito</strong> con resumen y cálculo de envío</li>
                <li><strong>Pasarela de pago</strong> MercadoPago</li>
            </ul>
            <H3>2.3 Disponibilidad Automática</H3>
            <P>Si un producto no tiene suficiente stock, se <strong>desactiva automáticamente</strong> de la web. Usted administra todo desde el <Go href="/owner">Panel de Administración</Go>.</P>

            {/* 3 */}
            <H2 id="panel">3. Panel de Administración</H2>
            <P>Se accede con rol OWNER o ADMIN. La barra lateral muestra los módulos.</P>

            <H3>3.1 Resumen (Dashboard)</H3>
            <P><Go href="/owner">Ir a Resumen →</Go></P>
            <P>Ingresos del día/mes, órdenes activas, alertas stock, gráfico canales, top 5 productos, distribución horaria.</P>

            <H3>3.2 Catálogo de Productos</H3>
            <P><Go href="/owner/catalog">Ir a Catálogo →</Go></P>
            <Table headers={['Acción', 'Cómo']} rows={[
                ['Crear producto', 'Botón "Nuevo Producto" → nombre, precio, categoría, foto'],
                ['Editar', 'Click en el producto → modificar → Guardar'],
                ['Activar/Desactivar', 'Toggle de disponibilidad'],
                ['Subir foto', 'Click en la imagen → seleccionar archivo'],
                ['Variantes', 'Dentro del producto → "Agregar Variante" (350g, 500g, 1kg)'],
            ]} />
            <Warn>Los cambios se reflejan <strong>inmediatamente</strong> en web, WhatsApp y POS.</Warn>

            <H3>3.3 Modificadores</H3>
            <P><Go href="/owner/modifiers">Ir a Modificadores →</Go></P>
            <P>Opciones de personalización (proteínas, extras). Cada grupo tiene opciones con precio adicional, límites mín/máx y orden personalizable por producto.</P>

            <H3>3.4 Marketing (Banners)</H3>
            <P><Go href="/owner/banners">Ir a Marketing →</Go></P>
            <P>Subir banners (1200×400px JPG/PNG), reordenar, activar/desactivar.</P>

            <H3>3.5 Inventario</H3>
            <P><Go href="/owner/inventory">Ir a Inventario →</Go></P>
            <Table headers={['Acción', 'Descripción']} rows={[
                ['Reponer', 'Registrar compra con cantidad, costo y <strong>rendimiento (%)</strong>'],
                ['Ajustar', 'Corregir stock real tras inventario físico'],
                ['Merma', 'Registrar pérdida con motivo (vencido, dañado) y nota'],
                ['Editar', 'Modificar nombre, rol, tipo, costo, umbral mínimo'],
                ['Nuevo insumo', 'Crear con categoría, rol, tipo, unidad, rendimiento'],
            ]} />
            <H4>Sistema de Rendimiento (Yield)</H4>
            <P>Al reponer, configure el <strong>% de aprovechamiento</strong>:</P>
            <Tip><strong>Ejemplo:</strong> 10 kg salmón a $8.000/kg con rendimiento 80% = 8 kg útiles, merma 2 kg, costo real $10.000/kg. El sistema calcula automáticamente.</Tip>
            <P>El descuento de inventario es <strong>automático</strong>: cada venta descuenta ingredientes según la receta. Stock en cero = producto desactivado.</P>

            <H3>3.6 Recetas Maestras</H3>
            <P><Go href="/owner/recipes">Ir a Recetas →</Go></P>
            <P><strong>Platos Finales:</strong> recetas de productos de venta (✅ configurada, ⚠️ pendiente).</P>
            <P><strong>Bases & Preps:</strong> sub-recetas (Base Ceviche, Salsas).</P>
            <P>El editor permite agregar ingredientes, cantidades y roles. Muestra <strong>costo de producción, precio de venta y margen de utilidad</strong> en tiempo real.</P>

            <H3>3.7 Reportes</H3>
            <P><Go href="/owner/reports">Ir a Reportes →</Go></P>
            <P>Ventas por período, desglose por canal, productos top, historial de transacciones.</P>

            <H3>3.8 Clientes</H3>
            <P><Go href="/owner/customers">Ir a Clientes →</Go></P>
            <P>Registro de clientes: nombre, teléfono, email, historial, dirección.</P>

            <H3>3.9 Personal</H3>
            <P><Go href="/owner/cashiers">Ir a Personal →</Go></P>
            <Table headers={['Acción', 'Cómo']} rows={[
                ['Crear usuario', '"Nuevo Usuario" → nombre, email, contraseña, rol'],
                ['Asignar rol', 'Owner, Admin, Cashier o Kitchen'],
                ['Módulos', 'Seleccionar secciones visibles por usuario'],
                ['Resetear contraseña', 'Botón de reseteo en cada usuario'],
            ]} />

            {/* 4 */}
            <H2 id="pos">4. Punto de Venta (POS)</H2>
            <P><Go href="/pos">Ir al POS →</Go></P>
            <H3>4.1 Crear una Venta</H3>
            <ol className="list-decimal pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li>Seleccionar productos del catálogo lateral</li>
                <li>Personalizar (proteínas, extras)</li>
                <li>Ajustar cantidades con +/-</li>
                <li>Click en <strong>"Pagar"</strong> → seleccionar método</li>
            </ol>
            <H3>4.2 Métodos de Pago</H3>
            <Table headers={['Método', 'Uso']} rows={[
                ['Efectivo', 'Calcula vuelto automáticamente'],
                ['Tarjeta', 'Registra como pago con tarjeta'],
                ['Transferencia', 'Registra como transferencia bancaria'],
                ['MercadoPago', 'Genera link de pago'],
            ]} />
            <H3>4.3 Cajas y Turnos</H3>
            <P><strong>Abrir Caja</strong> al iniciar turno con monto inicial. <strong>Operar</strong> ventas asociadas a la caja. <strong>Registrar gastos/retiros</strong> durante el turno. <strong>Cerrar Caja</strong> con resumen de ventas.</P>
            <H3>4.4 Flujo al Confirmar</H3>
            <Flow steps={['Cajero confirma pago', 'Se registra la venta', 'Se descuenta inventario (según receta)', 'Pedido aparece en Cocina', 'Cocina prepara y marca listo']} />

            {/* 5 */}
            <H2 id="cocina">5. Panel Cocina (KDS)</H2>
            <P><Go href="/kitchen">Ir a Cocina →</Go></P>
            <P>Pantalla donde llegan <strong>todos los pedidos</strong> de todos los canales en tiempo real.</P>
            <H3>5.1 Canales de Origen</H3>
            <Table headers={['Canal', 'Cómo llega', 'Etiqueta']} rows={[
                ['Web', 'Automático al pagar', 'WEB'],
                ['POS', 'Automático al confirmar', 'POS'],
                ['WhatsApp', 'Automático vía Maxi', 'WHATSAPP'],
                ['Uber Eats', 'Scraping cada 30-60s', 'UBER_EATS'],
            ]} />
            <H3>5.2 Estados</H3>
            <Flow steps={['📥 ENTRANTE — Pedido acaba de llegar', '🔥 PREPARANDO — En preparación', '✅ ENTREGA — Listo para despacho']} />
            <P>Cada tarjeta muestra: orden, cliente, productos, <strong>gramajes exactos</strong>, tiempo y notas.</P>
            <Table headers={['Botón', 'Acción']} rows={[
                ['Aceptar', 'Mover a "Preparando"'],
                ['Listo', 'Mover a "Entrega"'],
                ['Imprimir', 'Imprimir comanda'],
                ['Cancelar', 'Cancelar (con confirmación)'],
            ]} />

            {/* 6 */}
            <H2 id="whatsapp">6. WhatsApp Bot "Maxi"</H2>
            <P><Go href="/owner/inbox/whatsapp">Ir a WhatsApp Bot →</Go></P>
            <P>Asistente de IA que atiende clientes por WhatsApp: muestra menú, toma pedidos, personaliza, cotiza envío y genera links de pago.</P>
            <Table headers={['Función', 'Ejemplo']} rows={[
                ['Mostrar menú', '"¿Qué tienen disponible?"'],
                ['Tomar pedidos', '"Quiero un ceviche de 500g con salmón"'],
                ['Personalizar', '"Sin cebolla por favor"'],
                ['Cotizar envío', '"Mi dirección es O\'Higgins 456"'],
                ['Link de pago', 'Genera MercadoPago automáticamente'],
            ]} />
            <Tip>Maxi opera autónomamente. Para ajustes, contactar soporte técnico.</Tip>

            {/* 7 */}
            <H2 id="integraciones">7. Integraciones Externas</H2>
            <H3>7.1 Uber Eats</H3>
            <P>Captura automática cada 30-60s. Etiqueta "UBER_EATS" en cocina. Mapeo automático por aliases. Inventario se descuenta.</P>
            <Warn>Requiere renovación de cookie cada 24-48h. El Health Check detecta expiración. Cubierto por soporte.</Warn>
            <H3>7.2 MercadoPago</H3>
            <P>Pasarela de pagos: tarjeta, débito, saldo MP. Funciona en web y WhatsApp. Confirmación automática vía webhook.</P>
            <H3>7.3 PedidosYa</H3>
            <P>Cotización de envío integrada en checkout. El cliente ingresa dirección y se cotiza delivery.</P>
            <H3>7.4 Google Maps</H3>
            <P>Autocompletado de direcciones, cobertura de delivery y geocodificación.</P>

            {/* 8 */}
            <H2 id="health">8. Monitoreo Automático</H2>
            <P>Chequeo diario a las <strong>10:00 AM</strong> (hora Chile):</P>
            <Table headers={['Chequeo', 'Qué valida']} rows={[
                ['Cookie Uber Eats', 'Sesión vigente o requiere renovación'],
                ['Mapeo Productos', 'Alias apuntan a productos existentes'],
                ['Modificadores', 'Grupos con opciones activas y consistentes'],
                ['Turno de Caja', 'Hay caja abierta para ventas externas'],
                ['Inventario Crítico', 'Items con stock en 0 o negativo'],
            ]} />
            <P>Resultados: ✅ OK · ⚠️ Warning · 🔴 Crítico. El soporte monitorea y actúa proactivamente.</P>

            {/* 9 */}
            <H2 id="faq">9. Preguntas Frecuentes y Soporte</H2>
            {[
                ['¿Cómo cambio el precio?', 'Catálogo → Click producto → Editar precio → Guardar', '/owner/catalog'],
                ['¿Cómo desactivo un producto?', 'Catálogo → Toggle de disponibilidad', '/owner/catalog'],
                ['¿Cómo agrego un banner?', 'Marketing → "Nuevo Banner" → Subir imagen', '/owner/banners'],
                ['¿Cómo creo un cajero?', 'Personal → "Nuevo Usuario" → Rol "Cajero"', '/owner/cashiers'],
                ['¿Cómo registro compra de insumos?', 'Inventario → "Reponer" → Cantidad, costo, rendimiento', '/owner/inventory'],
                ['¿Cómo registro merma?', 'Inventario → "Merma" → Cantidad, motivo, nota', '/owner/inventory'],
                ['¿Cómo edito una receta?', 'Recetas → Click producto → Ingredientes → "Deploy"', '/owner/recipes'],
                ['¿Producto sin stock?', 'Se desactiva automáticamente de la web', '/owner/inventory'],
            ].map(([q, a, href], i) => (
                <div key={i} className="mb-3">
                    <p className="text-sm font-bold text-slate-900">{q}</p>
                    <p className="text-sm text-slate-500">Panel → <Go href={href as string}>{a}</Go></p>
                </div>
            ))}

            <H3>¿Qué Cubre el Soporte?</H3>
            <Table headers={['✅ SÍ cubre', '❌ NO cubre']} rows={[
                ['Integraciones (Uber, PedidosYa, MP)', 'Cambio de productos y precios'],
                ['Funcionamiento del bot Maxi', 'Gestión de banners'],
                ['Caídas del servidor o errores', 'Apertura/cierre de cajas'],
                ['Actualizaciones de seguridad', 'Creación de usuarios'],
                ['Renovación cookie Uber Eats', 'Registro de merma y reposición'],
                ['Configuración de recetas complejas', 'Ajustes manuales de stock'],
            ]} />

            <div className="mt-10 bg-slate-900 rounded-2xl p-6 text-white">
                <p className="font-black italic uppercase text-sm mb-1">¿Necesitas ayuda?</p>
                <p className="text-slate-400 text-sm">WhatsApp directo con Daniel — <strong>Lun a Sáb 10:00 a 20:30 hrs</strong></p>
            </div>

            <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-8 italic">Lo Más Rico V3 · Manual Operativo v2.3.0 · Mayo 2026</p>
        </>
    );
}
