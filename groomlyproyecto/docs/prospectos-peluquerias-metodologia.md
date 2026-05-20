# Metodología — Prospección de peluquerías caninas sin web

**Última actualización:** 2026-05-18
**Propósito:** documentar el proceso de prospección comercial de peluquerías caninas sin web propia para Groomly / peluguau, de forma que cualquier región nueva siga el mismo criterio y formato.

---

## Objetivo del ejercicio

Identificar, en una región geográfica dada, peluquerías caninas / centros de estética canina que **no tengan web propia**, como prospectos comerciales para el ERP SaaS Groomly / peluguau. El producto está orientado a digitalizar negocios pequeños del sector, por lo que la ausencia de web es señal de "early adopter" potencial o de necesidad explícita de presencia digital.

## Criterios de inclusión y clasificación

Cada negocio identificado se clasifica en uno de **dos grupos** o se excluye:

### Grupo A — Sin presencia digital propia
- No tiene web propia.
- No tiene perfil activo localizable en Instagram o Facebook (vía búsqueda pública).
- Puede aparecer únicamente en directorios (Páginas Amarillas, Google Maps, Pelucanes, etc.) o tener un Facebook esporádico sin actividad reciente.

### Grupo B — Solo redes sociales (sin web propia)
- No tiene dominio propio.
- Tiene perfil de Instagram y/o Facebook localizable y aparentemente activo.
- Perfil ideal de "early adopter" digital — ya entiende la presencia online pero le falta herramienta integrada.

### Excluidos (van al apéndice, NO a las tablas principales)
- Negocios con web propia verificada.
- Negocios que sí salen en búsquedas iniciales pero al verificar resulta que tienen dominio.

## Definición de "web propia"

- **Sí cuenta como web propia:** dominio del negocio en `.com`, `.es`, `.cat`, `.eus`, etc. (p. ej. `peluqueriacaninax.com`, `groomerx.es`).
- **NO cuenta como web propia** (se mantiene en grupos principales con nota explícita):
  - Subdominios gratuitos: `negocio.site`, `negocio.webnode.es`, `negocio.wordpress.com`, `negocio.ueniweb.com`, `negocio.business.site`.
  - Páginas de Booksy, Groupon, Cronoshare, Yelp u otros marketplaces.
  - Fichas de Google Maps o de directorios sectoriales.

Razonamiento: un subdominio gratuito sin personalización es un parche, no una solución digital — encaja en el perfil de prospecto.

## Datos a recopilar por cada peluquería

Obligatorios siempre que estén disponibles:

- **Nombre comercial**
- **Dirección** (calle, número, distrito o municipio)
- **Municipio** (o distrito si es ciudad grande tipo Madrid/Barcelona)
- **Teléfono**
- **Instagram** (link al perfil)
- **Facebook** (link a la página)
- **Valoración Google** (estrellas y nº de reseñas si aparece)
- **Notas**: especialización, años de actividad, señales relevantes (muy activo en IG, abre fines de semana, duplicidades detectadas, etc.)

Si falta algún dato, **dejar la celda vacía o con `—`** — **nunca inventar**. Marcar la entrada con asterisco (`*`) si tiene datos parciales relevantes (típicamente sin teléfono o sin dirección completa).

## Metodología de búsqueda

1. **Búsquedas Google por municipio o distrito**, en castellano y, si aplica, en idioma cooficial:
   - `"peluquería canina" + [municipio]`
   - `"estética canina" + [municipio]`
   - `"baño y corte perros" + [municipio]`
   - `"groomer" + [municipio]`
   - En Cataluña: `"perruqueria canina"`, `"estètica canina"`, `"banys i tall gossos"`.
   - En País Vasco: `"txakurren ile-apaindegia"` (uso secundario).
   - En Galicia: `"perruquería canina"`.
2. **Directorios consultados:**
   - Pelucanes (especialmente útil — explicita "no tiene web" en algunos casos)
   - Páginas Amarillas, QDQ, Cylex, Vulka, Infoisinfo
   - Booksy, Cronoshare, Caninoteca, Dogwell, MascotasHoy
   - Lo Mejor del Barrio, MiVet, ExpertoAnimal
   - Directorios de comercio local de los ajuntaments/ayuntamientos (especialmente útiles en Cataluña).
