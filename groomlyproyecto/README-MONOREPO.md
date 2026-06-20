# Groomly Monorepo

## Estructura

```
groomlyproyecto/
├── apps/
│   ├── web/                    # SPA React 19 + Vite (legacy groomly-web)
│   └── mobile/                 # App React Native + Expo SDK 56
│       ├── app/
│       │   ├── (staff)/        # ERP para personal del salón
│       │   │   ├── _layout.tsx     # Tabs: Inicio, Agenda, Clientes, Mascotas, Más
│       │   │   ├── index.tsx       # Dashboard staff
│       │   │   ├── agenda.tsx
│       │   │   ├── clientes.tsx
│       │   │   ├── mascotas.tsx
│       │   │   └── mas.tsx
│       │   ├── (client)/       # Portal del cliente
│       │   │   ├── _layout.tsx     # Tabs: Inicio, Citas, Mascotas, Perfil
│       │   │   ├── index.tsx       # Dashboard cliente
│       │   │   ├── citas.tsx
│       │   │   ├── mascotas.tsx
│       │   │   └── perfil.tsx
│       │   ├── _layout.tsx     # Root layout (QueryClientProvider, GestureHandler)
│       │   ├── index.tsx       # Splash / redirección según auth
│       │   ├── login.tsx       # Login nativo
│       │   └── register.tsx    # Registro nativo
│       └── src/
│           ├── components/ui/  # Button, Input, Card, Screen
│           ├── stores/         # authStore con SecureStore
│           ├── hooks/          # useAuth, useSalon (wrappers)
│           └── lib/            # API client mobile
├── packages/
│   └── shared/                 # Código compartido entre web y mobile
│       ├── src/types/api.ts    # ~1180 líneas de tipos TypeScript
│       ├── src/api/client.ts   # Axios factory con interceptores configurables
│       ├── src/stores/authStore.ts  # Zustand factory (storage adaptable)
│       ├── src/hooks/useAuth.ts     # Hook de auth (navegación inyectable)
│       ├── src/hooks/useSalon.ts    # Hook de salón
│       ├── src/lib/            # date, pricing, petLabels, cn, queryClient
│       └── src/services/auth.service.ts
└── backend/                    # Sin cambios
```

## Scripts disponibles

```bash
# Desde la raíz
cd apps/web && npm run dev         # Web en localhost:5173
cd apps/mobile && npx expo start   # Mobile con Expo Go
cd packages/shared && npm run build # Compilar shared
```

## Tecnologías

| Capa | Stack |
|------|-------|
| Mobile | React Native 0.85, Expo SDK 56, Expo Router v4, NativeWind v4 |
| Web | React 19, Vite 8, Tailwind CSS 4 |
| Shared | TypeScript, Zustand, React Query, Axios |
| Backend | Node.js/Express (sin cambios) |

## Código compartido

El paquete `@groomly/shared` exporta:
- **Tipos**: Todas las interfaces de la API (~100+ tipos)
- **API**: Cliente Axios con interceptores de auth configurables
- **Stores**: Factory `createAuthStore()` adaptable a cualquier storage
- **Hooks**: `useAuth()` y `useSalon()` con navegación inyectable
- **Utils**: Fechas, precios, labels de mascotas, cn (tailwind-merge)
- **Services**: Auth service (login, registro, magic link, etc.)

## Estado actual

- ✅ Monorepo inicializado (npm workspaces)
- ✅ `packages/shared` creado y compilando
- ✅ `apps/web` migrado y funcionando (build exitoso)
- ✅ `apps/mobile` creada con Expo SDK 56
- ✅ TypeScript limpio en mobile (0 errores)
- ✅ Navegación por tabs para staff y cliente
- ✅ Login y registro nativos funcionales
- ✅ Auth con persistencia en SecureStore (mobile)
- 🔄 Próximo: Conectar con backend real, pantallas de agenda, clientes, mascotas

## Para empezar

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar shared
cd packages/shared && npm run build

# 3. Web
cd apps/web && npm run dev

# 4. Mobile (necesitas emulador o Expo Go en tu móvil)
cd apps/mobile && npx expo start
```
