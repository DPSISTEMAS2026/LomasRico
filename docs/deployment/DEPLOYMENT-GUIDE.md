# 🚀 Guía de Despliegue a Producción - Lo Más Rico

## 📋 Arquitectura de Producción Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA FINAL                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (Vercel)                                          │
│  ├── Web App (Cliente)      → lomasrico.vercel.app         │
│  ├── Owner Panel            → owner.lomasrico.vercel.app    │
│  ├── POS                    → pos.lomasrico.vercel.app      │
│  ├── Kitchen                → kitchen.lomasrico.vercel.app  │
│  └── Admin                  → admin.lomasrico.vercel.app    │
│                                                              │
│  BACKEND (Render)                                           │
│  └── API NestJS             → api.lomasrico.com             │
│                                                              │
│  DATABASE (Supabase)                                        │
│  ├── PostgreSQL             → Supabase Postgres             │
│  └── Storage (Imágenes)     → Supabase Storage (ya activo) │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Ventajas de Esta Arquitectura

### ✅ Vercel para Frontend
- **Despliegue automático** desde Git
- **Edge Network global** (CDN)
- **Preview deployments** para cada PR
- **Optimización automática** de Next.js
- **GRATIS** para proyectos personales/pequeños
- **Dominios personalizados** incluidos

### ✅ Supabase para Base de Datos
- **PostgreSQL gestionado** con backups automáticos
- **Storage integrado** (ya lo están usando)
- **Realtime subscriptions** (útil para cocina/pedidos)
- **Row Level Security** (RLS)
- **GRATIS** hasta 500MB DB + 1GB Storage
- **Dashboard intuitivo** para gestión

### ✅ Render para Backend
- **Despliegue automático** desde Git
- **Logs centralizados**
- **Health checks automáticos**
- **GRATIS** para servicios web (con limitaciones)
- **Fácil configuración** de variables de entorno

---

## 📝 Plan de Migración Paso a Paso

### FASE 1: Preparar Supabase (Base de Datos)

#### 1.1 Migrar PostgreSQL a Supabase

Ya tienen Supabase configurado para Storage. Ahora vamos a usarlo también para la DB:

**Pasos:**

1. **Ir a Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/xnwbrdnorjafwwyfhysx
   - Ir a Settings → Database

2. **Obtener Connection String**
   ```
   postgresql://postgres:[PASSWORD]@db.xnwbrdnorjafwwyfhysx.supabase.co:5432/postgres
   ```

3. **Exportar datos actuales de Render**
   ```bash
   # Conectarse a la DB actual de Render
   pg_dump -h dpg-xxxxx.oregon-postgres.render.com -U lomasrico_user -d lomasrico > backup.sql
   ```

4. **Importar a Supabase**
   ```bash
   # Conectarse a Supabase
   psql "postgresql://postgres:[PASSWORD]@db.xnwbrdnorjafwwyfhysx.supabase.co:5432/postgres" < backup.sql
   ```

5. **Actualizar DATABASE_URL en Render**
   - Ir a Render Dashboard → API Service → Environment
   - Actualizar `DATABASE_URL` con la nueva URL de Supabase

---

### FASE 2: Configurar Vercel (Frontend)

#### 2.1 Preparar el Proyecto

Primero, necesitamos crear archivos de configuración para Vercel:

**Crear `vercel.json` en la raíz:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/owner/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/pos/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/kitchen/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "apps/admin/package.json",
      "use": "@vercel/next"
    }
  ]
}
```

#### 2.2 Desplegar en Vercel

**Opción A: Desde la Web (Recomendado para empezar)**

1. **Ir a Vercel**: https://vercel.com
2. **Conectar GitHub/GitLab**
3. **Importar el repositorio**
4. **Configurar cada app por separado:**

   **Para Web App (Cliente):**
   - Root Directory: `apps/web`
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
   - Environment Variables:
     ```
     NEXT_PUBLIC_API_URL=https://pro-lomasrico-api.onrender.com
     NEXT_PUBLIC_GOOGLE_MAPS_KEY=[TU_CLAVE]
     NEXT_PUBLIC_SUPABASE_URL=https://xnwbrdnorjafwwyfhysx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU_CLAVE]
     ```

   **Para Owner Panel:**
   - Root Directory: `apps/owner`
   - Framework Preset: Next.js
   - Environment Variables: (las mismas que web)

   **Para POS:**
   - Root Directory: `apps/pos`
   - Framework Preset: Next.js
   - Environment Variables: (las mismas que web)

   **Para Kitchen:**
   - Root Directory: `apps/kitchen`
   - Framework Preset: Next.js
   - Environment Variables: (las mismas que web)

   **Para Admin:**
   - Root Directory: `apps/admin`
   - Framework Preset: Next.js
   - Environment Variables: (las mismas que web)

**Opción B: Desde CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar cada app
cd apps/web
vercel --prod

cd ../owner
vercel --prod

cd ../pos
vercel --prod

cd ../kitchen
vercel --prod

cd ../admin
vercel --prod
```

