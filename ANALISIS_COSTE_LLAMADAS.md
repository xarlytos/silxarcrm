# Analisis de Costes - Llamadas Integradas en el CRM

## 1. Resumen Ejecutivo

**Volumen estimado:** 600 llamadas/mes (300 por persona)  
**Duracion media estimada:** 3 minutos  
**Minutos totales/mes:** ~1.800 minutos  
**Conclusion:** Es viable economicamente. El coste mensual oscila entre **15-65 EUR/mes** segun el proveedor.

---

## 2. Opciones Disponibles

### 2.1 Opcion A: Twilio (El estandar de la industria)

Twilio es el proveedor mas maduro y con mejor documentacion, pero tiene una limitacion critica para Espana.

| Concepto | Coste |
|----------|-------|
| Llamada saliente a fijo Espana | **$0.0178 / min** (~0.016 EUR) |
| Llamada saliente a movil Espana | **$0.0388 / min** (~0.036 EUR) |
| Numero de telefono Espanol | **NO DISPONIBLE** con voz habilitada |
| Numero internacional (alternativa) | Desde $1.15 / mes |

**Problema:** Twilio no ofrece numeros españoles con voz. Tendriais que usar un numero de otro pais (ej. UK, Alemania) como caller ID, lo cual reduce drasticamente la tasa de respuesta.

**Coste estimado mensual:**
- 1.800 min a moviles: ~65 EUR
- 1.800 min a fijos: ~29 EUR
- Numero internacional: ~1 EUR
- **Total: ~30-66 EUR/mes**

**Veredicto:** Descartable si necesitais mostrar un numero español.

---

### 2.2 Opcion B: Plivo (Alternativa economica a Twilio)

Plivo ofrece una API similar a Twilio con precios mas agresivos y SI tiene numeros españoles.

| Concepto | Coste |
|----------|-------|
| Llamada saliente a fijo Espana | ~**$0.012 / min** (~0.011 EUR) |
| Llamada saliente a movil Espana | ~**$0.030 / min** (~0.028 EUR) |
| Numero Espanol DID | ~**$3-5 / mes** |

**Coste estimado mensual:**
- 1.800 min a moviles: ~50 EUR
- 1.800 min a fijos: ~20 EUR
- Numero español (x2 personas): ~8 EUR
- **Total: ~28-58 EUR/mes**

**Veredicto:** Buena opcion. API compatible con Twilio, precios mejores, numeros españoles disponibles.

---

### 2.3 Opcion C: Zadarma (Especializado en telefonia VoIP)

Zadarma es un proveedor VoIP europeo con precios muy competitivos y API REST completa.

| Concepto | Coste |
|----------|-------|
| Llamada saliente a fijo Espana | ~**0.004 EUR / min** |
| Llamada saliente a movil Espana | ~**0.018 EUR / min** |
| Numero Espanol DID | ~**3 EUR / mes** |

**Coste estimado mensual:**
- 1.800 min a moviles: ~32 EUR
- 1.800 min a fijos: ~7 EUR
- Numero español (x2 personas): ~6 EUR
- **Total: ~13-38 EUR/mes**

**Veredicto:** La opcion mas economica. API menos "developer-friendly" que Twilio/Plivo pero funcional.

---

### 2.4 Opcion D: Vonage (Nexmo)

Vonage tiene presencia fuerte en Europa y numeros españoles disponibles.

| Concepto | Coste |
|----------|-------|
| Llamada saliente a fijo Espana | ~**0.015 EUR / min** |
| Llamada saliente a movil Espana | ~**0.035 EUR / min** |
| Numero Espanol DID | ~**5 EUR / mes** |

**Coste estimado mensual:**
- 1.800 min a moviles: ~63 EUR
- 1.800 min a fijos: ~27 EUR
- Numero español (x2 personas): ~10 EUR
- **Total: ~37-73 EUR/mes**

**Veredicto:** Precio medio. Buena fiabilidad europea.

---

### 2.5 Opcion E: Sin integracion - "Click to Call" basico

La opcion mas barata: en vez de llamar desde el servidor, el CRM abre la app de telefono nativa.

**Implementacion:**
```html
<a href="tel:+34600123456">Llamar</a>
```

**Coste:** 0 EUR de infraestructura. Pagais lo que pagueis hoy en vuestra tarifa movil/fijo.

**Ventajas:**
- Coste cero de desarrollo e infraestructura
- Usais vuestros numeros actuales (ya conocidos por clientes)
- Cero dependencia de terceros

**Desventajas:**
- No se registra la llamada en el CRM automaticamente
- No hay grabacion de llamadas
- No se puede mostrar "llamando desde el navegador"
- No se puede automatizar (llamadas automaticas, IVR, etc.)

**Veredicto:** Recomendable como **MVP inicial** si el presupuesto es ajustado.

---

### 2.6 Opcion F: 46elks (Proveedor nordico simple)

| Concepto | Coste |
|----------|-------|
| Llamada saliente a Espana | ~**0.030 EUR / min** (fijo y movil) |
| Numero Espanol DID | ~**4 EUR / mes** |

**Coste estimado mensual:**
- 1.800 min: ~54 EUR
- Numeros (x2): ~8 EUR
- **Total: ~62 EUR/mes**

**Veredicto:** API muy simple, precio plano (mismo coste fijo/movil). Bueno si quereis simplicidad.

---

## 3. Tabla Comparativa Resumen