3. **Verificación caso a caso:**
   - Buscar nombre comercial + ciudad para detectar dominio propio.
   - Buscar nombre comercial en Instagram y Facebook para clasificar A vs B.
   - Anotar dominio si se confirma web propia (la entrada va al apéndice).
4. **Deduplicación:**
   - Misma marca con varias direcciones = entradas separadas (cada local).
   - Mismo nombre + mismo teléfono = misma entrada.
   - **Mismo teléfono entre Grupo A y Grupo B** = posible duplicado, marcar en notas para validación manual.

## Formato del fichero entregable

Cada región genera un fichero en `docs/prospectos-peluquerias-<region>.md` con esta estructura **estricta**:

```markdown
# Prospectos peluquerías caninas — [Región]

**Fecha de recopilación:** [YYYY-MM-DD]
**Objetivo:** identificar peluquerías caninas en [región] sin web propia, como prospectos comerciales para Groomly / peluguau.

**Fuentes consultadas:** [lista]

**Metodología y límites:** [párrafo explicando criterios y nivel de verificación]

**Cobertura geográfica intentada:** [lista de comarcas/zonas/municipios]

---

## Grupo A — Sin presencia digital propia

| # | Nombre | Dirección | Municipio | Teléfono | Valoración Google | Notas |
|---|--------|-----------|-----------|----------|-------------------|-------|

## Grupo B — Solo redes sociales (sin web propia)

| # | Nombre | Dirección | Municipio | Teléfono | Instagram | Facebook | Valoración Google | Notas |
|---|--------|-----------|-----------|----------|-----------|----------|-------------------|-------|

---

## Resumen

- Total Grupo A: N
- Total Grupo B: M
- Total prospectos válidos: N + M
- Entradas con datos parciales (*): K
- Municipios con más prospectos: [top 3-5]
- Mejores pistas accionables: [3-5 nombres concretos con razón]
- Limitaciones materiales: [zonas con poca densidad, fichas opacas, etc.]

---

## Apéndice — Excluidas tras verificación (sí tienen web propia)

| Nombre | Municipio | Web propia detectada | Aparecía originalmente en |
|--------|-----------|---------------------|---------------------------|
```

**Reglas de oro del formato:**

- Las tablas principales (A y B) contienen **SOLO prospectos válidos**. Las excluidas van **directamente al apéndice** — no se dejan en las tablas con marcas "EXCLUIR" en notas (lección aprendida en la iteración Valencia: ensucia el deliverable comercial).
- **Numeración correlativa sin huecos**. Si se elimina una entrada durante la limpieza, renumerar.
- **Castellano con tildes y eñes correctas** en todo el texto descriptivo (peluquería, baño, valoración, reseñas, dirección, niños, mañana, año). Para nombres comerciales en idioma cooficial, mantener la grafía original (Perruqueria, Gosset, etc.).
- No inventar datos. Celda vacía o `—` cuando no hay información.
- Marcar entradas con datos parciales con `*` en la columna `#` o en `Nombre`.

## Lecciones aprendidas

### De la iteración Valencia (75 prospectos válidos)
- El agente inicial dejó entradas verificadas con web propia dentro de las tablas principales, marcadas con "EXCLUIR del scope". Resultado: tabla confusa para uso comercial. **Corrección aplicada en iteraciones posteriores**: instrucción explícita de que las excluidas van directamente al apéndice.
- **Duplicidades por teléfono entre A y B**: en Valencia se detectó que KRISTYLCAN (Grupo B) y una ficha anónima de C/ Pius XI 9 (Grupo A) compartían teléfono. Siempre cruzar teléfonos al final del compilado.
- **Fichas anónimas tipo "Peluquería canina C/ [calle]"**: aparecen en Google Maps sin nombre comercial publicado. Útiles como pistas, pero requieren validación telefónica previa al outreach. Marcar con `*` siempre.

