# Auditoría Gym PYME — Plan por bloques

> **Total:** 29 páginas · 11 bloques
> **Referencias previas:**
> - [ANALISIS_SILVIU_GIMNASIO.md](./ANALISIS_SILVIU_GIMNASIO.md) — análisis comercial/funcional por página (usar como base)
> - [ESTADO_VERSION_GYM.md](./ESTADO_VERSION_GYM.md) — estado actual de la versión
> - [PENDIENTE_GYM.md](./PENDIENTE_GYM.md) — backlog priorizado (Alta/Media/Baja)
> - [FitSuite_Gym_PYME_PRD.md](./FitSuite_Gym_PYME_PRD.md) — PRD del producto
> - [PLAN_INTEGRACION_FITSUITE_GYM_PYME.md](./PLAN_INTEGRACION_FITSUITE_GYM_PYME.md)
>
> **Última actualización:** 2026-05-14

---

## Cómo usar este plan

1. Elige un bloque por su número.
2. Pide: `auditar bloque N` (o `arreglar bloque N` si quieres ir directo a fixes).
3. Por cada página del bloque revisamos:
   - 🐛 **Bugs visibles** (errores TS, render loops, datos rotos)
   - 🎭 **Mock data persistente** que debería venir del backend
   - 🔘 **Botones inertes** sin handler real
   - 💾 **Persistencia local** que se pierde al recargar (useState en vez de API)
   - 🎯 **Acciones faltantes** que la página claramente necesita
   - 📐 **Mejoras UX/UI** (filtros, búsqueda, paginación, validación)
4. Al terminar un bloque, marca `- [x]` su línea en "Progreso global".

---

## Progreso global

- [ ] **Bloque 1** — Autenticación (1)
- [ ] **Bloque 2** — Dashboards y vistas operativas (4)
- [ ] **Bloque 3** — Agenda, reglas y créditos (3)
- [ ] **Bloque 4** — Miembros, ficha 360 y acceso (4)
- [ ] **Bloque 5** — Entrenadores y comisiones (2)
- [ ] **Bloque 6** — Portal del miembro (1)
- [ ] **Bloque 7** — Retención, segmentación y cohortes (4)
- [ ] **Bloque 8** — Comercial: precios, loyalty y marketing (3)
- [ ] **Bloque 9** — Finanzas y analytics de ocupación (2)
- [ ] **Bloque 10** — Encuestas e incidencias (3)
- [ ] **Bloque 11** — Configuración e integraciones (2)

**Total páginas:** 1+4+3+4+2+1+4+3+2+3+2 = **29** ✓

---

## 🚨 Hallazgos críticos previos

Antes de entrar en bloques, hallazgos visibles solo con grep que afectan a todo el vertical:

1. **`GymIntegrationsPage` está huérfana** — el archivo existe en `src/features/gym/pages/GymIntegrationsPage.tsx` pero **no hay ruta registrada en `App.tsx`** (no aparece en ningún `<Route path="/gym/integrations" …>`). O bien añadir la ruta, o bien borrar el archivo. Ver Bloque 11.
2. **PENDIENTE_GYM.md flag como "Prio Alta"** sin implementar:
   - Reservas de Clases (Web + Backend) → afecta Bloque 3 y Bloque 6
   - Check-in Manual desde Recepción → afecta Bloque 2 y Bloque 4
   - App Móvil del Miembro → afecta Bloque 6
   - Crear/Editar Clases desde Agenda → afecta Bloque 3

---

## Bloque 1 — Autenticación

**Páginas:** 1
- [ ] `src/features/gym/pages/GymLoginPage.tsx`

**Foco de auditoría:**
- Login multi-rol (Owner, Manager, Recepción, Entrenador, Miembro, Kiosk)
- Redirect por rol tras login (Manager → `/gym/dashboard`, Recepción → `/gym/receptionist`, Miembro → `/gym/portal`)
- "¿Olvidaste contraseña?" cableado a `POST /auth/forgot-password`
- "Recordarme" — persistencia de email en localStorage
- `autoComplete`, `aria-label`, spinner durante submit
- Mensajes de error claros (credenciales, usuario bloqueado, suscripción vencida)
- Modo Kiosk: ¿requiere login propio o lleva PIN/QR sin contraseña?

