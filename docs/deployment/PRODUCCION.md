# 🚀 SISTEMA LO MÁS RICO - PRODUCCIÓN

## 📋 URLs del Sistema

### Aplicaciones Desplegadas
- **Owner Panel**: https://pro-lomasrico-owner.onrender.com
- **POS (Punto de Venta)**: https://pro-lomasrico-pos.onrender.com
- **API Backend**: https://pro-lomasrico-api.onrender.com

### Servicios Externos
- **Supabase Dashboard**: https://supabase.com/dashboard/project/xnwbrdnorjafwwyfhysx
- **Render Dashboard**: https://dashboard.render.com

---

## 🔐 Credenciales de Producción

### Supabase (Storage de Imágenes)
```
NEXT_PUBLIC_SUPABASE_URL=https://xnwbrdnorjafwwyfhysx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud2JyZG5vcmphZnd3eWZoeXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDI3NDQsImV4cCI6MjA4NTMxODc0NH0.eWDp2G1wRlc_L5Tc87N0W6jUj4BodLamcRiWgYvbmLs
```

**Bucket configurado**: `assets` (público)
- **117 imágenes migradas** desde `apps/owner/public/assets/`
- Políticas RLS configuradas para INSERT y SELECT públicos

### Base de Datos (PostgreSQL en Render)
```
DATABASE_URL=postgresql://lomasrico_user:XXXXXXXXX@dpg-xxxxx.oregon-postgres.render.com/lomasrico
```
*(La URL completa está en las variables de entorno de Render)*

---

## 📊 Funcionalidades del Sistema

### ✅ Owner Panel (`/`)
- **Dashboard**: Métricas y KPIs en tiempo real
- **Catálogo** (`/catalog`): Gestión de productos con galería Supabase
- **Inventario** (`/inventory`): Control de insumos, reposición, alertas de stock
- **Recetas** (`/recipes`): Ingeniería de productos, costos, márgenes
- **Reportes** (`/reports`): Análisis de ventas, gráficos, tendencias
- **Pedidos/Cocina** (`/orders`): Flujo Kanban de comandas en tiempo real
- **Configuración** (`/settings`): Logística de despacho (PedidosYa/Interno)

### ✅ POS (Punto de Venta)
- Sistema de ventas con carrito
- Selección de productos configurables (ceviches con proteínas)
- Integración con inventario
- Generación de pedidos

### ✅ API Backend
- NestJS con PostgreSQL
- Endpoints para productos, ventas, inventario, recetas
- CORS configurado para permitir conexiones desde Owner y POS
- Integración con PedidosYa (configuración de despacho)

---

## 🗂️ Datos Persistentes

El sistema almacena permanentemente:
- ✅ **Clientes** (ID único, datos de contacto)
- ✅ **Ventas** (historial completo con items, totales, fechas)
- ✅ **Productos** (catálogo con precios, descripciones, imágenes)
- ✅ **Inventario** (stock actual, costos, alertas)
- ✅ **Recetas** (composición de productos, ingredientes, cantidades)
- ✅ **Imágenes** (Supabase Storage - no requiere deploy para actualizar)

---

## 🔄 Flujo de Trabajo

### Subir Imágenes
1. Ir a `/catalog` en Owner Panel
2. Editar un producto
3. Hacer clic en "Seleccionar Archivo" o "Galería de Supabase"
4. **No requiere deploy** - se actualiza instantáneamente

### Gestionar Inventario
1. Ir a `/inventory`
2. Crear nuevos insumos con "+ Nuevo Insumo"
3. Registrar compras con "Reponer"
4. El sistema calcula automáticamente el Precio Medio Ponderado (PMP)

### Configurar Recetas
1. Ir a `/recipes`
2. Seleccionar un producto o crear una base
3. Agregar ingredientes del inventario
4. El sistema calcula costos y márgenes automáticamente

### Procesar Pedidos
1. Ir a `/orders` (Cocina)
2. Los pedidos fluyen automáticamente: Entrante → Preparación → Listo → Completado
3. Actualizar estado con los botones de cada tarjeta

---

## 🛠️ Mantenimiento

### Actualizar Código
```bash
git pull origin main
# Render detecta automáticamente y redespliega
```

### Ver Logs
- Ir a Render Dashboard → Seleccionar servicio → Pestaña "Logs"

### Reiniciar Servicios
- Render Dashboard → Manual Deploy → "Clear build cache & deploy"

---

## 📞 Soporte

Si algo no funciona:
1. Verificar que las variables de entorno estén configuradas en Render
2. Revisar los logs en Render Dashboard
3. Verificar que la base de datos esté activa
4. Confirmar que Supabase Storage tenga las políticas RLS correctas

---

**Última actualización**: 31 de enero de 2026
**Estado del sistema**: ✅ Operativo en producción
