# peluguau, en cristiano

Mira.

Te voy a contar qué es esto sin diapositivas de PowerPoint, sin la palabra "disruptivo" y sin pintarte un cohete despegando hacia la luna.

Trato hecho.

---

## Qué es peluguau

Un ERP para peluquerías caninas.

Ya está.

Que sí, que técnicamente es un SaaS multi-tenant con autenticación JWT, portal de cliente, Stripe para los cobros, recordatorios automáticos, fidelización, comisiones de peluquero, inventario, facturación, calendario con FullCalendar y un panel de plataforma para los administradores del sistema.

Que sí.

Pero si tienes una peluquería de perros y entiendes a la primera, esto es lo que es:

El sitio donde dejas de llevarlo todo en un Excel que solo tú entiendes, una libreta llena de manchas y dieciocho conversaciones de WhatsApp abiertas a la vez.

Eso es peluguau.

Lo demás es decoración.

---

## Por qué existe

Porque hay una señora en algún lugar de España, 30 a 45 años, dos o tres peluqueras a su cargo, factura entre 8 y 25 mil euros al mes, y a las once de la noche un domingo todavía está respondiendo WhatsApps de gente que pregunta si hay hueco el martes.

Y el martes ya estaba lleno.

Y la del corte de las cinco se ha caído otra vez.

Y mañana le toca pagar el alquiler del local y no tiene ni idea de si este mes ha ganado dinero o si solo se ha pagado el sueldo.

Esa señora existe. Está en el documento `docs/avatar.md` con pelos y señales.

peluguau se ha construido para ella.

Punto.

---

## Cómo está montado el invento

Tres aplicaciones. Una carpeta cada una. Conviven en el mismo monorepo y se llaman entre sí sin postureo.

**`groomly-backend`** — La API. Node 20, Express, TypeScript, Prisma. SQLite en desarrollo, Postgres en producción. Si Stripe está configurado cobra de verdad; si no, funciona en modo mock y te deja desarrollar sin tarjeta. 232 tests pasando. No hay magia.

**`groomly-web`** — La aplicación principal. React 19 con Vite, Tailwind 4, Zustand para el estado, React Query para los fetches, FullCalendar para la agenda y Recharts para gráficas. Es donde vive el panel del salón, el portal del cliente y el `/platform` para los admins de la plataforma.

**`groomly-landing`** — La página pública. Next.js 16, App Router, Tailwind 4. Sirve para que alguien que llega de Instagram aterrice, vea el precio, lea la garantía y se registre o no se registre.

Tres terminales abiertas, tres `npm run dev`, tres puertos: 3000, 5173 y 3001.

Si has trabajado con monorepos esto te suena.

Si no has trabajado con monorepos, el README tiene los comandos uno detrás del otro y funcionan.

---

## El nombre

Por dentro la cosa se llama "Groomly". Carpetas, imports, `package.json`, identificadores TypeScript, todo eso sigue diciendo Groomly. Eso es la tubería.

Por fuera el producto se llama **peluguau**. La marca pública. Lo que ve la peluquera. Lo que pone en la landing, en los emails, en las metaetiquetas.

Es importante no liarse: si tocas tubería, Groomly. Si tocas algo que lo va a leer un cliente, peluguau.

No se renombra la tubería sin permiso explícito. Esto está en la memoria, en `project-groomly.md`, y romper imports porque uno se viene arriba renombrando es la forma rápida de cargarse el día.

---

## El modelo de datos

Multi-tenant de los serios. Cada salón es un `salonId` y ese identificador viaja en un header `X-Salon-Id` en cada petición de negocio.

Las tablas de dominio llevan `salonId NOT NULL` con índices compuestos por tenant. Soft deletes en las entidades principales. Audit logging centralizado en `lib/auditLog.ts`. Planes con límites duros aplicados por middlewares (`requirePlanFeature`, `requirePlanLimit`).

Por si no te queda claro: aquí no se filtran datos de un salón a otro. Y si se filtran es un bug y hay que arreglarlo el mismo día.

