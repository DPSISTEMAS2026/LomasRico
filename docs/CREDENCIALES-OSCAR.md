# 🍽️ Lo Más Rico — Credenciales Necesarias

**Para:** Oscar (Dueño)
**De:** Equipo de Desarrollo (Daniel)
**Fecha:** 28 de abril, 2026

---

Hola Oscar 👋

Para que el sistema de Lo Más Rico pueda **cobrar pedidos online** y **despachar con delivery**, necesitamos que nos proporciones las credenciales de producción de dos servicios. Este documento explica qué necesitamos y cómo obtenerlo paso a paso.

---

## 📋 Resumen

| # | Servicio | ¿Para qué? | Prioridad |
|---|----------|------------|-----------|
| 1 | **MercadoPago** | Cobrar pedidos online (tarjeta, débito, MercadoPago) | 🔴 Urgente |
| 2 | **PedidosYa Envíos** | Cotizar y despachar delivery con motoristas | 🔴 Urgente |

---

## 1. 💳 MercadoPago (Pagos Online)

### ¿Para qué sirve?
Permite que los clientes paguen sus pedidos desde la web de Lo Más Rico con **tarjeta de crédito, débito o saldo de MercadoPago**.

### ¿Qué necesitamos?
Dos claves de la cuenta **de PRODUCCIÓN** (no de prueba):

| Clave | Para qué |
|-------|----------|
| **Access Token** | El servidor procesa los pagos |
| **Public Key** | La web muestra el botón de pago |

### Pasos para obtenerlo:

1. Ir a **[mercadopago.cl](https://www.mercadopago.cl)** e iniciar sesión con la cuenta del negocio
2. Ir a **[mercadopago.cl/developers/panel/app](https://www.mercadopago.cl/developers/panel/app)**
3. Si no hay una aplicación creada, click en **"Crear aplicación"**:
   - Nombre: `Lo Más Rico Web`
   - Tipo: `Pagos online`
   - Producto: `Checkout Pro`
4. Dentro de la aplicación → click en **"Credenciales de producción"**
5. Copiar las dos claves:
   - ✅ **Access Token** (empieza con `APP_USR-`)
   - ✅ **Public Key** (empieza con `APP_USR-`)
6. Enviármelas por WhatsApp

> [!IMPORTANT]
> Actualmente el sistema tiene credenciales de **prueba** que no cobran dinero real. Sin las de producción, **ningún cliente puede pagar online**.

---

## 2. 🛵 PedidosYa Envíos (Delivery)

### ¿Para qué sirve?
Permite **cotizar el costo de envío** automáticamente cuando un cliente pone su dirección, y **despachar el pedido** con un motorista de PedidosYa.

### ¿Qué necesitamos?

| Clave | Para qué |
|-------|----------|
| **Token de API** | Conectar el sistema con PedidosYa Envíos |

### Pasos para obtenerlo:

1. Ir a **[envios.pedidosya.com](https://envios.pedidosya.com)**
2. Si el negocio no está registrado en PedidosYa Envíos, registrarse o contactar al ejecutivo comercial de PedidosYa
3. Una vez dentro del portal → **Configuración** → **API / Integraciones**
4. Generar un **token de API** de producción
5. Enviármelo por WhatsApp

> [!NOTE]
> Si ya tienen un ejecutivo asignado de PedidosYa, pueden pedirle directamente las credenciales de API para integración con sistema propio. Él sabrá qué entregarles.

---

## 📬 ¿Cómo enviarme las credenciales?

> [!WARNING]
> **No enviar credenciales por email público, Facebook ni Instagram.** Son claves sensibles que dan acceso a cobros y envíos.

La forma segura:
- ✅ **WhatsApp directo** a Daniel
- ✅ **Llamada telefónica**

---

## 🎯 Resumen de lo que necesito

| Servicio | Qué enviar | Cuántas claves |
|----------|-----------|----------------|
| **MercadoPago** | Access Token + Public Key | 2 claves |
| **PedidosYa Envíos** | Token de API | 1 clave |

**Total: 3 claves** y el sistema queda 100% operativo para cobros y delivery.

---

*¿Dudas? Escríbeme directamente. — Daniel* 📱
