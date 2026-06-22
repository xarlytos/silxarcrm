"""
Integración del Experimentation Framework con motores existentes
- Conversation Intelligence Engine
- Deal Engine
- Coaching Engine

Propósito: Conectar experimentación automática al flujo de conversación
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from app.conversation_intelligence import ConversationIntelligenceEngine, ArgumentInsight
from app.deal_engine import DealEngine, DealRecommendation
from app.coaching_engine import CoachingEngine, NextAction
from app.experimentation_engine import (
    ExperimentEngine,
    ContextualArgumentBandit,
    ActionBandit,
    ExperimentEvent
)

logger = logging.getLogger(__name__)


class ExperimentationIntegration:
    """
    Integra experimentación automática con flujo de conversación

    Responsabilidades:
    1. Asignar variants a llamadas
    2. Seleccionar argumentos usando Thompson Sampling
    3. Seleccionar ofertas usando A/B tests
    4. Seleccionar acciones post-call usando ε-Greedy
    5. Registrar eventos para análisis
    """

    def __init__(self,
                 exp_engine: ExperimentEngine,
                 conv_intel: ConversationIntelligenceEngine,
                 deal_engine: DealEngine,
                 coaching_engine: CoachingEngine):
        self.exp_engine = exp_engine
        self.conv_intel = conv_intel
        self.deal_engine = deal_engine
        self.coaching_engine = coaching_engine

        # Multi-Armed Bandits
        self.argument_bandit = ContextualArgumentBandit()
        self.action_bandit = ActionBandit(
            actions=["demo", "objection_handling", "nurturing", "price_negotiation"]
        )

    # ═══ ARGUMENT SELECTION ═══

    async def select_argument_for_call(self,
                                      call_id: str,
                                      industry: str,
                                      company_size: int,
                                      lead_score: int,
                                      force_experiment_id: Optional[str] = None) -> str:
        """
        Seleccionar argumento para usar en llamada

        Estrategia:
        1. Si hay experimento activo de argumentos → asignar variant
        2. Si no → usar Thompson Sampling (MAB contextual)
        3. Registrar event para tracking
        """

        # Opción A: Experiment override
        if force_experiment_id:
            exp = self.exp_engine.experiments.get(force_experiment_id)
            if exp:
                variant = await self.exp_engine.assign_variant(
                    call_context={
                        'phone': call_id,
                        'industry': industry,
                        'company_size': company_size,
                        'lead_score': lead_score
                    },
                    experiment_id=force_experiment_id
                )

                if variant:
                    # Track: assigned to experiment variant
                    await self.exp_engine.track_event(
                        call_id=call_id,
                        experiment_id=force_experiment_id,
                        event_type="argument_assigned",
                        metadata={
                            'variant': variant,
                            'industry': industry,
                            'company_size': company_size,
                            'lead_score': lead_score
                        }
                    )

                    logger.info(
                        f"Argument selected (EXPERIMENT {force_experiment_id}): "
                        f"{variant}"
                    )

                    return variant

        # Opción B: Thompson Sampling (normal case)
        argument = await self.argument_bandit.select_argument(
            industry=industry,
            company_size=company_size,
            lead_score=lead_score
        )

        logger.info(
            f"Argument selected (MAB {industry}_{company_size}): {argument}"
        )

        return argument

    async def record_argument_outcome(self,
                                     call_id: str,
                                     industry: str,
                                     company_size: int,
                                     lead_score: int,
                                     argument_used: str,
                                     prospect_response: str,  # "interested", "neutral", "objection"
                                     final_outcome: bool):  # True = closed
        """
        Registrar cómo respondió prospect a argumento

        Usa feedback para actualizar MAB + registrar en experimento
        """

        # 1. Update Thompson Sampling bandit
        # Outcome mapping: "interested" → True, others → False
        mab_outcome = prospect_response == "interested" or final_outcome

        await self.argument_bandit.feedback(
            industry=industry,
            company_size=company_size,
            lead_score=lead_score,
            argument=argument_used,
            outcome=mab_outcome
        )

        logger.debug(
            f"MAB feedback: {argument_used} → {mab_outcome} "
            f"(prospect_response={prospect_response})"
        )

        # 2. Track any active argument experiments
        # TODO: Link call_id to experiment_id if part of experiment
        # For now, this is handled in conversation_intelligence.py post-call

    # ═══ OFFER/DEAL SELECTION ═══

    async def select_offer_with_experiment(self,
                                          call_id: str,
                                          prospect_profile: dict,
                                          experiment_id: Optional[str] = None) -> DealRecommendation:
        """
        Seleccionar oferta (plan, precio, descuento) para prospect

        Estrategia:
        1. Si hay experimento de pricing activo → usar variant
        2. Si no → usar DealEngine normal (historical best)
        3. Registrar event para tracking
        """

        if experiment_id:
            exp = self.exp_engine.experiments.get(experiment_id)
            if exp:
                variant = await self.exp_engine.assign_variant(
                    call_context={'phone': call_id, **prospect_profile},
                    experiment_id=experiment_id
                )

                if variant:
                    # Apply variant to offer
                    offer = await self.deal_engine.get_best_offer(prospect_profile)
                    offer = self._apply_offer_variant(offer, variant)

                    # Track event
                    await self.exp_engine.track_event(
                        call_id=call_id,
                        experiment_id=experiment_id,
                        event_type="offer_presented",
                        metadata={
                            'variant': variant,
                            'plan': offer.plan,
                            'price': offer.price,
                            'discount': offer.discount_percent
                        }
                    )

                    logger.info(
                        f"Offer selected (EXPERIMENT {experiment_id}): "
                        f"{offer.plan} ${offer.price} ({offer.discount_percent}% off)"
                    )

                    return offer

        # Normal case: use DealEngine
        offer = await self.deal_engine.get_best_offer(prospect_profile)

        logger.info(
            f"Offer selected (NORMAL): {offer.plan} ${offer.price} "
            f"({offer.discount_percent}% off, confidence={offer.confidence:.0%})"
        )

        return offer

    def _apply_offer_variant(self, offer: DealRecommendation, variant: str) -> DealRecommendation:
        """Aplicar variant de experimento a oferta"""

        # Ejemplos de variants: "starter_1500", "pro_4500_20pct", etc
        parts = variant.lower().split("_")

        if len(parts) >= 2:
            plan = parts[0].capitalize()
            if plan in offer.plan:
                # Precio explícito en variant
                if len(parts) >= 2 and parts[1].isdigit():
                    offer.price = float(parts[1])

                # Descuento en variant
                if len(parts) >= 3 and "pct" in parts[2]:
                    discount_str = parts[2].replace("pct", "")
                    if discount_str.isdigit():
                        offer.discount_percent = float(discount_str)

        return offer

    async def record_offer_outcome(self,
                                  call_id: str,
                                  offer: DealRecommendation,
                                  prospect_decision: str):  # "accepted", "negotiated", "rejected", "unknown"
        """
        Registrar resultado de oferta

        Los experimentos de offer/pricing se analizan en términos de:
        - Acceptance rate
        - Expected revenue (price * acceptance_rate)
        """

        outcome = prospect_decision == "accepted"

        # Track for analysis
        # Normally this would be linked to experiment_id
        # TODO: implement in experiment_results table

        logger.debug(
            f"Offer outcome: {offer.plan} ${offer.price} → {prospect_decision}"
        )

    # ═══ NEXT ACTION SELECTION ═══

    async def select_next_action_with_experiment(self,
                                                call_id: str,
                                                lead_score,
                                                sentiment: str,
                                                probability: float,
                                                experiment_id: Optional[str] = None) -> NextAction:
        """
        Seleccionar acción post-call (demo, follow-up, etc)

        Estrategia:
        1. Si hay experimento de next_action → asignar variant
        2. Si no → usar ε-Greedy (ActionBandit)
        3. Registrar event + ejecutar automáticamente
        """

        if experiment_id:
            exp = self.exp_engine.experiments.get(experiment_id)
            if exp:
                variant = await self.exp_engine.assign_variant(
                    call_context={
                        'phone': call_id,
                        'lead_score': lead_score.score,
                        'sentiment': sentiment
                    },
                    experiment_id=experiment_id
                )

                if variant:
                    action = self._variant_to_next_action(variant, lead_score)

                    await self.exp_engine.track_event(
                        call_id=call_id,
                        experiment_id=experiment_id,
                        event_type="next_action_assigned",
                        metadata={
                            'variant': variant,
                            'action': action.channel,
                            'timing': action.timing_hours
                        }
                    )

                    logger.info(
                        f"Next action (EXPERIMENT {experiment_id}): "
                        f"{action.channel} in {action.timing_hours}h"
                    )

                    return action

        # Normal case: use ε-Greedy
        action_type = await self.action_bandit.select_action()

        action = await self.coaching_engine._determine_next_action(
            lead_score, sentiment, probability
        )

        # Override channel based on ε-Greedy selection
        action.channel = action_type

        logger.info(
            f"Next action (ε-GREEDY): {action.channel} "
            f"(level={lead_score.level})"
        )

        return action

    def _variant_to_next_action(self, variant: str, lead_score) -> NextAction:
        """Convertir variant (e.g., 'whatsapp_24h') a NextAction"""

        parts = variant.lower().split("_")

        channel = parts[0] if len(parts) > 0 else "email"
        timing = 24
        if len(parts) > 1:
            timing_str = parts[1].replace("h", "")
            if timing_str.isdigit():
                timing = int(timing_str)

        return NextAction(
            channel=channel,
            timing_hours=timing,
            priority="MEDIUM",
            message_template=f"{channel}_followup",
            follow_up_type="follow_up"
        )

    async def record_next_action_outcome(self,
                                        call_id: str,
                                        action: NextAction,
                                        outcome: str):  # "engaged", "converted", "no_response"
        """
        Registrar resultado de acción post-call

        Feedback para ε-Greedy:
        - "converted" → True
        - "engaged" → True (intermediate success)
        - "no_response" → False
        """

        mab_outcome = outcome in ["engaged", "converted"]

        await self.action_bandit.feedback(
            action=action.channel,
            outcome=mab_outcome
        )

        logger.debug(
            f"Action outcome: {action.channel} → {outcome} (mab_outcome={mab_outcome})"
        )

    # ═══ POST-CALL EXPERIMENT TRACKING ═══

    async def track_call_in_experiments(self,
                                       call_id: str,
                                       transcript: str,
                                       outcome: str,  # "cierre", "reagendar", "no_interesado"
                                       prospect_profile: dict):
        """
        Post-call: registrar eventos de experimento

        Llamada después de que ConversationIntelligenceEngine.extract_insights_from_call
        completó el análisis de la llamada

        Registra:
        - Arguments used + prospect response
        - Offer presented + acceptance
        - Next actions assigned
        """

        # Find all running experiments that match this call
        matching_experiments = await self._find_matching_experiments(prospect_profile)

        for exp_id in matching_experiments:
            # Extraer eventos de este call para este experimento
            events = await self._extract_experiment_events(
                call_id=call_id,
                transcript=transcript,
                outcome=outcome,
                experiment_id=exp_id
            )

            # Registrar eventos
            for event in events:
                await self.exp_engine.track_event(
                    call_id=call_id,
                    experiment_id=exp_id,
                    event_type=event['type'],
                    value=event['value'],
                    metadata=event.get('metadata', {})
                )

        logger.info(
            f"Call {call_id} tracked in {len(matching_experiments)} experiments"
        )

    async def _find_matching_experiments(self, prospect_profile: dict) -> list:
        """Encontrar experimentos activos que aplican a este prospect"""

        matching = []

        for exp_id, exp in self.exp_engine.experiments.items():
            if exp.status != "running":
                continue

            # Check if prospect matches target segment
            if await self._matches_segment(prospect_profile, exp.target_segment):
                matching.append(exp_id)

        return matching

    async def _matches_segment(self, profile: dict, segment: dict) -> bool:
        """¿Prospect coincide con segmento del experimento?"""

        if not segment:
            return True  # Empty segment = everyone

        for key, value in segment.items():
            if key not in profile:
                continue

            profile_value = profile[key]

            # Handle different comparison types
            if isinstance(value, list):
                if profile_value not in value:
                    return False
            elif isinstance(value, dict) and "min" in value and "max" in value:
                if not (value["min"] <= profile_value <= value["max"]):
                    return False
            elif profile_value != value:
                return False

        return True

    async def _extract_experiment_events(self,
                                        call_id: str,
                                        transcript: str,
                                        outcome: str,
                                        experiment_id: str) -> list:
        """Extraer eventos relevantes de una llamada para un experimento"""

        events = []
        exp = self.exp_engine.experiments.get(experiment_id)

        if not exp:
            return events

        # Mapear tipo de experimento a eventos
        if "argument" in exp.name.lower():
            # Argument experiment: track close as outcome
            closed = outcome == "cierre"
            events.append({
                'type': 'close',
                'value': 1.0 if closed else 0.0,
                'metadata': {'outcome': outcome}
            })

        elif "offer" in exp.name.lower() or "pricing" in exp.name.lower():
            # Offer experiment: track close
            closed = outcome == "cierre"
            events.append({
                'type': 'close',
                'value': 1.0 if closed else 0.0,
                'metadata': {'outcome': outcome}
            })

        elif "action" in exp.name.lower() or "follow" in exp.name.lower():
            # Next action experiment: track engagement/conversion
            # This would need follow-up call data to fully implement
            # For now: if call closed, action was successful
            events.append({
                'type': 'conversion',
                'value': 1.0 if outcome == "cierre" else 0.0,
                'metadata': {'outcome': outcome}
            })

        return events

    # ═══ DECISION ENGINE ═══

    async def get_experiment_recommendations(self) -> dict:
        """
        Generar recomendaciones de qué experimentos run próxima semana

        Usa histórico de learnings para priorizar high-ROI experiments
        """

        recommendations = {
            "high_priority": [],
            "medium_priority": [],
            "low_priority": [],
            "reasoning": {}
        }

        # TODO: Implement predictive experiment prioritization
        # For now: placeholder

        return recommendations

    async def check_experiment_health(self):
        """
        Revisar salud de experimentos activos

        Llamado cada hora:
        - Sample collection rate
        - Early stopping triggers
        - Segment distribution
        """

        for exp_id, exp in self.exp_engine.experiments.items():
            if exp.status != "running":
                continue

            # Count events
            events = [e for e in self.exp_engine.events if e.experiment_id == exp_id]
            n_events = len(events)

            days_running = (datetime.now() - exp.start_date).days if exp.start_date else 0

            if days_running > 0:
                events_per_day = n_events / days_running
                logger.debug(
                    f"Experiment {exp_id} health: "
                    f"{n_events} events in {days_running} days "
                    f"({events_per_day:.1f} per day)"
                )

                # Early stop if treatment looks bad
                if n_events > 50:
                    result = await self.exp_engine.analyze_experiment(exp_id)

                    if result.p_value < 0.001 and result.winner == "control":
                        logger.critical(
                            f"EARLY STOP {exp_id}: "
                            f"Treatment {result.lift:.1%} worse than control"
                        )
                        exp.status = "stopped"
                        exp.end_date = datetime.now()
