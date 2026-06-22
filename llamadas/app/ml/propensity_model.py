"""Propensity-to-Close ML Model — predicts likelihood of deal closing."""
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)


@dataclass
class PropensityPrediction:
    """Prediction output."""
    deal_id: str
    probability: float  # 0-1
    confidence: float  # 0-1
    feature_importance: Dict[str, float]


class PropensityToCloseModel:
    """
    Propensity-to-Close Model.

    Features:
    - call_count: number of calls
    - avg_call_duration: average call duration (seconds)
    - email_count: number of emails
    - demo_count: number of demos
    - budget_mentioned: binary
    - authority_identified: binary
    - objections_count: number of objections
    - days_in_stage: days since entered current stage
    - company_size: small|medium|large
    - industry: industry classification

    Target: close (1/0) or not
    Algorithm: LightGBM (fast, production-ready)
    """

    def __init__(self):
        """Initialize model."""
        self.is_trained = False
        self.model = None
        self.feature_names = [
            'call_count',
            'avg_call_duration',
            'email_count',
            'demo_count',
            'budget_mentioned',
            'authority_identified',
            'objections_count',
            'days_in_stage',
            'company_size_encoded',
            'industry_encoded',
        ]

    def train(self, X: List[List[float]], y: List[int]) -> Dict:
        """
        Train model on historical data.

        Args:
            X: feature matrix (n_samples x n_features)
            y: binary targets (1=closed, 0=not closed)

        Returns:
            metrics: {'auc': float, 'accuracy': float, 'feature_importance': dict}
        """
        try:
            import lightgbm as lgb
            import sklearn.metrics as metrics

            # Train LightGBM classifier
            self.model = lgb.LGBMClassifier(
                n_estimators=100,
                learning_rate=0.05,
                max_depth=7,
                num_leaves=31,
                random_state=42,
                verbose=-1,
            )
            self.model.fit(X, y)

            # Evaluate on training data (should validate on holdout in production)
            y_pred = self.model.predict(X)
            y_pred_proba = self.model.predict_proba(X)[:, 1]

            auc = metrics.roc_auc_score(y, y_pred_proba)
            accuracy = metrics.accuracy_score(y, y_pred)
            precision = metrics.precision_score(y, y_pred, zero_division=0)
            recall = metrics.recall_score(y, y_pred, zero_division=0)

            # Feature importance
            feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))

            self.is_trained = True

            logger.info(f"Propensity model trained: AUC={auc:.3f}, Accuracy={accuracy:.3f}")

            return {
                'auc': auc,
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'feature_importance': feature_importance,
            }

        except ImportError:
            logger.warning("LightGBM not installed, skipping model training")
            return {}

    def predict(self, features: List[float]) -> PropensityPrediction:
        """
        Predict probability of closing.

        Args:
            features: [call_count, avg_call_duration, email_count, ..., industry_encoded]

        Returns:
            PropensityPrediction
        """
        if not self.is_trained or self.model is None:
            # Fallback: heuristic prediction
            call_count = features[0]
            email_count = features[2]
            demo_count = features[3]
            budget_mentioned = features[4]
            objections = features[6]

            prob = 0.25  # base
            prob += min(call_count * 0.20, 0.35)
            prob += email_count * 0.05
            prob += demo_count * 0.15
            if budget_mentioned:
                prob += 0.15
            prob -= min(objections * 0.05, 0.15)

            prob = max(0, min(prob, 1))

            return PropensityPrediction(
                deal_id='',
                probability=prob,
                confidence=0.6,  # Low confidence for heuristic
                feature_importance={},
            )

        try:
            import numpy as np

            features_array = np.array([features])
            prob = self.model.predict_proba(features_array)[0, 1]
            feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))

            return PropensityPrediction(
                deal_id='',
                probability=float(prob),
                confidence=0.9,  # High confidence for trained model
                feature_importance=feature_importance,
            )

        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return PropensityPrediction(
                deal_id='',
                probability=0.5,
                confidence=0.0,
                feature_importance={},
            )

    def get_model_metrics(self) -> Dict:
        """Return current model metrics."""
        if not self.is_trained:
            return {'status': 'not_trained'}

        return {
            'status': 'trained',
            'n_estimators': getattr(self.model, 'n_estimators', 0),
            'feature_names': self.feature_names,
        }
