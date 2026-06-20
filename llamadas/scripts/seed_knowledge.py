"""Pobla la base de conocimiento (pgvector) a partir de seed_data.

Uso:
    python -m scripts.seed_knowledge
"""
from __future__ import annotations

import asyncio

from app.knowledge.rag import reindex_to_pgvector


async def main() -> None:
    n = await reindex_to_pgvector()
    print(f"Indexados {n} casos en pgvector (0 = modo seed local / faltan credenciales).")


if __name__ == "__main__":
    asyncio.run(main())