Las entidades principales son las que esperas:

- **Identidad**: `User`, `VerificationToken`.
- **Tenant**: `Salon`, `SalonSettings`, `SalonUser`, `Integration`.
- **Mascotas**: `Pet`, `PetPhoto` (antes/después), `PetServiceHistory`.
- **Clientes**: `Customer`, `CustomerPet`.
- **Servicios**: `Service`, `ServiceAddon`, `ServicePackage`.
- **Citas**: `Appointment`, `AppointmentService`, `GroomingSlot`, `WaitlistEntry`.
- **Staff**: `Groomer`, `GroomerSchedule`, `GroomerTimeOff`.
- **Finanzas**: `Invoice`, `InvoiceLine`, `Payment`, `Transaction`, `Expense`, `InventoryItem`, `StockMovement`, `Commission`.
- **Fidelización**: `LoyaltyRule`, `LoyaltyTransaction`, `Coupon`, `CustomerCoupon`.
- **Comunicaciones**: `Message`, `Notification`, `Reminder`, `Review`.
- **Auditoría**: `AuditLog`.

Sí, son muchas tablas. Una peluquería tiene muchas cosas pasando a la vez. No te creas a quien te diga lo contrario.

---

## Roles

Cinco roles dentro del salón y un sexto rol global para la plataforma:

- **OWNER** — La dueña. Acceso total.
- **MANAGER** — Gerente. Gestiona casi todo menos lo que la dueña reserve para ella.
- **GROOMER** — Peluquera. Su calendario, sus mascotas asignadas.
- **RECEPTIONIST** — Recepción. Citas, clientes, cobros básicos.
- **CUSTOMER** — Cliente. Solo el portal `/portal`.
- **Platform admin** — El que mira `/platform`. Bandera `User.isPlatformAdmin` en la base de datos.

Cada rol con sus permisos por dominio: `appointments:read`, `appointments:write`, etc.

No hay sorpresas. No hay roles ocultos. Lo que ves es lo que hay.

---

## El estado del proyecto

Ocho sprints técnicos. Del **sprint 00** (fundación, monorepo, auth, multi-tenant) hasta el **sprint 07** (Stripe billing, panel platform, landing pública).

Los ocho marcados como hechos.

Esto significa que el producto técnico está terminado. No es un MVP a medio cocinar. Es un ERP completo que puedes poner en producción mañana si tienes claro dónde lo despliegas.

Lo que **no** está cerrado:

- **Dockerfile**. No hay.
- **GitHub Actions**. No hay.
- **Migración automática en deploy**. No hay.
- **Hosting decidido**. No hay.
- **Storage de fotos**. Ahora mismo viven como data URL en la base de datos. Hay que sacarlas a R2 o S3 antes de tener 5.000 clientes haciendo fotos antes/después.

Cuando alguien decida la plataforma de despliegue, todo eso se monta. Hasta entonces, en desarrollo va.

---

## El otro proyecto que vive aquí dentro

Y aquí viene la parte que la mayoría de los repos de software no tienen.

peluguau tiene una segunda capa que no es código.

Es **comercial**.

Mira los ficheros en la raíz: `AUDITORIA_GROOMLY.md`, `PLAN_ACCION_COMERCIAL.md`, `SKILL.md` (que activa un consejo asesor virtual con seis nombres serios del marketing). Mira la carpeta `docs/`: `avatar.md`, `dfy-landing-copy.md`, `dfy-service.md`, `dfy-checklist-operativo.md`, `garantia.md`, `outreach-script.md`, `feedback-mercado.md`, `migracion-free-users.md`, `crm-template.md`.

Esto es de las cosas más raras y más interesantes que tiene este repositorio.

Aquí no solo se ha construido un software. Aquí se ha construido también la oferta comercial. Con su pricing nuevo (mata el plan Free, sube Professional a 97, Business a 297, Done-For-You a 1.997 setup + 297/mes), su garantía de 60 días, su avatar definido, su guion de outreach, su funnel completo.

