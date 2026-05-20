# Prompts para Generar Imágenes de Mascotas — Sistema de Tareas

Este documento contiene prompts optimizados para generar las imágenes de las 12 mascotas evolutivas del sistema de tareas del CRM. Los prompts están diseñados para funcionar con modelos de generación de imágenes como **Gemini/Imagen**, **Midjourney**, **DALL-E 3** o **Stable Diffusion**.

## Estilo Visual Recomendado

Para mantener coherencia visual entre todas las mascotas, usa este estilo base en cada generador:

> **Estilo base:** *Cute fantasy creature, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, vibrant colors, white or transparent background, game asset style, studio lighting, high quality, 4K, centered composition.*

---

## Mascotas por Nivel

### 1. Yema (Nivel 1)
**Prompt:**
```
A small glowing magical egg, cute fantasy creature, smooth pearlescent shell with soft silver and slate gray shimmer, subtle magical aura, tiny sparkles around it, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, white background, game asset style, studio lighting, 4K, centered composition.
```

### 2. Byte (Nivel 3)
**Prompt:**
```
A tiny baby phoenix bird just hatched from an egg, cute fantasy creature, fluffy golden and amber feathers, big curious eyes with electric sparks, small wings, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, warm yellow magical glow, white background, game asset style, studio lighting, 4K, centered composition.
```

### 3. Céfiro (Nivel 6)
**Prompt:**
```
A small emerald green fairy dragon with butterfly-like wings, cute fantasy creature, wings shimmer with reflections of gold coins and gems, big expressive eyes, emerald and cyan scales, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, magical sparkle trail, white background, game asset style, studio lighting, 4K, centered composition.
```

### 4. Iris (Nivel 10)
**Prompt:**
```
A majestic small owl with deep blue and violet feathers, cute fantasy creature, glowing intelligent eyes, wings spread slightly, wears a tiny scout scarf, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, blue magical aura, white background, game asset style, studio lighting, 4K, centered composition.
```

### 5. Closer (Nivel 16)
**Prompt:**
```
A small baby dragon with rose-pink and magenta scales, cute fantasy creature, tiny flames flickering from nostrils, wings with fuchsia membrane, golden underbelly, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, warm fire glow, white background, game asset style, studio lighting, 4K, centered composition.
```

### 6. Aureola (Nivel 25)
**Prompt:**
```
A radiant humanoid being made of pure golden and white light, cute fantasy creature, ethereal and translucent body, halo of rainbow prismatic light, floating slightly above ground, no distinct face just glowing energy, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, divine aura, white background, game asset style, studio lighting, 4K, centered composition.
```

### 7. Magnus (Nivel 35)
**Prompt:**
```
A small regal lion-like creature with a crown made of burning plasma and golden light, cute fantasy creature, amber and orange mane flowing like fire, majestic posture, plasma crown hovers above head, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, royal glow, white background, game asset style, studio lighting, 4K, centered composition.
```

### 8. Nova (Nivel 50)
**Prompt:**
```
A miniature living star creature, cute fantasy creature, spherical body of golden yellow plasma with a friendly face, small rays of light as arms, miniature planets orbit around it, emits warm golden glow, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, cosmic aura, white background, game asset style, studio lighting, 4K, centered composition.
```

### 9. Quark (Nivel 65)
**Prompt:**
```
A small floating atom-like creature, cute fantasy creature, central nucleus with a cute face, three electron orbits in violet and blue energy, pulsing with primordial energy, particles floating around, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, quantum glow effect, white background, game asset style, studio lighting, 4K, centered composition.
```

### 10. Fractal (Nivel 80)
**Prompt:**
```
A sacred geometry creature, cute fantasy creature, body made of interconnected emerald and cyan geometric shapes — hexagons, triangles, spirals, floating and rotating slightly, glowing edges, mathematical perfection, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, mystical glow, white background, game asset style, studio lighting, 4K, centered composition.
```

### 11. Prisma (Nivel 90)
**Prompt:**
```
A multifaceted crystal being, cute fantasy creature, body made of translucent cyan, pink, and amber crystal facets, each face reflects a different memory scene, light refracts through creating rainbows, floating, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, prismatic glow, white background, game asset style, studio lighting, 4K, centered composition.
```

### 12. Logos (Nivel 100)
**Prompt:**
```
A formless being of pure concept and light, cute fantasy creature, ever-shifting shape of golden, rose, violet, and cyan energy, resembles a constellation of connected light points, divine and ethereal, beyond physical form, chibi proportions, soft cel-shaded 3D render, clean vector-like edges, transcendent aura, white background, game asset style, studio lighting, 4K, centered composition.
```

---

## Formato de Salida Recomendado

| Parámetro | Valor |
|-----------|-------|
| **Resolución** | 1024x1024 (cuadrado) o 512x512 |
| **Fondo** | Blanco sólido o transparente (PNG) |
| **Estilo** | 3D render, cel-shaded, estilo videojuego |
| **Relación de aspecto** | 1:1 |

## Notas para el Desarrollador

- Las imágenes deben exportarse en **PNG con fondo transparente** para poder usarlas sobre cualquier fondo en la app.
- Se recomienda generar también una versión **SVG estilizado** o **icono flat** para uso en componentes pequeños.
- Las mascotas deben tener una **paleta coherente** con sus `aura` y `iconColor` definidos en `companion.ts`:

| Mascota | Aura (Tailwind) | Color de Icono |
|---------|----------------|----------------|
| Yema | `from-slate-400/30 to-slate-500/20` | `text-slate-300` |
| Byte | `from-amber-400/40 to-yellow-500/20` | `text-amber-300` |
| Céfiro | `from-emerald-400/40 to-cyan-500/30` | `text-emerald-300` |
| Iris | `from-blue-500/40 to-violet-500/30` | `text-blue-300` |
| Closer | `from-rose-500/40 via-fuchsia-500/30 to-amber-500/20` | `text-rose-300` |
| Aureola | `from-amber-400/50 via-fuchsia-400/40 to-cyan-400/30` | `text-amber-200` |
| Magnus | `from-amber-500/50 via-orange-500/40 to-yellow-300/40` | `text-amber-200` |
| Nova | `from-yellow-400/60 via-amber-400/50 to-orange-500/30` | `text-yellow-200` |
| Quark | `from-fuchsia-500/50 via-violet-500/40 to-blue-500/40` | `text-fuchsia-200` |
| Fractal | `from-cyan-400/60 via-emerald-400/40 to-fuchsia-400/40` | `text-cyan-200` |
| Prisma | `from-cyan-300/60 via-fuchsia-300/50 to-amber-300/40` | `text-cyan-100` |
| Logos | `from-amber-300/70 via-rose-300/60 via-violet-300/50 to-cyan-300/40` | `text-amber-100` |

## Prompts Negativos (Negative Prompts)

Si tu generador de imágenes lo soporta, añade estos prompts negativos para evitar artefactos:

```
realistic, photorealistic, scary, horror, ugly, deformed, blurry, low quality, bad anatomy, extra limbs, watermark, signature, text, logo, frame, border, complex background, dark background, cluttered
```