---

## Bloque 2 — Dashboards y vistas operativas

**Páginas:** 4
- [ ] `src/features/gym/pages/GymDashboardPage.tsx`
- [ ] `src/features/gym/pages/GymReceptionistPage.tsx`
- [ ] `src/features/gym/pages/GymKioskPage.tsx`
- [ ] `src/features/gym/pages/GymTVPage.tsx`

**Foco de auditoría:**
- **GymDashboardPage**: KPIs (miembros activos, churn este mes, ingresos MTD, ocupación) reales vs hardcoded; filtro temporal; click-through a páginas de detalle
- **GymDashboardPage**: dashboards diferenciados por rol (Owner/Manager/Recepción) o vista única
- **GymReceptionistPage**: IA "FitBot" — ¿hay LLM detrás o son scripts hardcoded?; integración con `/gym/access` para check-in; manejo de incidencias en caliente
- **GymReceptionistPage**: chat de soporte al miembro, registro automático de interacciones en CRM
- **GymKioskPage**: self check-in por QR o PIN; flujo offline si se cae la red; pantalla a fullscreen sin chrome
- **GymKioskPage**: integración con torno/puerta automatizada (probable hardware externo — ver `ANALISIS_SILVIU_GIMNASIO.md` sección "Excluido")
- **GymTVPage**: aforo en tiempo real por sala; próximas clases; auto-refresh sin parpadeo
- **GymTVPage**: rotación entre vistas; modo presentación sin login

---

## Bloque 3 — Agenda, reglas y créditos

**Páginas:** 3
- [ ] `src/features/gym/pages/GymAgendaPage.tsx`
- [ ] `src/features/gym/pages/GymRulesPage.tsx`
- [ ] `src/features/gym/pages/GymCreditsPage.tsx`

