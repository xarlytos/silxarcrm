"""Dispara una llamada de prueba al número indicado.

Requiere el servidor corriendo y accesible públicamente (ngrok) y las
credenciales Twilio en .env.

Uso:
    python -m scripts.test_call +52155XXXXXXXX
"""
from __future__ import annotations

import sys

from app.compliance.mx import within_legal_hours
from app.telephony.twilio_client import start_outbound_call


def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python -m scripts.test_call +52155XXXXXXXX")
        raise SystemExit(1)
    phone = sys.argv[1]
    if not within_legal_hours():
        print("Aviso: fuera del horario legal de llamadas (revisa CALL_HOUR_* en .env).")
    result = start_outbound_call(phone)
    print("Resultado:", result)


if __name__ == "__main__":
    main()
