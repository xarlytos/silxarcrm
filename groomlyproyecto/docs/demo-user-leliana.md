# Usuario demo: Peluqueria Canina L'Eliana

Demo completo creado mediante el script `groomly-backend/prisma/seed-leliana.ts`.
Reproducible con `npm run db:seed:leliana` desde `groomly-backend/`.

## Credenciales de acceso

| Campo | Valor |
|---|---|
| Email | `encargado@peluquerialeliana.es` |
| Password | `leliana2026` |
| Rol | `OWNER` |
| Email verificado | Si |

## Datos del propietario

| Campo | Valor |
|---|---|
| Nombre | Marta |
| Apellidos | Ferrer Domingo |

## Datos del salon

| Campo | Valor |
|---|---|
| Nombre | Peluqueria Canina L'Eliana |
| Slug | `peluqueria-canina-leliana` |
| Plan | `pro` |
| Estado suscripcion | `active` |
| Idioma | `es` |
| Zona horaria | `Europe/Madrid` |
| Moneda | `EUR` |
| Color primario | `#0ea5e9` |

### Horario

- Lunes a jueves: 09:30 - 19:30 (descanso 14:00 - 16:00)
- Viernes: 09:30 - 20:00 (descanso 14:00 - 16:00)
- Sabado: 10:00 - 14:00
- Domingo: cerrado

### Booking

- Antelacion maxima de reserva: 30 dias
- Antelacion minima: 12 horas
- Duracion de slot: 30 minutos

## Equipo (groomers)

| Nombre | Rol | Color calendario | Citas/dia max |
|---|---|---|---|
| Marta Ferrer | Senior (propietaria) | `#8636f4` | 8 |
| Andrea Lopez | Junior | `#f59e0b` | 7 |

Andrea esta especializada en razas de pelo largo y cortes asiaticos (`haircut`, `spa`, `bath`).

Horario semanal por defecto: L-V 09:00-18:00 con descanso 14-15h, S 09:00-14:00.

## Catalogo de servicios (6)

| Servicio | Duracion | Precio base | XS | S | M | L | XL |
|---|---|---|---|---|---|---|---|
| Bano basico | 30 min | 20 EUR | - | 18 | 22 | 28 | 35 |
| Bano y corte | 75 min | 35 EUR | - | 30 | 38 | 48 | 58 |
| Corte de unas | 15 min | 8 EUR | (fijo) | | | | |
| Limpieza de oidos | 15 min | 10 EUR | (fijo) | | | | |
| Deslanado | 45 min | 25 EUR | - | 20 | 28 | 38 | 48 |
| Spa / Tratamiento | 30 min | 18 EUR | (fijo) | | | | |

## Clientes (7)

| Cliente | Ciudad | Puntos fidelidad | Mascotas |
|---|---|---|---|
| Carmen Navarro Ortiz | L'Eliana | 240 | Coco |
| Javier Bellver Soriano | La Pobla de Vallbona | 80 | Lola |
| Rosa Martinez Pla (VIP) | L'Eliana | 540 | Trufa, Bruno |
| Sergio Climent Garcia | Betera | 30 | Rex |
| Laura Tarazona Gil | San Antonio de Benageber | 175 | Nube |
| Vicente Roig Albiol | L'Eliana | 95 | Simba |
| Patricia Olmos Vidal | L'Eliana | 410 | Thor, Greta, Lia |

## Mascotas (10)

| Nombre | Raza | Tamano | Sexo | Pelo | Peso | Notas |
|---|---|---|---|---|---|---|
| Coco | Schnauzer Mediano | M | macho | wire | 14.5 kg | Stripping cada 3 meses |
| Lola | Yorkshire Terrier | XS | hembra | long | 2.8 kg | Nerviosa con maquinilla |
| Trufa | Caniche Toy | S | hembra | curly | 4.2 kg | Alergia a sulfatos, corte "oso" |
| Bruno | Cocker Spaniel Ingles | M | macho | medium | 13 kg | Otitis recurrente |
| Rex | Mestizo grande | L | macho | short | 28.5 kg | Reactivo con otros perros |
| Nube | Bichon Maltes | S | hembra | long | 3.5 kg | Manto largo, lacito |
| Simba | Pomerania | XS | macho | long | 3.1 kg | Corte tipo oso |
| Thor | Golden Retriever | L | macho | medium | 34 kg | Deslanado obligatorio |
| Greta | Westy | S | hembra | wire | 8.2 kg | Dermatitis alergica |
| Lia | Border Collie | M | hembra | medium | 17.5 kg | - |