**Foco de auditoría:**
- **GymAgendaPage**: crear/editar clases desde la agenda (flagged "Prio Alta" en `PENDIENTE_GYM.md` #3)
- **GymAgendaPage**: reservas (flagged "Prio Alta" #4) — backend + UI
- **GymAgendaPage**: filtros por entrenador, sala, tipo de clase; vista semana/mes
- **GymAgendaPage**: lista de espera, sustituciones (no aparecen en directorio gym — ¿se reutilizan de yoga/boxeo o están pendientes?)
- **GymRulesPage**: motor de reglas (Fase 3) — engine que aplica políticas de reserva, cancelación, no-show
- **GymRulesPage**: UI tipo if/then (condición → acción); ejecución real vs solo configuración guardada
- **GymCreditsPage**: paquetes de créditos / bonos; canje en reservas
- **GymCreditsPage**: expiración de créditos, traspaso entre miembros, regalo
- **GymCreditsPage**: integración con Pricing (Bloque 8) y Loyalty (Bloque 8)

---

## Bloque 4 — Miembros, ficha 360 y acceso

**Páginas:** 4
- [ ] `src/features/gym/pages/GymMembersPage.tsx`
- [ ] `src/features/gym/pages/GymMember360Page.tsx`
- [ ] `src/features/gym/pages/GymEvaluationsPage.tsx`
- [ ] `src/features/gym/pages/GymAccessPage.tsx`

**Foco de auditoría:**
- **GymMembersPage**: directorio con filtros (estado, tipo de plan, antigüedad, churn risk); paginación; export CSV
- **GymMembersPage**: búsqueda por nombre/email/DNI con debounce
- **GymMember360Page**: ficha unificada — asistencia, pagos, evaluaciones, notas, incidencias
- **GymMember360Page**: tab "Comunicaciones" / "Notas privadas" — ¿persisten o solo `useState`?
- **GymMember360Page**: timeline de eventos (alta, renovación, evaluación, incidencia, baja…)
- **GymEvaluationsPage**: histórico tendencial (no solo último); composición corporal, fuerza, cardio
- **GymEvaluationsPage**: comparativa pre/post (delta entre evaluaciones)
- **GymEvaluationsPage**: PDF descargable para el miembro
- **GymAccessPage**: control de acceso para recepción — registro de entradas/salidas
- **GymAccessPage**: check-in manual (flagged "Prio Alta" en `PENDIENTE_GYM.md` #5)
- **GymAccessPage**: alertas (cuota vencida, no inscrito en clase, banneado)
- **GymAccessPage**: integración con `GymKioskPage` (Bloque 2)

---

## Bloque 5 — Entrenadores y comisiones

**Páginas:** 2
- [ ] `src/features/gym/pages/GymTrainersPage.tsx`
- [ ] `src/features/gym/pages/GymCommissionsPage.tsx`

**Foco de auditoría:**
- **GymTrainersPage**: directorio con especialidades, horarios, disponibilidad
- **GymTrainersPage**: ficha 360 del entrenador (clases impartidas, asistencia media, valoración miembros)
- **GymTrainersPage**: asignar entrenador como PT (personal trainer) a miembro
- **GymCommissionsPage**: cálculo de comisiones por modelo (fija, por clase, por revenue share)
- **GymCommissionsPage**: liquidación mensual con comprobante PDF
- **GymCommissionsPage**: estado "Pagado" hardcoded vs flujo real con confirmación bancaria
- **GymCommissionsPage**: columna "Clases/Total" sólo del entrenador seleccionado (patrón yoga/boxeo — UX confusa)
- **GymCommissionsPage**: histórico por entrenador, comparativa MoM

---

## Bloque 6 — Portal del miembro

**Páginas:** 1
- [ ] `src/features/gym/pages/GymMemberPortalPage.tsx`

**Foco de auditoría:**
- **GymMemberPortalPage**: una sola página vs varias (Home, Reservar, Mis clases, Membresía, Pagos)
- **GymMemberPortalPage**: `memberId` hardcoded — debe leer `getMiPerfil()`
- **GymMemberPortalPage**: reservas (depende de Bloque 3); cancelación con ventana según `GymRulesPage`
- **GymMemberPortalPage**: pagos pendientes, factura descargable
- **GymMemberPortalPage**: membresía — cambiar plan, pausar, comprar paquete de créditos
- **GymMemberPortalPage**: progreso personal (evaluaciones, peso, métricas)
- **App móvil del miembro** flagged "Prio Alta" en `PENDIENTE_GYM.md` #2 — React Native/Expo aún no implementada

---

## Bloque 7 — Retención, segmentación y cohortes

**Páginas:** 4
- [ ] `src/features/gym/pages/GymRetentionPage.tsx`
- [ ] `src/features/gym/pages/GymSegmentsPage.tsx`
- [ ] `src/features/gym/pages/GymInterventionsPage.tsx`
- [ ] `src/features/gym/pages/GymCohortPage.tsx`

**Foco de auditoría:**
- **GymRetentionPage**: alertas de churn risk — ¿hay modelo ML real o reglas heurísticas hardcoded?
- **GymRetentionPage**: score de riesgo por miembro; razón del riesgo explicada (no asistencia 30d, queja sin resolver, evaluación negativa)
- **GymRetentionPage**: acción rápida desde la alerta → lanzar Intervention (Bloque 7)
- **GymInterventionsPage**: plantillas de intervención (llamada, email, WhatsApp, descuento)
- **GymInterventionsPage**: tracking de resultado (atendida, ignorada, recuperado, perdido)
- **GymInterventionsPage**: A/B testing entre plantillas — KPI tasa de recuperación
- **GymCohortPage**: análisis de cohortes — retention curve por mes de alta
- **GymCohortPage**: filtro por plan, edad, género, canal de adquisición
- **GymSegmentsPage**: segmentación automática (RFM, asistencia, gasto)
- **GymSegmentsPage**: `criteria` guardado como `{notas: string}` incompatible con tipado (patrón visto en yoga/boxeo)
- **GymSegmentsPage**: query builder visual vs sólo texto libre
- **GymSegmentsPage**: enviar campaña al segmento (cruza con Bloque 8 Marketing)

---

## Bloque 8 — Comercial: precios, loyalty y marketing

**Páginas:** 3
- [ ] `src/features/gym/pages/GymPricingPage.tsx`
- [ ] `src/features/gym/pages/GymLoyaltyPage.tsx`
- [ ] `src/features/gym/pages/GymMarketingPage.tsx`

**Foco de auditoría:**
- **GymPricingPage**: pricing dinámico (Fase 3) — ¿auto-aplicación o solo simulación?
- **GymPricingPage**: planes (mensual, trimestral, anual, día); precios por sede; promociones
- **GymPricingPage**: histórico de precios (auditable); efecto sobre planes activos vs solo nuevas altas
- **GymLoyaltyPage**: gamificación — puntos, niveles, badges, recompensas
- **GymLoyaltyPage**: reglas de ganancia (asistencia, referidos, evaluaciones), canje (créditos, productos, descuentos)
- **GymLoyaltyPage**: leaderboard público del gym (opcional)
- **GymMarketingPage**: marketing IA generativa — generar email/WhatsApp con LLM
- **GymMarketingPage**: aprobar / editar / programar / disparar campañas
- **GymMarketingPage**: tracking de open/click/conversión; cruzar con Bloque 7 (cohorte que convirtió)
- **GymMarketingPage**: integración con Mailchimp / SendGrid / WhatsApp Business (Bloque 11)

---

## Bloque 9 — Finanzas y analytics de ocupación

**Páginas:** 2
- [ ] `src/features/gym/pages/GymFinanceReportsPage.tsx`
- [ ] `src/features/gym/pages/GymHeatmapPage.tsx`

**Foco de auditoría:**
- **GymFinanceReportsPage**: ingresos por categoría (membresías, créditos, productos, PT, eventos)
- **GymFinanceReportsPage**: `sixMonthsAgo()` / `today()` recalculados cada render → memoizar (patrón yoga/boxeo)
- **GymFinanceReportsPage**: gráficos Recharts coherentes (no mezclar `<AreaChart>` con `<Line>`)
- **GymFinanceReportsPage**: "Exportar CSV" / "Descargar reporte" sin handler real
- **GymFinanceReportsPage**: previsión de caja, conciliación bancaria, LTV por segmento
- **GymHeatmapPage**: mapa de calor de ocupación por hora/día/semana
- **GymHeatmapPage**: filtro por sala / tipo de clase / entrenador
- **GymHeatmapPage**: defasaje cruzando medianoche (zona horaria — patrón visto en yoga)
- **GymHeatmapPage**: identificación de huecos de capacidad → recomendaciones de programación
- **GymHeatmapPage**: cruce con `GymRetentionPage` (¿los miembros que no vienen son de las franjas más vacías?)

---

## Bloque 10 — Encuestas e incidencias

**Páginas:** 3
- [ ] `src/features/gym/pages/GymSurveysPage.tsx`
- [ ] `src/features/gym/pages/GymSurveyResultsPage.tsx`
- [ ] `src/features/gym/pages/GymIncidentsPage.tsx`

**Foco de auditoría:**
- **GymSurveysPage**: crear encuesta — ¿solo título o flujo completo de preguntas?
- **GymSurveysPage**: tipos de preguntas (NPS, escala, abierta, múltiple); plantillas predefinidas
- **GymSurveysPage**: disparadores (post-clase, post-baja, mensual)
- **GymSurveyResultsPage**: NPS dashboard, breakdown por segmento, comentarios abiertos con sentiment
- **GymSurveyResultsPage**: export, comparativa entre encuestas
- **GymSurveyResultsPage**: drill-down a respuesta individual (cruza con Member360)
- **GymIncidentsPage**: gestión de incidencias (mantenimiento + limpieza) — flagged "Prio Media" #12
- **GymIncidentsPage**: prioridad, asignación a técnico, SLA, fotos adjuntas
- **GymIncidentsPage**: `priorityClasses.high` con typo de Tailwind (patrón visto en boxeo/yoga)
- **GymIncidentsPage**: cierre con verificación; tickets desde Kiosk/App del miembro

---

## Bloque 11 — Configuración e integraciones

**Páginas:** 2
- [ ] `src/features/gym/pages/GymConfigPage.tsx`
- [ ] `src/features/gym/pages/GymIntegrationsPage.tsx` ⚠️ **HUÉRFANA — sin ruta en `App.tsx`**

**Foco de auditoría:**
- **GymConfigPage**: horarios apertura/cierre, política de cancelación, política de no-show
- **GymConfigPage**: ¿se cargan desde `org` y se envían en `updateOrg.mutate`? Patrón roto en yoga (`openingTime`/`closingTime` no persisten)
- **GymConfigPage**: upload logo, colores de marca, plantillas email/WhatsApp
- **GymConfigPage**: roles y permisos (Owner / Manager / Recepción / Entrenador / Miembro)
- **GymConfigPage**: multi-sede (si aplica)
- **GymConfigPage**: T&C, política privacidad, RGPD
- **GymIntegrationsPage**: 🚨 **decidir primero: añadir ruta o borrar archivo**
- **GymIntegrationsPage** (si se mantiene): Stripe / Redsys (cobros), Mailchimp / SendGrid (email), WhatsApp Business, Google Calendar
- **GymIntegrationsPage**: hardware externo — torno/puerta, báscula, lector huella (ver `ANALISIS_SILVIU_GIMNASIO.md` sección "Excluido")
- **GymIntegrationsPage**: solo toggle on/off vs OAuth/keys reales
- **GymIntegrationsPage**: webhooks salientes para CRM externo

---

## Patrones críticos a arreglar a nivel sistémico

Mover esto antes de bloques individuales puede ahorrar mucho trabajo. Patrones esperables (confirmados en yoga/boxeo, a verificar con grep en gym):

1. **`Date.now()` / `new Date()` en cuerpo del componente** — `queryKey` que cambia cada ms, cache nunca hit
2. **`memberId = 'm1'` / `trainerId = 't1'` hardcoded** — debería leer `getMiPerfil()` en Portal y similares
3. **Fechas string vs Date** — parsear en capa de API (helper `toDate()`)
4. **`setState` durante render** — Receptionist, Access, Kiosk candidatos
5. **`.map` sin guard `Array.isArray`** — varios sitios con backend que puede devolver undefined
6. **`useQuery` sin `enabled`** — disparos vacíos con id="" / userId=null
7. **`confirm()` nativo** — sustituir por modal coherente
8. **`as any` en componentes de badge** — tipar props correctamente
9. **`useAuth()` importado y no usado** — limpiar
10. **`criteria` de segmento tipado como `{notas: string}`** incompatible con backend (cruzar con yoga/boxeo Bloque CRM)

---

## Endpoints backend que probablemente faltan

A confirmar tras auditar cada bloque. Patrón esperable según yoga/boxeo + PENDIENTE_GYM.md:

- [ ] `POST /api/gym/clases` + `PATCH /api/gym/clases/:id` — crear/editar desde agenda (Bloque 3, Prio Alta)
- [ ] `POST /api/gym/reservas` + `DELETE /api/gym/reservas/:id` — reservas y cancelación (Bloque 3, Prio Alta)
- [ ] `POST /api/gym/checkin/manual` — check-in desde recepción (Bloque 2/4, Prio Alta)
- [ ] `POST /api/gym/checkin/qr` — check-in desde kiosk con QR
- [ ] `POST /api/gym/miembros/:id/notas` — notas privadas (Bloque 4)
- [ ] `POST /api/gym/interventions/:id/result` — resultado de intervención (Bloque 7)
- [ ] `POST /api/gym/surveys/:id/preguntas` — añadir preguntas (Bloque 10)
- [ ] `POST /api/gym/incidencias` + asignación técnico (Bloque 10)
- [ ] `PUT/PATCH` para entidades que hoy solo permiten crear/eliminar (Planes, Reglas, Loyalty rewards, Segmentos)
- [ ] Push notifications (PENDIENTE_GYM.md #11, Prio Media)

---

## Recomendación de orden

Para máximo ROI (alineado con `PENDIENTE_GYM.md` y prioridades de negocio):

1. **Patrones críticos sistémicos** (1-2 días) — arregla varias páginas de golpe
2. **Bloque 11 — Configuración e integraciones** — resolver primero la huérfana `GymIntegrationsPage` y desbloquear horarios/política
3. **Bloque 1 — Autenticación** — puerta de entrada multi-rol
4. **Bloque 3 — Agenda, reglas y créditos** — desbloquea Prio Alta #3, #4 de `PENDIENTE_GYM.md`
5. **Bloque 4 — Miembros, ficha 360 y acceso** — desbloquea Prio Alta #5 (check-in manual)
6. **Bloque 2 — Dashboards y vistas operativas** — Receptionist (IA FitBot), Kiosk, TV
7. **Bloque 5 — Entrenadores y comisiones** — operativa de pagos
8. **Bloque 6 — Portal del miembro** — preparar para App móvil (Prio Alta #2)
9. **Bloque 7 — Retención, segmentación y cohortes** — diferenciador clave del producto vs competencia
10. **Bloque 10 — Encuestas e incidencias** — Prio Media
11. **Bloque 8 — Comercial: precios, loyalty y marketing** — Fase 3 avanzada
12. **Bloque 9 — Finanzas y analytics** — depende de datos limpios en bloques anteriores

---

## Mapeo de rutas

Para referencia rápida al navegar:

| Bloque | Página | Ruta |
| --- | --- | --- |
| 1 | GymLoginPage | `/gym/login` |
| 2 | GymDashboardPage | `/gym/dashboard` |
| 2 | GymReceptionistPage | `/gym/receptionist` |
| 2 | GymKioskPage | `/gym/kiosk` |
| 2 | GymTVPage | `/gym/tv` |
| 3 | GymAgendaPage | `/gym/agenda` |
| 3 | GymRulesPage | `/gym/rules` |
| 3 | GymCreditsPage | `/gym/credits` |
| 4 | GymMembersPage | `/gym/members` |
| 4 | GymMember360Page | `/gym/members/:memberId` |
| 4 | GymEvaluationsPage | `/gym/evaluations` |
| 4 | GymAccessPage | `/gym/access` |
| 5 | GymTrainersPage | `/gym/trainers` |
| 5 | GymCommissionsPage | `/gym/commissions` |
| 6 | GymMemberPortalPage | `/gym/portal` |
| 7 | GymRetentionPage | `/gym/retention` |
| 7 | GymSegmentsPage | `/gym/segments` |
| 7 | GymInterventionsPage | `/gym/interventions` |
| 7 | GymCohortPage | `/gym/cohorts` |
| 8 | GymPricingPage | `/gym/pricing` |
| 8 | GymLoyaltyPage | `/gym/loyalty` |
| 8 | GymMarketingPage | `/gym/marketing` |
| 9 | GymFinanceReportsPage | `/gym/finance` |
| 9 | GymHeatmapPage | `/gym/heatmap` |
| 10 | GymSurveysPage | `/gym/surveys` |
| 10 | GymSurveyResultsPage | `/gym/surveys/:id/results` |
| 10 | GymIncidentsPage | `/gym/incidents` |
| 11 | GymConfigPage | `/gym/config` |
| 11 | GymIntegrationsPage | ⚠️ **SIN RUTA — archivo huérfano** |
