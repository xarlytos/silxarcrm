# Sprint 0: Fundacion y Autenticacion

**Duracion estimada:** 2 semanas  
**Objetivo:** Tener un proyecto funcional con autenticacion, multi-tenant basico y estructura de carpetas lista para desarrollar features de negocio.

---

## 0.1 Setup del Monorepo

### Tareas
- [ ] Crear estructura de carpetas:
  ```
  groomlyproyecto/
  ├── groomly-backend/
  ├── groomly-web/           (React + Vite)
  ├── groomly-landing/       (Next.js - landing publica)
  └── docs/
  ```
- [ ] Inicializar `groomly-backend` con:
  - Node.js 20+, TypeScript, Express
  - Prisma ORM con SQLite (dev)
  - Zod para validacion
  - JWT (jose), Argon2id
  - Helmet, CORS, Morgan, express-rate-limit
  - Vitest para testing
- [ ] Inicializar `groomly-web` con:
  - React 19, Vite, TypeScript
  - Tailwind CSS 4
  - React Router 7
  - Zustand, React Query (@tanstack/react-query)
  - shadcn/ui init
- [ ] Inicializar `groomly-landing` con:
  - Next.js, Tailwind CSS
- [ ] Configurar CORS entre backend y frontend
- [ ] Script `npm run dev` en cada proyecto

### Entregable
Los 3 proyectos compilan y corren sin errores.

---

## 0.2 Base de Datos: Schema Prisma Base

### Modelos a crear

```prisma
// Identidad global
model User {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String
  firstName        String?
  lastName         String?
  avatarUrl        String?
  emailVerifiedAt  DateTime?
  isPlatformAdmin  Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  salonUsers       SalonUser[]
  verificationTokens VerificationToken[]
  sessions         Session[]
}

model VerificationToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  type      String   // verify-email, reset-password
  expiresAt DateTime
  consumedAt DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Tenant: Peluqueria
model Salon {
  id                 String   @id @default(cuid())
  name               String
  slug               String   @unique
  plan               String   @default("free") // free, starter, pro, business
  subscriptionStatus String   @default("trial") // trial, active, past_due, canceled
  ownerUserId        String
  stripeCustomerId   String?
  stripeSubscriptionId String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  owner              User     @relation(fields: [ownerUserId], references: [id])
  salonUsers         SalonUser[]
  settings           SalonSettings?
  integrations       Integration[]
  auditLogs          AuditLog[]
}

model SalonSettings {
  id                String   @id @default(cuid())
  salonId           String   @unique
  language          String   @default("es")
  timezone          String   @default("Europe/Madrid")
  currency          String   @default("EUR")
  primaryColor      String?
  logoUrl           String?
  faviconUrl        String?
  openingHours      Json?    // {monday: {open: "09:00", close: "18:00"}, ...}
  bookingSettings   Json?    // {advanceDays: 14, minNoticeHours: 24, slotDuration: 30}
  notificationPrefs Json     @default("{\"email\":true,\"push\":false,\"sms\":false}")
  legalPrivacy      String?
  legalTerms        String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  salon             Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
}

model SalonUser {
  id          String   @id @default(cuid())
  salonId     String
  userId      String
  role        String   // OWNER, MANAGER, GROOMER, RECEPTIONIST, CUSTOMER
  status      String   @default("active") // invited, active, suspended, removed
  permissions Json?    // ["appointments:read", "finance:write"]
  hourlyRate  Decimal? @db.Decimal(10, 2)
  commissionRate Decimal? @db.Decimal(5, 2) // porcentaje ej: 15.00 = 15%
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  salon       Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([salonId, userId])
  @@index([salonId])
  @@index([userId])
}

model Integration {
  id        String   @id @default(cuid())
  salonId   String
  provider  String   // stripe, sendgrid, twilio, google_calendar
  status    String   @default("pending") // pending, connected, error
  config    String?  // cifrado con AES-256-GCM
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  salon     Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId])
}

model AuditLog {
  id        String   @id @default(cuid())
  salonId   String?
  userId    String?
  action    String
  entity    String
  entityId  String?
  meta      Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  salon     Salon?   @relation(fields: [salonId], references: [id], onDelete: SetNull)

  @@index([salonId])
  @@index([createdAt])
}
```

### Tareas
- [ ] Escribir schema Prisma completo
- [ ] Configurar `prisma/seed.ts` con datos minimos
- [ ] Crear migracion inicial
- [ ] Cliente Prisma singleton (`src/lib/prisma.ts`)

### Entregable
`npx prisma migrate dev` funciona y crea la base de datos.

---

## 0.3 Middleware y Pipeline de Request

