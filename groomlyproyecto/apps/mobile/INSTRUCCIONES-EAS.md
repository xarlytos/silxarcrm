# Instrucciones EAS Build — peluguau

## Requisitos previos

1. Cuenta en [expo.dev](https://expo.dev)
2. CLI de EAS instalado: `npm install -g eas-cli`
3. Logueado: `eas login`

---

## Paso 1: Inicializar proyecto en EAS

```bash
cd apps/mobile
eas init
```

Esto crea el proyecto en expo.dev y actualiza automáticamente `app.json` con el `projectId` correcto.

Si ya tienes un proyecto en expo.dev, copia el projectId y pégalo en `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

---

## Paso 2: Configurar variables de entorno (si aplica)

Crea `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://api.peluguau.com/api/v1
```

Para producción, también configura en expo.dev:
- Ve a tu proyecto → Secrets
- Añade `EXPO_PUBLIC_API_URL` con la URL de producción

---

## Paso 3: Generar builds

### Desarrollo (para testing con Expo Go)

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

### Preview (APK interno, sin Play Store)

```bash
# APK para Android
eas build --profile preview --platform android

# IPA para iOS (requiere cuenta de desarrollador Apple)
eas build --profile preview --platform ios
```

### Producción

```bash
# Android App Bundle (AAB) para Play Store
eas build --profile production --platform android

# IPA para App Store
eas build --profile production --platform ios
```

---

## Paso 4: Descargar e instalar

Después de cada build, EAS te da un enlace para descargar:

- **Android**: Descarga el APK e instálalo directamente
- **iOS**: Descarga el IPA y súbelo a TestFlight (requiere cuenta de desarrollador)

---

## Perfiles de build (eas.json)

| Perfil | Uso | Android | iOS |
|--------|-----|---------|-----|
| `development` | Testing con Expo Go | APK | IPA |
| `preview` | Distribución interna | APK | IPA (ad-hoc) |
| `production` | Tiendas oficiales | AAB | IPA (App Store) |

---

## Push Notifications

Para que las push notifications funcionen en producción:

1. En expo.dev → tu proyecto → Credentials
2. Genera FCM credentials para Android (descarga `google-services.json` de Firebase)
3. Para iOS, configura APNs (requiere certificado de Apple)

---

## Solución de problemas

### "Project ID not found"
Ejecuta `eas init` o verifica que `app.json` tenga el projectId correcto.

### "Bundle identifier already exists"
Cambia el `bundleIdentifier` en `app.json` o reclámalo en expo.dev.

### Build falla por dependencias
```bash
cd apps/mobile
npm install
cd ../..
npm run build:shared
```

---

## Scripts útiles (package.json)

```bash
npm run build:android     # Build de preview para Android
npm run build:ios         # Build de preview para iOS
npm run build:prod        # Build de producción
```

---

*Actualizado: 2026-06-04*
