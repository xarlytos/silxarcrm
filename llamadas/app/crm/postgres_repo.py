"""Acceso al CRM via PostgreSQL (compartido con backend Express).

Lee leads, spechs y escribe logs en las mismas tablas que usa el CRM Maestro.
Degrada a no-op si falta DATABASE_URL.

Tablas usadas:
  - leads (id, nombre, email, telefono, empresa, cargo, pais, estado, software_id, ...)
  - spechs_llamada (id, software_id, titulo, contenido, activo, es_default, ...)
  - llamadas_reales (id, software_id, lead_id, spech_id, agente_id, estado, modo,
                     telefono_lead, transcript, duracion_seg, grabacion_url,
                     ai_call_sid, ai_session_id, metadata, iniciada_at, terminada_at,
                     created_at, updated_at)
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

_pool = None


async def _get_pool():
    global _pool
    if _pool is not None:
        return _pool
    if not settings.database_url:
        return None
    try:
        import asyncpg

        _pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=5,
            command_timeout=10,
        )
    except Exception as exc:
        logger.warning("No se pudo conectar a PostgreSQL (%s); CRM en modo offline", exc)
        _pool = None
    return _pool


# ---------------------------------------------------------------------------
# Leads
# ---------------------------------------------------------------------------

async def get_lead(phone: str, software_id: str) -> dict[str, Any]:
    """Busca un lead por telefono + software_id."""
    pool = await _get_pool()
    if pool is None:
        return {"phone": phone, "status": "desconocido", "historial": "sin datos (offline)"}
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, nombre, email, telefono, empresa, cargo, pais,
                       estado, origen, software_id, notas, metadata,
                       created_at, updated_at
                FROM leads
                WHERE telefono = $1 AND software_id = $2
                LIMIT 1
                """,
                phone,
                software_id,
            )
            if row:
                return dict(row)
            return {"phone": phone, "status": "nuevo", "software_id": software_id}
    except Exception as exc:
        logger.warning("Fallo get_lead (%s)", exc)
        return {"phone": phone, "status": "error"}


