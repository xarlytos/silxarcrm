"""Conversation Intelligence — real conversation analysis beyond Gong."""
from .winning_arguments import (
    WinningArgumentsDB,
    ArgumentContext,
    ArgumentPerformance,
    ArgumentType,
    ObjectionType,
)
from .objection_detector import (
    ObjectionDetector,
    ObjectionAnalysis,
    RootCauseAnalysis,
    RootCauseType,
    SurfaceObjection,
)
from .talk_track_optimizer import (
    TalkTrackOptimizer,
    TalkTrackVariant,
    OptimizationResult,
    TalkTrackType,
)
from .competitive_detector import CompetitiveDetector, CompetitiveSignal

__all__ = [
    # Winning Arguments
    'WinningArgumentsDB',
    'ArgumentContext',
    'ArgumentPerformance',
    'ArgumentType',
    'ObjectionType',
    # Objection Detector
    'ObjectionDetector',
    'ObjectionAnalysis',
    'RootCauseAnalysis',
    'RootCauseType',
    'SurfaceObjection',
    # Talk Track Optimizer
    'TalkTrackOptimizer',
    'TalkTrackVariant',
    'OptimizationResult',
    'TalkTrackType',
    # Competitive Detector
    'CompetitiveDetector',
    'CompetitiveSignal',
]
