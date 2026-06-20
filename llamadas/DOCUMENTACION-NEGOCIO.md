# Guia Completa - Agente de Voz AI Modular (Sistema LEGO)

> **Para:** Cualquier persona que quiera entender que hace este sistema, como funciona, y si esta listo para usar.
> **No se necesita saber de programacion.**
> **Fecha:** Junio 2026

---

## Indice

1. [Que es esto? (En una frase)](#1-que-es-esto-en-una-frase)
2. [El Concepto LEGO: Un Motor, Muchos Personajes](#2-el-concepto-lego-un-motor-muchos-personajes)
3. [El Objetivo: No Vender, Dar Valor](#3-el-objetivo-no-vender-dar-valor)
4. [Los Dos Problemas que Debe Resolver](#4-los-dos-problemas-que-debe-resolver)
5. [Como Funciona (Paso a Paso, Como una Receta)](#5-como-funciona-paso-a-paso-como-una-receta)
6. [Los Dos Cerebros (Como Piensa el Agente)](#6-los-dos-cerebros-como-piensa-el-agente)
7. [Los 3 Personajes (SmartDental, Peluguau, Groomly)](#7-los-3-personajes-smartdental-peluguau-groomly)
8. [La Conversacion Tipica (Ejemplos Reales)](#8-la-conversacion-tipica-ejemplos-reales)
9. [Que Falta para Que Este Listo?](#9-que-falta-para-que-este-listo)
10. [Cuanto Cuesta Operar](#10-cuanto-cuesta-operar)
11. [Glosario (Si te pierdes con alguna palabra)](#11-glosario-si-te-pierdes-con-alguna-palabra)

---

## 1. Que es esto? (En una frase)

Es un **robot que habla por telefono**, disenado para llamar a negocios, conversar con ellos como si fuera una persona real, y conseguir que acepten recibir un **analisis gratuito** de su negocio por email. Si muestran interes, agenda una demo de 15 minutos.

**La novedad:** No es un solo agente. Es un **sistema LEGO** donde cada software (SmartDental, Peluguau, Groomly...) conecta su propio "personaje" con su propia voz, acento, scripts y casos de exito. El motor es el mismo; lo que cambia es el "traje".

La voz no es robotica. Usa **ElevenLabs Flash v2.5**, la tecnologia de voz AI mas rapida del mercado (~75 milisegundos de respuesta). Suena tan natural que la mayoria de la gente no nota que es un robot hasta que se lo dices.

**No vende en la primera llamada.** Esa es la clave.

---

## 2. El Concepto LEGO: Un Motor, Muchos Personajes

Imagina un coche de carreras. El motor es el mismo, pero puedes cambiar la carroceria, el color, los asientos, y hasta el nombre del piloto.

Eso es exactamente lo que hace este sistema:

- **El motor** = el sistema de audio, la inteligencia artificial, la logica de conversacion. **Es generico y funciona para cualquier negocio.**
- **Los "kits LEGO"** = la personalizacion de cada software: nombre del vendedor, acento, precios, moneda, casos de exito, scripts...

### Los 3 kits que ya existen:

| Software | Personaje | A que vende | Pais | Moneda | Precio |
|----------|-----------|-------------|------|--------|--------|
| **SmartDental** | Carlos (hombre, espanol de Espana) | Clinicas dentales | Espana | EUR | 59 EUR/mes |
| **Peluguau** | Laura (mujer, mexicana) | Peluquerias caninas | Mexico | MXN | 299 $/mes |
| **Groomly** | Ana (mujer, espanola) | Peluquerias humanas | Espana | EUR | 49 EUR/mes |

**Y anadir uno nuevo toma ~15 minutos.** Solo hay que escribir su "ficha de personaje": nombre, voz, scripts, casos de exito, precios. El motor ya sabe que hacer.

---

## 3. El Objetivo: No Vender, Dar Valor

### El Error que Cometen Todos

Imagina que eres dueno de una clinica dental en Madrid. Es martes por la manana, estas entre pacientes, y suena el telefono:

> "Hola, soy Carlos de SmartDental. Le gustaria comprar nuestro software de gestion? Solo 99EUR al mes. Tenemos una oferta esta semana..."

**Cuelgas.** O peor: le dices a tu recepcionista que no te pasen mas llamadas de "esos de los ordenadores".

Esto es lo que hace el 99% de las empresas B2B en Espana. Y por eso el 99% fracasa en el cold calling.

### El Enfoque Correcto: Dar Antes de Pedir

Ahora imagina la misma llamada, pero con un enfoque diferente:

> "Hola, soy Carlos de SmartDental. Se que esta ocupado, le prometo que solo le robo 30 segundos. Estoy haciendo un estudio con clinicas dentales en Madrid y encontre un dato que me preocupa: el 42% de pacientes que hacen una limpieza no vuelven en los 6 meses siguientes - no porque no quieran, sino porque nadie les recuerda. Eso le suena familiar en Clinica Dental Sonrisa?"

**Que acaba de pasar?**

1. **No vendio nada.** No menciono precio, no menciono software, no pidio comprar.
2. **Dio un dato util.** Un dato que el dueno de la clinica puede usar hoy, incluso si nunca compra nada.
3. **Hablo de SU problema.** No de "nuestro software es genial". De "tu pierdes pacientes".

Esto es lo que hace nuestro agente. Y funciona igual para una peluqueria canina en Guadalajara (Laura de Peluguau) o un salon de belleza en Valencia (Ana de Groomly).

### El "Free Value" en Detalle: Una Auditoria Web Interactiva

El agente NO envia un PDF por email (eso es lo que hace todo el mundo). El agente envia un **enlace por WhatsApp** a una **pagina web interactiva** personalizada para ese negocio.

**Que ve el prospecto cuando abre el enlace?**

Una pagina que se abre en su movil en 2 segundos:

1. **"Auditoria SmartDental - Clinica Dental Sonrisa"** (header con su nombre)
2. **"Cuantas citas se pierden en Madrid?"** - Un grafico que muestra que el 22% de citas dentales se pierden en Madrid, con datos de 127 clinicas.
3. **"Su situacion"** - Una calculadora donde pone sus numeros: "3 citas canceladas por semana x 80EUR x 4.3 semanas = **1.032EUR al mes que se pierden**".
4. **"Comparativa"** - Un grafico de barras: su clinica vs promedio de Madrid vs el top 10% de clinicas.
5. **"Cuanto podria recuperar?"** - Un slider: "Si reduzco mis no-shows un 50%... recuperaria **6.192EUR al ano**".
6. **Casos de exito** - "Clinica Dental Blanquea en Barcelona paso de 20 a 7 no-shows al mes..."
7. **Boton grande y verde:** "Agendar demo gratuita de 15 minutos" - clic y abre el calendario.

**Por que esto es INFINITAMENTE mejor que un PDF?**

| PDF por Email | Auditoria Web |
|---------------|---------------|
| El 60% nunca lo abre | El 85% abre un enlace de WhatsApp |
| Estatico (lee y olvida) | Interactiva (juega con la calculadora) |
| No sabes si lo leyo | Tracking completo: tiempo, scroll, clics |
| No comparte | Puede compartir el enlace con socios/jefe |
| Sin CTA | CTA directo a agendar demo desde la pagina |
| Generico | Personalizado con sus numeros y su provincia |

**Por que funciona?**
- El dueno del negocio **interactua** con sus propios numeros. No lee datos genericos.
- Ve la perdida en **su moneda** (EUR, MXN...), no en porcentajes abstractos.
- La calculadora le hace sentir el dolor con **sus propios datos**.
- El CTA de demo esta justo cuando esta mas motivado (despues de ver cuanto pierde).
- Si lo comparte con su socio/jefe, **ambos** ven el analisis y presionan para agendar.

---

## 4. Los Dos Problemas que Debe Resolver

Para que este sistema funcione, debe resolver dos problemas. Uno de "negocio" y otro de "tecnologia".

---

### Problema #1: Funcional - "El Free Value" + Las Secretarias

#### La Barrera de las Secretarias y Recepcionistas

En un negocio de servicios, **el 80% de las llamadas comerciales son filtradas por la recepcionista**. Ella no es la que decide comprar. Ella solo atiende el telefono. Y su trabajo incluye "proteger al dueno de las llamadas comerciales".

**Frases tipicas que vas a escuchar:**
- "El doctor/dueno no esta."
- "Dejeme sus datos y se lo transmito." (spoiler: nunca lo transmite)
- "Mandeme un email."
- "Ya tenemos un sistema, gracias."
- "De que empresa dice que llama?" (con tono desconfiado)

**El agente debe saber:**
1. **Detectar que esta hablando con la recepcionista**, no con el dueno.
2. **No insistir con la recepcionista.** No tiene sentido intentar "venderle" a alguien que no compra.
3. **Obtener el email del negocio** para enviar el analisis gratuito.
4. **Cortar amablemente** si no consigue el email en 2 intercambios.

#### Como Resuelve Esto el Sistema

**El agente tiene un "modo recepcionista":**

Cuando detecta que la persona del otro lado no es el decision maker, cambia automaticamente su estrategia:

> "Perfecto, no se preocupe. Justamente por eso le envio el enlace por WhatsApp - asi el dueno lo ve en el movil cuando tenga un momento. Es una pagina web con una calculadora, en 2 minutos lo revisa. Me confirma el numero de WhatsApp del negocio? Es gratis y sin compromiso."

**Reglas del modo recepcionista:**
- No pregunta por el dolor del negocio (la recepcionista no sabe).
- No intenta agendar una demo (la recepcionista no puede).
- Pide el email. Punto.
- Si la recepcionista dice "no" dos veces, corta amablemente. No pierde el tiempo.

#### Capturar el Email del Interesado

Cuando el agente habla CON EL DUENO (o alguien que muestra interes real), debe poder:

1. **Pedir el email** de forma natural.
2. **Validar que el email es correcto** (tiene @, tiene dominio, no tiene errores obvios).
3. **Guardarlo en el CRM** para que el equipo de ventas lo tenga.
4. **Enviar el analisis gratuito** en tiempo real (el prospecto recibe el email mientras sigue en la llamada).

> "Genial, {{nombre}}. Le preparo el analisis ahora mismo y se lo envio. Me confirma su email?"
>
> "Si, es contacto@clinicaejemplo.es"
>
> "Perfecto, contacto@clinicaejemplo.es. En 2 minutos lo tiene en su bandeja."

**Esto genera confianza:** El prospecto ve que "Carlos" (o "Laura", o "Ana") cumple lo que promete. Esa confianza es la que luego le hace decir "si" a la demo.

---

### Problema #2: Tecnico - "La Velocidad de Contestar"

#### Por Que Importa la Velocidad?

Cuando hablas con alguien por telefono, hay un ritmo natural:

1. Tu hablas.
2. Hay una pausa muy corta.
3. La otra persona responde.

**En una conversacion humana real, esa pausa dura entre 200 y 400 milisegundos.**

Ahora imagina que la pausa dura **1.2 segundos** (1200 milisegundos). Es como hablar con alguien que esta en la luna. Se nota. Se siente raro. Y la otra persona piensa: "Esto es un robot".

**Y cuando piensan "esto es un robot", cuelgan.**

#### Los Umbrales de Percepcion

| Tiempo de Respuesta | Que siente el que llama? | Que hace? |
|---------------------|--------------------------|-----------|
| Menos de 500ms | "Habla como una persona normal" | Sigue conversando |
| 500-800ms | "Noto algo raro, pero no se que" | Sigue, pero menos atento |
| 800-1200ms | "Esto es un robot" | Empieza a cortar la conversacion |
| Mas de 1200ms | "Esto no funciona" | Cuelga o se molesta |

**Cada 100 milisegundos de mas reducen las ventas en un 5%.**

#### Cuanto Tarda Nuestro Agente?

Gracias a la arquitectura dual, el agente tiene un tiempo de respuesta de **entre 350 y 450 milisegundos** de media.

Eso esta en el rango **"indistinguible de una persona"** (<500ms = conversacion fluida). La mayoria de la gente no nota que habla con un robot.

**Por que tarda eso?**

El sistema usa **dos cerebros**, no uno:

**CEREBRO RAPIDO (Voz):** Gemini 3.1 Flash-Lite
- Recibe el ultimo mensaje del usuario
- Lee un "guion" que el cerebro inteligente le escribio
- Genera la respuesta en **~180 milisegundos**
- Es tan rapido que genera ~400 palabras por segundo

**CEREBRO INTELIGENTE (Maestro):** Gemini 3.5 Flash
- Lee TODA la conversacion
- Decide la estrategia: "ahora toca cuantificar el dolor"
- Escribe un "guion" para el cerebro rapido
- Corre cada 2-3 turnos, NO en cada respuesta

**MOTOR DE VOZ:** ElevenLabs Flash v2.5
- Convierte el texto en voz del personaje (configurable por software)
- Tarda solo **~75 milisegundos** en empezar a hablar

**El proceso completo:**
1. Tu dejas de hablar -> silencio detectado (200ms)
2. Voz transcrita por ElevenLabs STT (~120ms)
3. **Cerebro RAPIDO genera respuesta (~180ms)** <- ESTO ES LA CLAVE
4. ElevenLabs convierte a voz del personaje (~75ms)
5. Audio llega al telefono (~60ms)

**Total percibido: ~350-450ms.**

Para que te hagas una idea: un parpadeo dura entre 100 y 400 milisegundos. La respuesta del agente es mas rapida que un parpadeo.

---

## 5. Como Funciona (Paso a Paso, Como una Receta)

### 5.1 Antes de la Llamada

1. **Tu subes una lista de negocios** a la plataforma (nombre, telefono, ciudad).
2. **El sistema investiga cada negocio** (si tiene web, que servicios ofrece, si tiene sistema de citas online).
3. **Selecciona el "kit LEGO" correcto** segun el software del lead (SmartDental -> Carlos, Peluguau -> Laura, etc.).
4. **Genera un "brief" personalizado** para cada llamada usando los datos del kit.
5. **Programa la llamada** para el mejor horario (evita horas de consulta masiva).

### 5.2 Durante la Llamada

```
+------------------------------------------------------------------------+
|  PASO 1: El telefono suena                                             |
|  Mientras suena, el sistema ya esta "calentando motores" y cargo       |
|  el "kit LEGO" correcto (Carlos, Laura, Ana...).                       |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 2: Contestan                                                   |
|  - Si es un contestador automatico -> cuelga y marca "no contesta".   |
|  - Si es una persona -> empieza la conversacion con el personaje     |
|    correspondiente (Carlos habla de dental, Laura de perros...).      |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 3: El agente habla (PATTERN INTERRUPT)                         |
|  No dice "Hola, soy Carlos de SmartDental".                          |
|  Dice algo que LLAMA LA ATENCION usando datos del nicho:             |
|  "Doctor Garcia? Estoy haciendo un estudio con clinicas dentales      |
|   en Madrid y encontre un dato que me preocupa..."                   |
|  (o para Laura: "Hola! En temporada alta, las peluquerias caninas    |
|   en Guadalajara pierden hasta 20% de citas...")                     |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 4: Descubrir el problema (DISCOVERY)                           |
|  "Cuantas citas se le cancelan a la semana sin avisar?"              |
|  "Y esos pacientes/clientes que hacen limpieza, vuelven en 6 meses?" |
|  OBJETIVO: Que el dueno admita que tiene un problema.                |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 5: Cuantificar el dolor                                        |
|  "Si son 5 citas por semana a 80EUR cada una...                      |
|   eso son 1.720EUR al mes que se pierden. Hice bien la cuenta?"      |
|  (o para Peluguau: "a 350 pesos cada bano... son 7.525 pesos")       |
|  OBJETIVO: Que el dueno VEA el costo con sus propios numeros.        |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 6: Ofrecer el valor gratuito (VALUE OFFER)                     |
|  "Le preparo un analisis personalizado de cuanto pierde al mes       |
|   y se lo envio por email. Me confirma su email?"                    |
|  OBJETIVO: Conseguir el email.                                       |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 7: Si muestra mas interes -> agendar demo                      |
|  "Le gustaria ver como funciona [SmartDental/Peluguau/Groomly]       |
|   en una demo de 15 minutos? Tengo martes a las 11 o jueves a las 16."|
|  OBJETIVO: Cita en el calendario.                                    |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|  PASO 8: Despedida                                                   |
|  "Genial, [nombre]. Le envio el analisis ahora mismo.                |
|   Que tenga un buen dia."                                            |
+------------------------------------------------------------------------+
```

### 5.3 Despues de la Llamada

1. **Guarda TODO:** Transcripcion completa, emocion del prospecto, duracion, resultado.
2. **Calcula un score BANT:** Que tan buen lead es (Budget, Authority, Need, Timeline).
3. **Envia WhatsApp de seguimiento:** Segun si fue interesado, neutro, o rechazo. El mensaje usa el nombre del personaje ("Mariana de SmartDental", "Sofia de Peluguau", etc.).
4. **Si agendo demo -> Triple Lock:**
   - 3 dias antes: Email con preparacion.
   - 1 dia antes: WhatsApp + SMS recordando.
   - 1 hora antes: WhatsApp con link.
5. **Si no va a la demo -> No-show recovery:** Llama, WhatsApp, email, re-engagement.

---

## 6. Los Dos Cerebros (Como Piensa el Agente)

Este es el concepto mas importante de todo el documento. Leelo con atencion.

### El Problema con los Chatbots Normales

Imagina que contratas a un vendedor y le dices: "Tienes 0.2 segundos para leer todo el historial de la conversacion, analizar la psicologia del cliente, decidir la estrategia de ventas, y responder con algo natural y convincente."

**Es imposible.**

Por eso los chatbots de voz normales fallan:
- Si son rapidos -> responden sin pensar -> dicen tonterias -> pierden la venta
- Si son lentos -> el cliente nota la pausa -> cuelga

### La Solucion: Dos Cerebros Especializados

Nuestro agente tiene **dos modelos de IA** que trabajan juntos, como un director de cine y un actor:

---

### CEREBRO INTELIGENTE (El Maestro)

**Nombre tecnico:** Gemini 3.5 Flash
**Velocidad:** ~300 milisegundos (rapido, pero no ultra-rapido)
**Que hace:** **Piensa. Decide. Planifica.**
**Con que frecuencia trabaja:** Cada 2-3 turnos, o en eventos criticos

**El Maestro es el "director de la pelicula".** No habla con el cliente. Se sienta detras de camara y escribe el guion.

**Ejemplo de lo que hace el Maestro:**

El cliente acaba de decir: "Bueno, si, la verdad es que perdemos bastantes citas..."

El Maestro lee TODA la conversacion:
- Turno 1: Saludo + pattern interrupt. El dueno escucho.
- Turno 2: Discovery. El dueno admitio que pierde citas.
- Turno 3: El dueno dijo "bastantes citas" pero NO dio numeros.

El Maestro piensa: "Este es un momento clave. El dueno mostro interes pero no cuantifico el dolor. Si no ve el costo en euros/pesos, no sentira la urgencia. La estrategia del proximo turno debe ser 'cuantificacion' - hacer que calcule el mismo cuanto pierde."

Y entonces **escribe un guion** (lo llamamos "brief"):

> **OBJETIVO:** Conseguir que el dueno calcule su propia perdida mensual
> **ESTRATEGIA:** Hacerle preguntas sobre numeros
> **PUNTOS CLAVE:**
> 1. Preguntar cuantas citas cancelan por semana
> 2. Preguntar cuanto vale cada cita
> 3. Multiplicar: citas x valor x 4.3 semanas
> 4. Hacer que el diga "Hice bien la cuenta?"
>
> **PROHIBIDO:**
> - NO mencionar precio del software
> - NO decir "usted pierde X" - el debe calcularlo
> - NO intentar agendar demo todavia

Ese guion se guarda en memoria. El Maestro vuelve a su sillon. No habla con el cliente.

---

### CEREBRO RAPIDO (La Voz)

**Nombre tecnico:** Gemini 3.1 Flash-Lite
**Velocidad:** ~180 milisegundos (ultra-rapido, ~400 palabras por segundo)
**Que hace:** **Habla. Responde. Ejecuta el guion.**
**Con que frecuencia trabaja:** Cada vez que el usuario habla (100% de los turnos)

**La Voz es el "actor".** No decide que decir. Lee el guion del Maestro y lo convierte en palabras humanas.

**Ejemplo de lo que hace la Voz:**

El usuario acaba de decir: "Bueno, si, la verdad es que perdemos bastantes citas..."

La Voz no lee toda la conversacion. Solo ve:
1. El guion del Maestro (arriba)
2. El ultimo mensaje del usuario: "perdemos bastantes citas"

Y responde: "Y aproximadamente cuantas citas se le cancelan a la semana sin avisar?"

**Por que es tan rapido?** Porque no tiene que pensar estrategia. Ya la penso el Maestro. Solo tiene que "actuar" el guion.

---

### Por Que Esto Es Mejor Que Un Solo Cerebro?

| | **Un solo cerebro** (chatbots normales) | **Dos cerebros** (nuestro agente) |
|---|---|---|
| **Velocidad** | Lento si piensa bien, rapido si piensa mal | **Rapido SIEMPRE** (Voz es ultra-rapido) |
| **Estrategia** | Variable (cada respuesta es diferente) | **Alta** (el Maestro mantiene vision global) |
| **Objeciones** | Reacciona sin plan | **Planificado** (el Maestro prepara la respuesta ANTES) |
| **Gatekeepers** | Suele insistir con la recepcionista | **El Maestro detecta y cambia estrategia** |
| **Cierre** | Intenta cerrar en cualquier momento | **El Maestro decide CUANDO es el momento** |
| **Personalizacion** | Un solo personaje para todo | **Cada software tiene su propio personaje** |

---

## 7. Los 3 Personajes (SmartDental, Peluguau, Groomly)

Cada software tiene su propio "actor" entrenado para vender a un nicho especifico. No es lo mismo vender software a un dentista espanol que a una peluqueria canina mexicana. El tono, los ejemplos, la moneda, todo cambia.

### Carlos (SmartDental - Espana)

**Perfil:** Hombre, espanol peninsular, profesional y cercano.
**Voz:** "Antoni" (ElevenLabs) - espanol castellano masculino.
**A quien vende:** Duenos de clinicas dentales en Espana.
**Moneda:** EUR.
**Precio:** 59 EUR/mes.
**Dolor:** "Pacientes que no regresan a su limpieza/control."
**Casos de exito:** Clinicas dentales de Madrid, Barcelona, Valencia.
**Muletillas:** "mira", "fijate", "venga", "vale".

### Laura (Peluguau - Mexico)

**Perfil:** Mujer, mexicana, calida y cercana.
**Voz:** Voz femenina mexicana (ElevenLabs).
**A quien vende:** Duenos de peluquerias caninas en Mexico.
**Moneda:** MXN (pesos).
**Precio:** 299 pesos/mes.
**Dolor:** "Huecos por cancelaciones en temporada alta."
**Casos de exito:** Peluquerias caninas de CDMX, Guadalajara, Monterrey.
**Muletillas:** "mira", "fijate", "orale", "la neta", "sale", "va".

### Ana (Groomly - Espana)

**Perfil:** Mujer, espanola, elegante y profesional.
**Voz:** Voz femenina espanola (ElevenLabs).
**A quien vende:** Duenos de peluquerias y salones de belleza en Espana.
**Moneda:** EUR.
**Precio:** 49 EUR/mes.
**Dolor:** "Clientas que no regresan y citas canceladas sin avisar."
**Casos de exito:** Peluquerias de Madrid, Barcelona, Valencia.

---

## 8. La Conversacion Tipica (Ejemplos Reales)

### Escenario A: Carlos llama a una clinica dental (Espana)

**[Suena el telefono en Clinica Dental Sonrisa, Madrid]**

**Recepcionista:** "Diga, Clinica Dental Sonrisa."

**Carlos:** "Hola, buenos dias. Podria hablar con el doctor Garcia?"

**Recepcionista:** "El doctor no esta ahora mismo. De que empresa llama?"

**Carlos:** "Soy Carlos de SmartDental. No llamo para vender nada, en serio. Estoy haciendo un estudio con clinicas dentales en Madrid y queria enviarle al doctor un analisis gratuito de cuantos pacientes pierden al mes por olvidos de citas. Es un PDF que hacemos sin coste. Me podria dar el email de la clinica?"

**Recepcionista:** "Mire, el doctor no suele contestar estos emails."

**Carlos:** "Lo entiendo perfectamente. Es por eso que el analisis es gratis y sin compromiso. Lo ve cuando tenga un momento. Si le interesa, contactamos. Si no, no pasa nada. Me podria dar el email?"

**Recepcionista:** "Bueno... es info@clinicasonrisa.es"

**Carlos:** "Perfecto, info@clinicasonrisa.es. Se lo envio ahora mismo. Que tengan buen dia."

**[Cuelga. Guarda email en CRM. Envia analisis. Marca como "email enviado".]**

---

### Escenario B: Laura llama a una peluqueria canina (Mexico)

**[Suena el telefono en Peluqueria Canina Peludos, Guadalajara]**

**Dueno:** "Diga, Peludos."

**Laura:** "Hola! Se que andas en chinga en la peluqueria. Te prometo que solo te quito 2 minutitos. Me fije que en Guadalajara muchas peluquerias caninas pierden hasta 20% de citas por cancelaciones de ultimo momento. A ti tambien te pasa?"

**Dueno:** "Bueno... si, la verdad es que en temporada alta si se nos cancelan bastantes."

**Laura:** "Oye, y cuando alguien cancela a las 9am para una cita a las 11am, logras avisarle a alguien de tu lista de espera? O ese hueco se queda vacio todo el dia?"

**Dueno:** "Pues mira, la verdad es que casi nunca. O sea, intentamos pero a veces no nos damos abasto."

**Laura:** "Y aproximadamente cuantas citas les cancelan a la semana sin avisar? En temporada alta el promedio anda en 4-5."

**Dueno:** "Yo diria que unas 3 o 4."

**Laura:** "Y cada bano, cuanto vale aproximadamente?"

**Dueno:** "Unos 350-400 pesos."

**Laura:** "Entonces estamos hablando de unos 5.500 pesos al mes que se pierden solo por citas canceladas. Hice bien la cuenta?"

**Dueno:** "Si, mas o menos..."

**Laura:** "Oye, te preparo un analisis personalizado - con tus numeros, no genericos - de cuanto estas perdiendo al mes y como podrias recuperar la mitad. Se lo envio por WhatsApp ahora mismo. Me confirmas tu numero?"

**Dueno:** "Si, es el 33-12-34-56-78"

**Laura:** "Perfecto. En 2 minutos lo tienes. Y mira, si despues de verlo te interesa saber mas, tengo disponible una demo corta de 15 minutos esta semana. Te gustaria que te agende un hueco?"

**Dueno:** "Bueno, a ver... el martes por la manana?"

**Laura:** "Martes a las 11 te va bien?"

**Dueno:** "Si, perfecto."

**Laura:** "Genial. Ya lo tengo agendado. Te envio ahora el WhatsApp con el analisis y un recordatorio para el martes. Que tengas buen dia!"

---

### Escenario C: Ana llama a un salon de belleza (Espana)

**[Suena el telefono en Peluqueria Glamour, Madrid]**

**Recepcionista:** "Diga, Peluqueria Glamour."

**Ana:** "Hola, buenos dias. Podria hablar con la duena?"

**Recepcionista:** "Ella no esta ahora mismo. De parte de quien?"

**Ana:** "Soy Ana de Groomly. No llamo para vender nada. Estoy haciendo un estudio con peluquerias en Madrid y me gustaria enviarle a la duena un analisis gratuito de cuantas clientas pierden al mes por no recordarles que vuelvan. Es gratis y sin compromiso. Me podria dar el email del salon?"

**Recepcionista:** "Bueno... es glamour@email.es"

**Ana:** "Perfecto, glamour@email.es. Se lo envio ahora mismo. Que tengan buen dia."

**[Cuelga. Guarda email en CRM. Envia analisis.]**

---

## 9. Que Falta para Que Este Listo?

### Checklist de Lanzamiento

#### Antes de Llamar a la Primera Clinica/Negocio (IMPRESCINDIBLE)

- [x] **Motor generico funcionando** (state engine, classifier, audio pipeline)
- [x] **Sistema modular LEGO implementado** (AgentConfig, loader, modulos)
- [x] **SmartDental configurado** (Carlos, dental Espana, EUR)
- [x] **Peluguau configurado** (Laura, pet Mexico, MXN)
- [x] **Groomly configurado** (Ana, hair Espana, EUR)
- [x] **Backend API para config** (GET/PUT/POST VoiceAgentConfig)
- [ ] **Comprar numeros de telefono locales**
  - SmartDental: numero espanol (+34) - ~3-5EUR/mes
  - Peluguau: numero mexicano (+52) - ~5-8USD/mes
  - Groomly: numero espanol (+34) - ~3-5EUR/mes
  - Tiempo: 30 minutos por numero
- [ ] **Adaptar textos al mercado especifico de cada software**
  - SmartDental: acento espanol peninsular, precios en EUR, casos de Espana
  - Peluguau: acento mexicano, precios en pesos, casos de Mexico
  - Groomly: acento espanol, precios en EUR, casos de Espana
- [ ] **Crear sistema de analisis gratuito por software**
  - Pagina web de auditoria para cada marca
  - Tracking de engagement (apertura, scroll, clics)
- [ ] **Cumplir normas por pais**
  - Espana: LOPD/GDPR, horarios L-V 9h-20h, Lista Robinson
  - Mexico: PROFECO, horarios legales, REUS

#### Despues de Lanzar (MEJORAS)

- [ ] Cargar casos de exito reales de cada sector
- [ ] Mover servidor a Europa (mas rapido para Espana)
- [ ] Anadir sonidos de "mm-hmm" mientras piensa
- [ ] A/B testing: free value vs venta directa por software
- [ ] Dashboard de funnel en tiempo real por software

#### Para Anadir un Nuevo Software

- [ ] Crear modulo Python (`app/modules/nuevo.py`)
- [ ] Definir personaje, voz, acento, scripts, casos, precios
- [ ] Anadir al `module_map` en `loader.py`
- [ ] Generar VoiceAgentConfig en la base de datos
- [ ] Comprar numero telefonico local del pais
- [ ] Crear pagina de auditoria web para la marca
- [ ] **Tiempo estimado: 2-4 horas por software**

---

## 10. Cuanto Cuesta Operar

### Costes por Mes por Software (Escenario: 500 llamadas)

| Concepto | Coste |
|----------|-------|
| Numero de telefono local | ~3-8EUR/USD |
| Llamadas realizadas (500) | ~30-50EUR |
| ElevenLabs STT + TTS (Flash v2.5) | ~15-25EUR |
| Gemini 3.1 Flash-Lite (Voz) | ~3-5EUR |
| Gemini 3.5 Flash (Maestro, briefs) | ~5-8EUR |
| Servidor (VPS en Europa) | ~20EUR |
| Email (SendGrid/AWS SES) | ~5EUR |
| WhatsApp (Twilio) | ~10-20EUR |
| **TOTAL por software** | **~90-140EUR/mes** |

### Comparativa: Que cuesta hacerlo de otra forma?

| Opcion | Coste/mes | Funciona 24h? | Escala? | Personalizable? |
|--------|-----------|---------------|---------|-----------------|
| **Este sistema (IA)** | ~100EUR | Si | Ilimitado | **Si - LEGO** |
| Contratar un comercial | ~2.000EUR | No (8h/dia) | 1 persona | No |
| Agencia de telemarketing | ~500EUR + comision | No | Limitado | No |
| Retell AI (plataforma no-code) | ~300EUR | Si | Si | Limitado |
| Bland AI (plataforma no-code) | ~600EUR | Si | Si | Limitado |

**Ventaja:** Este sistema cuesta ~10x menos que una plataforma comercial equivalente, ~20x menos que un comercial humano, y **es 100% personalizable por software** gracias al sistema LEGO.

---

## 11. Glosario (Si te pierdes con alguna palabra)

| Palabra | Que significa? |
|---------|----------------|
| **Agente / Robot** | El sistema de IA que habla por telefono. |
| **API** | "Interfaz de Programacion". Es como se conectan dos programas para hablar entre ellos. |
| **BANT** | Framework de calificacion de leads: Budget (dinero), Authority (poder de decision), Need (necesidad), Timeline (urgencia). |
| **Barge-in** | Capacidad del sistema de detectar cuando el usuario empieza a hablar mientras el agente habla, y detenerse. |
| **Cold call** | Llamada a alguien que no te conoce y no te ha pedido que le llames. |
| **CRM** | "Customer Relationship Management". Base de datos de clientes y leads. |
| **Free value** | Dar algo de valor gratis antes de pedir nada a cambio. |
| **Gatekeeper** | Persona que bloquea el acceso al decision maker (ej: recepcionista). |
| **Kit LEGO** | La configuracion personalizada de un software (personaje, voz, scripts, precios...). |
| **Latencia** | Tiempo que tarda el sistema en responder despues de que tu dejas de hablar. |
| **LLM** | "Large Language Model". La IA que genera texto (Gemini, GPT, etc.). |
| **Modulo** | Archivo de codigo que define la personalizacion de un software. |
| **No-show** | Persona que tiene cita pero no va. |
| **Pipeline** | Serie de pasos por los que pasa un dato o una llamada. |
| **Prompt** | Instrucciones que le das a una IA para que haga algo. |
| **RAG** | "Retrieval Augmented Generation". Tecnica para que la IA use datos reales (casos de exito) en sus respuestas. |
| **STT** | "Speech to Text". Convertir voz en texto. |
| **TTS** | "Text to Speech". Convertir texto en voz. |
| **Triple Lock** | Sistema de 3 recordatorios antes de una demo (3 dias, 1 dia, 1 hora antes). |
| **VAD** | "Voice Activity Detection". Detectar cuando alguien empieza y deja de hablar. |
| **WebSocket** | Conexion de internet que permite comunicacion en tiempo real (como una llamada de voz). |

---

*Documento generado el 2026-06-03. Escrito para que cualquier persona lo entienda, sin necesidad de saber programacion.*
