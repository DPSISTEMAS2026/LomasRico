
# 🔐 Configuración de Credenciales Reales

Para que el sistema de Pagos y Envíos funcione correctamente, debes configurar las siguientes credenciales. El sistema ya está programado para usarlas en cuanto las ingreses.

## 1. Configurar Frontend (Google Maps)
Crea un archivo llamado `.env.local` en la carpeta `apps/web/` y agrega tu clave de Google Maps.

**Ruta:** `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=https://pro-lomasrico-api.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_KEY=TU_CLAVE_API_AQUI
```
> **Nota:** Asegúrate de habilitar **"Maps JavaScript API"** y **"Places API"** en tu consola de Google Cloud.

---

## 2. Configurar Backend (MercadoPago y PedidosYa)
Debes agregar estas variables de entorno en tu panel de **Render** (o en `apps/api/.env` si corres local).

**Variables Requeridas:**

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `MERCADOPAGO_ACCESS_TOKEN` | Token de acceso de producción (o prueba) | [MercadoPago Developers](https://www.mercadopago.cl/developers/panel) > Tus Integraciones > Credenciales de Producción |
| `PEDIDOSYA_TOKEN` | Token Bearer para la API de Envíos | Contacto comercial o integración PedidosYa Envíos |
| `PEDIDOSYA_API_URL` | URL de la API (Prod/Test) | Por defecto usa prod. Para test: `https://api.pedidosya.com/v1/shippings` |

### Ejemplo de archivo `apps/api/.env` (Local):
```env
DATABASE_URL="postgresql://..."
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx
PEDIDOSYA_TOKEN=eyJh...
```

---

## 🚀 Flujo Activo
Una vez ingresadas:
1. **Dirección:** El checkout mostrará autocompletado de Google.
2. **Envío:** Se calculará automáticamente con coordenadas precisas.
3. **Pago:** El botón "Pagar con MercadoPago" redirigirá a la pasarela real.
4. **Cocina:** Al confirmarse el pago, la orden aparecerá automáticamente en la pantalla de cocina.
