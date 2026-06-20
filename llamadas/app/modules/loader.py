"""Loader de configuración modular para el agente de voz.

Carga la config de un software desde:
1. Cache en memoria (TTL 5 min)
2. Backend HTTP (API REST del CRM)
3. Módulos locales (fallback offline)

Uso:
    config = await load_agent_config("smartdental")
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.config import settings
from app.modules.types import AgentConfig

logger = logging.getLogger(__name__)

# Cache en memoria: software_id → (timestamp, config)
_config_cache: dict[str, tuple[float, AgentConfig]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutos


async def load_agent_config(software_id: str) -> AgentConfig:
    """Carga la configuración del agente para un software.

    Orden de preferencia:
    1. Cache en memoria (si no expiró)
    2. Backend HTTP (CRM)
    3. Módulo local (fallback offline)
    4. Config base genérica (último recurso)
    """
    if not software_id:
        logger.warning("software_id vacio, usando config base")
        return _load_base_config()

    # 1. Intentar cache
    cached = get_cached_config(software_id)
    if cached:
        return cached

    # 2. Intentar backend HTTP
    try:
        config = await _load_from_backend(software_id)
        if config:
            _config_cache[software_id] = (time.time(), config)
            logger.info("Config cargada desde backend para %s", software_id)
            return config
    except Exception as exc:
        logger.warning("Fallo cargando config desde backend (%s): %s", software_id, exc)

    # 3. Intentar módulo local
    try:
        config = _load_from_module(software_id)
        if config:
            _config_cache[software_id] = (time.time(), config)
            logger.info("Config cargada desde modulo local para %s", software_id)
            return config
    except Exception as exc:
        logger.warning("Fallo cargando config desde modulo local (%s): %s", software_id, exc)

    # 4. Fallback base
    logger.warning("Usando config base generica para %s", software_id)
    return _load_base_config()


def get_cached_config(software_id: str) -> AgentConfig | None:
    """Devuelve la config cacheada si no expiró."""
    if software_id not in _config_cache:
        return None
    ts, config = _config_cache[software_id]
    if time.time() - ts > CACHE_TTL_SECONDS:
        del _config_cache[software_id]
        return None
    return config


def clear_cache(software_id: str | None = None) -> None:
    """Limpia la cache. Si software_id es None, limpia toda la cache."""
    global _config_cache
    if software_id is None:
        _config_cache = {}
        logger.info("Cache de configs limpiada completamente")
    elif software_id in _config_cache:
        del _config_cache[software_id]
        logger.info("Cache de config limpiada para %s", software_id)


# ── Métodos privados ──

async def _load_from_backend(software_id: str) -> AgentConfig | None:
    """Carga config desde el backend Express via HTTP."""
    backend_url = getattr(settings, "backend_voice_config_url", "")
    api_key = getattr(settings, "voice_config_api_key", "") or getattr(settings, "backend_webhook_secret", "")

    if not backend_url:
        logger.debug("backend_voice_config_url no configurado")
        return None

    import aiohttp

    url = f"{backend_url.rstrip('/')}/config/{software_id}"
    headers = {"x-api-key": api_key} if api_key else {}

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 404:
                logger.debug("Config no encontrada en backend para %s", software_id)
                return None
            resp.raise_for_status()
            data = await resp.json()

            # El backend devuelve { success: true, data: config }
            config_data = data.get("data") if isinstance(data, dict) else data
            if not config_data:
                return None

            config = AgentConfig.from_dict(config_data)
            config.software_id = software_id
            return config


def _load_from_module(software_id: str) -> AgentConfig | None:
    """Carga config desde un módulo Python local (fallback offline)."""
    # Mapeo de software_id/slug → módulo
    module_map = {
        "smartdental": "app.modules.smartdental",
        "peluguau": "app.modules.peluguau",
        "groomly": "app.modules.groomly",
    }

    module_name = module_map.get(software_id)
    if not module_name:
        return None

    try:
        import importlib
        mod = importlib.import_module(module_name)
        config = mod.get_config()
        config.software_id = software_id
        return config
    except Exception as exc:
        logger.warning("No se pudo cargar modulo %s: %s", module_name, exc)
        return None


def _load_base_config() -> AgentConfig:
    """Config genérica de último recurso."""
    from app.modules.base import get_config
    return get_config()
