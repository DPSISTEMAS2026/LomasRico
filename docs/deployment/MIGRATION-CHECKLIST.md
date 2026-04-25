# ✅ Checklist de Migración a Producción

## 📅 Planificación

### Semana 1: Preparación
- [ ] Revisar la guía completa de despliegue (`DEPLOYMENT-GUIDE.md`)
- [ ] Revisar las variables de entorno necesarias (`ENV_VARIABLES.md`)
- [ ] Crear cuenta en Vercel (https://vercel.com)
- [ ] Verificar acceso a Supabase Dashboard
- [ ] Verificar acceso a Render Dashboard
- [ ] Obtener todas las credenciales necesarias:
  - [ ] Google Maps API Key
  - [ ] MercadoPago Access Token
  - [ ] PedidosYa Token
  - [ ] Google OAuth Client ID (opcional)

### Semana 2: Backup y Migración de Base de Datos
- [ ] Hacer backup de la base de datos actual de Render
  - [ ] Ejecutar script: `.\scripts\backup-render-db.ps1`
  - [ ] Verificar que el archivo de backup se creó correctamente
  - [ ] Guardar backup en un lugar seguro (Google Drive, Dropbox, etc.)
- [ ] Preparar Supabase para recibir los datos
  - [ ] Verificar que el proyecto de Supabase esté activo
  - [ ] Obtener la Connection String de Supabase
- [ ] Migrar datos a Supabase
  - [ ] Ejecutar script: `.\scripts\restore-to-supabase.ps1 [archivo_backup]`
  - [ ] Verificar que los datos se importaron correctamente
  - [ ] Revisar tablas en Supabase Dashboard
- [ ] Actualizar DATABASE_URL en Render
  - [ ] Ir a Render Dashboard → API Service → Environment
  - [ ] Actualizar `DATABASE_URL` con la URL de Supabase
  - [ ] Guardar cambios y esperar a que el servicio se reinicie
- [ ] Probar que el backend funcione con la nueva base de datos
  - [ ] Abrir https://pro-lomasrico-api.onrender.com/health
  - [ ] Verificar que responda correctamente
  - [ ] Probar endpoints críticos (productos, ventas, etc.)

### Semana 3: Despliegue en Vercel
- [ ] Preparar el repositorio
  - [ ] Hacer commit de los archivos de configuración creados
  - [ ] Push a GitHub/GitLab
- [ ] Conectar repositorio a Vercel
  - [ ] Ir a https://vercel.com/new
  - [ ] Importar el repositorio
- [ ] Desplegar Web App (Cliente)
  - [ ] Root Directory: `apps/web`
  - [ ] Framework: Next.js
  - [ ] Configurar variables de entorno (ver `ENV_VARIABLES.md`)
  - [ ] Deploy
  - [ ] Verificar que la app funcione correctamente
  - [ ] URL: https://[tu-proyecto].vercel.app
- [ ] Desplegar Owner Panel
  - [ ] Root Directory: `apps/owner`
  - [ ] Framework: Next.js
  - [ ] Configurar variables de entorno
  - [ ] Deploy
  - [ ] Verificar funcionalidad
- [ ] Desplegar POS
  - [ ] Root Directory: `apps/pos`
  - [ ] Framework: Next.js
  - [ ] Configurar variables de entorno
  - [ ] Deploy
  - [ ] Verificar funcionalidad
- [ ] Desplegar Kitchen
  - [ ] Root Directory: `apps/kitchen`
  - [ ] Framework: Next.js
  - [ ] Configurar variables de entorno
  - [ ] Deploy
  - [ ] Verificar funcionalidad
- [ ] Desplegar Admin
  - [ ] Root Directory: `apps/admin`
  - [ ] Framework: Next.js
  - [ ] Configurar variables de entorno
  - [ ] Deploy
  - [ ] Verificar funcionalidad

### Semana 4: Integración y Testing
- [ ] Actualizar CORS en el backend
  - [ ] Editar `apps/api/src/main.ts`
  - [ ] Agregar URLs de Vercel a `ALLOWED_ORIGINS`
  - [ ] Commit y push
  - [ ] Esperar a que Render redesplegue automáticamente
- [ ] Testing completo de cada aplicación
  - [ ] **Web App (Cliente)**
    - [ ] Cargar el catálogo
    - [ ] Agregar productos al carrito
    - [ ] Configurar productos (ceviches con proteínas)
    - [ ] Ingresar dirección de entrega (Google Maps)
    - [ ] Calcular costo de envío (PedidosYa)
    - [ ] Procesar pago (MercadoPago)
    - [ ] Verificar que la orden llegue a cocina
  - [ ] **Owner Panel**
    - [ ] Login
    - [ ] Ver dashboard con métricas
    - [ ] Gestionar catálogo (crear, editar, eliminar productos)
    - [ ] Subir imágenes a Supabase
    - [ ] Gestionar inventario (crear insumos, reponer stock)
    - [ ] Configurar recetas (agregar ingredientes, calcular costos)
    - [ ] Ver reportes de ventas
    - [ ] Gestionar pedidos en cocina
    - [ ] Configurar logística de despacho
  - [ ] **POS**
    - [ ] Cargar productos
    - [ ] Crear venta
    - [ ] Seleccionar productos configurables
    - [ ] Generar pedido
    - [ ] Verificar que se actualice el inventario
  - [ ] **Kitchen**
    - [ ] Ver pedidos entrantes
    - [ ] Mover pedidos entre estados (Entrante → Preparación → Listo → Completado)
    - [ ] Verificar actualización en tiempo real
  - [ ] **Admin**
    - [ ] Login
    - [ ] Ver métricas generales
    - [ ] Gestionar usuarios (si aplica)
    - [ ] Configuración del sistema
- [ ] Testing de integraciones
  - [ ] **Supabase Storage**
    - [ ] Subir imagen desde Owner Panel
    - [ ] Verificar que se guarde en Supabase
    - [ ] Verificar que se muestre en Web App
  - [ ] **MercadoPago**
    - [ ] Crear orden de prueba
    - [ ] Procesar pago
    - [ ] Verificar webhook de confirmación
    - [ ] Verificar que la orden se marque como pagada
  - [ ] **PedidosYa**
    - [ ] Calcular costo de envío
    - [ ] Crear envío
    - [ ] Verificar tracking
  - [ ] **Google Maps**
    - [ ] Autocompletado de direcciones
    - [ ] Geocodificación
    - [ ] Cálculo de distancia

### Semana 5: Configuración Avanzada
- [ ] Configurar dominios personalizados (opcional)
  - [ ] Comprar dominio (ej: lomasrico.cl)
  - [ ] Configurar DNS en Vercel
  - [ ] Asignar subdominios:
    - [ ] `lomasrico.cl` → Web App
    - [ ] `owner.lomasrico.cl` → Owner Panel
    - [ ] `pos.lomasrico.cl` → POS
    - [ ] `kitchen.lomasrico.cl` → Kitchen
    - [ ] `admin.lomasrico.cl` → Admin
  - [ ] Actualizar variables de entorno con nuevos dominios
  - [ ] Actualizar CORS en el backend
- [ ] Configurar monitoreo
  - [ ] Crear cuenta en UptimeRobot (https://uptimerobot.com)
  - [ ] Agregar monitor para el backend:
    - [ ] URL: https://pro-lomasrico-api.onrender.com/health
    - [ ] Intervalo: 10 minutos
    - [ ] Notificaciones: Email
  - [ ] Agregar monitores para cada frontend (opcional)
- [ ] Configurar analytics (opcional)
  - [ ] Google Analytics
  - [ ] Vercel Analytics
  - [ ] Mixpanel / Amplitude
- [ ] Configurar error tracking (opcional)
  - [ ] Sentry
  - [ ] LogRocket
  - [ ] Rollbar

---

## 🚨 Troubleshooting

### Problemas Comunes

#### Build falla en Vercel
- [ ] Verificar que las dependencias estén correctamente instaladas
- [ ] Revisar logs de build en Vercel Dashboard
- [ ] Verificar que `package.json` tenga todas las dependencias
- [ ] Verificar que los workspaces estén configurados correctamente

#### CORS errors
- [ ] Verificar que las URLs en `ALLOWED_ORIGINS` coincidan exactamente
- [ ] No incluir trailing slash (`/`) al final de las URLs
- [ ] Verificar que el backend esté desplegado y funcionando
- [ ] Revisar logs del backend en Render

#### Imágenes no cargan
- [ ] Verificar que las políticas RLS en Supabase Storage estén configuradas
- [ ] Verificar que el bucket `assets` sea público
- [ ] Verificar que `NEXT_PUBLIC_SUPABASE_URL` esté correctamente configurado
- [ ] Verificar que `NEXT_PUBLIC_SUPABASE_ANON_KEY` esté correctamente configurado

#### Base de datos no conecta
- [ ] Verificar que `DATABASE_URL` esté correctamente configurado
- [ ] Verificar que la contraseña sea correcta
- [ ] Verificar que Supabase permita conexiones externas
- [ ] Revisar logs del backend en Render

#### MercadoPago no funciona
- [ ] Verificar que `MERCADOPAGO_ACCESS_TOKEN` esté configurado
- [ ] Verificar que sea el token de producción (no de prueba)
- [ ] Verificar que la cuenta de MercadoPago esté activa
- [ ] Revisar logs del backend

#### PedidosYa no funciona
- [ ] Verificar que `PEDIDOSYA_TOKEN` esté configurado
- [ ] Verificar que `PEDIDOSYA_API_URL` sea correcta
- [ ] Verificar que el token no haya expirado
- [ ] Contactar soporte de PedidosYa si es necesario

---

## 📊 Métricas de Éxito

### Post-Despliegue
- [ ] Todas las apps están desplegadas y accesibles
- [ ] Todas las funcionalidades críticas funcionan
- [ ] No hay errores en los logs
- [ ] Tiempo de carga < 3 segundos
- [ ] Uptime > 99%

### Primera Semana
- [ ] Al menos 10 pedidos procesados exitosamente
- [ ] Al menos 5 pagos procesados con MercadoPago
- [ ] Al menos 3 envíos coordinados con PedidosYa
- [ ] Cero downtime no planificado
- [ ] Feedback positivo de usuarios

### Primer Mes
- [ ] 100+ pedidos procesados
- [ ] 50+ pagos procesados
- [ ] 30+ envíos coordinados
- [ ] Uptime > 99.5%
- [ ] Tiempo de respuesta promedio < 500ms

---

## 📝 Notas

### Fecha de inicio de migración:
_______________________

### Fecha estimada de finalización:
_______________________

### Responsables:
- Migración de DB: _______________________
- Despliegue Frontend: _______________________
- Testing: _______________________
- Monitoreo: _______________________

### Notas adicionales:
_______________________
_______________________
_______________________

---

**Última actualización**: 4 de febrero de 2026
**Estado**: 📋 Listo para ejecutar