#### 2.3 Configurar Dominios Personalizados (Opcional)

En Vercel Dashboard → Settings → Domains:
- `lomasrico.cl` → Web App
- `owner.lomasrico.cl` → Owner Panel
- `pos.lomasrico.cl` → POS
- `kitchen.lomasrico.cl` → Kitchen
- `admin.lomasrico.cl` → Admin

---

### FASE 3: Optimizar Backend en Render

#### 3.1 Actualizar Variables de Entorno

En Render Dashboard → API Service → Environment:

```env
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xnwbrdnorjafwwyfhysx.supabase.co:5432/postgres

# JWT
JWT_SECRET=[AUTO_GENERADO]

# Pagos
MERCADOPAGO_ACCESS_TOKEN=[TU_TOKEN]

# Envíos
PEDIDOSYA_TOKEN=[TU_TOKEN]
PEDIDOSYA_API_URL=https://api.pedidosya.com/v1/shippings

# Google
GOOGLE_CLIENT_ID=[TU_CLIENT_ID]

# CORS (Actualizar con las nuevas URLs de Vercel)
ALLOWED_ORIGINS=https://lomasrico.vercel.app,https://owner.lomasrico.vercel.app,https://pos.lomasrico.vercel.app,https://kitchen.lomasrico.vercel.app,https://admin.lomasrico.vercel.app

# Node
NODE_ENV=production
PORT=10000
```

#### 3.2 Actualizar CORS en el Backend

Editar `apps/api/src/main.ts` para permitir las nuevas URLs:

```typescript
app.enableCors({
  origin: [
    'https://lomasrico.vercel.app',
    'https://owner.lomasrico.vercel.app',
    'https://pos.lomasrico.vercel.app',
    'https://kitchen.lomasrico.vercel.app',
    'https://admin.lomasrico.vercel.app',
    // Mantener las de Render por si acaso
    'https://pro-lomasrico-web.onrender.com',
    'https://pro-lomasrico-owner.onrender.com',
    'https://pro-lomasrico-pos.onrender.com',
  ],
  credentials: true,
});
```

---

## 🔧 Configuración Avanzada

### Monorepo en Vercel

Como tienen un monorepo con workspaces, necesitan configurar correctamente el build:

**Crear `apps/web/vercel.json`:**
```json
{
  "buildCommand": "cd ../.. && npm install && npm run build --workspace=@lomasrico/shared-types && npm run build --workspace=web",
  "installCommand": "cd ../.. && npm install"
}
```

Repetir para cada app (`owner`, `pos`, `kitchen`, `admin`).

### Optimización de Build

**Crear `.vercelignore` en la raíz:**
```
node_modules
.git
*.log
.env*
!.env.example
apps/api
packages/database
infra
scripts
*.md
!README.md
```

---

## 📊 Comparación de Costos

| Servicio | Plan Actual (Render) | Plan Nuevo | Costo Mensual |
|----------|---------------------|------------|---------------|
| **Frontend** | Render Free (5 apps) | Vercel Free | $0 |
| **Backend** | Render Free | Render Free | $0 |
| **Database** | Render Postgres ($7/mes) | Supabase Free | $0 |
| **Storage** | Supabase Free | Supabase Free | $0 |
| **TOTAL** | ~$7/mes | **$0/mes** | **AHORRO: $7/mes** |

### Límites del Plan Gratuito

**Vercel Free:**
- 100 GB bandwidth/mes
- Unlimited deployments
- Automatic HTTPS
- Edge Network

**Supabase Free:**
- 500 MB Database
- 1 GB Storage
- 2 GB Bandwidth
- 50,000 Monthly Active Users

**Render Free:**
- 750 horas/mes
- Auto-sleep después de 15 min de inactividad
- 512 MB RAM

---

## 🚨 Consideraciones Importantes

### 1. Auto-Sleep en Render (Backend)

El plan gratuito de Render pone el servicio en sleep después de 15 minutos de inactividad.

**Soluciones:**