async def get_lead_by_id(lead_id: str) -> dict[str, Any] | None:
    """Busca un lead por su ID."""
    pool = await _get_pool()
    if pool is None:
        return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, nombre, email, telefono, empresa, cargo, pais,
                       estado, origen, software_id, notas, metadata
                FROM leads
                WHERE id = $1
                LIMIT 1
                """,
                lead_id,
            )
            return dict(row) if row else None
    except Exception as exc:
        logger.warning("Fallo get_lead_by_id (%s)", exc)
        return None


async def is_optout(phone: str, software_id: str = "") -> bool:
    """Consulta si el lead esta en estado RECHAZADO o NO_RESPONDE."""
    pool = await _get_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            where_extra = "AND software_id = $2" if software_id else ""
            params = [phone]
            if software_id:
                params.append(software_id)
            row = await conn.fetchrow(
                f"""
                SELECT estado FROM leads
                WHERE telefono = $1 {where_extra}
                LIMIT 1
                """,
                *params,
            )
            if row:
                estado = row["estado"]
                return estado in ("RECHAZADO", "NO_RESPONDE")
            return False
    except Exception as exc:
        logger.warning("Fallo is_optout (%s)", exc)
        return False


async def set_optout(phone: str, software_id: str = "") -> None:
    """Marca el lead como RECHAZADO."""
    pool = await _get_pool()
    if pool is None:
        logger.info("[offline] opt-out registrado para %s", phone)
        return
    try:
        async with pool.acquire() as conn:
            where_extra = "AND software_id = $2" if software_id else ""
            params = [phone]
            if software_id:
                params.append(software_id)
            await conn.execute(
                f"""
                UPDATE leads
                SET estado = 'RECHAZADO', updated_at = NOW()
                WHERE telefono = $1 {where_extra}
                """,
                *params,
            )
    except Exception as exc:
        logger.warning("Fallo set_optout (%s)", exc)


# ---------------------------------------------------------------------------
# Spechs
# ---------------------------------------------------------------------------

async def get_spech(software_id: str, spech_id: str | None = None) -> dict[str, Any] | None:
    """Busca un spech por software_id. Si se pasa spech_id, busca exacto.
    Si no, busca el default (es_default = true) o el primero activo.
    """
    pool = await _get_pool()
    if pool is None:
        return None
    try:
        async with pool.acquire() as conn:
            if spech_id:
                row = await conn.fetchrow(
                    """
                    SELECT id, titulo, contenido, objetivo, objeciones, orden, activo, es_default
                    FROM spechs_llamada
                    WHERE id = $1 AND software_id = $2 AND activo = true
                    LIMIT 1
                    """,
                    spech_id,
                    software_id,
                )
                return dict(row) if row else None

            # Primero intenta el default
            row = await conn.fetchrow(
                """
                SELECT id, titulo, contenido, objetivo, objeciones, orden, activo, es_default
                FROM spechs_llamada
                WHERE software_id = $1 AND activo = true AND es_default = true
                LIMIT 1
                """,
                software_id,
            )
            if row:
                return dict(row)

            # Fallback al primero activo por orden
            row = await conn.fetchrow(
                """
                SELECT id, titulo, contenido, objetivo, objeciones, orden, activo, es_default
                FROM spechs_llamada
                WHERE software_id = $1 AND activo = true
                ORDER BY orden ASC
                LIMIT 1
                """,
                software_id,
            )
            return dict(row) if row else None
    except Exception as exc:
        logger.warning("Fallo get_spech (%s)", exc)
        return None


# ---------------------------------------------------------------------------
# Llamadas
# ---------------------------------------------------------------------------

async def create_llamada(
    software_id: str,
    lead_id: str,
    spech_id: str | None,
    agente_id: int,
    telefono_lead: str,
    modo: str = "AI",
    ai_call_sid: str | None = None,
) -> str:
    """Crea un registro de llamada y devuelve su ID."""
    pool = await _get_pool()
    if pool is None:
        return ""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO llamadas_reales
                (software_id, lead_id, spech_id, agente_id, estado, direccion,
                 telefono_lead, modo, ai_call_sid, iniciada_at, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
                RETURNING id
                """,
                software_id,
                lead_id,
                spech_id,
                agente_id,
                "ai_conectando",
                "saliente",
                telefono_lead,
                modo,
                ai_call_sid,
            )
            return str(row["id"]) if row else ""
    except Exception as exc:
        logger.warning("Fallo create_llamada (%s)", exc)
        return ""


async def update_llamada_estado(
    llamada_id: str,
    estado: str,
    metadata: dict | None = None,
    duracion_seg: int | None = None,
    transcript: list[dict] | None = None,
    grabacion_url: str | None = None,
) -> None:
    """Actualiza el estado de una llamada en curso."""
    pool = await _get_pool()
    if pool is None:
        return
    try:
        async with pool.acquire() as conn:
            fields = ["estado = $2", "updated_at = NOW()"]
            params: list[Any] = [llamada_id, estado]
            idx = 3

            if metadata is not None:
                fields.append(f"metadata = COALESCE(metadata, '{{}}'::jsonb) || ${idx}::jsonb")
                params.append(json.dumps(metadata))
                idx += 1

            if duracion_seg is not None:
                fields.append(f"duracion_seg = ${idx}")
                params.append(duracion_seg)
                idx += 1

            if transcript is not None:
                fields.append(f"transcript = ${idx}")
                params.append(json.dumps(transcript))
                idx += 1

            if grabacion_url is not None:
                fields.append(f"grabacion_url = ${idx}")
                params.append(grabacion_url)
                idx += 1

            if estado in ("completada", "fallida", "no_contesta", "cancelada", "rechazado", "optout", "transferido"):
                fields.append("terminada_at = NOW()")

            sql = f"UPDATE llamadas_reales SET {', '.join(fields)} WHERE id = $1"
            await conn.execute(sql, *params)
    except Exception as exc:
        logger.warning("Fallo update_llamada_estado (%s)", exc)


