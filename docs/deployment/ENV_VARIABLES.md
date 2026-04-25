# 🔐 Variables de Entorno para Producción

Este archivo contiene todas las variables de entorno necesarias para el despliegue en producción.
**NO COMMITEAR ESTE ARCHIVO CON VALORES REALES**

---

## 📦 VERCEL - Frontend Apps (Web, Owner, POS, Kitchen, Admin)

Configurar en: Vercel Dashboard → Project → Settings → Environment Variables

### Variables Comunes para Todas las Apps

```env
# API Backend
NEXT_PUBLIC_API_URL=https://pro-lomasrico-api.onrender.com

# Supabase (Storage de Imágenes)
NEXT_PUBLIC_SUPABASE_URL=https://xnwbrdnorjafwwyfhysx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud2JyZG5vcmphZnd3eWZoeXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDI3NDQsImV4cCI6MjA4NTMxODc0NH0.eWDp2G1wRlc_L5Tc87N0W6jUj4BodLamcRiWgYvbmLs

# Google Maps (solo para Web App)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=TU_CLAVE_AQUI
```

### Cómo Configurar en Vercel

1. Ir a https://vercel.com/dashboard
2. Seleccionar el proyecto (ej: lomasrico-web)
3. Settings → Environment Variables
4. Agregar cada variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://pro-lomasrico-api.onrender.com`
   - Environment: Production, Preview, Development (marcar todos)
5. Hacer clic en "Save"
6. Repetir para cada variable

---

## 🔧 RENDER - Backend API

Configurar en: Render Dashboard → API Service → Environment

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xnwbrdnorjafwwyfhysx.supabase.co:5432/postgres

# JWT Secret (auto-generado por Render)
JWT_SECRET=auto_generated_by_render

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx

# PedidosYa
PEDIDOSYA_TOKEN=Bearer_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PEDIDOSYA_API_URL=https://api.pedidosya.com/v1/shippings

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# CORS - Permitir frontends de Vercel
ALLOWED_ORIGINS=https://lomasrico.vercel.app,https://owner.vercel.app,https://pos.vercel.app,https://kitchen.vercel.app,https://admin.vercel.app

# Node
NODE_ENV=production
PORT=10000
NODE_VERSION=20.9.0
```

### Cómo Configurar en Render

1. Ir a https://dashboard.render.com
2. Seleccionar el servicio "pro-lomasrico-api"
3. Environment → Environment Variables
4. Editar o agregar cada variable
5. Hacer clic en "Save Changes"
6. El servicio se reiniciará automáticamente

---

## 🗄️ SUPABASE - Database & Storage

### Connection String

```
postgresql://postgres:[PASSWORD]@db.xnwbrdnorjafwwyfhysx.supabase.co:5432/postgres
```

### Dónde Obtener la Contraseña

1. Ir a https://supabase.com/dashboard/project/xnwbrdnorjafwwyfhysx
2. Settings → Database
3. Connection String → URI (copiar)
4. La contraseña es la que configuraste al crear el proyecto

### Storage Bucket

- **Bucket Name**: `assets`
- **Public**: Sí
- **Políticas RLS**: Configuradas para SELECT e INSERT públicos

---

## 🔑 Dónde Obtener las Credenciales

### Google Maps API Key

1. Ir a https://console.cloud.google.com
2. Crear un proyecto o seleccionar uno existente
3. APIs & Services → Credentials
4. Create Credentials → API Key
5. Habilitar APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API

### MercadoPago Access Token

1. Ir a https://www.mercadopago.cl/developers/panel
2. Tus Integraciones → Crear aplicación
3. Credenciales → Credenciales de Producción
4. Copiar "Access Token"

### PedidosYa Token

1. Contactar al equipo comercial de PedidosYa
2. Solicitar acceso a la API de Envíos
3. Te proporcionarán un Bearer Token

### Google OAuth Client ID (Opcional)

1. Ir a https://console.cloud.google.com
2. APIs & Services → Credentials
3. Create Credentials → OAuth 2.0 Client ID
4. Application Type: Web Application
5. Authorized redirect URIs:
   - `https://pro-lomasrico-api.onrender.com/auth/google/callback`

---

## 📋 Checklist de Configuración

### Antes de Desplegar

- [ ] Obtener todas las credenciales necesarias
- [ ] Crear cuenta en Vercel (si no existe)
- [ ] Verificar acceso a Supabase
- [ ] Verificar acceso a Render

### Durante el Despliegue

- [ ] Configurar variables en Vercel para cada app
- [ ] Configurar variables en Render para el backend
- [ ] Actualizar DATABASE_URL con Supabase
- [ ] Verificar que CORS incluya las URLs de Vercel

### Después del Despliegue

- [ ] Probar login en cada app
- [ ] Verificar que las imágenes carguen
- [ ] Crear un producto de prueba
- [ ] Crear una venta de prueba
- [ ] Verificar integración con MercadoPago
- [ ] Verificar integración con PedidosYa

---

## 🚨 Seguridad

### Variables Sensibles (NUNCA COMMITEAR)

- `DATABASE_URL`
- `JWT_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `PEDIDOSYA_TOKEN`
- `GOOGLE_CLIENT_ID`
- Contraseñas de Supabase

### Variables Públicas (OK para commitear)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (es una clave pública)

---

## 📞 Soporte

Si tienes problemas configurando las variables:

1. **Vercel**: https://vercel.com/docs/concepts/projects/environment-variables
2. **Render**: https://render.com/docs/environment-variables
3. **Supabase**: https://supabase.com/docs/guides/database/connecting-to-postgres

---

**Última actualización**: 4 de febrero de 2026
