# 🛠️ Guía de Desarrollo Local

Esta guía te ayudará a configurar y ejecutar el proyecto completo en tu máquina local.

---

## 📋 Prerrequisitos

- ✅ Node.js v24.13.0 (instalado)
- ✅ npm 11.6.2 (instalado)
- ⚠️ PostgreSQL 14+ (necesario instalar)
- ⚠️ Git (verificar instalación)

---

## 🚀 Configuración Inicial

### 1. Instalar PostgreSQL Local

**Opción A: PostgreSQL Nativo**
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# Instalar con configuración por defecto
# Usuario: postgres
# Password: postgres (o el que prefieras)
# Puerto: 5432
```

**Opción B: Docker (Recomendado)**
```bash
docker run --name lomasrico-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lomasrico_dev -p 5432:5432 -d postgres:14
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.local.example .env.local

# Editar .env.local con tus valores
# Mínimo necesario:
# - DATABASE_URL
# - JWT_SECRET
# - NEXT_PUBLIC_API_URL
```

### 3. Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm install
```

### 4. Configurar Base de Datos

```bash
# Generar Prisma Client
cd packages/database
npx prisma generate

# Crear las tablas
npx prisma db push

# (Opcional) Seed con datos de prueba
npx prisma db seed

cd ../..
```

---

## 🏃 Ejecutar en Desarrollo

### Opción 1: Ejecutar Todo (Recomendado)

```bash
# Desde la raíz
npm run dev
```

Esto iniciará:
- 🔧 API Backend en `http://localhost:3001`
- 🏪 Owner Panel en `http://localhost:3000`
- 💻 POS en `http://localhost:3002`
- 👨‍🍳 Kitchen en `http://localhost:3003`
- 🌐 Web App en `http://localhost:3004`
- 👑 Admin en `http://localhost:3005`

### Opción 2: Ejecutar Servicios Individuales

```bash
# Solo API
npm run dev:api

# Solo Owner Panel
npm run dev:owner

# Solo POS
npm run dev:pos

# Solo Kitchen
npm run dev:kitchen

# Solo Web
npm run dev:web

# Solo Admin
npm run dev:admin
```

---

## 🔧 Comandos Útiles

### Base de Datos

```bash
# Ver la base de datos en Prisma Studio
npm run studio

# Resetear la base de datos (⚠️ BORRA TODO)
cd packages/database
npx prisma migrate reset

# Crear una migración
npx prisma migrate dev --name nombre_de_la_migracion

# Aplicar migraciones
npx prisma migrate deploy
```

### Desarrollo

```bash
# Limpiar y reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Limpiar caché de Next.js
rm -rf apps/*/.next

# Verificar errores de TypeScript
npm run type-check

# Ejecutar linter
npm run lint
```

---

## 📊 Verificar que Todo Funciona

### 1. Backend API

```bash
# Verificar que la API responde
curl http://localhost:3001/health

# Debería retornar: {"status":"ok"}
```

### 2. Base de Datos

```bash
# Abrir Prisma Studio
npm run studio

# Verificar que hay tablas creadas
# Debería ver: SellingProduct, Recipe, InventoryItem, etc.
```

### 3. Frontend

```bash
# Abrir en el navegador
http://localhost:3000  # Owner Panel
http://localhost:3002  # POS
http://localhost:3003  # Kitchen
http://localhost:3004  # Web App
http://localhost:3005  # Admin
```

---

## 🐛 Solución de Problemas

### Error: "Cannot find module '@lomasrico/database'"

```bash
cd packages/database
npx prisma generate
npm run build
cd ../..
npm install
```

### Error: "Port 3001 already in use"

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# O cambiar el puerto en .env.local
PORT=3002
```

### Error: "Database connection failed"

```bash
# Verificar que PostgreSQL está corriendo
# Windows: Services > PostgreSQL

# Verificar la URL en .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lomasrico_dev?schema=public"
```

### Error: "Prisma Client not generated"

```bash
cd packages/database
npx prisma generate
cd ../..
```

---

## 📝 Workflow de Desarrollo

### 1. Antes de Empezar a Trabajar

```bash
# Actualizar código
git pull origin main

# Instalar dependencias nuevas
npm install

# Aplicar migraciones
cd packages/database
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 2. Durante el Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# En otra terminal, ver logs de la base de datos
npm run studio
```

### 3. Antes de Hacer Commit

```bash
# Verificar que no hay errores de TypeScript
npm run type-check

# Ejecutar linter
npm run lint

# Probar que todo funciona
# - Crear un producto
# - Crear una receta
# - Hacer una venta
# - Ver en cocina
```

---

## 🔄 Sincronizar con Producción

### Hacer Backup de Producción

```bash
# Usar el script de backup
.\scripts\backup-render-db.ps1
```

### Restaurar en Local

```bash
# Restaurar el backup en local
psql -U postgres -d lomasrico_dev < backup.sql
```

---

## 📚 Recursos

- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **NestJS Docs**: https://docs.nestjs.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

## ✅ Checklist de Configuración

- [ ] PostgreSQL instalado y corriendo
- [ ] Variables de entorno configuradas (.env.local)
- [ ] Dependencias instaladas (npm install)
- [ ] Prisma Client generado (npx prisma generate)
- [ ] Base de datos creada (npx prisma db push)
- [ ] API corriendo en http://localhost:3001
- [ ] Owner Panel corriendo en http://localhost:3000
- [ ] Puedo crear un producto
- [ ] Puedo crear una receta
- [ ] Puedo hacer una venta

---

**¡Listo para desarrollar! 🚀**

