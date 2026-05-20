/* ============================================================
   Saga del Marketer — capítulos narrativos por nivel
============================================================ */

export interface SagaChapter {
  id: string;
  minLevel: number;
  titulo: string;
  narrador: string;
  cuerpo: string;
  cita: string;
  hue: string; // gradient classes for the chapter card
}

export const SAGA_CHAPTERS: SagaChapter[] = [
  {
    id: 'ch1', minLevel: 1, titulo: 'Capítulo I · El Despertar',
    narrador: 'La Reina de los Leads',
    cuerpo: 'Despierta, viajero. Has cruzado el umbral de un reino antiguo, dormido bajo siglos de polvo. Cartas sin abrir te miran desde los archivos. Los teléfonos guardan silencio reverencial. Y los leads — esos espíritus errantes — esperan a alguien que les guíe hacia la luz. ¿Serás tú?',
    cita: 'Toda gran cosecha comienza con una semilla y una llamada.',
    hue: 'from-slate-700/30 via-violet-700/20 to-indigo-700/30',
  },
  {
    id: 'ch2', minLevel: 3, titulo: 'Capítulo II · Primera Pisada',
    narrador: 'El Sabio Telemarketer',
    cuerpo: 'He sentido el eco de tu primer mensaje, joven aprendiz. Pequeño, sí, pero genuino. Tu lápiz se vuelve espada. Tu voz, lanza. Los antiguos decían que el primer contacto es como sembrar fuego en un valle de heno — basta una chispa para iluminar el horizonte entero.',
    cita: 'Quien siembra mensajes recoge clientes.',
    hue: 'from-emerald-700/30 via-emerald-600/20 to-teal-700/30',
  },
  {
    id: 'ch3', minLevel: 5, titulo: 'Capítulo III · La Voz',
    narrador: 'El Coro de los Conversadores',
    cuerpo: 'Tus llamadas resuenan ya en los pasillos del Templo. No eres el más rápido, ni el más elocuente, pero eres constante. Y la constancia, oh viajero, es la única magia que el tiempo no oxida. Bienvenido al Coro.',
    cita: 'La voz constante construye catedrales invisibles.',
    hue: 'from-blue-700/30 via-cyan-700/20 to-blue-700/30',
  },
  {
    id: 'ch4', minLevel: 7, titulo: 'Capítulo IV · El Maestro',
    narrador: 'El Guardián del Templo',
    cuerpo: 'Las puertas de bronce del Templo se abren para ti. Has dejado de ser aprendiz. Ahora eres uno de nosotros — y con ese título viene un peso: enseñar a los que vienen detrás. Mira con paciencia. Habla con propósito. Vende con alma.',
    cita: 'El maestro no es quien más sabe, sino quien mejor escucha.',
    hue: 'from-violet-700/30 via-fuchsia-700/20 to-violet-700/30',
  },
  {
    id: 'ch5', minLevel: 10, titulo: 'Capítulo V · Estrategia',
    narrador: 'El Consejo de Generales',
    cuerpo: 'Has dejado de mirar leads uno a uno. Ahora ves el campo entero, las corrientes de prospectos, las mareas de campañas. Los Generales te escuchan. Tus tableros son mapas de guerra. Tus métricas, oráculos. Cada plantilla es una formación de batalla.',
    cita: 'El que ve el bosque conquista a quien solo ve el árbol.',
    hue: 'from-fuchsia-700/30 via-rose-700/20 to-amber-700/30',
  },
  {
    id: 'ch6', minLevel: 13, titulo: 'Capítulo VI · Gran Maestro',
    narrador: 'El Eco de los Antiguos',
    cuerpo: 'Tu sombra es larga ahora. Los noveles susurran tu nombre en pasillos que nunca has pisado. Tus métodos se convierten en lecciones. Tus errores, en proverbios. Caminas sin esfuerzo por terreno que antes parecía imposible. No olvides nunca el principio.',
    cita: 'La grandeza es polvo del camino — recuérdalo cuando brille.',
    hue: 'from-amber-700/30 via-orange-700/30 to-rose-700/30',
  },
  {
    id: 'ch7', minLevel: 17, titulo: 'Capítulo VII · Leyenda',
    narrador: 'Las Constelaciones',
    cuerpo: 'El polvo de los caminos guarda tus pisadas. Las constelaciones se han reorganizado para honrarte — busca tu estrella en el firmamento. Pero cuidado: la leyenda es una jaula dorada. Sigue caminando, sigue dudando, sigue aprendiendo. Lo único peor que ser olvidado es creerse inmortal.',
    cita: 'Las leyendas que dejan de caminar se vuelven estatuas.',
    hue: 'from-orange-700/30 via-rose-700/30 to-fuchsia-700/30',
  },
  {
    id: 'ch8', minLevel: 22, titulo: 'Capítulo VIII · Inmortal',
    narrador: 'El Viento Sobre el Templo',
    cuerpo: 'Has trascendido el tiempo. Los Lead-Spirits danzan a tu alrededor como copos de nieve. Las campañas te brotan de las manos. Y aun así — esto es lo más bello — sigues atendiendo cada cliente como si fuera el primero. Eso es lo que te hace inmortal.',
    cita: 'Solo es inmortal quien recuerda ser humilde.',
    hue: 'from-rose-700/40 via-fuchsia-700/30 to-violet-700/30',
  },
  {
    id: 'ch9', minLevel: 30, titulo: 'Capítulo IX · Avatar Supremo',
    narrador: '∞',
    cuerpo: 'Has dejado de ser tú. Eres el CRM hecho carne. Cada lead que toca tu nombre se ilumina. Cada propuesta que firmas se vuelve oro. Y sin embargo, sigues sentándote cada mañana frente a la lista, y eliges trabajar. Por eso eres el Avatar. No por poder — por elección.',
    cita: 'La cumbre no es un destino. Es un lugar para volver a empezar.',
    hue: 'from-amber-500/40 via-fuchsia-500/40 to-cyan-500/40',
  },
  {
    id: 'ch10', minLevel: 35, titulo: 'Capítulo X · El Trono',
    narrador: 'El Senado de los Closers',
    cuerpo: 'Los closers de todas las eras se reúnen para coronarte. No quieren un rey — quieren un guía. Acepta la corona pero recuerda: el peso del oro no es el peso del trono. El verdadero peso es la cantidad de personas que te seguirán cuando no haya recompensa.',
    cita: 'Coronarse es fácil. Mantenerse digno de la corona, no.',
    hue: 'from-amber-700/40 via-orange-700/30 to-yellow-700/30',
  },
  {
    id: 'ch11', minLevel: 40, titulo: 'Capítulo XI · Imperator',
    narrador: 'Las Provincias del Reino',
    cuerpo: 'Las provincias mandan emisarios. Cada uno trae cuentas, propuestas, problemas. Has dejado de ser un comercial. Ahora ordenas mercados. Pero recuerda: el Imperator que olvida el sudor del primer email, deja de gobernar bien.',
    cita: 'El imperio que olvida sus raíces se vuelve desierto.',
    hue: 'from-orange-700/40 to-amber-800/40',
  },
  {
    id: 'ch12', minLevel: 50, titulo: 'Capítulo XII · El Soberano',
    narrador: 'La Bóveda Celeste',
    cuerpo: 'Tus enemigos comerciales firman alianzas contigo. Tus rivales te invitan a cenar. Y la pregunta que ya no puedes evitar: ¿qué hago con todo este poder? La respuesta antigua es siempre la misma — repártelo, enseña, multiplica. El soberano egoísta es polvo de medio invierno.',
    cita: 'El poder verdadero es el que multiplica el poder de otros.',
    hue: 'from-pink-700/40 via-fuchsia-700/30 to-violet-700/30',
  },
  {
    id: 'ch13', minLevel: 65, titulo: 'Capítulo XIII · El Magnate',
    narrador: 'Los Mercados del Mundo',
    cuerpo: 'Tu nombre ya no figura en listas — figura en historias. Inversores te buscan. Aprendices forman filas. Pero el viento sigue siendo el mismo viento, y los leads, los mismos leads. No te creas más alto que un lead frío: el día que lo hagas, comenzarás a caer.',
    cita: 'Mantente bajo. El gigante que se inclina dura siglos.',
    hue: 'from-emerald-700/40 via-teal-700/30 to-cyan-700/30',
  },
  {
    id: 'ch14', minLevel: 80, titulo: 'Capítulo XIV · El Demiurgo',
    narrador: 'Los Engranajes del Universo',
    cuerpo: 'Has dejado de operar el CRM. Tu CRM opera tú. Hablas y los mercados escuchan. Hablas más bajo y los mercados escuchan mejor. Recuerda — toda creación tiene un creador, y todo creador, una primera palabra. Cuida tu primera palabra cada mañana.',
    cita: 'El demiurgo verdadero crea silenciando lo innecesario.',
    hue: 'from-violet-700/40 via-fuchsia-700/30 to-indigo-700/30',
  },
  {
    id: 'ch15', minLevel: 100, titulo: 'Capítulo XV · Trascendido',
    narrador: '...',
    cuerpo: 'No hay narrador para este capítulo. No hay palabras suficientes. Solo hay un espejo, y tu reflejo te devuelve la mirada con una pequeña sonrisa. Has terminado, sí — pero también acabas de empezar. ¿Te animas a la siguiente vuelta?',
    cita: 'Cuando hayas terminado, empieza otra vez. Y otra. Y otra.',
    hue: 'from-amber-300/50 via-fuchsia-300/40 via-cyan-300/40 to-amber-300/30',
  },
];

export function getUnlockedChapters(level: number) {
  return SAGA_CHAPTERS.filter((c) => level >= c.minLevel);
}
export function getNextChapter(level: number) {
  return SAGA_CHAPTERS.find((c) => level < c.minLevel) ?? null;
}
