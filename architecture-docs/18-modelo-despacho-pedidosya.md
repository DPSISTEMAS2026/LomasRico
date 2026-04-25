# MODELO DE DESPACHO: PEDIDOSYA ENVÍOS (LOGÍSTICA EXTERNA)

Este documento define la lógica y el flujo de integración con PedidosYa Envíos para el cálculo y gestión de despachos.

## 1. FLUJO DE CÁLCULO (PRE-VENTA)
El cálculo del despacho es **bloqueante** para el cierre de la venta en canales digitales (Web/WhatsApp).

1.  **Ingreso de Dirección**: El cliente ingresa su dirección (Calle, Número, Comuna).
2.  **Validación de Origen**: Se utiliza el punto fijo: `Obispo Hipólito Salas 1205, Concepción`.
3.  **Solicitud de Cotización (Quote)**:
    - Se envía a la API de PedidosYa la dirección de origen y destino.
    - Se incluyen las dimensiones/peso estimado basado en el carrito (BoM).
4.  **Respuesta**: La API retorna el costo (fee) y el tiempo estimado de entrega (ETA).
5.  **Exhibición**: Se suma el costo de envío al total de la orden.

## 2. REGLAS POR CANAL

### A. WEB CLIENTE (Autoservicio)
- **Cálculo automático**: Al ingresar la dirección en el checkout.
- **Fuera de Rango (> 8 km)**: El sistema bloquea el modo "Despacho" y sugiere únicamente "Retiro en Local".
- **Falla de API**: Si PedidosYa no responde, la Web inhabilita el despacho temporalmente (Prevención de cobros erróneos).

### B. POS (Venta Presencial/Telefónica)
- **Cálculo asistido**: El cajero ingresa la dirección y presiona "Cotizar".
- **Override Manual**: El cajero puede sobreescribir el precio de despacho si hay un acuerdo previo o la API falla.
- **Forzado**: El POS permite omitir la validación de 8km bajo responsabilidad del staff (ej: un despacho por fuera).

### C. WHATSAPP (Automatizado)
- **Captura**: El bot pide la dirección o ubicación GPS.
- **Cotización Silenciosa**: El backend consulta la API y el bot responde: *"El costo de envío a tu ubicación es de $X. ¿Deseas confirmar el pedido?"*.

## 3. GESTIÓN DE ERRORES Y LÍMITES
- **Dirección no encontrada**: Se solicita al usuario ser más específico o usar el mapa.
- **API Down**: El sistema entra en modo "Fall-back":
    - Opción A: Cobro de tarifa plana preconfigurada (Ej: $3.000 parejo).
    - Opción B: Notificar al cliente que el despacho se cobrará al recibir (Manual).
- **Límite de Distancia**: 8 km estrictos desde el local para despacho automatizado.

## 4. CONTRATO DE DATOS (SNAPSHOT VENTA)
Cuando la venta se confirma, se deben persistir los siguientes campos en la tabla `Sale`:

```json
{
  "shipping": {
    "method": "PEDIDOS_YA",
    "cost": 2500,
    "address": "Calle Falsa 123, Concepción",
    "reference": "Puerta roja, segundo piso",
    "externalEstimateId": "py-987654321", // ID de cotización de PedidosYa
    "status": "QUOTED" // PENDING | QUOTED | DISPATCHED | DELIVERED
  }
}
```

## 5. ACCIÓN POST-VENTA (WEBHOOK/TRIGGER)
Una vez que el pago es confirmado (o la venta es validada en POS):
1. El sistema realiza el **Booking** real en la API de PedidosYa usando el `externalEstimateId`.
2. Se genera el ticket de trazabilidad para que el local sepa que el repartidor viene en camino.
