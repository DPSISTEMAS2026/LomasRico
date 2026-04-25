# ✅ CONFIGURACIÓN COMPLETADA

**Fecha**: 5 de febrero de 2026

---

## 🔧 Cambios Realizados

### 1. Scripts de npm Agregados
**Archivo**: `package.json`

Se agregaron scripts individuales para ejecutar cada aplicación por separado:

```json
"dev:api": "npm run dev -w apps/api",
"dev:owner": "npm run dev -w apps/owner",
"dev:kitchen": "npm run dev -w apps/kitchen",
"dev:pos": "npm run dev -w apps/pos",
"dev:web": "npm run dev -w apps/web",
"dev:admin": "npm run dev -w apps/admin"
```

### 2. Archivo .env Creado
**Archivo**: `.env`

Configuración para desarrollo local:
- ✅ DATABASE_URL apuntando a Docker (postgres:password@localhost:5432/lomasricodb)
- ✅ JWT_SECRET para desarrollo
- ✅ SUPABASE_URL y ANON_KEY (de producción, solo para storage)
- ✅ NEXT_PUBLIC_API_URL apuntando a localhost:3001
- ✅ CORS configurado para localhost

### 3. Guía de Inicio Rápido
**Archivo**: `QUICK-START.md`

Guía paso a paso para:
- Levantar base de datos con Docker
- Configurar Prisma
- Ejecutar las aplicaciones
- Troubleshooting común

---

## 🚀 CÓMO EMPEZAR AHORA

### Paso 1: Levantar Base de Datos
```powershell
npm run db:up
```

### Paso 2: Configurar Prisma
```powershell
cd packages/database
npx prisma generate
npx prisma db push
cd ../..
```

### Paso 3: Ejecutar Aplicaciones

**Terminal 1**:
```powershell
npm run dev:api
```

**Terminal 2**:
```powershell
npm run dev:owner
```

**Terminal 3**:
```powershell
npm run dev:kitchen
```

---

## 📋 URLs

Una vez que todo esté corriendo:

- 🔧 **API**: http://localhost:3001
- 👔 **Owner Panel**: http://localhost:3000
- 👨‍🍳 **Kitchen**: http://localhost:3003
- 💰 **POS**: http://localhost:3002

---

## ⚠️ IMPORTANTE

### Si el puerto 5432 está ocupado

Significa que ya tienes PostgreSQL corriendo localmente. Tienes 2 opciones:

**Opción A**: Usar tu PostgreSQL local (más fácil)
1. Editar `.env`:
   ```
   DATABASE_URL="postgresql://postgres:tu-password@localhost:5432/lomasrico_dev?schema=public"
   ```
2. Crear la base de datos:
   ```powershell
   psql -U postgres -c "CREATE DATABASE lomasrico_dev;"
   ```
3. Aplicar schema:
   ```powershell
   cd packages/database
   npx prisma db push
   ```

**Opción B**: Detener PostgreSQL local y usar Docker
- Windows: Services > PostgreSQL > Stop
- Luego ejecutar `npm run db:up`

---

## 🧪 SIGUIENTE PASO

Una vez que las 3 aplicaciones estén corriendo:

1. Abre http://localhost:3000 (Owner Panel)
2. Sigue la guía de testing: `docs/audit/TESTING-GUIDE.md`

---

## 📊 PROGRESO

```
✅ Configuración del entorno: COMPLETADO
✅ Scripts de npm: COMPLETADO
✅ Archivo .env: COMPLETADO
✅ Guías de inicio: COMPLETADO

⏳ SIGUIENTE: Levantar aplicaciones y testing
```

---

**¿Necesitas ayuda?** Revisa `QUICK-START.md` para troubleshooting.
