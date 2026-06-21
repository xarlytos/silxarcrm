"""Multi-Agent Sales System

A sophisticated orchestration framework for specialized sales agents:
- SDR Agent: Qualification (BANT framework)
- CLOSER Agent: Deal closing
- RECOVERY Agent: Objection handling
- FOLLOW_UP Agent: Nurturing & re-engagement
- EXPANSION Agent: Upsell & churn prevention

Key components:
- Shared Memory Layer: Redis + PostgreSQL persistence
- Agent Router: Decision tree for agent selection
- Context Window Optimizer: Prompt optimization per agent
- Handoff Protocol: Warm & cold handoff between agents

Example:
    from app.multi_agent.shared_memory import SharedMemoryStore, ProspectProfile
    from app.multi_agent.agent_router import AgentRouter, ContextWindowOptimizer

    # Initialize
    memory_store = SharedMemoryStore(redis_client, db_client)
    router = AgentRouter()

    # Load prospect
    prospect = await memory_store.load_prospect("prospect_123")
    state = await memory_store.load_state("prospect_123")

    # Route to agent
    agent_type, reason = await router.route_agent(prospect, state)

    # Get optimized context
    context = ContextWindowOptimizer.get_sdr_context(prospect, state)

Architecture:
    ┌─────────────────────────────────────────────────────────┐
    │                    SHARED MEMORY LAYER                   │
    │  (Prospect Profile + Sales State + Decision Signals)    │
    └─────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
        ┌───▼───┐     ┌───▼───┐   ┌───▼────┐
        │  SDR  │     │CLOSER │   │RECOVERY│
        │ Agent │────▶│ Agent │──▶│ Agent  │
        └───┬───┘     └───▲───┘   └───┬───┘
            │             │            │
            └─────┬───────┴────────────┘
                  │
        ┌─────────▼──────────────────────┐
        │   FOLLOW_UP + EXPANSION AGENTS │
        │        (Async Processing)      │
        └────────────────────────────────┘

Performance Targets:
    - Routing latency: <200ms
    - SDR agent latency: <500ms
    - CLOSER agent latency: <2s
    - RECOVERY agent latency: <3s
    - Memory load (Redis): <50ms
    - System uptime: 99.5%+

Expected Outcomes (Year 1):
    - Close rate: 15% → 32% (+113%)
    - Sales cycle: 49 days → 16 days (-67%)
    - Revenue/customer: $4,900 → $6,500 (+33%)
    - ROI: 23.4x

References:
    - MULTI_AGENT_ARCHITECTURE.md (50+ pages)
    - IMPLEMENTATION_ROADMAP.md (60-day plan)
    - TECHNICAL_SPECIFICATIONS.md (API specs)
    - ROI_AND_METRICS.md (financial analysis)
    - EXECUTIVE_SUMMARY.md (decision brief)
"""

__version__ = "0.1.0"
__author__ = "SilxArCRM Team"

# Import main components
from app.multi_agent.shared_memory import (
    ProspectProfile,
    SharedSalesState,
    AgentType,
    PipelineStage,
    DealStatus,
    HandoffPacket,
    SharedMemoryStore,
)
from app.multi_agent.agent_router import (
    AgentRouter,
    ContextWindowOptimizer,
)

__all__ = [
    # Shared Memory
    "ProspectProfile",
    "SharedSalesState",
    "HandoffPacket",
    "SharedMemoryStore",
    # Enums
    "AgentType",
    "PipelineStage",
    "DealStatus",
    # Router
    "AgentRouter",
    "ContextWindowOptimizer",
]

# Version info
VERSION = __version__