async def log_call(
    call_sid: str,
    phone: str,
    outcome: str,
    transcript: list[dict],
    duration_s: int | None = None,
    software_id: str = "",
    lead_id: str = "",
    metadata: dict | None = None,
) -> None:
    """Guarda el resultado final de la llamada. Busca por ai_call_sid."""
    pool = await _get_pool()
    if pool is None:
        logger.info("[offline] call_log: %s -> %s", call_sid, outcome)
        return
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE llamadas_reales
                SET estado = $3,
                    transcript = $4,
                    duracion_seg = $5,
                    terminada_at = NOW(),
                    updated_at = NOW(),
                    metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb
                WHERE ai_call_sid = $1 OR id = $2
                """,
                call_sid,
                lead_id,
                outcome,
                json.dumps(transcript),
                duration_s,
                json.dumps(metadata or {}),
            )
    except Exception as exc:
        logger.warning("Fallo log_call (%s)", exc)


async def update_lead_estado_post_llamada(
    lead_id: str,
    nuevo_estado: str,
    descripcion: str = "",
    agente_id: int | None = None,
) -> None:
    """Actualiza el estado del lead y crea entrada en historial."""
    pool = await _get_pool()
    if pool is None:
        return
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE leads
                SET estado = $2, ultimo_contacto = NOW(), updated_at = NOW()
                WHERE id = $1
                """,
                lead_id,
                nuevo_estado,
            )
            if descripcion:
                await conn.execute(
                    """
                    INSERT INTO lead_historial (lead_id, tipo, descripcion, usuario_id, created_at)
                    VALUES ($1, 'llamada_ai', $2, $3, NOW())
                    """,
                    lead_id,
                    descripcion,
                    agente_id,
                )
    except Exception as exc:
        logger.warning("Fallo update_lead_estado_post_llamada (%s)", exc)


# ---------------------------------------------------------------------------
# Historial del lead
# ---------------------------------------------------------------------------

async def get_lead_historial(lead_id: str, limit: int = 5) -> list[dict[str, Any]]:
    """Obtiene las últimas N entradas del historial de un lead."""
    pool = await _get_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT tipo, descripcion, created_at
                FROM lead_historial
                WHERE lead_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                lead_id,
                limit,
            )
            return [dict(r) for r in rows]
    except Exception as exc:
        logger.warning("Fallo get_lead_historial (%s)", exc)
        return []


# ---------------------------------------------------------------------------
# Activation logs (para recordatorios Triple Lock y post-call workflow)
# ---------------------------------------------------------------------------

async def create_activation_log(
    lead_id: str,
    action: str,
    scheduled_at: Any,
    metadata: dict | None = None,
) -> str:
    """Crea un registro de acción programada (recordatorio, follow-up, etc.).

    Usa la tabla activation_logs del schema Prisma.
    """
    pool = await _get_pool()
    if pool is None:
        logger.info("[offline] activation_log: %s -> %s", lead_id, action)
        return ""
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO activation_logs
                (lead_id, action, status, scheduled_at, metadata, created_at, updated_at)
                VALUES ($1, $2, 'PENDING', $3, $4, NOW(), NOW())
                RETURNING id
                """,
                lead_id,
                action,
                scheduled_at,
                json.dumps(metadata or {}),
            )
            return str(row["id"]) if row else ""
    except Exception as exc:
        logger.warning("Fallo create_activation_log (%s)", exc)
        return ""


async def get_pending_activation_logs(
    before: Any,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Obtiene logs de activación pendientes que deben ejecutarse antes de una fecha."""
    pool = await _get_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, lead_id, action, status, scheduled_at, metadata, created_at
                FROM activation_logs
                WHERE status = 'PENDING' AND scheduled_at <= $1
                ORDER BY scheduled_at ASC
                LIMIT $2
                """,
                before,
                limit,
            )
            return [dict(r) for r in rows]
    except Exception as exc:
        logger.warning("Fallo get_pending_activation_logs (%s)", exc)
        return []


async def mark_activation_log_executed(
    log_id: str,
    error: str | None = None,
) -> None:
    """Marca un log de activación como ejecutado (o fallido)."""
    pool = await _get_pool()
    if pool is None:
        return
    try:
        async with pool.acquire() as conn:
            status = "FAILED" if error else "EXECUTED"
            await conn.execute(
                """
                UPDATE activation_logs
                SET status = $2, executed_at = NOW(), error = $3, updated_at = NOW()
                WHERE id = $1
                """,
                log_id,
                status,
                error,
            )
    except Exception as exc:
        logger.warning("Fallo mark_activation_log_executed (%s)", exc)
