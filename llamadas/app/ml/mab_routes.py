"""
FastAPI routes for Multi-Armed Bandits engine

Endpoints:
  GET  /mab/status                  - Overall MAB status + current arms stats
  GET  /mab/weekly-report           - Latest weekly performance report
  GET  /mab/arguments               - All registered arguments + stats
  GET  /mab/arguments/{arm_id}      - Stats for specific argument
  POST /mab/record-call             - Record call outcome (internal)
  GET  /mab/export                  - Export current MAB state
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import datetime
import logging

from app.mab_integration import (
    get_mab_engine,
    get_weekly_report,
    get_argument_stats,
    export_mab_state,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mab", tags=["multi-armed-bandits"])


@router.get("/status")
async def mab_status() -> JSONResponse:
    """
    Get overall MAB status and current argument performance.

    Returns stats on all active arms (arguments) including:
    - Total uses and closes
    - Empirical close rate
    - Confidence intervals
    - Beta distribution parameters (alpha/beta)
    """
    try:
        mab = get_mab_engine()

        stats = mab.get_arm_stats()

        # Calculate aggregates
        total_uses = sum(int(s['total_uses']) for s in stats.values())
        total_closes = sum(int(s['total_closes']) for s in stats.values())
        overall_rate = total_closes / total_uses if total_uses > 0 else 0.0

        return JSONResponse({
            'status': 'active',
            'timestamp': datetime.now().isoformat(),
            'arguments': {
                'total_registered': len(stats),
                'total_uses': total_uses,
                'total_closes': total_closes,
                'overall_close_rate': f"{overall_rate:.1%}",
            },
            'arms': stats,
        })

    except Exception as e:
        logger.error(f"Error getting MAB status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-report")
async def mab_weekly_report() -> JSONResponse:
    """
    Get latest weekly report on argument performance.

    Includes:
    - Best performing argument
    - Overall close rate for the week
    - Learnings and recommendations
    - Performance of all arguments in the past 7 days
    """
    try:
        report = await get_weekly_report()
        return JSONResponse(report)

    except Exception as e:
        logger.error(f"Error getting weekly report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/arguments")
async def mab_all_arguments() -> JSONResponse:
    """
    Get all registered arguments with their performance stats.

    Sorted by empirical close rate (highest first).
    """
    try:
        stats = await get_argument_stats()

        # Sort by close_rate
        sorted_args = sorted(
            stats.items(),
            key=lambda x: float(x[1]['close_rate'].rstrip('%')) / 100,
            reverse=True
        )

        return JSONResponse({
            'arguments': dict(sorted_args),
            'total_registered': len(sorted_args),
            'timestamp': datetime.now().isoformat(),
        })

    except Exception as e:
        logger.error(f"Error getting arguments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/arguments/{arm_id}")
async def mab_argument_detail(arm_id: str) -> JSONResponse:
    """
    Get detailed stats for a specific argument.

    Includes:
    - Full argument text
    - Total uses and closes
    - Confidence intervals
    - Creation/update timestamps
    """
    try:
        stats = await get_argument_stats(arm_id)

        if arm_id not in stats:
            raise HTTPException(status_code=404, detail=f"Argument {arm_id} not found")

        return JSONResponse({
            'arm_id': arm_id,
            'details': stats[arm_id],
            'timestamp': datetime.now().isoformat(),
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting argument detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/record-call")
async def mab_record_call(
    call_id: str = Query(..., description="Call ID"),
    arm_id: str = Query(..., description="Argument (arm) ID used"),
    outcome: str = Query(..., regex="^(close|no_close)$", description="Call outcome"),
    duration: int = Query(None, description="Call duration in seconds"),
) -> JSONResponse:
    """
    Record the outcome of a call using a specific argument.

    Used by post-call processing to update the Thompson Sampling distributions.

    Args:
        call_id: Unique call identifier
        arm_id: Which argument was used
        outcome: "close" or "no_close"
        duration: Optional call duration in seconds
    """
    try:
        mab = get_mab_engine()

        # Validate
        if arm_id not in mab.arms:
            raise HTTPException(status_code=400, detail=f"Unknown argument: {arm_id}")

        # Record
        mab.record_call_outcome(
            call_id=call_id,
            arm_id=arm_id,
            outcome=outcome,
            duration_seconds=duration,
        )

        # Get updated arm stats
        arm = mab.arms[arm_id]

        return JSONResponse({
            'success': True,
            'call_id': call_id,
            'arm_id': arm_id,
            'outcome': outcome,
            'updated_stats': {
                'total_uses': arm.total_uses,
                'total_closes': arm.total_closes,
                'close_rate': f"{arm.close_rate():.1%}",
            },
            'timestamp': datetime.now().isoformat(),
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def mab_export() -> JSONResponse:
    """
    Export current MAB state for analysis/backup/debugging.

    Returns:
    - All arm definitions with Beta distribution parameters
    - Summary statistics
    - Timestamp
    """
    try:
        state = await export_mab_state()
        return JSONResponse(state)

    except Exception as e:
        logger.error(f"Error exporting MAB state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def mab_health() -> JSONResponse:
    """
    Health check for MAB system.

    Returns status and basic metrics.
    """
    try:
        mab = get_mab_engine()
        return JSONResponse({
            'status': 'healthy',
            'initialized': True,
            'num_arms': len(mab.arms),
            'num_calls_tracked': len(mab.call_history),
            'timestamp': datetime.now().isoformat(),
        })

    except Exception as e:
        logger.error(f"Error in MAB health check: {e}")
        return JSONResponse({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
        }, status_code=500)
