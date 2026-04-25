# 🚀 GUÍA RÁPIDA - LEVANTAR SERVIDORES

## ⚠️ REQUISITO PREVIO: BASE DE DATOS

Antes de iniciar los servidores, **DEBES** tener una base de datos PostgreSQL configurada.

### Opción 1: Docker (Recomendado)
```bash
# Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/
# Luego ejecuta:
cd infra/local
docker-compose up -d
```

### Opción 2: PostgreSQL Local
- Instala PostgreSQL en tu máquina
- Crea una base de datos llamada `lomasricodb`
- Actualiza `.env` con tu conexión:
  ```
  DATABASE_URL="postgresql://usuario:password@localhost:5432/lomasricodb?schema=public"
  ```

### Opción 3: Base de Datos Remota (Render/Supabase)
- Usa una base de datos PostgreSQL en la nube
- Actualiza `.env` con la URL de conexión

---

## 🎯 INICIAR SERVIDORES

### Método 1: Script Automático (Recomendado)

Simplemente ejecuta:

```bash
.\start-servers.bat
```

Este script:
1. ✅ Genera Prisma Client
2. ✅ Compila el package de database
3. ✅ Inicia API en puerto 3001
4. ✅ Inicia POS en puerto 3002
5. ✅ Inicia Kitchen en puerto 3003
6. ✅ Inicia Owner en puerto 3000

Cada servidor se abrirá en una ventana CMD separada.

---

### Método 2: Manual (Paso a Paso)

#### 1. Preparar Prisma
```bash
cd packages/database
npx prisma generate
npm run build
cd ../..
```

#### 2. Iniciar API (Terminal 1)
```bash
npm run dev:api
```
Espera a ver: `🚀 API running on http://localhost:3001`

#### 3. Iniciar POS (Terminal 2)
```bash
npm run dev:pos
```

#### 4. Iniciar Kitchen (Terminal 3)
```bash
npm run dev:kitchen
```

#### 5. Iniciar Owner (Terminal 4)
```bash
npm run dev:owner
```

---

## 📍 URLs DE ACCESO

Una vez iniciados, accede a:

- **API**: http://localhost:3001
- **POS**: http://localhost:3002 (PIN: 0000)
- **Kitchen**: http://localhost:3003
- **Owner**: http://localhost:3000
- **Web**: http://localhost:3004 (opcional)

---

## 🧪 TESTING RÁPIDO

### 1. Verificar API
Abre en el navegador: http://localhost:3001/health
Deberías ver: `{"status":"ok"}`

### 2. Probar POS
1. Abre: http://localhost:3002
2. Ingresa PIN: `0000`
3. Selecciona un producto
4. Agrégalo al carrito
5. Finaliza la venta

### 3. Verificar Kitchen
1. Abre: http://localhost:3003
2. Deberías ver el pedido que hiciste en POS
3. Cambia su estado a "Preparando"

---

## ❌ SOLUCIÓN DE PROBLEMAS

### Error: "Cannot connect to database"
- ✅ Verifica que PostgreSQL esté corriendo
- ✅ Verifica que `DATABASE_URL` en `.env` sea correcta
- ✅ Ejecuta: `npx prisma db push` para crear las tablas

### Error: "Port 3001 already in use"
- ✅ Cierra cualquier proceso usando ese puerto
- ✅ En Windows: `netstat -ano | findstr :3001`
- ✅ Mata el proceso: `taskkill /PID <numero> /F`

### Error: "Prisma Client not generated"
```bash
cd packages/database
npx prisma generate
npm run build
```

### Error: "Module not found"
```bash
npm install
```

---

## 🛑 DETENER SERVIDORES

- **Script automático**: Cierra cada ventana CMD
- **Manual**: Presiona `Ctrl+C` en cada terminal

---

## 📊 VERIFICAR QUE TODO FUNCIONA

1. ✅ API responde en http://localhost:3001/health
2. ✅ POS carga el catálogo
3. ✅ Kitchen muestra "No hay pedidos pendientes"
4. ✅ Owner muestra el dashboard

Si todo lo anterior funciona, **¡el sistema está listo!** 🎉

---

## 🆘 AYUDA ADICIONAL

Si tienes problemas, revisa:
- `docs/audit/TESTING-GUIDE.md` - Guía completa de testing
- `QUICK-START.md` - Guía de inicio rápido
- `LOCAL-DEV-GUIDE.md` - Guía de desarrollo local

O contacta al equipo de desarrollo.
