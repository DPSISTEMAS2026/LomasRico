# 🍽️ Lo Más Rico - Sistema de Gestión de Restaurante

Sistema completo de gestión para restaurante con POS, Cocina, Panel de Administración y Web App.

---

## 📚 Documentación

### 🚀 Inicio Rápido
- **[docs/deployment/START-HERE.md](docs/deployment/START-HERE.md)** - Guía rápida de inicio
- **[docs/development/LOCAL-DEV-GUIDE.md](docs/development/LOCAL-DEV-GUIDE.md)** - Configuración de entorno local

### 🏗️ Arquitectura
- **[docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** - Diagramas y arquitectura del sistema

### 🚢 Despliegue
- **[docs/deployment/DEPLOYMENT-GUIDE.md](docs/deployment/DEPLOYMENT-GUIDE.md)** - Guía completa de migración a producción
- **[docs/deployment/MIGRATION-CHECKLIST.md](docs/deployment/MIGRATION-CHECKLIST.md)** - Checklist paso a paso
- **[docs/deployment/ENV_VARIABLES.md](docs/deployment/ENV_VARIABLES.md)** - Variables de entorno
- **[docs/deployment/PRODUCCION.md](docs/deployment/PRODUCCION.md)** - Información de producción actual

### 🔧 Desarrollo
- **[docs/development/LOCAL-DEV-GUIDE.md](docs/development/LOCAL-DEV-GUIDE.md)** - Guía de desarrollo local
- **[docs/development/.env.local.example](docs/development/.env.local.example)** - Ejemplo de variables de entorno

### 🔍 Auditoría y Correcciones
- **[docs/audit/AUDIT-REPORT.md](docs/audit/AUDIT-REPORT.md)** - Reporte completo de auditoría (38 bugs identificados)
- **[docs/audit/IMPLEMENTATION-PLAN.md](docs/audit/IMPLEMENTATION-PLAN.md)** - Plan de implementación día por día
- **[docs/audit/PROGRESS-DAY-1.md](docs/audit/PROGRESS-DAY-1.md)** - Progreso del Día 1 (6 bugs corregidos)

### 📖 Guías
- **[docs/guides/POWERSHELL-GUIDE.md](docs/guides/POWERSHELL-GUIDE.md)** - Guía de PowerShell y permisos
- **[docs/guides/INSTRUCCIONES_CREDENCIALES.md](docs/guides/INSTRUCCIONES_CREDENCIALES.md)** - Configuración de credenciales

---

## 🏃 Ejecutar en Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp docs/development/.env.local.example .env.local
# Editar .env.local con tus valores

# 3. Configurar base de datos
cd packages/database
npx prisma generate
npx prisma db push
cd ../..

# 4. Ejecutar todo
npm run dev
```

**URLs Locales:**
- API: http://localhost:3001
- Owner Panel: http://localhost:3000
- POS: http://localhost:3002
- Kitchen: http://localhost:3003
- Web App: http://localhost:3004
- Admin: http://localhost:3005

---

## 📊 Estado del Proyecto

### ✅ Bugs Corregidos (Día 1)
- ✅ Bug #1: Productos no se guardan correctamente
- ✅ Bug #2: Recetas no se guardan - falta campo `role`
- ✅ Bug #3: Recetas no cargan el `role` al editar
- ✅ Bug #4: No se puede asignar `role` en la UI
- ✅ Bug #5: Autenticación - Prisma Client regenerado
- ✅ Bug #10: Campo `baseWeight` no se guarda

### 🔄 En Progreso (Día 2)
- [ ] Bug #6: Pedidos no entran a cocina
- [ ] Bug #7: Detalles de preparación no se ven en cocina

### ⏳ Pendientes
- 12 bugs críticos restantes
- Ver [docs/audit/AUDIT-REPORT.md](docs/audit/AUDIT-REPORT.md) para detalles

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: Supabase Storage
- **Deployment**: Vercel (Frontend) + Render (Backend)

---

## 📞 Soporte

Para más información, consulta la documentación en la carpeta `docs/`.
