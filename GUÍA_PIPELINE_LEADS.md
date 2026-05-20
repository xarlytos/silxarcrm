# Guía del Pipeline de Leads Ervok

## Qué tenemos ahora

| Métrica | Valor |
|---|---|
| **Total leads en BD** | 9,335 |
| **Clasificados con IA (MiniMax)** | 1,543 |
| **Pendientes de clasificar** | 7,792 |
| **Sectores** | 12 (dental, gimnasio, asesoría, taller, restaurante, peluquería, veterinaria, fisioterapia, inmobiliaria, farmacia, óptica, academia) |
| **Ciudades** | 13 (Madrid, Barcelona, Valencia, Sevilla, Málaga, Zaragoza, Bilbao, Alicante, Córdoba, Granada, Valladolid, Murcia, Palma) |

### Los 1,543 clasificados
- Tienen `metadata.iaClassification` con: sector, subsector, painPoints, automationOpportunities, personalizedPitch, softwareType, confidence
- Se ven en el ERP: página de detalle del lead y columna Sector en la lista

### Los 7,792 pendientes
- Tienen los datos básicos del scan (nombre, teléfono, dirección, rating, sectorBusqueda)
- **No tienen** análisis de IA todavía
- Se muestran en el ERP pero sin la sección "Análisis IA"

---

## Opción A: Esperar a MiniMax (recomendado para máxima calidad)

MiniMax está en rate limit hasta aproximadamente las **2:00 AM hora española** (8:00 AM CST China).

### Cómo continuar mañana:

```bash
cd backend
npx ts-node scripts/classify-leads-ervok-minimax.ts --batch=20
```

Esto procesará los 7,792 pendientes. Tiempo estimado: **4-5 horas**.

**Truco**: Si quieres procesar solo los más valiosos (los sin web = prioridad ALTA):

```bash
npx ts-node scripts/classify-leads-ervok-minimax.ts --batch=20 --limit=1500
```

---

## Opción B: Plantillas manuales ahora (instantáneo, calidad media)

Si no quieres esperar, puedo aplicar plantillas por sector sin usar API. Los pitches serán genéricos pero funcionales.

```bash
cd backend
npx ts-node scripts/apply-sector-templates.ts
```

Esto procesa los 7,792 en **menos de 1 minuto**.

**Después**, cuando MiniMax vuelva a funcionar, puedes re-clasificar los leads más importantes:

```bash
# Re-clasificar solo los de prioridad ALTA con MiniMax
npx ts-node scripts/classify-leads-ervok-minimax.ts --limit=500
```

---

## Opción C: Híbrida (recomendada por equilibrio)

1. **Ahora**: Aplicar plantillas manuales a los 7,792 pendientes → todos tienen datos en minutos
2. **Mañana**: Re-clasificar con MiniMax solo los leads ALTA (sin web) + los que tengan mejor pinta

```bash
# Paso 1: plantillas instantáneas
npx ts-node scripts/apply-sector-templates.ts

# Paso 2: mañana, re-clasificar los mejores con MiniMax
npx ts-node scripts/classify-leads-ervok-minimax.ts --limit=1000
```

---

## Cómo añadir más sectores en el futuro

### 1. Editar el script de scan

Edita `backend/scripts/scan-leads-pymes-ervok.ts`:

```typescript
const SECTORES = [
  // ... sectores actuales
  'nuevo sector aquí',
];

const CIUDADES = [
  // ... ciudades actuales
  'nueva ciudad aquí',
];
```

### 2. Ejecutar el scan

```bash
cd backend
npx ts-node scripts/scan-leads-pymes-ervok.ts --skip-pagespeed
```

> **Importante**: Usa `--skip-pagespeed` porque PageSpeed API no está habilitada en GCP.

### 3. Importar a la BD

```bash
npx ts-node scripts/import-leads-ervok-from-json.ts
```

### 4. Clasificar con MiniMax

```bash
npx ts-node scripts/classify-leads-ervok-minimax.ts --batch=20
```

---

## Estructura de datos guardada

Cada lead tiene en `metadata`:

```json
{
  "googlePlaceId": "...",
  "sectorBusqueda": "restaurante",
  "ciudadBusqueda": "Madrid",
  "clasificacionWeb": "SIN_WEB",
  "iaClassification": {
    "sector": "hostelería",
    "subsector": "restaurante",
    "painPoints": ["...", "...", "..."],
    "automationOpportunities": ["...", "..."],
    "personalizedPitch": "...",
    "softwareType": "...",
    "confidence": "alta"
  },
  "iaClassifiedAt": "2026-05-19T..."
}
```

---

## Costes acumulados Google Places API

| Scan | Queries | Coste estimado |
|---|---|---|
| Original (4 sectores x 5 ciudades) | 20 | $0.64 |
| Expandido (12 sectores x 13 ciudades) | 156 | $4.99 |
| **Total** | **176** | **~$5.63** |

Crédito gratuito mensual: $200. Quedan ~$194.

---

## Próximos pasos sugeridos

1. **Elegir opción A, B o C** arriba para terminar los 7,792 pendientes
2. **Crear plantillas de email/WhatsApp** con los pitches para hacer outreach
3. **Activar PageSpeed Insights API** en GCP si quieres clasificar webs (SIN_WEB vs WEB_MALA)
4. **Revoque las API keys expuestas** (Google Places + MiniMax) por seguridad
5. **Añadir más sectores**: veterinarias, clínicas de estética, talleres de chapa, academias de conducir, etc.

---

## Comandos rápidos

```bash
# Ver cuántos leads tenemos y cuántos clasificados
cd backend && npx ts-node scripts/check-progress.ts

# Ver leads de un sector específico
cd backend && npx ts-node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.lead.findMany({where:{softwareId:'ervok'}, select:{nombre:true, metadata:true}})
  .then(all => {
    const bySector = {};
    all.forEach(l => {
      const sb = l.metadata?.sectorBusqueda || '?';
      bySector[sb] = (bySector[sb] || 0) + 1;
    });
    console.log(bySector);
    p['\$disconnect']().then(()=>process.exit(0));
  });
"

# Exportar leads clasificados a JSON
cd backend && npx ts-node -e "
const {PrismaClient} = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
p.lead.findMany({where:{softwareId:'ervok'}, select:{nombre:true, telefono:true, metadata:true}})
  .then(all => {
    const classified = all.filter(l => l.metadata?.iaClassification);
    fs.writeFileSync('scripts/output/ervok-export.json', JSON.stringify(classified, null, 2));
    console.log('Exportados:', classified.length);
    p['\$disconnect']().then(()=>process.exit(0));
  });
"
```
