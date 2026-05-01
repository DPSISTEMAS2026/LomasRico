# 📘 MANUAL OPERATIVO — Lo Más Rico V3

**Plataforma Digital de Ventas y Gestión Operativa**
Versión 2.3.0 | Mayo 2026

---

## Índice

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Web E-commerce (lomasrico.cl)](#2-web-e-commerce)
3. [Panel de Administración](#3-panel-de-administración)
4. [Punto de Venta (POS)](#4-punto-de-venta-pos)
5. [Panel Cocina (KDS)](#5-panel-cocina-kds)
6. [WhatsApp Bot "Maxi"](#6-whatsapp-bot-maxi)
7. [Integraciones Externas](#7-integraciones-externas)
8. [Monitoreo Automático (Health Check)](#8-monitoreo-automático-health-check)
9. [Preguntas Frecuentes y Soporte](#9-preguntas-frecuentes-y-soporte)

---

## 1. Acceso al Sistema

### 1.1 URLs del Sistema

| Plataforma | URL | Para quién |
|------------|-----|-----------|
| **Web Tienda** | https://lomasrico.cl | Clientes |
| **Panel de Gestión** | https://lomasrico-panels.netlify.app | Dueño, Admin, Cajeros, Cocina |
| **API (Backend)** | https://pro-lomasrico-api-69je.onrender.com | Automático (no acceder manualmente) |

### 1.2 Roles de Usuario

El sistema maneja **4 roles** con permisos diferenciados:

| Rol | Acceso | Para quién |
|-----|--------|-----------|
| **OWNER** (Dueño) | Todo el sistema sin restricciones | Oscar |
| **ADMIN** | Todo el sistema | Encargado de turno |
| **CASHIER** (Cajero) | POS + Cocina | Personal de caja |
| **KITCHEN** (Cocina) | Solo panel de cocina | Personal de preparación |

Además, cada usuario puede tener **módulos individuales** asignados, lo que permite acceso granular a secciones específicas independiente de su rol base.

### 1.3 Cómo Ingresar

1. Ir a **lomasrico-panels.netlify.app**
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
Navega el catálogo por categorías (dinámicas desde la base de datos)
        ↓
Selecciona un producto → personaliza (proteínas, extras, sin ingredientes)
        ↓
Agrega al carrito
        ↓
Ingresa su dirección → el sistema cotiza envío automáticamente (PedidosYa)
        ↓
Elige método de pago → MercadoPago (tarjeta/débito)
        ↓
Confirma pedido → aparece en el Panel Cocina automáticamente
```

### 2.3 Lo que el Cliente Ve

- **Banners promocionales** en la parte superior (administrables desde el panel)
- **Catálogo** organizado por categorías dinámicas con fotos y precios
- **Constructor de Ceviche**: permite elegir proteínas, quitar ingredientes, agregar extras
- **Carrito de compra** con resumen y cálculo de envío
- **Pasarela de pago** de MercadoPago
- **Páginas legales** (términos y condiciones)
- **Perfil de usuario** para clientes registrados

### 2.4 Disponibilidad Automática

El sistema verifica el stock de ingredientes en tiempo real. Si un producto no tiene suficiente inventario para ser preparado, se **desactiva automáticamente** de la web y no aparece disponible para el cliente.

### 2.5 ¿Quién administra el contenido?

Usted. Todo el contenido visible en la web (productos, precios, fotos, banners) se administra desde el **Panel de Administración** sin necesidad de soporte técnico.

---

## 3. Panel de Administración

Se accede desde **lomasrico-panels.netlify.app** con rol OWNER o ADMIN. La barra lateral izquierda muestra todos los módulos disponibles.

### Módulos del Menú Lateral

| Icono | Módulo | Ruta |
|-------|--------|------|
| 📊 | Resumen | `/owner` |
| 👨‍🍳 | Cocina | `/kitchen` |
| 📱 | Punto de Venta | `/pos` |
| 📦 | Catálogo | `/owner/catalog` |
| 🔲 | Modificadores | `/owner/modifiers` |
| 📺 | Marketing | `/owner/banners` |
| 📋 | Inventario | `/owner/inventory` |
| 🔥 | Recetas | `/owner/recipes` |
| 📈 | Reportes | `/owner/reports` |
| 👥 | Clientes | `/owner/customers` |
| 💬 | WhatsApp Bot | `/owner/inbox/whatsapp` |
| 👤 | Personal | `/owner/cashiers` |

> **Tip:** En la vista de Cocina, el sidebar se colapsa automáticamente para maximizar el espacio de trabajo.

### 3.1 Resumen (Dashboard)

**Ubicación:** Menú → Resumen

Vista ejecutiva del estado del negocio con:

- **Ingresos del día** y del mes con tendencia porcentual
- **Órdenes activas** en cocina
- **Alertas de stock bajo** (ingredientes que necesitan reposición)
- **Gráfico de canales de venta** — distribución tipo pie (Web, POS, WhatsApp, Uber Eats)
- **Top 5 productos más vendidos** — ranking con barras de progreso
- **Distribución horaria** de demanda — gráfico de barras por hora del día

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
| **Ordenar productos** | El orden de visualización (sortOrder) se puede ajustar por producto |

> **Importante:** Los cambios en el catálogo se reflejan **inmediatamente** en la web, WhatsApp y POS. Las categorías se generan dinámicamente desde la base de datos.

### 3.3 Modificadores

**Ubicación:** Menú → Modificadores

Los modificadores son las opciones de personalización de cada producto (proteínas, extras, ingredientes removibles):

| Concepto | Ejemplo |
|----------|---------|
| **Grupo de Modificadores** | "Elige tus Proteínas", "Extras", "Sin ingredientes" |
| **Opciones dentro del grupo** | Salmón, Reineta, Camarón, Pulpo... |
| **Precio adicional** | Cada opción puede tener un recargo (ej: Extra Palta +$1.500) |
| **Mín/Máx selecciones** | Cuántas opciones puede elegir el cliente (ej: mín 1, máx 3 proteínas) |
| **Orden personalizado** | Los modificadores se pueden reordenar por producto |

Para editar:
1. Click en un grupo de modificadores
2. Agregar/editar/eliminar opciones
3. Configurar precios y límites
4. Reordenar con flechas (orden por producto)
5. Guardar cambios

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

Control completo de stock de todos los insumos del negocio:

#### Vista Principal

| Dato | Descripción |
|------|-------------|
| **Insumos totales** | Cantidad total de items registrados |
| **Valor total del stock** | Suma de (stock × costo unitario PMP) de todos los insumos |
| **Alertas de stock** | Items con stock menor a 10 unidades |

#### Acciones por Insumo

| Acción | Descripción |
|--------|-------------|
| **Editar** | Modificar nombre, rol, tipo, unidad, costo y umbral mínimo |
| **Ajustar** | Corregir el stock real verificado manualmente (inventario físico) |
| **Reponer** | Registrar una compra con cantidad, costo y **rendimiento (%)** |
| **Merma** | Registrar pérdida con motivo (vencido, dañado, etc.) y nota |

#### Sistema de Rendimiento

Al reponer stock, puede configurar el **rendimiento del insumo** (yield):
- **100%** = sin merma, todo el producto comprado es utilizable
- **70%** = 30% se pierde en limpieza/procesamiento
- El sistema calcula automáticamente el stock útil y el costo neto real (PMP)

**Ejemplo:** Si compra 10 kg de salmón a $8.000/kg con rendimiento 80%:
- Stock útil ingresado: 8 kg
- Merma: 2 kg
- Costo neto real (PMP): $10.000/kg

#### Crear Nuevo Insumo

Al crear un insumo se configuran:

| Campo | Opciones |
|-------|----------|
| **Nombre** | Nombre descriptivo del insumo |
| **Categoría** | Seleccionar existente o crear nueva categoría |
| **Rol** | Base/Abarrote, Proteína Principal, Proteína Premium, Verdura, Salsa, Packaging |
| **Tipo** | 🪨 Materia Prima, 🍳 Preparado/Sub-receta, 📦 Envase/Empaque |
| **Unidad** | KG, GR, LT, ML, UN |
| **Rendimiento %** | Porcentaje de aprovechamiento |
| **Precio compra** | Precio por unidad de medida |
| **Stock inicial** | Cantidad inicial disponible |
| **Alerta mínima** | Umbral para alertas de stock bajo |

> **El descuento de inventario es automático.** Cada vez que se realiza una venta (web, POS o Uber Eats), el sistema descuenta los ingredientes según la receta del producto. Si el stock llega a cero, el producto se desactiva automáticamente.

### 3.6 Recetas Maestras

**Ubicación:** Menú → Recetas

Módulo avanzado de **ingeniería de producto** con dos secciones:

#### Platos Finales
Recetas de los productos que se venden al cliente. Muestra:
- Lista de todos los productos activos, ordenados por categoría
- Indicador visual de si tiene receta configurada (✅) o pendiente (⚠️)
- Filtro de búsqueda por nombre

#### Bases & Preparaciones
Recetas de sub-preparaciones usadas como ingredientes (ej: Base Ceviche, Salsas):
- Botón "Nueva Base Maestro" para crear preparaciones
- Cada base tiene su propia receta de ingredientes

#### Editor de Receta

Al hacer click en cualquier producto/base, se abre el editor con:

| Sección | Descripción |
|---------|-------------|
| **Peso Objetivo (KG)** | Peso base de la porción |
| **Proteínas Permitidas** | Máximo de proteínas seleccionables (solo platos) |
| **Componentes** | Buscador de ingredientes del inventario para agregar |
| **Tabla de ingredientes** | Rol, nombre, cantidad, unidad de cada componente |
| **Análisis Maestro** | Costo de producción, precio de venta y margen de utilidad |

El **Análisis Maestro** muestra en tiempo real:
- **Costo de producción** neto basado en los ingredientes
- **Precio de venta** configurado
- **Margen de utilidad** con indicador verde (>50%) o rojo (<50%)
- **Desglose de costos** por ingrediente individual

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
| **Registrar gasto** | Se pueden registrar gastos y retiros durante el turno |
| **Cerrar Caja** | Al terminar turno, se cierra la caja con el resumen de ventas |

El resumen de cierre muestra:
- Total de ventas del turno
- Desglose por método de pago (efectivo, tarjeta, transferencia)
- Número de transacciones
- Gastos y retiros registrados

> **Importante:** Si un turno lleva más de 24 horas abierto, el sistema de Health Check genera una alerta automática.

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
| **Uber Eats** | Automático (scraping cada 30-60s) | Etiqueta "UBER_EATS" |

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
- El mapeo de productos de Uber Eats a productos internos es automático (vía aliases)
- El inventario se descuenta automáticamente
- Los pedidos de Uber generan alertas de inventario (no bloquean) para mantener el flujo

> **Nota técnica:** Esta integración requiere renovación periódica de cookie (cada 24-48h). El sistema de Health Check diario detecta automáticamente cuando la cookie expira y genera una alerta. La renovación está cubierta por el soporte técnico.

### 7.2 PedidosYa

**Integración activa para cotización de envío:**

- La cotización de envío con motoristas de PedidosYa funciona desde la web
- El cliente ingresa su dirección y el sistema cotiza el delivery vía API de PedidosYa
- Envíos vía Google Maps para cálculo de cobertura y geocodificación

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

### 7.5 Supabase

- **Base de datos PostgreSQL** en la nube (almacenamiento de todos los datos)
- **Storage** para imágenes de productos y banners (subida directa desde el panel)

---

## 8. Monitoreo Automático (Health Check)

El sistema ejecuta un **chequeo diario automático a las 10:00 AM (hora de Chile)** que verifica:

| Chequeo | Qué valida |
|---------|------------|
| **Cookie Uber Eats** | Si la sesión está vigente o requiere renovación |
| **Mapeo de Productos** | Si todos los alias de Uber apuntan a productos existentes |
| **Modificadores** | Que los grupos tengan opciones activas y no estén asignados a productos inactivos |
| **Turno de Caja** | Si hay un turno abierto (necesario para registrar ventas externas) |
| **Inventario Crítico** | Items con stock en 0 o negativo |

Los resultados se categorizan como:
- ✅ **OK** — Sin problemas
- ⚠️ **WARNING** — Requiere atención pero no es crítico
- 🔴 **CRITICAL** — Requiere acción inmediata

> Este sistema es transparente para el usuario. El soporte técnico monitorea las alertas y actúa proactivamente.

---

## 9. Preguntas Frecuentes y Soporte

### 9.1 Preguntas Frecuentes

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
Panel → Inventario → Los items con stock bajo aparecen destacados en rojo, y en la parte superior aparece la sección "Reposición Urgente Necesaria"

**¿Cómo registro una compra de insumos?**
Panel → Inventario → Botón "Reponer" en el insumo → Ingresar cantidad, costo y rendimiento → Confirmar

**¿Cómo registro merma/pérdida de producto?**
Panel → Inventario → Botón "Merma" en el insumo → Ingresar cantidad, motivo y nota → Confirmar

**¿Cómo edito la receta de un producto?**
Panel → Recetas → Click en el producto → Agregar/editar ingredientes y cantidades → "Deploy Receta Maestra"

**¿Qué pasa si un producto se queda sin stock?**
El sistema lo desactiva automáticamente en la web. Aparecerá nuevamente cuando se reponga el inventario suficiente.

**¿Qué pasa si se cae el internet?**
Los pedidos web y de plataformas externas se pausan. Las ventas por POS se pueden seguir registrando y se sincronizan al volver la conexión.

### 9.2 ¿Qué Cubre el Soporte?

| ✅ SÍ cubre | ❌ NO cubre |
|-------------|------------|
| Integraciones (Uber Eats, PedidosYa, MercadoPago) | Cambio de productos y precios |
| Funcionamiento del bot Maxi | Gestión de banners |
| Caídas del servidor o errores del sistema | Apertura/cierre de cajas |
| Actualizaciones de seguridad | Creación de usuarios |
| Errores en pasarela de pago | Consulta de reportes |
| Problemas con pedidos automáticos | Subir fotos de productos |
| Renovación de cookie Uber Eats | Registro de merma y reposición |
| Configuración de recetas complejas | Ajustes manuales de stock |

### 9.3 Horario de Soporte

**Lunes a Sábado: 10:00 a 20:30 hrs**

Canal: WhatsApp directo con el equipo de soporte.

Las solicitudes fuera de horario se atienden al día hábil siguiente.

---

## Datos Importantes

| Dato | Valor |
|------|-------|
| **URL Web** | https://lomasrico.cl |
| **URL Panel** | https://lomasrico-panels.netlify.app |
| **URL API** | https://pro-lomasrico-api-69je.onrender.com |
| **Versión** | 2.3.0 |
| **Soporte** | WhatsApp con Daniel |
| **Horario Soporte** | Lun-Sáb 10:00 - 20:30 |
| **Health Check** | Diario a las 10:00 AM (automático) |

---

## Arquitectura de Despliegue

| Componente | Plataforma | Plan |
|------------|-----------|------|
| **API Backend** (NestJS + Prisma) | Render.com | Starter (always-on) |
| **Web Storefront** (Next.js) | Render.com / Netlify | Free |
| **Panel Admin/POS/Cocina** (Next.js) | Netlify | Free |
| **Base de Datos** (PostgreSQL) | Supabase | Cloud |
| **Storage de Imágenes** | Supabase Storage | Cloud |

---

*Documento actualizado el 1 de mayo de 2026.*
*Lo Más Rico V3 — Plataforma de Gestión Integral*
