"""Base de conocimiento por nicho: casos de éxito, dolores y objeciones.

Estos datos alimentan el RAG (`buscar_caso_de_exito`) y la comparación con
competidores. Provienen del documento de diseño, adaptados a México.
"""
from __future__ import annotations

SUCCESS_CASES: list[dict] = [
    {
        "tipo_negocio": "veterinaria",
        "caso": "La clínica VetSan en CDMX pasó de 8 a 2 cancelaciones por semana con recordatorios por WhatsApp.",
        "dolor": "Dueños olvidan vacunas y desparasitaciones; se pierden ingresos.",
        "precio_justo": 49,
        "objecion_comun": "ya uso una agenda",
    },
    {
        "tipo_negocio": "peluqueria_canina",
        "caso": "Peludos Spa en Guadalajara duplicó citas usando lista de espera automática que avisa al siguiente cliente en 10 segundos.",
        "dolor": "Huecos por cancelaciones en temporada alta.",
        "precio_justo": 29,
        "objecion_comun": "solo soy yo",
    },
    {
        "tipo_negocio": "gimnasio",
        "caso": "FitZone en Monterrey bajó de 15 a 6 abandonos al mes con recordatorios de rutina y seguimiento automático.",
        "dolor": "Membresías vencidas y falta de seguimiento.",
        "precio_justo": 59,
        "objecion_comun": "uso otra app",
    },
    {
        "tipo_negocio": "dentista",
        "caso": "El consultorio Sonrisas Perfectas llenó su agenda en 2 meses recordando limpiezas cada 6 meses y controles.",
        "dolor": "Pacientes que no regresan tras la primera cita (~40%).",
        "precio_justo": 39,
        "objecion_comun": "mi secretaria maneja eso",
    },
    {
        "tipo_negocio": "yoga",
        "caso": "Luz Interior dejó de perder 2 horas al día coordinando: ahora los clientes reservan solos en su página.",
        "dolor": "Coordinar horarios de sesiones individuales por WhatsApp.",
        "precio_justo": 29,
        "objecion_comun": "tengo pocos clientes",
    },
    {
        "tipo_negocio": "terapeuta",
        "caso": "Una terapeuta holística organizó sus talleres grupales y sesiones sin dobles reservas.",
        "dolor": "Agenda desordenada de sesiones individuales.",
        "precio_justo": 29,
        "objecion_comun": "tengo pocos clientes",
    },
    {
        "tipo_negocio": "entrenador",
        "caso": "StrongBy pasó de 15 a 40 clientes en 3 meses con recordatorios de rutina y seguimiento de progreso.",
        "dolor": "Clientes que faltan a sesiones; no hay compromiso.",
        "precio_justo": 29,
        "objecion_comun": "uso Calendly",
    },
]

COMPETITOR_COMPARISONS: dict[str, dict] = {
    "calendly": {
        "diferencias": [
            "Calendly solo agenda. GestPro además manda recordatorios por WhatsApp, cobra y da seguimiento a quien abandona.",
            "Calendly $12 + Stripe + WhatsApp Business por separado suele salir más caro que los $29 todo incluido de GestPro.",
            "Calendly no tiene CRM; GestPro guarda el historial de cada cliente.",
        ],
        "caso_exito": "FitZone migró de Calendly a GestPro y dejó de perder 8 clientes al mes.",
    },
    "excel": {
        "diferencias": [
            "Excel no recuerda nada al cliente; GestPro manda recordatorios automáticos.",
            "Con Excel no hay reservas online ni cobros; GestPro sí.",
        ],
        "caso_exito": "Varios negocios pasaron de Excel a GestPro y recuperan citas la primera semana.",
    },
    "papel": {
        "diferencias": [
            "La agenda de papel se pierde y no avisa a nadie; GestPro recuerda solo.",
            "GestPro permite reservar online 24/7 sin que usted conteste.",
        ],
        "caso_exito": "Negocios que dejaron el papel llenaron huecos que antes ni veían.",
    },
}
