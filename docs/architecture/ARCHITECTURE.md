# 🏗️ Arquitectura de Producción - Lo Más Rico

## 📊 Diagrama de Arquitectura Actual vs. Propuesta

### 🔴 ARQUITECTURA ACTUAL (Todo en Render)

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDER.COM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Owner Panel │  │     POS      │          │
│  │   (Next.js)  │  │   (Next.js)  │  │  (Next.js)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Kitchen    │  │    Admin     │                            │
│  │   (Next.js)  │  │  (Next.js)   │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                  │
│  ┌────────────────────────────────────────────────┐            │
│  │           API Backend (NestJS)                  │            │
│  └────────────────────────────────────────────────┘            │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────┐            │
│  │        PostgreSQL Database ($7/mes)             │            │
│  └────────────────────────────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE.COM                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐            │
│  │         Storage (Imágenes) - GRATIS             │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘

Problemas:
❌ Render Free tiene auto-sleep (15 min inactividad)
❌ PostgreSQL en Render cuesta $7/mes
❌ Frontends en Render son más lentos que Vercel
❌ No hay CDN global para los frontends
```

---

### 🟢 ARQUITECTURA PROPUESTA (Optimizada)

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL.COM                                │
│                    (CDN Global - GRATIS)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  lomasrico.vercel.app - Web App (Cliente)                │  │
│  │  • Catálogo de productos                                  │  │
│  │  • Carrito de compras                                      │  │
│  │  • Checkout con MercadoPago                                │  │
│  │  • Integración Google Maps                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  owner.vercel.app - Owner Panel                           │  │
│  │  • Dashboard con métricas                                  │  │
│  │  • Gestión de catálogo                                     │  │
│  │  • Gestión de inventario                                   │  │
│  │  • Configuración de recetas                                │  │
│  │  • Reportes de ventas                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  pos.vercel.app - POS (Punto de Venta)                    │  │
│  │  • Sistema de ventas                                       │  │
│  │  • Carrito                                                 │  │
│  │  • Generación de pedidos                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  kitchen.vercel.app - Kitchen (Cocina)                    │  │
│  │  • Flujo Kanban de pedidos                                 │  │
│  │  • Actualización en tiempo real                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  admin.vercel.app - Admin Dashboard                       │  │
│  │  • Administración central                                  │  │
│  │  • Configuración del sistema                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                        RENDER.COM                                │
│                     (Backend - GRATIS*)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐            │
│  │     pro-lomasrico-api.onrender.com              │            │
│  │           API Backend (NestJS)                   │            │
│  │  • REST API                                      │            │
│  │  • Autenticación JWT                             │            │
│  │  • Integración MercadoPago                       │            │
│  │  • Integración PedidosYa                         │            │
│  │  • CORS configurado                              │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Database Queries
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE.COM                               │
│                  (Database + Storage - GRATIS)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐            │
│  │        PostgreSQL Database (500MB)              │            │
│  │  • Productos                                     │            │
│  │  • Ventas                                        │            │
│  │  • Inventario                                    │            │
│  │  • Recetas                                       │            │
│  │  • Clientes                                      │            │
│  │  • Pedidos                                       │            │
│  └────────────────────────────────────────────────┘            │
│                                                                  │
│  ┌────────────────────────────────────────────────┐            │
│  │         Storage - Bucket "assets" (1GB)         │            │
│  │  • Imágenes de productos                         │            │
│  │  • Logos                                         │            │
│  │  • Banners                                       │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘

Servicios Externos:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  MercadoPago API │  │  PedidosYa API   │  │  Google Maps API │
│  (Pagos)         │  │  (Envíos)        │  │  (Geocoding)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘

Ventajas:
✅ Todo GRATIS (ahorro de $7/mes)
✅ Vercel: CDN global, despliegues automáticos, preview deployments
✅ Supabase: DB + Storage consolidados, backups automáticos
✅ Render: Mantener backend funcionando sin cambios
✅ Mejor performance para usuarios finales
```

---

## 🔄 Flujo de Datos

### 1. Usuario Final (Cliente Web)

```
Usuario → lomasrico.vercel.app
   ↓
   Ver catálogo (imágenes desde Supabase Storage)
   ↓
   Agregar al carrito
   ↓
   Checkout → Ingresar dirección (Google Maps API)
   ↓
   Calcular envío → API Backend → PedidosYa API
   ↓
   Pagar → API Backend → MercadoPago API
   ↓
   Confirmar pedido → API Backend → Supabase DB
   ↓
   Notificar cocina → kitchen.vercel.app (WebSocket/Polling)
```

### 2. Dueño (Owner Panel)

```
Dueño → owner.vercel.app
   ↓
   Login → API Backend → Verificar JWT
   ↓
   Ver dashboard → API Backend → Supabase DB (métricas)
   ↓
   Gestionar productos → API Backend → Supabase DB
   ↓
   Subir imagen → Supabase Storage (directo desde frontend)
   ↓
   Ver reportes → API Backend → Supabase DB (queries complejas)
```

### 3. Punto de Venta (POS)

```
Vendedor → pos.vercel.app
   ↓
   Crear venta → API Backend → Supabase DB
   ↓
   Actualizar inventario → API Backend → Supabase DB (FIFO)
   ↓
   Generar pedido → API Backend → Supabase DB
   ↓
   Notificar cocina → kitchen.vercel.app
```