### De la iteración Barcelona (147 prospectos válidos)
- **Búsquedas bilingües (castellano + catalán)** doblan resultados en áreas donde el idioma cooficial domina el branding local. Imprescindibles en Cataluña, País Vasco, Galicia, Valencia.
- **Subdominios gratuitos** (UENI, Webnode, WordPress.com) son frecuentes como sustituto de web propia. Tratarlos como "no-web" y anotarlo expresamente — son perfil ideal de prospecto.
- **Densidad asimétrica**: en provincias grandes, la cobertura es excelente en la capital y AMB pero floja en comarcas rurales. Documentar explícitamente las zonas de cobertura débil en el resumen.

### Comunes
- La clasificación A vs B se basa en si el perfil de IG/FB aparece en buscadores públicos. **No se valida frecuencia de publicación**. Recomendación operativa: segunda pasada manual antes de campaña para descartar cuentas zombi.
- **Las clínicas veterinarias mixtas con servicio de peluquería** suelen quedar fuera del perfil objetivo (su negocio principal es otro). Documentar en el resumen cuántas se descartaron por esto.
- **Datos parciales son aceptables**, mejor que inventar. Las entradas con `*` son pistas — útiles para campañas de email o redes, no para outreach telefónico en frío.

## Estado del ejercicio por regiones

| Región | Fichero | Grupo A | Grupo B | Total | Estado |
|--------|---------|---------|---------|-------|--------|
| Valencia (provincia) | `prospectos-peluquerias-valencia.md` | 56 | 19 | 75 | Completo |
| Barcelona (provincia) | `prospectos-peluquerias-barcelona.md` | 108 | 39 | 147 | Completo |
| Madrid (comunidad) | `prospectos-peluquerias-madrid.md` | — | — | — | Pendiente |

### Regiones candidatas para iteraciones futuras (orden sugerido por tamaño de mercado)

1. **Madrid (Comunidad)** — siguiente lógico, sin idioma cooficial.
2. **Sevilla (provincia)** — capital andaluza, mercado grande.
3. **Málaga (provincia)** — alta densidad turística, muchas mascotas.
4. **Bilbao + área metropolitana / Bizkaia** — bilingüe (euskera), criterio similar a Cataluña.
5. **Zaragoza (provincia)** — capital aragonesa.
6. **Vigo / A Coruña / Galicia** — bilingüe (gallego).
7. **Alicante (provincia)** — completar el levante tras Valencia.
8. **Murcia (Región)** — mercado medio.

## Aplicación del workflow para una nueva región

Pasos recomendados al iniciar una región nueva:

1. **Definir cobertura geográfica** con detalle (ciudad, comarcas, lista de municipios principales). Esto va al header del fichero.
2. **Identificar idiomas relevantes** (castellano + cooficial si aplica).
3. **Delegar a un agente de investigación** con prompt que incluya:
   - Referencia explícita a `docs/prospectos-peluquerias-valencia.md` y `docs/prospectos-peluquerias-barcelona.md` como modelos de formato.
   - Lista detallada de municipios/distritos a cubrir.
   - Reglas estrictas: web propia al apéndice, no en tablas; numeración correlativa; castellano con tildes; no inventar datos.
4. **Verificar el fichero generado**:
   - Conteo de líneas con `wc -l`.
   - Búsqueda de "EXCLUIR" para confirmar que no quedaron entradas en las tablas que debían ir al apéndice.
   - Lectura del header y del apéndice para validar estructura.
5. **Si encuentras inconsistencias** (entradas EXCLUIR en tablas principales, numeración con huecos, datos inventados), limpiar el fichero antes de entregárselo al usuario.
6. **Actualizar este fichero de metodología** con la nueva región en la tabla de "Estado del ejercicio" y cualquier lección aprendida nueva.

## Pendientes operativos transversales

- **Consolidación CSV**: en algún momento conviene exportar todos los prospectos válidos a un único CSV importable a CRM, con columna `region` añadida. Aún no se ha hecho.
- **Sistema de tracking de outreach**: actualmente las listas son estáticas. Falta marcar cuáles ya se contactaron, fecha, resultado.
- **Segunda pasada manual de cuentas IG**: pendiente en todas las regiones (verificar actividad reciente y descartar cuentas zombi).
- **Validación telefónica de fichas anónimas** (las que aparecen solo como "Peluquería canina C/ [calle]"): pendiente.
