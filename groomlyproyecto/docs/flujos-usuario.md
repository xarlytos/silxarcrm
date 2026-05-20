# Flujos de Usuario - Groomly ERP

> Documento con flujos multipasos realistas de acciones realizadas en el software. Cada flujo representa una secuencia completa de pasos que un usuario real sigue para completar una tarea de negocio.

---

## Indice de Flujos

1. [Flujo 1: Apertura del dia y agenda](#flujo-1-apertura-del-dia-y-agenda)
2. [Flujo 2: Recepcion de cliente nuevo con mascota](#flujo-2-recepcion-de-cliente-nuevo-con-mascota)
3. [Flujo 3: Agendamiento de cita por telefono](#flujo-3-agendamiento-de-cita-por-telefono)
4. [Flujo 4: Atencion completa de una cita](#flujo-4-atencion-completa-de-una-cita)
5. [Flujo 5: Gestion financiera diaria](#flujo-5-gestion-financiera-diaria)
6. [Flujo 6: Control de inventario](#flujo-6-control-de-inventario)
7. [Flujo 7: Fidelizacion de cliente](#flujo-7-fidelizacion-de-cliente)
8. [Flujo 8: Reserva online por el cliente](#flujo-8-reserva-online-por-el-cliente)
9. [Flujo 9: Gestion de equipo y comisiones](#flujo-9-gestion-de-equipo-y-comisiones)
10. [Flujo 10: Analisis de productividad](#flujo-10-analisis-de-productividad)
11. [Flujo 11: Venta de paquete de servicios](#flujo-11-venta-de-paquete-de-servicios)
12. [Flujo 12: Lista de espera](#flujo-12-lista-de-espera)
13. [Flujo 13: Onboarding de nuevo salon](#flujo-13-onboarding-de-nuevo-salon)
14. [Flujo 14: Facturacion con pagos parciales](#flujo-14-facturacion-con-pagos-parciales)
15. [Flujo 15: Cancelacion y reprogramacion](#flujo-15-cancelacion-y-reprogramacion)
16. [Flujo 16: Gestion de vacaciones del peluquero](#flujo-16-gestion-de-vacaciones-del-peluquero)
17. [Flujo 17: Revision de salud de mascota](#flujo-17-revision-de-salud-de-mascota)
18. [Flujo 18: Uso de cupon de descuento](#flujo-18-uso-de-cupon-de-descuento)
19. [Flujo 19: Cierre de caja diario](#flujo-19-cierre-de-caja-diario)
20. [Flujo 20: Gestion de reseñas](#flujo-20-gestion-de-resenas)

---

## Flujo 1: Apertura del dia y agenda

**Actor:** Recepcionista o Manager  
**Contexto:** Inicio de jornada laboral. La peluqueria abre a las 9:00. Es lunes por la mañana.

### Paso 1: Inicio de sesion
- La recepcionista accede a `https://app.groomly.pro/login`
- Ingresa su email y contraseña
- El sistema valida credenciales y redirige al Dashboard

### Paso 2: Revision del Dashboard
- Visualiza las KPIs del dia: 8 citas programadas, 2 nuevas notificaciones
- Ve el resumen de citas del dia con estados de color
- Identifica 1 cita marcada como "pendiente de confirmacion"

### Paso 3: Confirmacion de citas pendientes
- Navega a `/appointments`
- Filtra por estado "pendiente" y fecha de hoy
- Llama al cliente de la cita de las 10:30 para confirmar
- El cliente confirma asistencia
- Edita la cita y cambia el estado de "pendiente" a "confirmada"
- El sistema envia automaticamente un recordatorio por email

### Paso 4: Revision de disponibilidad
- Consulta el calendario en vista "dia"
- Verifica que todos los peluqueros tienen sus horarios cargados
- Identifica que hay un hueco libre de 11:00 a 12:00 en el peluquero Carlos
- Anota mentalmente el slot disponible para posibles walk-ins

### Paso 5: Revision de alertas
- Revisa notificaciones: 1 item de inventario con stock bajo (champu hidratante, quedan 2 unidades)
- Marca la alerta como leida
- Anota en la libreta de pendientes reponer stock

---

## Flujo 2: Recepcion de cliente nuevo con mascota

**Actor:** Recepcionista  
**Contexto:** Un cliente nuevo llega a la peluqueria sin cita previa. Tiene un Golden Retriever de 3 años.

### Paso 1: Busqueda del cliente
- En el Dashboard, hace clic en "Nuevo cliente"
- Abre el formulario de creacion en `/customers/new`
- Como no esta registrado, procede a crearlo

### Paso 2: Creacion del cliente
- Ingresa nombre completo: "Maria Garcia Lopez"
- Ingresa telefono: +34 612 345 678
- Ingresa email: maria.garcia@email.com
- Anade notas: "Cliente referido por Juan Perez. Vive en la zona."
- Guarda el cliente
- El sistema crea el registro y redirige al detalle del cliente

### Paso 3: Creacion de la mascota
- Desde la ficha del cliente, hace clic en "Anadir mascota"
- Abre el formulario en `/pets/new` con el cliente preseleccionado
- Ingresa nombre: "Max"
- Selecciona especie: Perro
- Selecciona raza: Golden Retriever
- Ingresa fecha de nacimiento: 15/03/2022
- Selecciona tamano: Grande
- Ingresa peso: 32 kg
- Anade alergias conocidas: "Ninguna conocida"
- Anade notas de comportamiento: "Muy tranquilo, le gusta el agua"
- Anade notas de grooming: "Preferible no cortar el pelo del torso, solo higiene"
- Sube una foto de Max desde el movil
- Guarda la mascota

### Paso 4: Registro del servicio solicitado
- El cliente pide un bano completo + corte de uñas
- La recepcionista consulta disponibilidad para hoy
- Encuentra slot libre con Carlos a las 11:00
- Procede al Flujo 3 (Agendamiento) con el cliente ya creado

---

## Flujo 3: Agendamiento de cita por telefono

**Actor:** Recepcionista  
**Contexto:** Cliente existente llama para agendar cita para su perro.

### Paso 1: Identificacion del cliente
- Recibe llamada de cliente que dice ser "Laura Martinez"
- Busca en `/customers` usando el buscador
- Encuentra a Laura Martinez con telefono +34 623 456 789
- Abre la ficha del cliente para verificar sus mascotas

### Paso 2: Consulta de mascotas
- Ve que Laura tiene 2 mascotas registradas: "Toby" (Caniche Toy) y "Luna" (Shih Tzu)
- Laura confirma que quiere cita para Toby
- Abre la ficha de Toby para revisar historial
- Ve que la ultima cita fue hace 6 semanas (bano y corte)

### Paso 3: Seleccion de servicios
- Laura pide: bano con champu antialergico + corte estetico completo + corte de uñas
- La recepcionista consulta el catalogo de servicios
- Identifica:
  - Bano completo (tamanio pequeno): 25 EUR
  - Corte estetico (tamanio pequeno): 35 EUR
  - Corte de uñas (addon): 8 EUR
  - Total estimado: 68 EUR
- Comunica el precio a Laura, quien lo acepta

### Paso 4: Seleccion de fecha y peluquero
- Laura prefiere el miercoles por la mañana
- La recepcionista navega al calendario en `/appointments`
- Selecciona la vista "semana" y avanza al miercoles
- Consulta disponibilidad de peluqueros
- Ofrece 10:00 con Ana o 11:30 con Carlos
- Laura prefiere a Ana a las 10:00

### Paso 5: Creacion de la cita
- Abre el modal de nueva cita
- Cliente: Laura Martinez (preseleccionado)
- Mascota: Toby (preseleccionado)
- Peluquero: Ana Rodriguez
- Fecha: Miercoles 10:00
- Servicios: Bano completo + Corte estetico + Corte de uñas
- Duracion estimada: 90 minutos (se calcula automaticamente)
- Estado: Pendiente
- Notas internas: "Usar champu antialergico, cliente lo especifica siempre"
- Guarda la cita

### Paso 6: Confirmacion al cliente
- El sistema envia SMS/email de confirmacion a Laura
- La recepcionista confirma verbalmente por telefono los detalles
- Anota que Laura debe confirmar 24h antes

---

## Flujo 4: Atencion completa de una cita

**Actor:** Peluquero + Recepcionista  
**Contexto:** El perro Toby llega para su cita de las 10:00 con Ana.

### Paso 1: Check-in del cliente
- Toby y Laura llegan a las 9:55
- La recepcionista busca la cita en el calendario
- Identifica la cita de Toby con Ana a las 10:00
- Abre la cita y hace clic en "Check-in"
- Estado cambia de "confirmada" a "en curso"
- Hora de check-in registrada: 9:58

### Paso 2: Recepcion por el peluquero
- Ana viene a buscar a Toby
- La recepcionista le entrega la ficha impresa con las notas
- Ana revisa las notas de grooming: "Usar champu antialergico"
- Ana lleva a Toby al area de bano

### Paso 3: Ejecucion del servicio (lado del peluquero)
- Ana empieza con el bano usando champu antialergico
- Durante el secado, nota una pequena irritacion en la piel del vientre
- Anade una nota en la ficha de la mascota: "Irritacion leve en vientre, recomendar vet"
- Toma foto "antes" con la tablet del salon
- Realiza el corte estetico segun instrucciones del cliente
- Corta las uñas
- Toma foto "despues" con la tablet
- Sube ambas fotos a la cita como "antes/después"

### Paso 4: Check-out y finalizacion
- Ana termina el servicio a las 11:25
- Lleva a Toby a recepcion
- La recepcionista abre la cita y hace clic en "Check-out"
- Hora de check-out registrada: 11:28
- Estado cambia de "en curso" a "completada"

### Paso 5: Facturacion inmediata
- El sistema genera automaticamente una factura borrador
- La recepcionista revisa la factura:
  - Bano completo (pequeno): 25.00 EUR
  - Corte estetico (pequeno): 35.00 EUR
  - Corte de uñas: 8.00 EUR
  - Total: 68.00 EUR
- Anade nota: "Champu antialergico usado segun preferencia"
- Confirma la factura

### Paso 6: Cobro
- Laura paga con tarjeta
- La recepcionista registra el pago:
  - Metodo: Tarjeta
  - Monto: 68.00 EUR
  - Fecha: Hoy
- El estado de la factura cambia a "pagada"
- El sistema genera el comprobante de pago
- Laura recibe el comprobante por email

### Paso 7: Entrega y despedida
- La recepcionista informa a Laura sobre la irritacion notada
- Recomienda consultar al veterinario si persiste
- Laura agradece y se lleva a Toby
- La recepcionista marca la cita como "finalizada"

---

## Flujo 5: Gestion financiera diaria

**Actor:** Manager / Dueno  
**Contexto:** Final del dia, se necesita registrar todas las transacciones y revisar el estado financiero.

### Paso 1: Registro de gastos del dia
- Navega a `/finance/expenses`
- Registra gasto 1: Compra de champu profesional
  - Concepto: "Champu hidratante 5L"
  - Categoria: Productos de grooming
  - Monto: 45.00 EUR
  - Metodo: Transferencia
  - Proveedor: Distribuidora Canina SL
  - Fecha: Hoy
- Registra gasto 2: Factura de luz
  - Concepto: "Factura electricidad mayo"
  - Categoria: Suministros
  - Monto: 128.50 EUR
  - Metodo: Domiciliacion
  - Fecha: Hoy
- Registra gasto 3: Material de oficina
  - Concepto: "Papel A4, boligrafos, carpetas"
  - Categoria: Material de oficina
  - Monto: 23.40 EUR
  - Metodo: Tarjeta
  - Fecha: Hoy

### Paso 2: Revision de facturas emitidas
- Navega a `/finance/invoices`
- Filtra por fecha de hoy
- Ve 6 facturas emitidas durante el dia
- Verifica que todas estan pagadas excepto 1
- La factura pendiente es de un cliente habitual que paga a fin de mes
- Estado: "pendiente de pago" (vencimiento en 30 dias)

### Paso 3: Registro de pago pendiente
- Abre la factura pendiente (Cliente: Roberto Sanchez)
- Monto: 85.00 EUR
- Anade una nota: "Cliente con credito aprobado, paga mensualmente"
- Deja la factura como "pendiente de pago" con fecha de vencimiento

### Paso 4: Revision del Dashboard financiero
- Navega a `/finance`
- Visualiza los graficos:
  - Ingresos del dia: 412.00 EUR
  - Gastos del dia: 196.90 EUR
  - Balance neto del dia: +215.10 EUR
- Revisa el grafico de tendencia semanal
- Compara con el mismo dia de la semana pasada: +12% ingresos

### Paso 5: Calculo de comisiones
- Navega a `/finance/commissions`
- El sistema muestra las comisiones automaticas del dia:
  - Ana Rodriguez: 6 citas, venta total 340 EUR, comision 15% = 51.00 EUR
  - Carlos Martinez: 4 citas, venta total 220 EUR, comision 15% = 33.00 EUR
- Revisa y confirma las comisiones
- Las marca como "pendientes de pago" (se pagan el dia 1 de cada mes)

---

## Flujo 6: Control de inventario

**Actor:** Manager  
**Contexto:** Revision semanal de stock. Se detectaron productos bajos durante la semana.

### Paso 1: Revision de inventario actual
- Navega a `/finance/inventory`
- Visualiza el listado completo de productos
- Ordena por "stock actual" ascendente
- Identifica productos con alerta (en rojo):
  - Champu hidratante: 2 unidades (minimo: 5)
  - Acondicionador desenredante: 1 unidad (minimo: 3)
  - Toallas desechables (pack 50): 3 packs (minimo: 5)

### Paso 2: Verificacion fisica
- El manager va al almacen y cuenta fisicamente los productos
- Confirma que las cantidades del sistema coinciden con la realidad
- Encuentra 1 champu mas que no estaba registrado (devolucion de ayer)
- Registra el ajuste:
  - Producto: Champu hidratante
  - Tipo: Ajuste de inventario (+1)
  - Motivo: "Devolucion no registrada del dia anterior"
  - Cantidad ajustada: de 2 a 3 unidades

### Paso 3: Registro de entrada de stock
- Llega el pedido del proveedor
- Recibe:
  - 10 unidades de champu hidratante
  - 5 unidades de acondicionador
  - 10 packs de toallas
- Registra movimiento de entrada:
  - Producto: Champu hidratante
  - Tipo: Entrada
  - Cantidad: +10
  - Proveedor: Distribuidora Canina SL
  - Costo unitario: 9.00 EUR
  - Numero de factura de proveedor: FAC-2024-1123

### Paso 4: Repeticion para todos los productos recibidos
- Repite el proceso de registro de entrada para cada producto
- Verifica que los niveles de stock ahora estan por encima del minimo
- Champu hidratante: 13 unidades (minimo 5) - OK
- Acondicionador: 6 unidades (minimo 3) - OK
- Toallas: 13 packs (minimo 5) - OK

### Paso 5: Registro de consumo diario
- Al final del dia, registra consumos:
  - Champu hidratante: -0.5L (uso del dia)
  - Tipo: Salida por consumo
  - Motivo: "Uso diario en servicios"

---

## Flujo 7: Fidelizacion de cliente

**Actor:** Sistema automatico + Recepcionista  
**Contexto:** Programa de puntos. El cliente Roberto acumula puntos y los quiere canjear.

### Paso 1: Configuracion inicial del programa (Manager)
- El manager navego a `/loyalty` en su momento
- Configuro las reglas:
  - 1 punto por cada 1 EUR gastado
  - Multiplicador por servicio completo: 1.5x
  - Minimo de compra para acumular: 10 EUR
  - 1 punto = 0.10 EUR de descuento al canjear
  - Puntos expiran a los 12 meses

### Paso 2: Acumulacion automatica de puntos
- Roberto ha venido 8 veces en los ultimos 6 meses
- Gasto total acumulado: 680 EUR
- Puntos acumulados: 850 (algunos con multiplicador 1.5x por servicios completos)
- El sistema fue acumulando puntos automaticamente con cada factura pagada

### Paso 3: Consulta de saldo
- Roberto llega para su cita y pregunta cuantos puntos tiene
- La recepcionista abre la ficha de Roberto en `/customers/:id`
- Ve la pestaña "Fidelizacion" o "Puntos"
- Saldo actual: 850 puntos (equivalente a 85.00 EUR de descuento)

### Paso 4: Roberto decide canjear puntos
- La cita de hoy es: bano + corte = 60 EUR
- Roberto quiere canjear 500 puntos para obtener 50 EUR de descuento
- La recepcionista accede al proceso de facturacion

### Paso 5: Aplicacion de puntos en factura
- Crea la factura normal por 60.00 EUR
- En el checkout, selecciona "Canjear puntos de fidelidad"
- Ingresa: 500 puntos
- El sistema calcula: 500 puntos x 0.10 EUR = 50.00 EUR descuento
- Total a pagar: 60.00 - 50.00 = 10.00 EUR
- Confirma la factura con el descuento aplicado

### Paso 6: Registro de la transaccion de puntos
- El sistema registra automaticamente:
  - Transaccion de debito: -500 puntos
  - Motivo: "Canje en factura #INV-2024-0542"
  - Saldo restante: 350 puntos
- Roberto paga los 10.00 EUR restantes en efectivo
- Recibe comprobante por email

### Paso 7: Roberto acumula nuevos puntos
- Por los 10 EUR pagados (despues del descuento), acumula 10 puntos nuevos
- Saldo final: 350 + 10 = 360 puntos
- Roberto recibe email con su nuevo saldo y un agradecimiento

---

## Flujo 8: Reserva online por el cliente

**Actor:** Cliente final (autogestion)  
**Contexto:** Marta, cliente existente, quiere reservar cita para su perro desde su movil.

### Paso 1: Acceso al portal
- Marta abre su navegador y va a `https://peluguau.mi-salon.groomly.pro/portal`
- (o accede desde el link del email de bienvenida)
- Ingresa su email y contraseña
- Accede a su portal personal

### Paso 2: Consulta de proximas citas
- En el Dashboard del portal, ve su proxima cita: 15 de mayo a las 16:00 con Ana
- Quiere agendar otra cita adicional para su segundo perro

### Paso 3: Inicio de nueva reserva
- Hace clic en "Reservar cita" o navega a `/portal/appointments/new`
- Selecciona la mascota: "Rocky" (su Labrador, ya registrado)

### Paso 4: Seleccion de servicios
- Ve el catalogo de servicios disponibles del salon:
  - Bano completo: 30 EUR (tamano mediano)
  - Corte estetico: 40 EUR
  - Corte de uñas: 8 EUR
  - Deslanado: 35 EUR
- Selecciona: Bano completo + Corte estetico
- Ve el total estimado: 70 EUR

### Paso 5: Seleccion de fecha y hora
- El sistema muestra un calendario interactivo
- Marta selecciona el jueves 22 de mayo
- El sistema muestra los slots disponibles:
  - 09:00 - 10:30 con Carlos
  - 11:00 - 12:30 con Ana
  - 16:00 - 17:30 con Carlos
- Marta selecciona 11:00 con Ana

### Paso 6: Confirmacion de datos
- Revisa el resumen:
  - Mascota: Rocky
  - Servicios: Bano + Corte estetico
  - Fecha: Jueves 22 de mayo, 11:00
  - Peluquero: Ana Rodriguez
  - Total estimado: 70 EUR
- Anade una nota: "Rocky es nervioso con el secador, por favor paciencia"
- Hace clic en "Confirmar reserva"

### Paso 7: Confirmacion del sistema
- El sistema crea la cita con estado "pendiente"
- Marta recibe email de confirmacion con los detalles
- En el salon, la cita aparece en el calendario como "pendiente de confirmacion"
- La recepcionista debe confirmarla manualmente o llamar al cliente

### Paso 8: Seguimiento desde el portal
- Marta puede ver su cita en `/portal/appointments`
- Ve el estado: "Pendiente de confirmacion"
- Tambien puede cancelarla o modificarla si es necesario
- Recibe un recordatorio 24h antes de la cita por email

---

## Flujo 9: Gestion de equipo y comisiones

**Actor:** Dueno / Manager  
**Contexto:** Nuevo peluquero se incorpora al equipo. Configuracion completa.

### Paso 1: Creacion del peluquero
- El dueno navega a `/groomers`
- Hace clic en "Nuevo peluquero"
- Completa el formulario:
  - Nombre: "Elena Vazquez"
  - Email: elena.vazquez@email.com
  - Telefono: +34 634 567 890
  - Especialidades: "Cortes esteticos, preparacion para exposiciones"
  - Color asignado: Morado (para identificar en el calendario)
  - Foto: Sube foto profesional
  - Biografia breve: "Especialista en razas pequenas con 5 anos de experiencia"
- Guarda el peluquero

### Paso 2: Configuracion de horario semanal
- Desde la ficha de Elena, navega a "Horario"
- Configura disponibilidad:
  - Lunes: 9:00 - 14:00, 16:00 - 20:00
  - Martes: 9:00 - 14:00, 16:00 - 20:00
  - Miercoles: 9:00 - 14:00, 16:00 - 20:00
  - Jueves: 9:00 - 14:00, 16:00 - 20:00
  - Viernes: 9:00 - 14:00, 16:00 - 19:00
  - Sabado: 9:00 - 14:00
  - Domingo: No disponible
- Guarda el horario

### Paso 3: Configuracion de porcentaje de comision
- Navega a `/finance/commissions`
- Busca a Elena en el listado
- Asigna porcentaje de comision: 18% (nivel senior)
- Fecha efectiva: 1 de junio (cuando empieza)
- Guarda la configuracion

### Paso 4: Invitacion al equipo
- Navega a `/team`
- Hace clic en "Invitar miembro"
- Ingresa email: elena.vazquez@email.com
- Selecciona rol: GROOMER
- Asigna permisos: Citas, Calendario, Mascotas (lectura)
- Envia invitacion

### Paso 5: Elena acepta la invitacion
- Elena recibe email con link de invitacion
- Hace clic en el link `/accept-invite/:token`
- Crea su contrasena
- Completa su perfil
- Inicia sesion por primera vez
- El sistema la redirige al calendario de su agenda

### Paso 6: Primer mes de trabajo
- Elena trabaja todo junio
- Atiende 45 citas
- Genera ingresos por valor de 2,850 EUR
- El sistema calcula su comision automaticamente:
  - 2,850 EUR x 18% = 513.00 EUR

### Paso 7: Pago de comisiones
- El 1 de julio, el manager navega a `/finance/commissions`
- Ve el resumen de junio:
  - Elena Vazquez: 513.00 EUR (pendiente de pago)
  - Ana Rodriguez: 620.00 EUR (pendiente)
  - Carlos Martinez: 480.00 EUR (pendiente)
- Marca todas como "pagadas"
- Registra el pago por transferencia bancaria
- Elena recibe notificacion de pago recibido

---

## Flujo 10: Analisis de productividad

**Actor:** Dueno / Manager  
**Contexto:** Fin de mes, se requiere analizar la productividad del equipo para revisiones.

### Paso 1: Acceso a reportes
- Navega a `/reports/groomers`
- Selecciona el periodo: 1 al 31 de mayo
- Visualiza el dashboard de productividad

### Paso 2: Analisis por peluquero
- Ve la tabla comparativa:
  | Peluquero | Citas | Ingresos | Servicios | Clientes unicos | Ticket medio |
  |-----------|-------|----------|-----------|-----------------|--------------|
  | Ana R. | 52 | 3,200 EUR | 78 | 35 | 61.50 EUR |
  | Carlos M. | 48 | 2,850 EUR | 65 | 28 | 59.40 EUR |
  | Elena V. | 45 | 2,850 EUR | 62 | 30 | 63.30 EUR |

### Paso 3: Analisis de tendencias
- Revisa el grafico de citas por dia de la semana
- Identifica que los miercoles son los dias mas cargados
- Los lunes por la mañana tienen mucha disponibilidad

### Paso 4: Analisis de servicios mas demandados
- Navega a la seccion de servicios del reporte
- Top 3 servicios:
  1. Bano completo: 120 veces (45%)
  2. Corte estetico: 95 veces (35%)
  3. Deslanado: 40 veces (15%)
- Los addons menos usados: tinte de pelaje (2 veces)

### Paso 5: Exportacion de datos
- El manager quiere compartir el reporte con el contador
- Hace clic en "Exportar a CSV"
- El sistema genera el archivo con todos los datos del periodo
- Lo descarga y lo envia por email al contador

### Paso 6: Toma de decisiones
- Basado en el analisis:
  - Decide ofrecer descuento los lunes por la mañana para aumentar ocupacion
  - Considera contratar un peluquero mas para los miercoles
  - Evalua eliminar el servicio de tinte por baja demanda

---

## Flujo 11: Venta de paquete de servicios

**Actor:** Recepcionista  
**Contexto:** Cliente habitual quiere comprar un paquete de varios banos con descuento.

### Paso 1: Configuracion previa (Manager)
- El manager creo previamente en `/packages`:
  - Nombre: "Pack Bano Mensual"
  - Descripcion: "5 banos completos para perros medianos"
  - Servicios incluidos: 5 x Bano completo (mediano)
  - Precio normal: 150 EUR (5 x 30)
  - Precio pack: 120 EUR (20% descuento)
  - Validez: 90 dias desde la compra
  - Limite: 1 pack activo por cliente

### Paso 2: Cliente solicita el pack
- Laura Martinez llega a recepcion
- Pregunta por el "Pack Bano Mensual" que vio en Instagram
- La recepcionista confirma que esta disponible

### Paso 3: Verificacion de elegibilidad
- Busca a Laura en el sistema
- Verifica que no tiene ningun pack activo actualmente
- Confirma que puede comprar el pack

### Paso 4: Venta del paquete
- Navega a la ficha de Laura
- Seccion "Paquetes"
- Hace clic en "Adquirir paquete"
- Selecciona "Pack Bano Mensual"
- Precio: 120.00 EUR
- Crea la factura correspondiente

### Paso 5: Cobro
- Laura paga 120.00 EUR con tarjeta
- Se registra el pago
- El sistema activa el paquete en la cuenta de Laura:
  - 5 banos disponibles
  - Validez: 90 dias (hasta 15 de agosto)
  - Estado: Activo

### Paso 6: Uso del paquete (primera cita)
- Una semana despues, Laura reserva bano para Toby
- Durante la facturacion, la recepcionista selecciona "Usar paquete"
- El sistema descuenta 1 bano del paquete
- Quedan 4 banos disponibles
- El total de la factura es 0 EUR (cubierto por el paquete)
- Se genera factura con total 0 marcando "Pagado con pack"

### Paso 7: Seguimiento del paquete
- Laura puede ver en su portal: "Pack Bano Mensual - 3/5 banos usados, vence en 45 dias"
- Recibe recordatorio cuando le queda 1 bano
- Recibe alerta cuando el pack esta a 7 dias de vencer

---

## Flujo 12: Lista de espera

**Actor:** Recepcionista + Cliente  
**Contexto:** Cliente quiere cita para este fin de semana pero no hay disponibilidad.

### Paso 1: Cliente solicita cita urgente
- Pedro Gomez llama el martes
- Quiere cita para su perro para el sabado por la mañana
- Su perro tiene una exposicion canina el domingo y necesita ir presentable

### Paso 2: Verificacion de disponibilidad
- La recepcionista consulta el calendario
- Sabado por la mañana: COMPLETO
- No hay slots libres con ningun peluquero
- Comunica a Pedro que no hay disponibilidad

### Paso 3: Ofrecer lista de espera
- La recepcionista ofrece anadir a Pedro a la lista de espera
- Pedro acepta
- Navega a `/waitlist`
- Hace clic en "Nueva entrada"

### Paso 4: Registro en lista de espera
- Cliente: Pedro Gomez (ya registrado)
- Mascota: "Duke" (Golden Retriever)
- Servicios solicitados: Bano completo + Corte estetico completo
- Preferencia de fecha: Sabado por la mañana
- Flexibilidad: "Tambien valido el viernes por la tarde"
- Prioridad: Alta (motivo: exposicion canina)
- Notas: "Necesita estar listo para exposicion el domingo"
- Estado: "En espera"
- Guarda la entrada

### Paso 5: Notificacion al cliente
- Pedro recibe email: "Estas en lista de espera. Te avisaremos si hay cancelacion"

### Paso 6: Cancelacion de otra cita (evento externo)
- El viernes por la mañana, otro cliente cancela su cita del sabado a las 9:00
- La cita liberada es con Ana, duracion 90 minutos

### Paso 7: Asignacion desde lista de espera
- El sistema detecta un slot libre que coincide con la preferencia de Pedro
- La recepcionista recibe una notificacion: "Slot disponible para lista de espera"
- Revisa `/waitlist` y ve a Pedro como candidato

### Paso 8: Contacto y confirmacion
- La recepcionista llama a Pedro
- Le ofrece el sabado a las 9:00 con Ana
- Pedro acepta encantado
- La recepcionista:
  1. Crea la cita normalmente
  2. Marca la entrada de lista de espera como "Atendida"
  3. Vincula la cita creada con la entrada de la lista

### Paso 9: Cita atendida
- Pedro y Duke asisten a la cita del sabado
- Servicio completado con exito
- Duke queda listo para la exposicion del domingo

---

## Flujo 13: Onboarding de nuevo salon

**Actor:** Nuevo dueno de peluqueria  
**Contexto:** Javier acaba de registrar su peluqueria canina "Patitas Felices" en Groomly.

### Paso 1: Registro inicial
- Javier accede a la landing page en `https://peluguau.com`
- Hace clic en "Empieza gratis"
- Completa el formulario de registro:
  - Nombre: Javier Rodriguez
  - Email: javier@patitasfelices.com
  - Contrasena: [segura]
  - Nombre del salon: "Patitas Felices"
- Acepta terminos y condiciones
- Hace clic en "Crear cuenta"

### Paso 2: Verificacion de email
- Recibe email con link de verificacion
- Hace clic en el link `/verify-email?token=...`
- Email verificado correctamente
- El sistema inicia sesion automaticamente

### Paso 3: Onboarding paso a paso
- El sistema redirige a `/onboarding`
- **Paso 1 - Datos del salon:**
  - Direccion: Calle Mayor 15, Madrid
  - Telefono: +34 915 123 456
  - Slug del salon: `patitas-felices`
  - Zona horaria: Europe/Madrid
  - Moneda: EUR
  - Idioma: Espanol

- **Paso 2 - Horarios de apertura:**
  - Lunes a Viernes: 9:00 - 14:00, 17:00 - 20:00
  - Sabado: 9:00 - 14:00
  - Domingo: Cerrado

- **Paso 3 - Personalizacion:**
  - Sube el logo de Patitas Felices
  - Selecciona color primario: #4CAF50 (verde)
  - Selecciona color secundario: #FF9800 (naranja)

- **Paso 4 - Servicios iniciales:**
  - El sistema sugiere servicios predefinidos
  - Javier los personaliza:
    - Bano completo: 25-45 EUR (segun tamano)
    - Corte estetico: 30-50 EUR
    - Corte de uñas: 8 EUR
    - Deslanado: 25-40 EUR

- **Paso 5 - Equipo inicial:**
  - Se anade a si mismo como peluquero
  - Nombre: Javier Rodriguez
  - Color: Azul
  - Horario: Misma que el salon

### Paso 4: Finalizacion del onboarding
- Revisa el resumen de toda la configuracion
- Hace clic en "Finalizar y empezar"
- El sistema crea todo en la base de datos
- Redirige al Dashboard principal

### Paso 5: Primeros pasos
- Javier explora el Dashboard vacio
- Ve el tutorial interactivo de primeros pasos
- Crea un cliente de prueba para familiarizarse
- Agenda una cita de prueba
- Explora el calendario

### Paso 6: Configuracion de Stripe (Billing)
- Navega a `/settings/billing`
- Selecciona plan Starter (gratis 14 dias)
- Ve la opcion de conectar Stripe para pagos de clientes
- Decide hacerlo mas adelante cuando tenga clientes reales

---

## Flujo 14: Facturacion con pagos parciales

**Actor:** Recepcionista  
**Contexto:** Cliente no puede pagar el total al contado. Acuerda pagar en 2 partes.

### Paso 1: Servicio completado
- Se atiende una cita compleja para un perro grande
- Servicios: Bano + Corte estetico + Tratamiento antipulgas + Deslanado
- Total: 125.00 EUR

### Paso 2: Creacion de factura
- La recepcionista genera la factura
- Revisa las lineas:
  - Bano completo (grande): 35.00 EUR
  - Corte estetico (grande): 45.00 EUR
  - Tratamiento antipulgas: 20.00 EUR
  - Deslanado (grande): 25.00 EUR
  - Total: 125.00 EUR

### Paso 3: Acuerdo de pago parcial
- El cliente pide si puede pagar la mitad hoy y la mitad la semana que viene
- La recepcionista consulta con el manager, quien aprueba
- Vuelve a la factura

### Paso 4: Registro del primer pago
- En la factura, selecciona "Anadir pago"
- Monto: 62.50 EUR
- Metodo: Tarjeta
- Fecha: Hoy
- Guarda el pago
- Estado de la factura: "Parcialmente pagada"
- Saldo pendiente: 62.50 EUR

### Paso 5: Entrega y nota
- El cliente se lleva al perro
- La recepcionista anade una nota a la factura:
  - "Segundo pago acordado para el 20 de mayo. Cliente habitual, confiable."
- El cliente recibe copia de la factura con el pago registrado

### Paso 6: Pago final (una semana despues)
- El cliente vuelve el dia acordado
- La recepcionista busca la factura en `/finance/invoices`
- Filtra por "parcialmente pagadas"
- Encuentra la factura con saldo 62.50 EUR

### Paso 7: Registro del segundo pago
- Abre la factura
- Selecciona "Anadir pago"
- Monto: 62.50 EUR
- Metodo: Efectivo
- Fecha: Hoy
- Guarda el pago

### Paso 8: Factura saldada
- Estado cambia a "Pagada"
- Saldo pendiente: 0.00 EUR
- El sistema envia comprobante final por email
- La factura queda archivada como pagada completamente

---

## Flujo 15: Cancelacion y reprogramacion

**Actor:** Cliente + Recepcionista  
**Contexto:** Cliente necesita cancelar su cita de mañana y moverla a otra fecha.

### Paso 1: Cliente solicita cancelacion
- Roberto Sanchez llama el lunes por la tarde
- Tiene cita para el martes a las 10:00 con Ana
- Un imprevisto laboral le impide asistir

### Paso 2: Busqueda de la cita
- La recepcionista navega a `/appointments`
- Busca la cita de Roberto para manana
- La encuentra: Martes 10:00, Ana, servicio: Bano + Corte

### Paso 3: Cancelacion
- Abre la cita
- Hace clic en "Cancelar cita"
- El sistema pide motivo de cancelacion
- Selecciona: "Cancelacion por cliente"
- Anade nota: "Cliente llamo por imprevisto laboral"
- Confirma la cancelacion

### Paso 4: Politica de cancelacion
- El sistema verifica cuando se hizo la cita:
  - Cita creada hace 2 semanas
  - Cancelacion con mas de 24h de antelacion
  - Aplica politica: Sin penalizacion
- Si fuera con menos de 24h, podria aplicar cargo segun configuracion del salon

### Paso 5: Ofrecer reprogramacion
- La recepcionista pregunta a Roberto si quiere otra fecha
- Roberto dice que preferiria el jueves por la tarde

### Paso 6: Nueva busqueda de disponibilidad
- Consulta el calendario para el jueves
- Slots disponibles:
  - 16:00 con Carlos
  - 17:30 con Ana
- Roberto prefiere a Ana a las 17:30

### Paso 7: Creacion de nueva cita
- Crea nueva cita:
  - Cliente: Roberto Sanchez
  - Mascota: Max
  - Peluquero: Ana Rodriguez
  - Fecha: Jueves 17:30
  - Servicios: Bano + Corte (mismos que la cancelada)
  - Estado: Confirmada
- Anade nota: "Reprogramada desde martes 10:00 por imprevisto laboral"

### Paso 8: Confirmaciones
- Roberto recibe email de cancelacion de la cita original
- Recibe email de confirmacion de la nueva cita
- La recepcionista ve en el calendario que el slot del martes 10:00 queda libre

---

## Flujo 16: Gestion de vacaciones del peluquero

**Actor:** Manager + Peluquero  
**Contexto:** Ana solicita vacaciones en agosto. El manager debe gestionar su ausencia.

### Paso 1: Solicitud de vacaciones
- Ana solicita 2 semanas de vacaciones del 1 al 15 de agosto
- El manager recibe la solicitud por email/whatsApp

### Paso 2: Registro de ausencia en el sistema
- El manager navega a `/groomers`
- Busca a Ana Rodriguez
- Accede a su ficha y selecciona "Ausencias"
- Hace clic en "Nueva ausencia"
- Completa:
  - Tipo: Vacaciones
  - Fecha inicio: 1 de agosto
  - Fecha fin: 15 de agosto
  - Motivo: "Vacaciones anuales"
  - Estado: Aprobada
- Guarda la ausencia

### Paso 3: Impacto en el calendario
- El sistema automaticamente:
  - Bloquea los dias 1-15 de agosto en el calendario de Ana
  - Muestra los dias como "no disponible" en la vista de agenda
  - Previene que se agenden citas en esos dias

### Paso 4: Revision de citas afectadas
- El manager revisa si hay citas ya agendadas con Ana en esas fechas
- El sistema muestra una alerta: "3 citas programadas en periodo de ausencia"
- Las citas afectadas son:
  - 2 de agosto, 10:00 - Cliente: Marta Lopez
  - 5 de agosto, 16:00 - Cliente: Pedro Gomez
  - 10 de agosto, 11:00 - Cliente: Laura Martinez

### Paso 5: Reprogramacion de citas afectadas
- El manager contacta a cada cliente para reprogramar
- Ofrece opciones con otros peluqueros (Carlos o Elena)
- Reprograma las 3 citas:
  - Marta Lopez: 2 de agosto con Carlos a las 10:00
  - Pedro Gomez: 5 de agosto con Elena a las 16:00
  - Laura Martinez: 10 de agosto con Carlos a las 11:00

### Paso 6: Notificaciones
- Todos los clientes reciben email de modificacion de cita
- Ana recibe confirmacion de que sus vacaciones estan registradas
- El calendario del salon refleja correctamente la ausencia de Ana

### Paso 7: Planificacion de cobertura
- El manager revisa la carga de trabajo para agosto
- Decide si necesita peluquero temporal o si Carlos y Elena pueden absorber
- Consulta el reporte de productividad para estimar

---

## Flujo 17: Revision de salud de mascota

**Actor:** Peluquero  
**Contexto:** Durante un servicio, el peluquero detecta un problema de salud en la mascota.

### Paso 1: Inicio del servicio
- Elena atiende a "Bella", una poodle de 6 anos
- Servicio: Bano completo + Corte estetico
- Cliente: Carmen Ruiz (presente en el salon)

### Paso 2: Deteccion durante el bano
- Durante el secado, Elena nota:
  - Piel muy seca y escamosa en la zona lumbar
  - Pequena masa/bulto en el flanco izquierdo (aprox 1cm)
  - Unas con aspecto quebradizo

### Paso 3: Documentacion en la ficha
- Elena accede a la tablet del salon
- Abre la ficha de Bella en `/pets/:id`
- En las notas medicas, anade:
  - "[Fecha actual] - Revision durante grooming:
    - Piel seca/escamosa zona lumbar. Recomendar revision vet.
    - Bulto palpable flanco izquierdo ~1cm. URGENTE: recomendar vet.
    - Unas quebradizas, posible deficiencia."
- Guarda las notas

### Paso 4: Anotacion en la cita
- Vuelve a la cita actual
- En notas internas, anade:
  - "Hallazgos medicos documentados en ficha de mascota. Clienta informada verbalmente."

### Paso 5: Comunicacion con el cliente
- Elena termina el servicio y lleva a Bella a recepcion
- Comunica a Carmen lo observado de forma respetuosa y profesional
- Recomienda encarecidamente visita al veterinario, especialmente por el bulto
- Carmen se muestra agradecida y preocupada

### Paso 6: Registro de comunicacion
- La recepcionista registra en el sistema:
  - Tipo: Nota de salud
  - Cliente: Carmen Ruiz
  - Mascota: Bella
  - Contenido: "Peluquero detecto bulto en flanco. Cliente informada. Recomendada visita vet."
  - Fecha: Hoy

### Paso 7: Seguimiento
- Una semana despues, Carmen vuelve para otro servicio
- La recepcionista pregunta amablemente si fue al veterinario
- Carmen confirma que si, el bulto era benigno pero necesita monitoreo
- La recepcionista anade a la ficha de Bella:
  - "Cliente visito vet. Bulto benigno, monitoreo recomendado cada 3 meses."

---

## Flujo 18: Uso de cupon de descuento

**Actor:** Cliente (portal) + Sistema  
**Contexto:** El salon lanza una promocion de verano. Cliente aplica cupon en reserva.

### Paso 1: Creacion del cupon (Manager)
- El manager navega a `/coupons`
- Crea nuevo cupon:
  - Codigo: "VERANO2024"
  - Tipo: Porcentaje
  - Valor: 20%
  - Minimo de compra: 40 EUR
  - Maximo de descuento: 20 EUR
  - Usos maximos: 50
  - Fecha inicio: 1 de junio
  - Fecha fin: 31 de agosto
  - Aplicable a: Todos los servicios
- Publicita el cupon en redes sociales e email marketing

### Paso 2: Cliente obtiene el cupon
- Marta ve la promocion en Instagram
- El post dice: "20% de descuento con codigo VERANO2024"
- Anota el codigo para usarlo

### Paso 3: Reserva con cupon
- Marta accede al portal del cliente
- Inicia reserva de cita para Rocky:
  - Servicios: Bano completo + Corte estetico = 70 EUR
  - Fecha: 15 de junio, 10:00 con Ana

### Paso 4: Aplicacion del cupon
- En el resumen antes de confirmar, hay campo "Codigo de descuento"
- Marta ingresa: VERANO2024
- Hace clic en "Aplicar"
- El sistema valida:
  - Codigo existe: SI
  - Esta activo: SI
  - No ha expirado: SI
  - Compra minima (70 >= 40): SI
  - Usos disponibles (quedan 45 de 50): SI
  - Marta no ha usado este cupon antes: SI

### Paso 5: Calculo del descuento
- Subtotal: 70.00 EUR
- Descuento 20%: 14.00 EUR (esta dentro del maximo de 20 EUR)
- Total con descuento: 56.00 EUR
- Marta ve el desglose y confirma

### Paso 6: Confirmacion de la reserva
- El sistema crea la cita con estado "pendiente"
- Marta recibe email de confirmacion mostrando:
  - Servicios: 70.00 EUR
  - Descuento (VERANO2024): -14.00 EUR
  - Total estimado: 56.00 EUR
- El sistema decrementa el contador de usos del cupon (45 -> 44)

### Paso 7: Facturacion con cupon aplicado
- El dia de la cita, el servicio se completa
- La recepcionista genera la factura
- El sistema aplica automaticamente el descuento del cupon
- Factura final:
  - Subtotal: 70.00 EUR
  - Descuento (Cupon VERANO2024): -14.00 EUR
  - Total: 56.00 EUR
- Marta paga 56.00 EUR
- El cupon se marca como "usado" en la cuenta de Marta

---

## Flujo 19: Cierre de caja diario

**Actor:** Recepcionista / Manager  
**Contexto:** Final del dia laboral. Se debe cuadrar la caja y cerrar la jornada.

### Paso 1: Revision de facturas del dia
- Navega a `/finance/invoices`
- Filtra por fecha de hoy
- Visualiza todas las facturas emitidas:
  - Factura 1: 45.00 EUR - Efectivo
  - Factura 2: 68.00 EUR - Tarjeta
  - Factura 3: 35.00 EUR - Bizum
  - Factura 4: 85.00 EUR - Transferencia
  - Factura 5: 52.00 EUR - Tarjeta
  - Factura 6: 28.00 EUR - Efectivo
  - Factura 7: 99.00 EUR - Tarjeta
  - Total facturado: 412.00 EUR

### Paso 2: Desglose por metodo de pago
- Agrupa por metodo:
  - Efectivo: 73.00 EUR (Facturas 1 y 6)
  - Tarjeta: 219.00 EUR (Facturas 2, 5, 7)
  - Bizum: 35.00 EUR (Factura 3)
  - Transferencia: 85.00 EUR (Factura 4)

### Paso 3: Cuadre de efectivo
- Cuenta fisicamente el dinero en caja:
  - Billetes: 50 + 20 + 5 = 75 EUR
  - Monedas: 2 + 1 + 0.50 + 0.50 = 4 EUR
  - Total fisico: 79 EUR
- Compara con lo registrado: 73.00 EUR
- Diferencia: +6.00 EUR (sobrante)

### Paso 4: Registro de diferencia
- Investiga la diferencia
- Recuerda que un cliente pago 50 EUR en efectivo por una factura de 45 EUR
- El cambio de 5 EUR no se registro correctamente (se quedo en caja)
- Ajusta: Registra un gasto menor de 5 EUR como "Error de cambio no entregado"
- Nuevo calculo: 73 + 5 (error) = 78 EUR registrados
- Diferencia real: 79 - 78 = +1 EUR (sobrante menor, posible propina olvidada)
- Anota: "Sobrante 1 EUR - dejado en caja como fondo"

### Paso 5: Revision de gastos del dia
- Navega a `/finance/expenses`
- Filtra por hoy:
  - Compra champu: 45.00 EUR
  - Material oficina: 23.40 EUR
  - Total gastos: 68.40 EUR (la luz es domiciliada, no entra en caja)

### Paso 6: Calculo de cierre
- Ingresos en efectivo: 73.00 EUR
- Gastos en efectivo: 68.40 EUR
- Neto en caja: 4.60 EUR
- Fondo de caja establecido: 100.00 EUR
- Deberia haber: 104.60 EUR
- Hay: 79.00 EUR (despues de dejar el sobrante)
- Nota: La diferencia se debe a que los gastos se pagaron con el efectivo acumulado

### Paso 7: Retirada y deposito
- La recepcionista:
  - Deja 100 EUR como fondo para manana
  - El excedente lo anota para depositar
  - Prepara el sobre con el desglose

### Paso 8: Generacion de reporte de cierre
- Usa el reporte de cierre del dia:
  ```
  CIERRE DE CAJA - 15/05/2024
  ===========================
  Facturacion total:     412.00 EUR
  - Efectivo:             73.00 EUR
  - Tarjeta:             219.00 EUR
  - Bizum:                35.00 EUR
  - Transferencia:        85.00 EUR

  Gastos del dia:         68.40 EUR

  Citas atendidas:         8
  Clientes nuevos:         2
  Cancelaciones:           1
  No-shows:                0
  ```
- Guarda el reporte en el sistema
- Imprime copia para archivo fisico

### Paso 9: Backup y cierre
- Verifica que todas las citas del dia estan en estado final (completada, cancelada, no-show)
- Cierra sesion del sistema
- Guarda el dinero en la caja fuerte

---

## Flujo 20: Gestion de resenas

**Actor:** Cliente + Manager  
**Contexto:** Despues de una cita, el sistema solicita una resena. El manager responde.

### Paso 1: Solicitud automatica de resena
- 24 horas despues de que Marta recogio a Rocky
- El sistema envia automaticamente un email a Marta:
  - Asunto: "Como fue la visita de Rocky a Patitas Felices?"
  - Link a `/portal/reviews/new?appointment=123`

### Paso 2: Cliente deja resena
- Marta abre el email y hace clic en el link
- Accede al formulario de resena (ya autenticada via token en el link)
- Calificacion general: 5 estrellas
- Puntuacion del peluquero (Ana): 5 estrellas
- Puntuacion del servicio: 5 estrellas
- Comentario: "Ana fue maravillosa con Rocky. El quedo precioso y ella fue muy paciente porque Rocky se pone nervioso con el secador. Volveremos seguro!"
- Recomendaria: Si
- Envia la resena

### Paso 3: Recepcion en el sistema
- El sistema recibe la resena
- Estado: "Pendiente de moderacion"
- Notifica al manager por email: "Nueva resena recibida de Marta Lopez"

### Paso 4: Moderacion por el manager
- El manager navega a `/reviews` o `/communications`
- Ve la nueva resena de Marta
- Revisa el contenido: positivo, sin datos sensibles
- La aprueba haciendo clic en "Aprobar"
- Estado cambia a "Publicada"

### Paso 5: Respuesta del salon
- El manager decide responder a Marta
- Escribe respuesta:
  - "Muchas gracias Marta! Nos alegra mucho que Rocky haya estado comodo con Ana. Efectivamente es un mimoso pero con paciencia sale todo :) Te esperamos en la proxima visita!"
- Guarda la respuesta
- Marta recibe notificacion de la respuesta por email

### Paso 6: Metricas de resenas
- El manager revisa el panel de resenas:
  - Total resenas: 47
  - Promedio general: 4.8 / 5 estrellas
  - Resenas este mes: 8
  - Distribucion:
    - 5 estrellas: 40
    - 4 estrellas: 5
    - 3 estrellas: 1
    - 2 estrellas: 1
    - 1 estrella: 0

### Paso 7: Gestion de resena negativa (ejemplo)
- Una resena de 2 estrellas llega de otro cliente
- Comentario: "Llegue y no tenian mi cita registrada, tuve que esperar 30 minutos"
- El manager investiga:
  - Revisa el calendario del dia mencionado
  - Encuentra que hubo un error de doble booking
  - Identifica que el sistema permitio una cita online en un slot ya ocupado

### Paso 8: Respuesta y accion correctiva
- Responde a la resena:
  - "Pedimos disculpas por el inconveniente. Hubo un error en nuestro sistema de reservas que ya hemos corregido. Nos gustaria ofrecerle un 20% de descuento en su proxima visita como compensacion. Por favor contactenos por email."
- Marca internamente como "Requiere seguimiento"
- Contacta al cliente por telefono para disculparse personalmente
- Ofrece el descuento y reprograma su proxima cita

### Paso 9: Mejora del proceso
- El manager revisa como ocurrio el doble booking
- Identifica un bug en la configuracion de horarios
- Ajusta la logica para prevenir solapamientos
- Documenta el incidente para el equipo

---

## Anexo: Matriz de actores y permisos por flujo

| Flujo | OWNER | MANAGER | GROOMER | RECEPTIONIST | CUSTOMER |
|-------|-------|---------|---------|--------------|----------|
| 1. Apertura del dia | Si | Si | Parcial | Si | No |
| 2. Recepcion cliente nuevo | Si | Si | No | Si | No |
| 3. Agendamiento telefono | Si | Si | No | Si | No |
| 4. Atencion de cita | Si | Si | Si | Si | No |
| 5. Gestion financiera | Si | Si | No | Parcial | No |
| 6. Control inventario | Si | Si | No | Parcial | No |
| 7. Fidelizacion | Si | Si | No | Si | Ver puntos |
| 8. Reserva online | No | No | No | No | Si |
| 9. Gestion equipo | Si | Parcial | No | No | No |
| 10. Analisis productividad | Si | Si | Ver propias | No | No |
| 11. Venta paquetes | Si | Si | No | Si | Ver propios |
| 12. Lista de espera | Si | Si | No | Si | No |
| 13. Onboarding | Si (propio) | No | No | No | No |
| 14. Pagos parciales | Si | Si | No | Si | No |
| 15. Cancelacion/reprog | Si | Si | Parcial | Si | Si (propias) |
| 16. Vacaciones | Si | Si | Ver propias | No | No |
| 17. Revision salud | Si | Si | Si | No | No |
| 18. Uso cupon | Si (crea) | Si (crea) | No | Si (aplica) | Si (usa) |
| 19. Cierre caja | Si | Si | No | Si | No |
| 20. Gestion resenas | Si | Si | No | No | Si (crea) |

---

> Documento generado el 2026-05-13. 20 flujos multipasos que cubren el 95% de las operaciones diarias del negocio.