### 4. Cocina (Kitchen)

```
Cocinero → kitchen.vercel.app
   ↓
   Ver pedidos → API Backend → Supabase DB
   ↓
   Actualizar estado → API Backend → Supabase DB
   ↓
   Notificar cliente (opcional) → Email/SMS
```

---

## 🔐 Seguridad

### Variables de Entorno

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
├─────────────────────────────────────────────────────────────────┤
│  NEXT_PUBLIC_API_URL                 (público)                  │
│  NEXT_PUBLIC_SUPABASE_URL            (público)                  │
│  NEXT_PUBLIC_SUPABASE_ANON_KEY       (público)                  │
│  NEXT_PUBLIC_GOOGLE_MAPS_KEY         (público)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         RENDER                                   │
├─────────────────────────────────────────────────────────────────┤
│  DATABASE_URL                        (privado) ⚠️               │
│  JWT_SECRET                          (privado) ⚠️               │
│  MERCADOPAGO_ACCESS_TOKEN            (privado) ⚠️               │
│  PEDIDOSYA_TOKEN                     (privado) ⚠️               │
│  GOOGLE_CLIENT_ID                    (privado) ⚠️               │
└─────────────────────────────────────────────────────────────────┘
```

### CORS

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'https://lomasrico.vercel.app',      // Web App
    'https://owner.vercel.app',          // Owner Panel
    'https://pos.vercel.app',            // POS
    'https://kitchen.vercel.app',        // Kitchen
    'https://admin.vercel.app',          // Admin
  ],
  credentials: true,
});
```

---

## 📊 Comparación de Costos

| Componente | Actual (Render) | Propuesto | Ahorro |
|------------|----------------|-----------|--------|
| **Frontend (5 apps)** | $0 (Free tier) | $0 (Vercel Free) | $0 |
| **Backend** | $0 (Free tier*) | $0 (Render Free*) | $0 |
| **Database** | **$7/mes** | $0 (Supabase Free) | **$7/mes** |
| **Storage** | $0 (Supabase) | $0 (Supabase) | $0 |
| **CDN** | ❌ No incluido | ✅ Incluido (Vercel) | 🎁 Gratis |
| **TOTAL** | **$7/mes** | **$0/mes** | **$7/mes** |

*Auto-sleep después de 15 min de inactividad en plan Free

---

## 🚀 Performance

### Tiempos de Carga Estimados

| Métrica | Actual (Render) | Propuesto (Vercel) | Mejora |
|---------|----------------|-------------------|--------|
| **First Contentful Paint** | ~2.5s | ~0.8s | 68% ⬆️ |
| **Time to Interactive** | ~4.0s | ~1.5s | 62% ⬆️ |
| **Largest Contentful Paint** | ~3.5s | ~1.2s | 66% ⬆️ |

### Ubicación de Servidores

**Render (Oregon, USA)**
- Latencia desde Chile: ~150-200ms

**Vercel (Edge Network)**
- Latencia desde Chile: ~20-50ms (Santiago Edge Node)
- Mejora: **75% más rápido** 🚀

---

## 🌍 Escalabilidad

### Límites del Plan Gratuito

| Servicio | Límite | Suficiente para |
|----------|--------|----------------|
| **Vercel** | 100 GB bandwidth/mes | ~100,000 visitas/mes |
| **Supabase** | 500 MB DB | ~50,000 productos + ventas |
| **Supabase** | 1 GB Storage | ~1,000 imágenes |
| **Render** | 750 horas/mes | 24/7 con auto-sleep |

### Cuándo Actualizar

**Vercel Pro ($20/mes)**
- Cuando superes 100 GB bandwidth
- Cuando necesites más de 3 miembros en el equipo
- Cuando necesites analytics avanzados

**Supabase Pro ($25/mes)**
- Cuando superes 500 MB de DB
- Cuando necesites más de 1 GB de Storage
- Cuando necesites backups diarios automáticos

**Render Starter ($7/mes)**
- Cuando necesites eliminar el auto-sleep
- Cuando necesites 512 MB RAM garantizada
- Para producción seria

---

## 📈 Roadmap de Migración

```
Semana 1: Preparación
├── Obtener credenciales
├── Crear cuentas
└── Revisar documentación

Semana 2: Migración de DB
├── Backup de Render
├── Importar a Supabase
└── Actualizar DATABASE_URL

Semana 3: Despliegue en Vercel
├── Conectar repositorio
├── Desplegar 5 apps
└── Configurar variables de entorno

Semana 4: Testing e Integración
├── Testing completo
├── Actualizar CORS
└── Configurar dominios (opcional)

Semana 5: Monitoreo y Optimización
├── Configurar UptimeRobot
├── Configurar analytics
└── Documentar URLs finales
```

---

## ✅ Checklist de Validación

### Pre-Migración
- [ ] Backup completo de DB
- [ ] Backup de archivos
- [ ] Todas las credenciales obtenidas
- [ ] Acceso a todas las plataformas

### Post-Migración
- [ ] Todas las apps desplegadas
- [ ] Todas las funcionalidades funcionan
- [ ] Performance mejorada
- [ ] Costos reducidos
- [ ] Monitoreo configurado

---

**Última actualización**: 4 de febrero de 2026
**Versión**: 1.0