### Archivos a crear

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/middleware/auth.middleware.ts` | Verificar JWT, inyectar req.user |
| `src/middleware/tenant.middleware.ts` | Verificar X-Salon-Id, inyectar req.tenant |
| `src/middleware/role.middleware.ts` | requireRole(), requirePlatformAdmin |
| `src/middleware/permission.middleware.ts` | requirePermission() |
| `src/middleware/validate.ts` | Validacion Zod de body/query/params |
| `src/middleware/error.middleware.ts` | Error handler global |

### Tareas
- [ ] authMiddleware: extrae Bearer, verifica JWT con jose, busca User en BD
- [ ] tenantMiddleware: lee X-Salon-Id, verifica SalonUser activa, inyecta req.tenant
- [ ] requireRole: OWNER pasa automaticamente, CUSTOMER solo portal
- [ ] requirePermission: evalua JSON array de permisos
- [ ] validate: integra Zod, devuelve 400 con detalles
- [ ] errorHandler: formatea errores, loguea stack en desarrollo
- [ ] rateLimit: 300 req/min general, 30/15min en auth

### Entregable
Toda peticion pasa por el pipeline correctamente.

---

## 0.4 Modulo de Autenticacion Completo

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Registro con email, password, nombre. Opcional: nombre de salon |
| POST | `/api/v1/auth/login` | Login, devuelve JWT + memberships |
| POST | `/api/v1/auth/logout` | Logout (cliente borra token) |
| POST | `/api/v1/auth/forgot-password` | Genera token, envia email (mock) |
| POST | `/api/v1/auth/reset-password` | Valida token, cambia password |
| POST | `/api/v1/auth/verify-email` | Valida token de email |
| POST | `/api/v1/auth/resend-verification` | Reenvia email de verificacion |

### Tareas
- [ ] Register: valida con Zod, hashea con Argon2id, crea User. Si hay nombre de salon, crea Salon + SalonUser OWNER
- [ ] Login: verifica Argon2id, genera JWT, devuelve memberships activas
- [ ] Forgot password: genera token (32 bytes random, hash SHA-256), guarda en VerificationToken
- [ ] Reset password: valida token, hashea nueva password, consume token
- [ ] Verify email: marca emailVerifiedAt, consume token
- [ ] En desarrollo, los emails se loguean en consola (no se envian)

### Entregable
Se puede registrar, loguear, recuperar password via API.

---

## 0.5 Modulo /me y Onboarding

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/me` | Perfil + memberships activos |
| PATCH | `/api/v1/me` | Actualizar nombre/apellido/avatar |
| POST | `/api/v1/me/change-password` | Cambio con password actual |
| GET | `/api/v1/me/sessions` | Historial de logins |
| POST | `/api/v1/onboarding/salon` | Crear primer salon (si no tiene) |

### Tareas
- [ ] GET /me: devuelve User + array de memberships con Salon info
- [ ] PATCH /me: actualiza campos permitidos
- [ ] Change password: verifica actual con Argon2id, hashea nueva
- [ ] Onboarding: crea Salon, SalonUser OWNER, SalonSettings defaults

### Entregable
Usuario puede completar onboarding y tener su primer salon.

---

## 0.6 Frontend: Auth UI + Router

### Pantallas a crear

| Ruta | Componente | Descripcion |
|------|------------|-------------|
| `/login` | LoginPage | Formulario email/password |
| `/register` | RegisterPage | Formulario registro con opcion de crear salon |
| `/forgot-password` | ForgotPasswordPage | Solicitar reset |
| `/reset-password` | ResetPasswordPage | Formulario nueva password (con token en URL) |
| `/verify-email` | VerifyEmailPage | Verificar email (con token en URL) |
| `/onboarding` | OnboardingPage | Crear primer salon si no tiene |
| `/` | DashboardPage | Dashboard principal (protegido) |

### Tareas
- [ ] Layout publico (sin sidebar) para auth
- [ ] Layout protegido con sidebar para app principal
- [ ] Zustand store: authStore con user, token, currentSalon, memberships
- [ ] Hook useAuth: login, register, logout, isAuthenticated
- [ ] Hook useSalon: switchSalon, currentSalon
- [ ] React Query setup con axios interceptors (inyectar X-Salon-Id)
- [ ] Guard de rutas: redirige a /login si no autenticado
- [ ] Persistir token en localStorage
- [ ] Logout limpia todo

### Entregable
Flujo completo: register → onboarding → dashboard funciona en la UI.

---

## 0.7 Panel de Plataforma (Admin)

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/platform/dashboard` | KPIs globales |
| GET | `/api/v1/platform/salons` | Listar peluquerias |
| GET | `/api/v1/platform/salons/:id` | Detalle |
| GET | `/api/v1/platform/users` | Listar usuarios |
| GET | `/api/v1/platform/subscriptions` | Suscripciones |

### Tareas
- [ ] requirePlatformAdmin middleware
- [ ] Dashboard: conteo de salons, users, MRR
- [ ] Listado con paginacion

### Entregable
Usuario con isPlatformAdmin puede acceder a /platform.

---

## Criterios de Aceptacion del Sprint

- [ ] Backend compila y corre en `localhost:3000`
- [ ] Frontend compila y corre en `localhost:5173`
- [ ] Se puede registrar un usuario con salon
- [ ] Se puede loguear y ver dashboard
- [ ] Se puede cambiar de salon si tiene multiples
- [ ] Panel /platform funciona para admins
- [ ] Todos los endpoints protegen con auth + tenant
- [ ] Tests de autenticacion pasan