## Citas

### Pasadas (3, completadas)

| Fecha | Cliente | Mascota | Groomer | Servicio | Total |
|---|---|---|---|---|---|
| Hoy -7 | Carmen | Coco | Marta | Bano y corte | 38 EUR |
| Hoy -3 | Rosa | Trufa | Andrea | Bano y corte + Spa | 48 EUR |
| Hoy -1 | Patricia | Thor | Marta | Bano basico + Deslanado | 66 EUR |

### Futuras (6)

| Fecha | Cliente | Mascota | Groomer | Estado | Total |
|---|---|---|---|---|---|
| Hoy +1 | Javier | Lola | Andrea | confirmed | 30 EUR |
| Hoy +2 | Sergio | Rex | Marta | confirmed | 28 EUR |
| Hoy +3 | Laura | Nube | Andrea | pending | 48 EUR |
| Hoy +5 | Vicente | Simba | Marta | confirmed | 38 EUR |
| Hoy +7 | Patricia | Greta | Andrea | pending | 40 EUR |
| Hoy +10 | Rosa | Bruno | Marta | confirmed | 48 EUR |

## Facturas (3)

| Numero | Cliente | Total | Estado |
|---|---|---|---|
| F-2026-0001 | Carmen | 38 EUR | paid (tarjeta) |
| F-2026-0002 | Rosa | 48 EUR | paid (tarjeta) |
| F-2026-0003 | Patricia | 66 EUR | pending |

## Gastos del mes (4)

| Categoria | Concepto | Importe | Proveedor |
|---|---|---|---|
| products | Pedido productos de bano | 125.40 EUR | Distribuidora Canica SL |
| rent | Alquiler local mayo 2026 | 750.00 EUR | Inmobiliaria Valle SL |
| utilities | Factura luz abril | 92.15 EUR | Iberdrola |
| marketing | Publicidad Instagram (1 semana) | 45.00 EUR | Meta Platforms |

## Inventario (7 articulos)

| Producto | SKU | Stock | Min |
|---|---|---|---|
| Champu hipoalergenico 5L | CH-HIPO-5L | 6 | 2 |
| Champu blanqueador 5L | CH-BLAN-5L | 3 | 2 |
| Acondicionador hidratante 1L | AC-HIDRA-1L | 8 | 3 |
| Tijeras curvas Geib 8" | TJ-GEIB-8 | 2 | 1 |
| Cuchilla Andis 7F | CCH-7F | 4 | 2 |
| Perfume canino Roses 100ml | PFM-ROS-100 | 11 | 3 |
| Lacitos surtidos (pack 50u) | ACC-LAC-50 | 1 | 2 |

> Atencion: los lacitos estan por debajo del minimo (1 < 2).

## Fidelizacion

- **Regla activa**: 2 puntos por euro, minimo de compra 15 EUR.
- **Transacciones registradas**: Carmen (+76 pts), Rosa (+96 pts).
- **Cupon activo**: `PRIMAVERA2026` — 15% descuento, compra minima 25 EUR, 50 usos limite (7 usados), valido hasta hoy +60 dias.

## Paquetes

| Paquete | Servicios | Precio | Original | Ahorro | Validez |
|---|---|---|---|---|---|
| Bono 5 banos | 5 Banos basicos | 80 EUR | 100 EUR | 20% | 365 dias |

## Resenas (2, publicadas)

| Cliente | Cita | Rating | Comentario |
|---|---|---|---|
| Carmen | Bano y corte Coco | 5* | "Coco salio guapisimo, como siempre. Marta es una crack con los schnauzer." |
| Rosa | Bano y spa Trufa | 5* | "Trufa olia genial al recogerla. Repetiremos seguro." (respondida) |

---

## Recrear el demo

```powershell
cd groomly-backend
npm run db:seed:leliana
```

El script es idempotente: si ya existe el usuario o el slug, aborta sin duplicar. Para regenerar desde cero, primero `npm run db:reset` (cuidado: borra toda la base de datos).