**A) Mantener el servicio activo (Gratis):**
```bash
# Usar un servicio de ping como UptimeRobot o Cron-Job.org
# Hacer ping cada 10 minutos a:
https://pro-lomasrico-api.onrender.com/health
```

**B) Upgrade a plan pagado ($7/mes):**
- Sin auto-sleep
- 512 MB RAM garantizada
- Mejor para producción real

### 2. Migración de Datos

**IMPORTANTE:** Hacer backup completo antes de migrar:

```bash
# Backup de Render
pg_dump -h dpg-xxxxx.oregon-postgres.render.com -U lomasrico_user -d lomasrico > backup_$(date +%Y%m%d).sql

# Backup de archivos locales
zip -r backup_assets.zip apps/owner/public/assets/
```

### 3. Testing Post-Migración

Checklist de pruebas:

- [ ] Login funciona en todas las apps
- [ ] Imágenes cargan desde Supabase
- [ ] Crear nuevo producto
- [ ] Crear nueva venta
- [ ] Actualizar inventario
- [ ] Ver reportes
- [ ] Procesar pedido en cocina
- [ ] Integración con MercadoPago
- [ ] Integración con PedidosYa

---

## 🎬 Orden de Ejecución Recomendado

### Día 1: Preparación
1. ✅ Hacer backup completo de DB y archivos
2. ✅ Crear cuenta en Vercel (si no la tienen)
3. ✅ Revisar que Supabase esté configurado correctamente

### Día 2: Migración de Base de Datos
1. ✅ Exportar datos de Render
2. ✅ Importar a Supabase
3. ✅ Verificar que los datos estén completos
4. ✅ Actualizar DATABASE_URL en Render
5. ✅ Probar que el backend funcione con la nueva DB

### Día 3: Despliegue en Vercel
1. ✅ Conectar repositorio a Vercel
2. ✅ Desplegar Web App
3. ✅ Desplegar Owner Panel
4. ✅ Desplegar POS
5. ✅ Desplegar Kitchen
6. ✅ Desplegar Admin
7. ✅ Configurar variables de entorno en cada app

### Día 4: Integración y Testing
1. ✅ Actualizar CORS en el backend
2. ✅ Actualizar NEXT_PUBLIC_API_URL en Vercel
3. ✅ Probar todas las funcionalidades
4. ✅ Configurar dominios personalizados (opcional)

### Día 5: Monitoreo
1. ✅ Configurar UptimeRobot para el backend
2. ✅ Revisar logs en Vercel y Render
3. ✅ Documentar URLs finales
4. ✅ Celebrar 🎉

---

## 📞 Troubleshooting

### Problema: "Module not found" en Vercel

**Solución:**
```json
// En apps/web/package.json (y en cada app)
{
  "dependencies": {
    "@lomasrico/shared-types": "*"
  }
}
```

### Problema: Build falla por falta de dependencias

**Solución:**
Asegurarse de que el `installCommand` instale desde la raíz:
```json
{
  "installCommand": "cd ../.. && npm install"
}
```

### Problema: CORS errors

**Solución:**
Verificar que las URLs en `ALLOWED_ORIGINS` coincidan exactamente con las de Vercel (sin trailing slash).

### Problema: Imágenes no cargan

**Solución:**
Verificar que las políticas RLS en Supabase Storage estén configuradas:
```sql
-- En Supabase SQL Editor
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'assets');
```

---

## 🔐 Seguridad

### Variables de Entorno Sensibles

**NUNCA** commitear:
- `DATABASE_URL`
- `JWT_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `PEDIDOSYA_TOKEN`
- `GOOGLE_CLIENT_ID`

Usar siempre los dashboards de Vercel y Render para configurarlas.

### HTTPS

- ✅ Vercel: HTTPS automático
- ✅ Render: HTTPS automático
- ✅ Supabase: HTTPS automático

---

## 📚 Recursos Útiles

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Render Docs**: https://render.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment

---

## ✅ Checklist Final

### Pre-Migración
- [ ] Backup de base de datos
- [ ] Backup de archivos
- [ ] Lista de todas las variables de entorno
- [ ] Acceso a todas las cuentas (Vercel, Supabase, Render)

### Post-Migración
- [ ] Todas las apps desplegadas en Vercel
- [ ] Backend funcionando en Render
- [ ] Base de datos migrada a Supabase
- [ ] CORS configurado correctamente
- [ ] Variables de entorno configuradas
- [ ] Testing completo realizado
- [ ] Monitoreo configurado
- [ ] Documentación actualizada

---

**Última actualización**: 4 de febrero de 2026
**Estado**: 📋 Guía lista para ejecutar