| Proveedor | Fijo/min | Movil/min | Numero/mes | Coste total/mes* | Numero ES | API |
|-----------|----------|-----------|------------|------------------|-----------|-----|
| **Twilio** | 0.016 EUR | 0.036 EUR | NO | 29-66 EUR | No | Excelente |
| **Plivo** | 0.011 EUR | 0.028 EUR | ~4 EUR | 28-58 EUR | Si | Muy buena |
| **Zadarma** | 0.004 EUR | 0.018 EUR | ~3 EUR | 13-38 EUR | Si | Media |
| **Vonage** | 0.015 EUR | 0.035 EUR | ~5 EUR | 37-73 EUR | Si | Buena |
| **46elks** | 0.030 EUR | 0.030 EUR | ~4 EUR | 62 EUR | Si | Simple |
| **Click-to-Call** | 0 EUR | 0 EUR | 0 EUR | 0 EUR | Si | N/A |

*Coste total = minutos + 2 numeros de telefono. Asumiendo mix 50% fijos / 50% moviles.

---

## 4. Recomendacion por Escenario

### Escenario A: "Empezar rapido y barato"
**Opcion:** Click-to-Call basico + registro manual  
**Coste:** 0 EUR/mes  
**Esforzo:** 2 horas de desarrollo

### Escenario B: "Balance precio/calidad"
**Opcion:** Zadarma  
**Coste:** ~25 EUR/mes estimado  
**Esforzo:** 1-2 dias de desarrollo

### Escenario C: "Escalar sin preocupaciones"
**Opcion:** Plivo  
**Coste:** ~43 EUR/mes estimado  
**Esforzo:** 1-2 dias de desarrollo

### Escenario D: "Enterprise, soporte premium"
**Opcion:** Vonage o Twilio + numero externo  
**Coste:** ~55-73 EUR/mes  
**Esforzo:** 1-2 dias de desarrollo

---

## 5. Consideraciones Tecnicas

### Arquitectura de la integracion

```
Usuario hace click en "Llamar"
  |
  v
Frontend envia request a vuestro backend
  |
  v
Backend valida permisos y llama a API del proveedor
  |
  v
Proveedor inicia la llamada
  |
  v
Telefono del agente suena primero -> luego el del lead
```

### Patron "Click-to-Dial" (el mas comun)

1. El agente hace click en el numero del lead
2. El sistema llama primero al telefono del agente
3. Cuando el agente descuelga, el sistema llama al lead
4. Se conectan ambas partes

**Ventaja:** No necesitais microfono en el navegador. Cualquier telefono (fijo o movil) sirve.

### Grabacion de llamadas

| Proveedor | Coste grabacion |
|-----------|-----------------|
| Twilio | $0.0025 / min |
| Plivo | $0.0025 / min |
| Zadarma | Incluido o muy bajo |

Para 1.800 min/mes: ~4.5 EUR/mes adicionales.

### Almacenamiento de grabaciones

Las grabaciones ocupan ~1 MB por minuto (en MP3 comprimido).
- 1.800 min/mes = ~1.8 GB/mes
- Almacenamiento S3/Google Cloud: ~0.02 EUR/GB = insignificante

---

## 6. Coste de Desarrollo

### Fase 1: Click-to-Call basico (tel: links)
- **Tiempo:** 2-4 horas
- **Coste:** Solo vuestro tiempo
- **Funcionalidad:** Boton "Llamar" que abre la app de telefono

### Fase 2: Integracion con proveedor VoIP
- **Tiempo:** 1-2 dias
- **Coste:** Solo vuestro tiempo + coste del proveedor
- **Funcionalidad:**
  - Click-to-dial desde el navegador
  - Registro automatico de llamadas en el historial del lead
  - Notas post-llamada

### Fase 3: Features avanzadas
- **Tiempo:** 3-5 dias adicionales
- **Funcionalidad:**
  - Grabacion de llamadas
  - Dashboard con estadisticas (llamadas realizadas, duracion, tasa de contacto)
  - Click-to-dial con WebRTC (llamar directo desde el navegador con cascos)

---

## 7. Mi Recomendacion

Dado que sois **2 personas** y **600 llamadas/mes** (~15 llamadas/dia por persona):

### Paso 1 (Inmediato): Click-to-Call basico
Implementar `tel:` links en la pagina de detalle del lead y en la tabla. Cero coste, inmediato.

### Paso 2 (1-2 semanas): Integrar Zadarma o Plivo
- **Zadarma** si el presupuesto es muy ajustado (~25 EUR/mes)
- **Plivo** si quereis mejor documentacion y escalabilidad (~43 EUR/mes)

Con 600 llamadas/mes, la diferencia de 18 EUR entre Zadarma y Plivo es insignificante frente al valor de tener llamadas registradas en el CRM.

### Paso 3 (Futuro): WebRTC
Cuando escaleis a mas personas, evaluar llamadas directas desde el navegador para no depender de telefonos fisicos.

---

## 8. Nota Legal/Compliance

- **Grabacion:** En Espana, para grabar llamadas necesitais consentimiento de ambas partes o aviso previo. Se puede implementar un mensaje automatico: "Esta llamada puede ser grabada para fines de calidad".
- **Caller ID:** Es recomendable usar un numero de telefono propio. Llamar con numero oculto o internacional reduce drasticamente la tasa de respuesta.
- **Horario:** Considerar implementar restricciones de horario (no llamar antes de las 9:00 ni despues de las 20:00).

---

## 9. Conclusion

**600 llamadas/mes es perfectamente viable.** El coste mensual ronda los **20-50 EUR**, que para 2 personas haciendo comercial es un coste operativo muy razonable.

La pregunta clave no es "cuesta mucho", sino "cuanto valor aporta tener las llamadas registradas en el CRM". Si os permite hacer seguimiento, analizar que funciona, y no perder leads por falta de contacto, el ROI es positivo desde el primer mes.