Hay un plan de acción comercial a 12 semanas. Seis sprints comerciales paralelos a los técnicos. Hormozi, Brunson, Godin firmando con su nombre cada bloque.

Hay 16 auditorías por bloque del producto en `docs/auditoria-bloque-NN-*.md`. Una por cada bloque funcional (landing, auth, agenda, clientes, servicios, peluqueros, equipo, finanzas...). Cada auditoría con hallazgos cross-cutting, bugs detectados, prioridades marcadas con emoji (🚨 urgente, 🔥 alta, 🛠️ media, 📈 baja) y siguiente paso sugerido.

Esto no es decoración tampoco.

Esto es el plan operativo de los próximos meses.

---

## Cómo se trabaja contra los audits

El usuario llega con un audit y dice "vamos a hacer el bloque 4". O sea: "vamos a la agenda".

Y entonces:

1. Primero los 🚨 urgentes. Suelen ser bugs reales de ESLint y refactor para extraer cosas a `lib/`.
2. Luego los 🔥 alta que sean **frontend-only**. Lo que se ve. Lo que mueve la aguja sin tocar backend.
3. Lo que requiere backend nuevo (recordatorios reales, recurrencia, depósitos en Stripe) es un proyecto grande. Se confirma antes de empezar. No se mete a la torera.

Hay una regla blanda pero importante: **no se renombra tubería técnica sin permiso**. Y otra regla dura: en el código se enforce la regla ESLint `set-state-in-effect`. Si te tienta poner un `useEffect` para resetear estado cuando cambia una prop, no. Patrón correcto: `key={initial?.id}` en el sub-componente. Esto está en la memoria, viene de un incidente real, y no se discute.

---

## Convenciones del texto visible

Si escribes algo que va a leer un humano (alt, title, header, footer, copy, email, metadata, descripción para el usuario): **tildes y eñes correctas**.

Sí, todas.

El audit marca como sistémico el texto sin tildar. Y tiene razón. Una peluquería canina en España no quiere leer "Configuracion" sin tilde. Quiere leer "Configuración".

Si la convención no se cumple, se ve. Y si se ve, se nota. Y si se nota, baja la confianza.

Esto también está en la memoria. No es opinión.

---

## Resumen para gente con prisa

- **Qué es:** ERP SaaS multi-tenant para peluquerías caninas, marca pública peluguau, codebase llamado Groomly.
- **Para quién:** Dueñas de peluquería canina independiente en España con 2-4 peluqueras. Avatar exacto en `docs/avatar.md`.
- **Estado técnico:** 8 sprints terminados (00 a 07). Producción posible cuando se decida hosting.
- **Estado comercial:** Plan a 12 semanas listo. Oferta replanteada (mata el Free, sube precios x3-x5, añade DFY de 1.997+297/mes, garantía de 60 días + devolución +50 €). Pendiente ejecución del outreach.
- **Stack:** Node 20 + Express + Prisma + SQLite/Postgres en el backend. React 19 + Vite + Tailwind 4 + Zustand + React Query en el panel. Next.js 16 en la landing. Stripe para los cobros.
- **Próximos frentes:** auditorías por bloque (16 en total, 4 ya auditado), arranque de outreach masivo, despliegue a producción y migración de fotos a storage externo.

---

## Una cosa más

Esto se ha pensado para una persona concreta.

No para "el mercado".

No para "todas las pymes españolas".

No para "el sector de los servicios para mascotas".

Para una mujer de 30 a 45 años, con su salón, con sus dos o tres empleadas, con su libreta y su WhatsApp Business saturado, que se ha leído tres veces el congreso de la ANPCC y que sigue cobrando lo mismo que cuando abrió hace ocho años porque le da miedo subir precios.

Si peluguau resuelve el problema de esa mujer, todo lo demás cae solo.

Si no, no hay landing bonita ni roadmap impecable que arregle nada.

Eso es lo que hay.

Y eso es lo que se está construyendo.
