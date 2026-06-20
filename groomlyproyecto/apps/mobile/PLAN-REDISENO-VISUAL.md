# 🎨 Plan de Rediseño Visual — Groomly Mobile

> Objetivo: Elevar la experiencia visual de Groomly Mobile al nivel de PadelTop, migrando patrones de diseño probados que generan una percepción de calidad premium.

**Referencia visual principal:** PadelTop App (`padeltop/`)
**Estado actual:** Groomly Mobile (`apps/mobile/`)

---

## 📋 ÍNDICE

1. [Paleta de Colores](#1-paleta-de-colores)
2. [Sistema Tipográfico](#2-sistema-tipográfico)
3. [Gradientes y Efectos](#3-gradientes-y-efectos)
4. [Componentes UI a Reemplazar](#4-componentes-ui-a-reemplazar)
5. [Animaciones](#5-animaciones)
6. [Pantallas Específicas](#6-pantallas-específicas)
7. [Assets Necesarios](#7-assets-necesarios)
8. [Priorización y Roadmap](#8-priorización-y-roadmap)

---

## 1. PALETA DE COLORES

### 1.1 Fondo Oscuro como Primario (Dark-First)

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `#0A0B10` | Fondo base de toda la app |
| `surface` | `#14161F` | Tarjetas, contenedores |
| `surfaceElevated` | `#1C1E2A` | Inputs, bottom sheets, elementos elevados |
| `surfaceHighlight` | `#252836` | Bordes, separadores, hover states |
| `border` | `#2E2E42` | Líneas de separación |

> **Nota:** El modo claro pasa a ser derivado. Se invierten los valores proporcionalmente.

### 1.2 Acento Primario Cian

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#00D4FF` | Botones primarios, acentos, indicadores activos |
| `primaryLight` | `#33DDFF` | Hover states, glows |
| `primaryDark` | `#00A8CC` | Estados pressed, modo claro |
| `primaryGlow` | `rgba(0, 212, 255, 0.08)` | Fondos de glow sutiles |

> **Razón:** El violeta `#8636F4` es bueno pero común. El cian `#00D4FF` sobre fondo oscuro es único, moderno, y asocia a tecnología/IA (perfecto para Groomly AI).

### 1.3 Acento Secundario Púrpura

| Token | Valor | Uso |
|-------|-------|-----|
| `accent` | `#7B61FF` | Badges premium, elementos destacados, gradientes |
| `accentGlow` | `rgba(123, 97, 255, 0.08)` | Glows sutiles |

### 1.4 Escala de Texto

| Token | Valor | Uso |
|-------|-------|-----|
| `text` | `#FFFFFF` | Texto principal |
| `textSecondary` | `#9AA3B2` | Subtítulos, descripciones |
| `textMuted` | `#5A616D` | Placeholders, timestamps |

### 1.5 Estados Semánticos

| Token | Valor | Uso |
|-------|-------|-----|
| `success` | `#00D4FF` | Usa el primario para coherencia de marca |
| `error` | `#FF4D6D` | Cancelaciones, errores |
| `warning` | `#FFD740` | Pendientes, advertencias |
| `info` | `#7B61FF` | Notificaciones informativas |

### 1.6 Colores de Servicio / Estado de Cita

| Estado | Color | Uso |
|--------|-------|-----|
| Confirmada | `#00D4FF` cian | Cita confirmada |
| En curso | `#00FF88` verde neón | Cita en progreso (con pulso) |
| Pendiente | `#FFD740` ámbar | Esperando confirmación |
| Cancelada | `#FF4D6D` rosa | Cita cancelada |
| Completada | `#5A616D` gris | Cita finalizada |

### 1.7 Archivos a Modificar

- [ ] `tailwind.config.js` — Reemplazar toda la paleta actual
- [ ] `src/theme/colors.ts` (crear) — Sistema de tokens tipado
- [ ] `src/theme/ThemeContext.tsx` — Actualizar colores del tema oscuro como default
- [ ] `src/components/ui/Screen.tsx` — Fondo `#0A0B10`
- [ ] `src/components/ui/Card.tsx` — Fondo `#14161F`, bordes `#252836`
- [ ] `src/components/ui/Input.tsx` — Fondo `#1C1E2A`, borde `#2E2E42`
- [ ] `src/components/ui/Button.tsx` — Actualizar variantes con cian
- [ ] `src/components/ui/ThemedText.tsx` — Actualizar colores de texto

---

## 2. SISTEMA TIPOGRÁFICO

### 2.1 Nueva Jerarquía Tipográfica

```typescript
export const typography = {
  display: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  score: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 12,
    textTransform: 'uppercase',
  },
};
```

### 2.2 Estilos de Texto Temáticos (Reemplazar ThemedText)

```typescript
export const textStyles = {
  // Nuevos estilos a agregar a ThemedText
  brand: { color: '#00D4FF', fontWeight: '600' },
  brandMuted: { color: 'rgba(0, 212, 255, 0.6)', fontWeight: '400' },
  inverse: { color: '#FFFFFF' },
  inverseMuted: { color: '#9AA3B2' },
  display: typography.display,
  score: typography.score,
  label: typography.label,
  overline: typography.overline,
};
```

### 2.3 Archivos a Modificar

- [ ] `src/theme/typography.ts` (crear)
- [ ] `src/components/ui/ThemedText.tsx` — Integrar sistema tipográfico
- [ ] Todas las pantallas que usan tamaños hardcodeados

---

## 3. GRADIENTES Y EFECTOS

### 3.1 Librería Requerida

```bash
npx expo install expo-linear-gradient
```

### 3.2 Gradientes a Implementar

#### Gradient de Legibilidad sobre Imágenes
```tsx
<LinearGradient
  colors={['transparent', 'rgba(10, 11, 16, 0.8)', 'rgba(10, 11, 16, 1)']}
  locations={[0.3, 0.7, 1]}
  style={StyleSheet.absoluteFill}
/>
```

#### Glow Sutil en Tarjetas Destacadas
```tsx
// Fondo de glow detrás de la tarjeta
<View style={{
  position: 'absolute',
  inset: -2,
  borderRadius: 18,
  backgroundColor: 'rgba(0, 212, 255, 0.08)',
  opacity: 0.5,
}} />
```

#### Gradiente en Badges Premium
```tsx
<LinearGradient
  colors={['#00D4FF', '#7B61FF']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{ borderRadius: 999 }}
>
  <Text>Badge</Text>
</LinearGradient>
```

#### Gradiente de Tarjeta Hero (Próxima Cita)
```tsx
<LinearGradient
  colors={['rgba(0, 212, 255, 0.15)', 'rgba(123, 97, 255, 0.05)', 'transparent']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{ borderRadius: 16 }}
/>
```

### 3.3 Sistema de Sombras

```typescript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 0,
  },
};
```

### 3.4 Sistema de Radios

```typescript
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};
```

### 3.5 Archivos a Modificar

- [ ] `src/theme/colors.ts` (crear tokens de gradiente)
- [ ] `src/theme/shadows.ts` (crear)
- [ ] `src/theme/radius.ts` (crear)
- [ ] `src/components/ui/Card.tsx` — Aplicar sombra md + radius lg
- [ ] `src/components/ui/Button.tsx` — Primary con gradiente cian→púrpura
- [ ] Pantalla Home del Staff — Hero con gradiente de próxima cita

---

## 4. COMPONENTES UI A REEMPLAZAR

### 4.1 Nuevos Componentes a Crear

#### `GradientButton`
```tsx
// Botón primario con gradiente cian → púrpura
<LinearGradient
  colors={['#00D4FF', '#7B61FF']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
>
  <Text style={{ color: '#0A0B10', fontWeight: '700' }}>{label}</Text>
</LinearGradient>
```
- Border radius: 16px
- Altura: 52px (lg), 44px (md)
- Spring scale 0.97 on press

#### `HeroCard`
```tsx
// Tarjeta destacada para "Próxima cita" en el Home
// - Fondo con gradiente sutil
// - Imagen de fondo (servicio/mascota)
// - Gradient de legibilidad
// - Info superpuesta: nombre, hora, servicio
// - Badge de estado
```
- Usar en: Dashboard del staff, Home del cliente

#### `StatusBadge`
```tsx
// Badge con color semántico + animación de pulso cuando está "en curso"
<View style={[styles.badge, { backgroundColor: statusColor }]}>
  {isPulsing && (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFill,
        backgroundColor: statusColor,
        borderRadius: 999,
        transform: [{ scale: pulseAnimation }],
        opacity: 0.3,
      }}
    />
  )}
  <Text style={styles.badgeText}>{statusLabel}</Text>
</View>
```

#### `AvatarStack`
```tsx
// Avatares superpuestos para dueño + mascota
<View style={{ flexDirection: 'row' }}>
  <Avatar image={ownerImage} size={40} borderColor="#0A0B10" />
  <Avatar image={petImage} size={40} borderColor="#0A0B10" style={{ marginLeft: -12 }} />
</View>
```

#### `GlowCard`
```tsx
// Tarjeta con glow sutil alrededor (para destacados/premium)
<View>
  <View style={[styles.glow, { backgroundColor: glowColor }]} />
  <View style={styles.card}>
    {children}
  </View>
</View>
```

#### `SectionHeader`
```tsx
// Header de sección con dot cuadrado rotado + título + acción
<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
  <View style={{
    width: 8, height: 8,
    backgroundColor: '#00D4FF',
    transform: [{ rotate: '45deg' }],
    marginRight: 10,
  }} />
  <Text style={typography.h2}>{title}</Text>
  {action && (
    <TouchableOpacity onPress={action.onPress}>
      <Text style={{ color: '#00D4FF', marginLeft: 'auto' }}>{action.label}</Text>
      <ChevronRight size={16} color="#00D4FF" />
    </TouchableOpacity>
  )}
</View>
```

#### `StoryCircle`
```tsx
// Círculo con gradiente para "stories" de próximas citas
<LinearGradient
  colors={['#00D4FF', '#7B61FF']}
  style={{ borderRadius: 999, padding: 3 }}
>
  <View style={{ borderRadius: 999, backgroundColor: '#0A0B10', padding: 2 }}>
    <Image source={petImage} style={{ width: 56, height: 56, borderRadius: 999 }} />
  </View>
</LinearGradient>
```

### 4.2 Componentes Existentes a Actualizar

| Componente | Cambios |
|------------|---------|
| `Button` | Agregar variante `gradient`. Spring scale 0.97 on press. |
| `Card` | Sombra md en vez de sombra mínima. Fondo `#14161F`. |
| `Input` | Fondo `#1C1E2A`. Borde `#2E2E42`. Focus → borde cian. |
| `Screen` | Fondo `#0A0B10` por defecto. StatusBar light-content. |
| `Skeleton` | Actualizar colores. Agregar variantes específicas por pantalla. |
| `AnimatedView` | Agregar variantes de entrada más suaves. |

### 4.3 Archivos a Modificar/Crear

- [ ] `src/components/ui/GradientButton.tsx` (crear)
- [ ] `src/components/ui/HeroCard.tsx` (crear)
- [ ] `src/components/ui/StatusBadge.tsx` (crear)
- [ ] `src/components/ui/AvatarStack.tsx` (crear)
- [ ] `src/components/ui/GlowCard.tsx` (crear)
- [ ] `src/components/ui/SectionHeader.tsx` (crear)
- [ ] `src/components/ui/StoryCircle.tsx` (crear)
- [ ] `src/components/ui/Button.tsx` (modificar)
- [ ] `src/components/ui/Card.tsx` (modificar)
- [ ] `src/components/ui/Input.tsx` (modificar)
- [ ] `src/components/ui/Screen.tsx` (modificar)
- [ ] `src/components/ui/Skeleton.tsx` (modificar)

---

## 5. ANIMACIONES

### 5.1 Animaciones de Interacción (Nuevas)

#### Spring en Botones
```tsx
const scale = useRef(new Animated.Value(1)).current;

const onPressIn = () => {
  Animated.spring(scale, {
    toValue: 0.97,
    useNativeDriver: true,
    friction: 8,
    tension: 100,
  }).start();
};

const onPressOut = () => {
  Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
    friction: 8,
    tension: 100,
  }).start();
};
```

#### Pulso en Badge "En Curso"
```tsx
const pulse = useRef(new Animated.Value(1)).current;

useEffect(() => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.4,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ])
  ).start();
}, []);
```

#### Slide + Fade en Tarjetas
```tsx
const slideUp = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(slideUp, {
    toValue: 1,
    duration: 350,
    delay: index * 60,
    useNativeDriver: true,
  }).start();
}, []);

// Style:
// opacity: slideUp
// transform: [{ translateY: slideUp.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
```

### 5.2 Archivos a Modificar

- [ ] `src/components/ui/Button.tsx` — Agregar spring scale
- [ ] `src/components/ui/StatusBadge.tsx` — Agregar pulso
- [ ] `src/components/ui/AnimatedView.tsx` — Agregar SlideUpView
- [ ] `src/components/ui/Card.tsx` — Agregar slideUp en listas

---

## 6. PANTALLAS ESPECÍFICAS

### 6.1 Home del Staff (Dashboard)

**Cambios propuestos:**

```
ANTES:
[Header: "Dashboard" + botón +]
[Stats: 2 columnas con números]
[Quick Actions: grid de iconos]
[Lista de citas del día]

DESPUÉS:
[Header: Logo + menú hamburguesa + badge notificaciones]
[HERO: Próxima cita destacada con imagen de fondo + gradiente]
  → Nombre del cliente + mascota
  → Hora + servicio
  → Badge de estado
  → Botón "Comenzar" con gradiente
[Stories horizontales: Próximas citas del día]
  → Círculos con foto de la mascota + hora
[Stats: 2 columnas con números grandes (tabular-nums) + labels]
[Acciones rápidas: iconos más grandes, con glow sutil]
[Sección "Citas de hoy" con SectionHeader]
  → Lista con slideUp staggered
```

**Archivos:** `app/(staff)/index.tsx`

### 6.2 Home del Cliente

```
[HERO: Próxima cita reservada]
[Stories: Historial de mascotas / servicios recientes]
[Stats: Total de citas, mascotas]
[Quick Actions: Reservar, Ver citas, Mi mascota, Contactar]
[Sección "Mis mascotas"]
[Sección "Próximas citas"]
```

**Archivos:** `app/(client)/index.tsx`

### 6.3 Lista de Citas (Agenda)

```
[Selector de días: pills horizontales con día + número]
  → Día actual destacado con fondo cian
[Sección "En curso" con badge LIVE pulsante]
[Sección "Próximas"]
[Sección "Finalizadas"]
```

**Archivos:** `app/(staff)/agenda/index.tsx`

### 6.4 Perfil de Mascota

```
[Hero: Foto de mascota con gradiente de legibilidad]
  → Nombre + raza + edad
[Info cards: Dueño, historial, próxima cita]
[AvatarStack: Dueño + Mascota superpuestos]
```

**Archivos:** `app/(staff)/mascotas/[id].tsx`, `app/(client)/mascotas/[id].tsx`

### 6.5 Navegación (Tab Bar)

```
[TabBar actual: básico con iconos]

[TabBar nuevo:]
  → Fondo: `#0A0B10` con borde superior `#252836`
  → Tab activo: icono cian + label cian + indicador dot
  → Tab inactivo: icono `#5A616D` + label `#5A616D`
  → Badge de notificaciones: rojo con contador
  → Altura: 64px + safe area
```

**Archivos:** `app/(staff)/_layout.tsx`, `app/(client)/_layout.tsx`

### 6.6 Header Personalizado

```tsx
// Header con logo dinámico + menú hamburguesa
<Header>
  <MenuButton onPress={openDrawer} />
  <Logo color={tierColor} /> // "Groomly" en cian
  <NotificationButton badgeCount={unreadCount} />
</Header>
```

**Archivos:** Crear `src/components/layout/Header.tsx`

---

## 7. ASSETS NECESARIOS

> ⚠️ **El usuario ofreció generar imágenes con IA.** Marcar las que requieren generación.

### 7.1 Logo

| Asset | Descripción | Formato | Generar con IA |
|-------|-------------|---------|----------------|
| `logo-groomly-dark.png` | Logo "Groomly" en blanco/cian para fondo oscuro | PNG transparente | ❌ (usar SVG o texto) |
| `logo-groomly-light.png` | Logo "Groomly" en oscuro para fondo claro | PNG transparente | ❌ |

### 7.2 Fondos de Pantalla

| Asset | Descripción | Formato | Generar con IA |
|-------|-------------|---------|----------------|
| `bg-dark.png` | Fondo abstracto oscuro con formas suaves de cian/púrpura | PNG/JPG | ✅ **SÍ** |
| `bg-light.png` | Versión clara del fondo | PNG/JPG | ✅ **SÍ** |
| `hero-cita-default.png` | Imagen de una mascota en la peluquería, tonos cálidos | JPG | ✅ **SÍ** |

> **Prompt sugerido para fondo oscuro:**
> *"Abstract dark background with subtle soft gradients, deep navy blue (#0A0B10) base with very faint cyan (#00D4FF) and purple (#7B61FF) glow spots, minimal, premium, mobile app wallpaper, 4K, no text"*

> **Prompt sugerido para hero cita:**
> *"A happy golden retriever being groomed at a modern pet salon, warm lighting, shallow depth of field, professional photography, cozy atmosphere, high quality"*

### 7.3 Splash Screen

| Asset | Descripción | Formato | Generar con IA |
|-------|-------------|---------|----------------|
| `splash-icon.png` | Icono de la app para splash screen | PNG 1024x1024 | ❌ (usar logo existente) |

### 7.4 Iconos y Avatares

| Asset | Descripción | Formato | Generar con IA |
|-------|-------------|---------|----------------|
| `avatar-default-pet.png` | Avatar por defecto para mascotas sin foto | PNG | ✅ **SÍ** |
| `avatar-default-owner.png` | Avatar por defecto para dueños sin foto | PNG | ✅ **SÍ** |

> **Prompt sugerido avatar mascota:**
> *"Cute cartoon dog face icon, flat design, minimal, white background, friendly expression, single color cyan outline"*

### 7.5 Ilustraciones para Empty States

| Asset | Descripción | Formato | Generar con IA |
|-------|-------------|---------|----------------|
| `empty-citas.png` | Ilustración de calendario vacío | PNG | ✅ **SÍ** |
| `empty-mascotas.png` | Ilustración sin mascotas | PNG | ✅ **SÍ** |
| `empty-notificaciones.png` | Ilustración sin notificaciones | PNG | ✅ **SÍ** |

> **Prompt sugerido empty citas:**
> *"Minimal illustration of an empty calendar with a small sad dog, flat design, dark background (#0A0B10), cyan (#00D4FF) accents, clean lines"*

### 7.6 Lista Completa de Assets

```
assets/
├── images/
│   ├── bg-dark.jpg              [IA]
│   ├── bg-light.jpg             [IA]
│   ├── hero-cita-default.jpg    [IA]
│   ├── avatar-default-pet.png   [IA]
│   ├── avatar-default-owner.png [IA]
│   ├── empty-citas.png          [IA]
│   ├── empty-mascotas.png       [IA]
│   └── empty-notificaciones.png [IA]
├── logo/
│   ├── logo-dark.png
│   └── logo-light.png
└── splash/
    └── splash-icon.png
```

---

## 8. PRIORIZACIÓN Y ROADMAP

### Fase 1: Fundamentos (Impacto Visual Alto / Esfuerzo Medio)
> *Duración estimada: 2-3 días*

- [ ] **1.1** Instalar `expo-linear-gradient`
- [ ] **1.2** Crear sistema de tokens (`colors.ts`, `typography.ts`, `shadows.ts`, `radius.ts`)
- [ ] **1.3** Actualizar `tailwind.config.js` con nueva paleta
- [ ] **1.4** Actualizar `Screen.tsx` con fondo oscuro
- [ ] **1.5** Actualizar `Card.tsx` con nuevos colores y sombra
- [ ] **1.6** Actualizar `Button.tsx` con gradiente + spring
- [ ] **1.7** Actualizar `Input.tsx` con nuevos colores
- [ ] **1.8** Actualizar `ThemedText.tsx` con sistema tipográfico
- [ ] **1.9** Cambiar tema default a oscuro

**Resultado esperado:** Toda la app se ve con fondo oscuro, botones cian, tarjetas con sombra. Impacto visual inmediato.

### Fase 2: Componentes Nuevos (Impacto Visual Alto / Esfuerzo Medio-Alto)
> *Duración estimada: 3-4 días*

- [ ] **2.1** Crear `GradientButton.tsx`
- [ ] **2.2** Crear `HeroCard.tsx`
- [ ] **2.3** Crear `StatusBadge.tsx` con pulso
- [ ] **2.4** Crear `AvatarStack.tsx`
- [ ] **2.5** Crear `GlowCard.tsx`
- [ ] **2.6** Crear `SectionHeader.tsx`
- [ ] **2.7** Crear `StoryCircle.tsx`
- [ ] **2.8** Crear `Header.tsx` personalizado
- [ ] **2.9** Actualizar TabBar con nuevo diseño

**Resultado esperado:** Componentes ricos listos para usar en pantallas.

### Fase 3: Pantallas Clave (Impacto Visual Máximo / Esfuerzo Alto)
> *Duración estimada: 4-5 días*

- [ ] **3.1** Rediseñar Home del Staff con Hero + Stories + Stats
- [ ] **3.2** Rediseñar Home del Cliente
- [ ] **3.3** Rediseñar Agenda con selector de días
- [ ] **3.4** Rediseñar Perfil de Mascota con Hero
- [ ] **3.5** Rediseñar Lista de Clientes con AvatarStack
- [ ] **3.6** Rediseñar Detalle de Cita

**Resultado esperado:** Las pantallas principales tienen el look premium completo.

### Fase 4: Assets y Polish (Impacto Visual Medio / Esfuerzo Medio)
> *Duración estimada: 2-3 días*

- [ ] **4.1** Generar imágenes de fondo con IA
- [ ] **4.2** Generar avatares por defecto con IA
- [ ] **4.3** Generar ilustraciones de empty states con IA
- [ ] **4.4** Integrar imágenes en componentes
- [ ] **4.5** Ajustar skeletons a nuevos diseños
- [ ] **4.6** Revisar modo claro (invertir colores)
- [ ] **4.7** Testing visual en iOS y Android

**Resultado esperado:** App pulida con assets propios, modo claro funcional, sin glitches.

### Fase 5: Animaciones Avanzadas (Impacto Visual Medio-Alto / Esfuerzo Alto)
> *Duración estimada: 3-4 días*

- [ ] **5.1** Agregar spring en todos los botones
- [ ] **5.2** Agregar stagger en todas las listas
- [ ] **5.3** Agregar pulso en badges de estado activo
- [ ] **5.4** Crear animación de transición entre tabs
- [ ] **5.5** Agregar micro-interacciones (iconos que bounce, etc.)

**Resultado esperado:** La app *se siente* premium, no solo se ve premium.

---

## 📊 ESTIMACIÓN TOTAL

| Fase | Esfuerzo | Impacto Visual |
|------|----------|----------------|
| 1: Fundamentos | 2-3 días | ⭐⭐⭐⭐⭐ |
| 2: Componentes | 3-4 días | ⭐⭐⭐⭐⭐ |
| 3: Pantallas | 4-5 días | ⭐⭐⭐⭐⭐ |
| 4: Assets | 2-3 días | ⭐⭐⭐⭐ |
| 5: Animaciones | 3-4 días | ⭐⭐⭐⭐ |
| **TOTAL** | **14-19 días** | **⭐⭐⭐⭐⭐** |

> Con 1 desarrollador full-time, el MVP visual estaría en ~7-10 días (Fases 1-3).

---

## 🎯 DECISIONES PENDIENTES

Antes de empezar, confirmar:

1. **¿Mantener el violeta `#8636F4` como primario o migrar a cian `#00D4FF`?**
   - Recomendación: Migrar a cian para el look premium. El violeta puede quedar como secundario/accento.

2. **¿Dark-only o dark-first con claro como opción?**
   - Recomendación: Dark-first (oscuro por defecto, claro opcional).

3. **¿Generar assets con IA ahora o usar placeholders primero?**
   - Recomendación: Placeholders de color sólido primero, assets IA después.

4. **¿Scope: solo pantallas del staff, solo cliente, o ambas?**
   - Recomendación: Ambas para consistencia de marca.

---

## 📝 NOTAS TÉCNICAS

### Dependencias a Instalar

```bash
# Gradiente
npx expo install expo-linear-gradient

# Ya instalados (verificar versiones)
# react-native-reanimated
# lucide-react-native
# nativewind
```

### Performance

- Todas las animaciones deben usar `useNativeDriver: true`
- Las imágenes deben usar `resizeMode="cover"` con dimensiones fijas
- Los gradientes no deben recrearse en cada render (usar `useMemo`)
- Las sombras en Android: usar `elevation` en lugar de `shadow`

### Accesibilidad

- Mantener contrastes WCAG AA (4.5:1 para texto normal, 3:1 para grande)
- Cian `#00D4FF` sobre `#0A0B10` → ratio ~12:1 ✅
- Blanco `#FFFFFF` sobre `#0A0B10` → ratio ~19:1 ✅
- Gris `#9AA3B2` sobre `#0A0B10` → ratio ~7:1 ✅
- Gris `#5A616D` sobre `#0A0B10` → ratio ~3.8:1 ⚠️ (solo para texto grande o no esencial)

---

*Documento creado el 2026-06-04*
*Referencia visual: PadelTop App*
*Target: Groomly Mobile v2.0 Visual*
