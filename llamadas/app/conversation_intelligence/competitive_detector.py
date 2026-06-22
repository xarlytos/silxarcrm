"""Competitive Switch Detector — signal when prospect is considering competitor."""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class CompetitiveSignal:
    """A signal that prospect is considering a competitor."""
    signal_id: str
    prospect_id: str
    deal_id: str
    signal_type: str  # 'competitor_mention', 'feature_comparison', 'pricing_question', 'timeline_change', etc.
    competitor_name: Optional[str] = None
    confidence: float = 0.0  # 0-1, how confident is this signal
    evidence: str = ""  # Quote or context
    context_before: str = ""  # Conversation context
    risk_level: str = "medium"  # low, medium, high
    recommended_action: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    addressed: bool = False
    outcome: Optional[str] = None  # 'lost_to_competitor', 'recovered', 'still_open'


class CompetitiveDetector:
    """
    Detect competitive switches and signals that prospect is considering competitors.
    Provides early warning system for deal risk.
    """

    # Common competitors and their characteristics
    KNOWN_COMPETITORS = {
        'gong': {
            'names': ['gong', 'gong.io'],
            'features': ['conversation intelligence', 'call recording', 'win/loss analysis'],
            'price_range': 'enterprise',
        },
        'salesforce': {
            'names': ['salesforce', 'sfdc'],
            'features': ['crm', 'pipeline management', 'forecasting'],
            'price_range': 'enterprise',
        },
        'hubspot': {
            'names': ['hubspot', 'hub spot'],
            'features': ['crm', 'automation', 'free option'],
            'price_range': 'smb-mid',
        },
        'pipedrive': {
            'names': ['pipedrive'],
            'features': ['visual pipeline', 'deal management'],
            'price_range': 'smb',
        },
    }

    # Competitive signal indicators
    SIGNAL_PATTERNS = {
        'competitor_mention': {
            'keywords': ['instead of', 'versus', 'compared to', 'alternative', 'looking at', 'evaluating'],
            'risk': 'high',
        },
        'feature_comparison': {
            'keywords': ['does it do', 'can you', 'support for', 'integrated with', 'compatible'],
            'risk': 'medium',
        },
        'pricing_negotiation': {
            'keywords': ['cheaper', 'price', 'cost', 'budget', 'discount', 'deal'],
            'risk': 'medium',
        },
        'timeline_pressure': {
            'keywords': ['need to decide', 'deadline', 'by end of', 'before quarter', 'asap'],
            'risk': 'medium',
        },
        'pilot_delay': {
            'keywords': ['postpone', 'delay', 'push back', 'reschedule', 'not ready yet'],
            'risk': 'high',
        },
        'stakeholder_change': {
            'keywords': ['new buyer', 'replacing', 'someone else', 'different person'],
            'risk': 'high',
        },
    }

    def __init__(self):
        """Initialize competitive detector."""
        self.signals: Dict[str, CompetitiveSignal] = {}
        self.deals_at_risk: Dict[str, Dict] = {}
        self.competitive_win_loss: Dict[str, int] = {}  # competitor_name -> lost_count
        self.recovery_strategies: Dict[str, List[str]] = {}

    def detect_signal(
        self,
        prospect_id: str,
        deal_id: str,
        conversation_text: str,
        context_before: str = "",
    ) -> Optional[CompetitiveSignal]:
        """
        Analyze conversation for competitive signals.

        Args:
            prospect_id: Prospect ID
            deal_id: Deal ID
            conversation_text: Prospect's statement or conversation snippet
            context_before: Previous conversation context

        Returns:
            CompetitiveSignal if detected, None otherwise
        """
        text_lower = conversation_text.lower()
        context_lower = context_before.lower()

        # Check for explicit competitor mentions
        competitor_found = self._extract_competitor(text_lower)

        # Analyze for signal patterns
        signals_found = self._match_signal_patterns(text_lower)

        if not signals_found and not competitor_found:
            return None

        signal_id = f"{deal_id}_{len(self.signals)}_{datetime.now().timestamp()}"
        signal_type = signals_found[0] if signals_found else "competitor_mention"

        confidence = 0.6
        risk_level = self.SIGNAL_PATTERNS.get(signal_type, {}).get('risk', 'medium')

        if competitor_found:
            confidence = 0.9
            risk_level = 'high'

        # Generate recommended action
        recommended_action = self._recommend_action(
            competitor_found,
            signal_type,
            risk_level,
        )

        signal = CompetitiveSignal(
            signal_id=signal_id,
            prospect_id=prospect_id,
            deal_id=deal_id,
            signal_type=signal_type,
            competitor_name=competitor_found,
            confidence=confidence,
            evidence=conversation_text[:200],
            context_before=context_before[:200],
            risk_level=risk_level,
            recommended_action=recommended_action,
        )

        self.signals[signal_id] = signal

        # Update deal risk status
        self._update_deal_risk(deal_id, signal)

        logger.info(
            f"Detected competitive signal {signal_id}: "
            f"{signal_type}, competitor={competitor_found}, risk={risk_level}"
        )

        return signal

    def analyze_deal_risk(self, deal_id: str) -> Dict:
        """
        Get competitive risk analysis for a deal.

        Returns:
            Risk assessment with signals and recommended actions
        """
        deal_signals = [s for s in self.signals.values() if s.deal_id == deal_id]

        if not deal_signals:
            return {
                'deal_id': deal_id,
                'competitive_risk': 'low',
                'signals_count': 0,
                'recommended_actions': [],
            }

        # Calculate risk level
        high_risk_count = sum(1 for s in deal_signals if s.risk_level == 'high')
        medium_risk_count = sum(1 for s in deal_signals if s.risk_level == 'medium')

        if high_risk_count >= 2:
            risk_level = 'critical'
        elif high_risk_count >= 1:
            risk_level = 'high'
        elif medium_risk_count >= 3:
            risk_level = 'high'
        elif medium_risk_count >= 2:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Get unaddressed signals
        unaddressed = [s for s in deal_signals if not s.addressed]

        # Identify competitors
        competitors = set()
        for signal in deal_signals:
            if signal.competitor_name:
                competitors.add(signal.competitor_name)

        # Get recommended actions
        recommended_actions = []
        if high_risk_count >= 1:
            recommended_actions.append("Schedule urgent competitive response call")
        if competitors:
            for competitor in competitors:
                recommended_actions.append(
                    f"Prepare differentiation brief vs {competitor.title()}"
                )
        if any(s.signal_type == 'pilot_delay' for s in deal_signals):
            recommended_actions.append("Reactivate pilot and remove blockers")
        if any(s.signal_type == 'stakeholder_change' for s in deal_signals):
            recommended_actions.append("Understand new stakeholder's priorities")

        return {
            'deal_id': deal_id,
            'competitive_risk': risk_level,
            'signals_count': len(deal_signals),
            'unaddressed_signals': len(unaddressed),
            'competitors': list(competitors),
            'signal_types': list(set(s.signal_type for s in deal_signals)),
            'recent_signals': [
                {
                    'signal_type': s.signal_type,
                    'competitor': s.competitor_name,
                    'confidence': s.confidence,
                    'risk_level': s.risk_level,
                    'timestamp': s.timestamp.isoformat(),
                }
                for s in sorted(deal_signals, key=lambda x: x.timestamp, reverse=True)[:5]
            ],
            'recommended_actions': recommended_actions,
            'win_probability': max(0.0, 1.0 - (risk_level == 'critical') * 0.5 - (risk_level == 'high') * 0.3),
        }

    def log_signal_outcome(
        self,
        signal_id: str,
        addressed: bool,
        outcome: str,  # 'recovered', 'lost_to_competitor', 'still_open'
        response_action: str = "",
    ) -> None:
        """
        Log outcome of addressing a competitive signal.

        Args:
            signal_id: Signal ID
            addressed: Whether it was addressed
            outcome: Result of the response
            response_action: What action was taken
        """
        if signal_id not in self.signals:
            return

        signal = self.signals[signal_id]
        signal.addressed = addressed
        signal.outcome = outcome

        # Track competitive losses
        if outcome == 'lost_to_competitor' and signal.competitor_name:
            competitor = signal.competitor_name.lower()
            self.competitive_win_loss[competitor] = (
                self.competitive_win_loss.get(competitor, 0) + 1
            )

        logger.info(f"Logged signal outcome {signal_id}: {outcome}")

    def get_competitive_threats(self, limit: int = 10) -> List[Dict]:
        """
        Get most pressing competitive threats (unaddressed signals).
        """
        unaddressed = [s for s in self.signals.values() if not s.addressed]

        threats = [
            {
                'signal_id': s.signal_id,
                'deal_id': s.deal_id,
                'prospect_id': s.prospect_id,
                'signal_type': s.signal_type,
                'competitor': s.competitor_name,
                'confidence': s.confidence,
                'risk_level': s.risk_level,
                'evidence': s.evidence,
                'recommended_action': s.recommended_action,
                'timestamp': s.timestamp.isoformat(),
            }
            for s in sorted(
                unaddressed,
                key=lambda x: (x.confidence, x.risk_level == 'high'),
                reverse=True,
            )
        ]

        return threats[:limit]

    def get_competitor_analysis(self) -> Dict[str, Dict]:
        """
        Get analysis of competitive pressure by competitor.
        """
        analysis = {}

        for signal in self.signals.values():
            if not signal.competitor_name:
                continue

            competitor = signal.competitor_name.lower()
            if competitor not in analysis:
                analysis[competitor] = {
                    'mentions': 0,
                    'signal_types': [],
                    'high_risk_signals': 0,
                    'deals_affected': set(),
                    'lost_deals': 0,
                    'win_rate': 0.0,
                }

            analysis[competitor]['mentions'] += 1
            analysis[competitor]['signal_types'].append(signal.signal_type)
            analysis[competitor]['deals_affected'].add(signal.deal_id)

            if signal.risk_level == 'high':
                analysis[competitor]['high_risk_signals'] += 1

            if signal.outcome == 'lost_to_competitor':
                analysis[competitor]['lost_deals'] += 1

        # Calculate win rates
        for competitor, data in analysis.items():
            total_signals = data['mentions']
            lost = data['lost_deals']
            data['win_rate'] = 1.0 - (lost / total_signals) if total_signals > 0 else 1.0
            data['deals_affected'] = len(data['deals_affected'])
            del data['signal_types']  # Remove duplicate data

        return dict(sorted(
            analysis.items(),
            key=lambda x: (x[1]['high_risk_signals'], x[1]['mentions']),
            reverse=True,
        ))

    def _extract_competitor(self, text: str) -> Optional[str]:
        """Extract competitor name from text."""
        for competitor, info in self.KNOWN_COMPETITORS.items():
            for name in info['names']:
                if name in text:
                    return competitor

        return None

    def _match_signal_patterns(self, text: str) -> List[str]:
        """Match text against signal patterns."""
        matched = []

        for signal_type, pattern in self.SIGNAL_PATTERNS.items():
            keywords = pattern.get('keywords', [])
            if any(keyword in text for keyword in keywords):
                matched.append(signal_type)

        return matched

    def _recommend_action(
        self,
        competitor_found: Optional[str],
        signal_type: str,
        risk_level: str,
    ) -> str:
        """Generate recommended action based on signal."""
        if competitor_found:
            return (
                f"Initiate competitive response: "
                f"Schedule call to highlight differentiation vs {competitor_found.title()}"
            )

        recommendations = {
            'feature_comparison': "Clarify feature capabilities in next call",
            'pricing_negotiation': "Prepare ROI and value-based pricing proposal",
            'timeline_pressure': "Understand decision timeline and move to closing stage",
            'pilot_delay': "Remove implementation blockers, reset expectations",
            'stakeholder_change': "Re-qualify with new stakeholder, discover priorities",
        }

        return recommendations.get(
            signal_type,
            "Address prospect concern and clarify value proposition",
        )

    def _update_deal_risk(self, deal_id: str, signal: CompetitiveSignal) -> None:
        """Update deal-level risk tracking."""
        if deal_id not in self.deals_at_risk:
            self.deals_at_risk[deal_id] = {
                'signals': [],
                'max_risk': 'low',
                'last_updated': datetime.now(),
            }

        self.deals_at_risk[deal_id]['signals'].append(signal.signal_id)

        risk_levels = ['low', 'medium', 'high', 'critical']
        current_max = risk_levels.index(self.deals_at_risk[deal_id]['max_risk'])
        new_risk = risk_levels.index(signal.risk_level)

        if new_risk > current_max:
            self.deals_at_risk[deal_id]['max_risk'] = signal.risk_level

        self.deals_at_risk[deal_id]['last_updated'] = datetime.now()
