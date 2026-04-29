# 📘 MANUAL OPERATIVO — Lo Más Rico V3

**Plataforma Digital de Ventas y Gestión Operativa**
Versión 2.3.0 | Abril 2026

---

## Índice

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Web E-commerce (lomasrico.cl)](#2-web-e-commerce)
3. [Panel de Administración](#3-panel-de-administración)
4. [Punto de Venta (POS)](#4-punto-de-venta-pos)
5. [Panel Cocina (KDS)](#5-panel-cocina-kds)
6. [WhatsApp Bot "Maxi"](#6-whatsapp-bot-maxi)
7. [Integraciones Externas](#7-integraciones-externas)
8. [Preguntas Frecuentes y Soporte](#8-preguntas-frecuentes-y-soporte)

---

## 1. Acceso al Sistema

### 1.1 URLs del Sistema

| Plataforma | URL | Para quién |
|------------|-----|-----------|
| **Web Tienda** | https://lomasrico.cl | Clientes |
| **Panel de Gestión** | https://panel.lomasrico.cl | Dueño, Admin, Cajeros, Cocina |
| **API (Backend)** | https://pro-lomasrico-api-69je.onrender.com | Automático (no acceder manualmente) |

### 1.2 Roles de Usuario

El sistema maneja **4 roles** con permisos diferenciados:

| Rol | Acceso | Para quién |
|-----|--------|-----------|
| **OWNER** (Dueño) | Todo el sistema sin restricciones | Oscar |
| **ADMIN** | Todo el sistema | Encargado de turno |
| **CASHIER** (Cajero) | POS + Cocina | Personal de caja |
| **KITCHEN** (Cocina) | Solo panel de cocina | Personal de preparación |

### 1.3 Cómo Ingresar

1. Ir a **panel.lomasrico.cl**
2. Ingresar **usuario** y **contraseña** proporcionados
3. El sistema redirige automáticamente al panel correspondiente según su rol

> **Nota:** Si olvida su contraseña, el administrador puede resetearla desde **Personal** en el panel.

---

## 2. Web E-commerce

### 2.1 ¿Qué es?

La web pública del negocio donde los clientes pueden ver el menú, armar su pedido, elegir delivery o retiro, y pagar online.

### 2.2 Flujo de Compra del Cliente

```
El cliente ingresa a lomasrico.cl
        ↓
Navega el catálogo por categorías
        ↓
Selecciona un producto → personaliza (proteínas, extras, sin ingredientes)
        ↓
Agrega al carrito
        ↓
Ingresa su dirección → el sistema cotiza envío automáticamente
        ↓
Elige método de pago → MercadoPago (tarjeta/débito)
        ↓
Confirma pedido → aparece en el Panel Cocina automáticamente
```

### 2.3 Lo que el Cliente Ve

- **Banners promocionales** en la parte superior (administrables desde el panel)
- **Catálogo** organizado por categorías con fotos y precios
- **Constructor de Ceviche**: permite elegir proteínas, quitar ingredientes, agregar extras
- **Carrito de compra** con resumen y cálculo de envío
- **Pasarela de pago** de MercadoPago

### 2.4 ¿Quién administra el contenido?

Usted. Todo el contenido visible en la web (productos, precios, fotos, banners) se administra desde el **Panel de Administración** sin necesidad de soporte técnico.

---

## 3. Panel de Administración

Se accede desde **panel.lomasrico.cl** con rol OWNER o ADMIN. La barra lateral izquierda muestra todos los módulos disponibles.

### 3.1 Resumen (Dashboard)

**Ubicación:** Menú → Resumen

Vista ejecutiva del estado del negocio con:

- **Ingresos del día** y del mes con tendencia
- **Órdenes activas** en cocina
- **Alertas de stock bajo** (ingredientes que necesitan reposición)
- **Gráfico de canales de venta** (Web, POS, WhatsApp, Uber Eats)
- **Top 5 productos más vendidos**
- **Distribución horaria** de demanda (horas peak)

### 3.2 Catálogo de Productos

**Ubicación:** Menú → Catálogo

Permite gestionar todos los productos a la venta:

| Acción | Cómo |
|--------|------|
| **Crear producto** | Botón "Nuevo Producto" → completar nombre, precio, categoría, foto |
| **Editar producto** | Click en el producto → modificar campos → Guardar |
| **Activar/Desactivar** | Toggle de disponibilidad en cada producto |
| **Subir foto** | Click en la imagen del producto → seleccionar archivo |
| **Crear variante** | Dentro del producto → "Agregar Variante" (ej: 350g, 500g, 1kg) |
| **Ordenar categorías** | Las categorías se muestran en el orden configurado |

> **Importante:** Los cambios en el catálogo se reflejan **inmediatamente** en la web, WhatsApp y POS.

### 3.3 Modificadores

**Ubicación:** Menú → Modificadores

Los modificadores son las opciones de personalización de cada producto (proteínas, extras, ingredientes removibles):

| Concepto | Ejemplo |
|----------|---------|
| **Grupo de Modificadores** | "Elige tus Proteínas", "Extras", "Sin ingredientes" |
| **Opciones dentro del grupo** | Salmón, Reineta, Camarón, Pulpo... |
| **Precio adicional** | Cada opción puede tener un recargo (ej: Extra Palta +$1.500) |
| **Mín/Máx selecciones** | Cuántas opciones puede elegir el cliente (ej: mín 1, máx 3 proteínas) |

Para editar:
1. Click en un grupo de modificadores
2. Agregar/editar/eliminar opciones
3. Configurar precios y límites
4. Guardar cambios

### 3.4 Marketing (Banners)

**Ubicación:** Menú → Marketing

Administre los banners promocionales que aparecen en la parte superior de la web:

| Acción | Cómo |
|--------|------|
| **Subir banner** | Click "Nuevo Banner" → subir imagen → guardar |
| **Reordenar** | Arrastrar y soltar para cambiar el orden |
| **Activar/Desactivar** | Toggle de visibilidad |
| **Eliminar** | Botón de eliminar en cada banner |

**Tamaño recomendado:** 1200 x 400 píxeles, formato JPG o PNG.

### 3.5 Inventario

**Ubicación:** Menú → Inventario

Control de stock de todos los insumos del negocio:

| Función | Descripción |
|---------|-------------|
| **Ver stock actual** | Lista de todos los insumos con cantidad disponible |
| **Alertas de stock bajo** | Indicador visual cuando un insumo está bajo el mínimo |
| **Registrar ingreso** | "Agregar Stock" → ingresar cantidad recibida |
| **Tipos de insumo** | Materia prima, preparaciones, insumos de empaque |

> **El descuento de inventario es automático.** Cada vez que se realiza una venta (web, POS o Uber Eats), el sistema descuenta los ingredientes según la receta del producto.

### 3.6 Recetas

**Ubicación:** Menú → Recetas

Visualización de las recetas de producción de cada producto:

- Ver los ingredientes y gramajes de cada receta
- Las recetas determinan el descuento automático de inventario
- Los gramajes varían según el tamaño y las proteínas seleccionadas

> **Nota:** Las recetas están configuradas según los estándares operativos del negocio. Para modificaciones, contactar al soporte técnico.

### 3.7 Reportes

**Ubicación:** Menú → Reportes

Acceso a informes de ventas y operación:

- Ventas por período (día, semana, mes)
- Desglose por canal de venta
- Productos más vendidos
- Historial de transacciones

### 3.8 Clientes

**Ubicación:** Menú → Clientes

Registro de clientes que han comprado en la plataforma:

- Nombre, teléfono, email
- Historial de pedidos
- Dirección de entrega registrada

### 3.9 Personal (Usuarios del Sistema)

**Ubicación:** Menú → Personal

Gestión de los usuarios que acceden al panel:

| Acción | Cómo |
|--------|------|
| **Crear usuario** | "Nuevo Usuario" → nombre, email, contraseña, rol |
| **Asignar rol** | Seleccionar: Owner, Admin, Cashier o Kitchen |
| **Asignar módulos** | Seleccionar qué secciones puede ver cada usuario |
| **Desactivar usuario** | Toggle de estado activo/inactivo |
| **Resetear contraseña** | Botón de resetear en cada usuario |

---

## 4. Punto de Venta (POS)

### 4.1 ¿Qué es?

El módulo de venta presencial en el local. Permite registrar ventas directas, seleccionar productos del catálogo, personalizar pedidos y procesar pagos.

**Ubicación:** Menú → Punto de Venta

### 4.2 Crear una Venta

1. **Seleccionar productos** del catálogo lateral (organizado por categorías)
2. **Personalizar** cada producto si tiene modificadores (proteínas, extras)
3. Los productos se agregan al **carrito** (panel derecho)
4. Ajustar **cantidades** con los botones +/-
5. Revisar el **total**
6. Click en **"Pagar"** para finalizar

### 4.3 Métodos de Pago

Al finalizar la venta, seleccionar el método de pago:

| Método | Uso |
|--------|-----|
| **Efectivo** | El sistema calcula el vuelto automáticamente |
| **Tarjeta** | Registra el pago como tarjeta |
| **Transferencia** | Registra el pago como transferencia bancaria |
| **MercadoPago** | Genera un link de pago para el cliente |

### 4.4 Datos del Cliente (Opcional)

Al momento del pago se puede registrar:
- Nombre del cliente
- Teléfono
- Tipo de entrega (retiro en local / delivery)
- Dirección de entrega (si aplica)

### 4.5 Cajas y Turnos

El POS funciona con un sistema de **cajas y turnos**:

| Acción | Descripción |
|--------|-------------|
| **Abrir Caja** | Al iniciar turno, el cajero abre caja con un monto inicial |
| **Operar** | Todas las ventas se asocian a la caja abierta |
| **Cerrar Caja** | Al terminar turno, se cierra la caja con el resumen de ventas |

El resumen de cierre muestra:
- Total de ventas del turno
- Desglose por método de pago (efectivo, tarjeta, transferencia)
- Número de transacciones

### 4.6 Flujo al Confirmar una Venta

```
Cajero confirma el pago
        ↓
Se registra la venta en el sistema
        ↓
Se descuenta inventario automáticamente (según receta)
        ↓
El pedido aparece en el Panel Cocina
        ↓
Cocina prepara y marca como listo
```

---

## 5. Panel Cocina (KDS)

### 5.1 ¿Qué es?

El Kitchen Display System (KDS) es la pantalla de cocina donde llegan **todos los pedidos** de todos los canales en tiempo real.

**Ubicación:** Menú → Cocina

### 5.2 ¿De dónde llegan los pedidos?

| Canal | Cómo llega | Identificación |
|-------|------------|----------------|
| **Web (lomasrico.cl)** | Automático al pagar | Etiqueta "WEB" |
| **POS (local)** | Automático al confirmar venta | Etiqueta "POS" |
| **WhatsApp (Maxi)** | Automático al confirmar pedido | Etiqueta "WHATSAPP" |
| **Uber Eats** | Automático (scraping cada 60s) | Etiqueta "UBER_EATS" |
| **PedidosYa** | Automático (por implementar) | Etiqueta "PEDIDOS_YA" |

### 5.3 Estados de un Pedido

Cada pedido pasa por los siguientes estados:

```
📥 ENTRANTE → El pedido acaba de llegar
        ↓ (Aceptar)
🔥 PREPARANDO → Se está preparando en cocina
        ↓ (Listo)
✅ ENTREGA → Listo para entregar al cliente o al repartidor
```

### 5.4 Información en Cada Pedido

Cada tarjeta de pedido muestra:
- **Número de orden** y canal de origen
- **Nombre del cliente**
- **Productos** con sus personalizaciones
- **Receta desglosada**: gramajes exactos de cada ingrediente
- **Tiempo transcurrido** desde que llegó el pedido
- **Notas especiales** del cliente

### 5.5 Acciones Disponibles

| Botón | Acción |
|-------|--------|
| **Aceptar** | Mover el pedido a "Preparando" |
| **Listo** | Mover a "Entrega" — listo para despacho |
| **Imprimir** | Imprimir la comanda del pedido |
| **Cancelar** | Cancelar el pedido (con confirmación) |

---

## 6. WhatsApp Bot "Maxi"

### 6.1 ¿Qué es?

Maxi es un **asistente de inteligencia artificial** que atiende a los clientes por WhatsApp. Puede responder preguntas, tomar pedidos y guiar al cliente hasta el pago.

### 6.2 ¿Qué puede hacer Maxi?

| Función | Ejemplo |
|---------|---------|
| **Mostrar el menú** | "¿Qué tienen disponible?" |
| **Tomar pedidos** | "Quiero un ceviche de 500g con salmón y camarón" |
| **Personalizar** | "Sin cebolla por favor" |
| **Cotizar envío** | "Mi dirección es O'Higgins 456, Concepción" |
| **Enviar link de pago** | Genera link de MercadoPago automáticamente |
| **Informar horarios** | "¿A qué hora abren?" |
| **Responder dudas** | "¿Cuáles son las proteínas premium?" |

### 6.3 Monitoreo

**Ubicación:** Menú → WhatsApp Bot

Desde el panel se puede ver:
- Conversaciones activas
- Pedidos generados por el bot
- Estado de la conexión del bot

> **Nota:** Maxi opera de forma autónoma. Si necesita ajustes en las respuestas o el catálogo del bot, contactar al soporte técnico.

---

## 7. Integraciones Externas

### 7.1 Uber Eats

El sistema **captura automáticamente** los pedidos que llegan por Uber Eats y los envía al panel de cocina.

- Los pedidos aparecen con la etiqueta **"UBER EATS"** en color verde
- El mapeo de productos de Uber Eats a productos internos es automático
- El inventario se descuenta automáticamente

> **Nota técnica:** Esta integración requiere renovación periódica de sesión. Este proceso está cubierto por el soporte técnico.

### 7.2 PedidosYa

**Estado actual:** En proceso de habilitación vía API oficial.

Una vez activo:
- Los pedidos de PedidosYa llegarán automáticamente al panel de cocina
- La cotización de envío con motoristas de PedidosYa funciona desde la web

### 7.3 MercadoPago

Pasarela de pagos para cobros online:

- Funciona en la web y en links de pago por WhatsApp
- Acepta tarjeta de crédito, débito y saldo MercadoPago
- Los pagos se confirman automáticamente vía webhook
- Las ventas se registran con el detalle del pago

### 7.4 Google Maps

- Autocompletado de direcciones en el checkout de la web
- Cálculo automático de cobertura de delivery
- Geocodificación para cotización de envío

---

## 8. Preguntas Frecuentes y Soporte

### 8.1 Preguntas Frecuentes

**¿Cómo cambio el precio de un producto?**
Panel → Catálogo → Click en el producto → Editar precio → Guardar

**¿Cómo desactivo un producto temporalmente?**
Panel → Catálogo → Toggle de disponibilidad del producto

**¿Cómo agrego un banner nuevo?**
Panel → Marketing → "Nuevo Banner" → Subir imagen → Guardar

**¿Cómo creo un nuevo usuario para un cajero?**
Panel → Personal → "Nuevo Usuario" → Asignar rol "Cajero"

**¿Cómo veo las ventas del día?**
Panel → Resumen (dashboard) → "Ingresos Hoy"

**¿Cómo sé si falta stock?**
Panel → Inventario → Los items con stock bajo aparecen destacados en rojo

**¿Qué pasa si se cae el internet?**
Los pedidos web y de plataformas externas se pausan. Las ventas por POS se pueden seguir registrando y se sincronizan al volver la conexión.

### 8.2 ¿Qué Cubre el Soporte?

| ✅ SÍ cubre | ❌ NO cubre |
|-------------|------------|
| Integraciones (Uber Eats, PedidosYa, MercadoPago) | Cambio de productos y precios |
| Funcionamiento del bot Maxi | Gestión de banners |
| Caídas del servidor o errores del sistema | Apertura/cierre de cajas |
| Actualizaciones de seguridad | Creación de usuarios |
| Errores en pasarela de pago | Consulta de reportes |
| Problemas con pedidos automáticos | Subir fotos de productos |

### 8.3 Horario de Soporte

**Lunes a Sábado: 10:00 a 20:30 hrs**

Canal: WhatsApp directo con el equipo de soporte.

Las solicitudes fuera de horario se atienden al día hábil siguiente.

---

## Datos Importantes

| Dato | Valor |
|------|-------|
| **URL Web** | https://lomasrico.cl |
| **URL Panel** | https://panel.lomasrico.cl |
| **Versión** | 2.3.0 |
| **Soporte** | WhatsApp con Daniel |
| **Horario Soporte** | Lun-Sáb 10:00 - 20:30 |

---

*Documento generado el 29 de abril de 2026.*
*Lo Más Rico V3 — Plataforma de Gestión Integral*
