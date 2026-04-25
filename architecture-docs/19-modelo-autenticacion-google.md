# MODELO DE AUTENTICACIÓN: GOOGLE SSO & PERSISTENCIA

Este documento define la arquitectura de identidad para clientes y la relación de datos personales en el sistema "Lo Más Rico V2".

## 1. CAPTURA DE DATOS (Google OAuth 2.0)
Se utiliza Google como proveedor de identidad (IDP) único para clientes Web.
- **Datos solicitados**: `email`, `name`, `picture` (opcional para avatar).
- **ID Único**: Se utiliza el `sub` (Subject ID) de Google como identificador de enlace inmutable.

## 2. MODELO DE DATOS EN BASE DE DATOS (Prisma)
El usuario se persiste en una tabla local para centralizar su historial y preferencias.

```prisma
model User {
  id            String    @id @default(uuid())
  googleId      String    @unique // El "sub" de Google
  email         String    @unique
  name          String
  avatarUrl     String?
  role          UserRole  @default(CUSTOMER)
  
  // Relaciones
  addresses     Address[] // Direcciones guardadas por el usuario
  orders        Sale[]    // Historial de pedidos
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Address {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  label       String   // Ej: "Casa", "Trabajo", "Polola"
  street      String
  number      String
  city        String   @default("Concepción")
  isDefault   Boolean  @default(false)
}
```

## 3. FLUJO DE AUTENTICACIÓN POR CANAL

### A. WEB CLIENTE (Checkout & Perfil)
- **Login Opcional**: El cliente puede navegar y armar su carrito como **Invitado**.
- **Punto de Conversión**: Se solicita el login al momento de querer ver el "Historial" o para autocompletar la dirección en el Checkout.
- **Persistencia**: Se emite un JWT (JSON Web Token) de corta duración para sesiones seguras.

### B. POS (Venta Presencial)
- **Modo Identificado**: El cajero puede buscar a un cliente por **Email** o **Nombre** (si ya existe en la DB).
- **Vinculación**: Si un cliente compra en el POS entregando su email, esa venta se vincula automáticamente a su cuenta de Google si decide loguearse en la web después con ese mismo email.

## 4. GESTIÓN DE DIRECCIONES (Reglas Estrictas)
- **NO se importan de Google**: Las API de Google suelen entregar direcciones en formatos incompatibles o incompletos.
- **Creación Local**: El cliente guarda sus direcciones manualmente en su perfil. Estas direcciones son las que se pasan al motor de **PedidosYa Envíos**.
- **Límite**: Un usuario puede guardar hasta 5 direcciones frecuentes.

## 5. ESCENARIO: COMPRA COMO INVITADO (GUEST)
Si el cliente NO inicia sesión:
- **Venta Anónima**: La tabla `Sale` guarda el nombre y dirección de forma plana (sin `userId`).
- **Pérdida de Trazabilidad**: El cliente no podrá ver este pedido en un futuro login, a menos que el sistema realice un "Claim" (reclamo) basado en coincidencia de email.

## 6. CONTRATO DE JWT (Payload)
El token emitido por el API contendrá:
```json
{
  "uid": "uuid-local-123",
  "email": "juan@gmail.com",
  "role": "CUSTOMER",
  "iat": 1700000000,
  "exp": 1700086400
}
```
