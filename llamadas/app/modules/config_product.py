"""Configuracion del producto/software que el agente vende."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProductConfig:
    """Que se vende: marca, producto, vertical, precio, moneda, mercado."""

    company_name: str = "GestPro"
    product_name: str = "GestPro"
    product_description: str = "Software de gestion para negocios"

    # Mercado objetivo
    target_vertical: str = "negocios de servicios"
    target_audience: str = "duenos de negocios"

    # Economia
    currency: str = "EUR"
    currency_symbol: str = "EUR"
    price_monthly: int = 39

    # Geografia
    market_country: str = "es"  # es, mx, co, ar...
    market_city_examples: str = "Madrid, Barcelona, Valencia"
