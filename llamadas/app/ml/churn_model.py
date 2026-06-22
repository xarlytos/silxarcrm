"""Churn Prediction ML Model — predicts customer churn probability within 90 days."""
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


@dataclass
class ChurnPrediction:
    """Prediction output."""
    customer_id: str
    probability: float  # 0-1
    confidence: float  # 0-1
    feature_importance: Dict[str, float]
    prediction_date: str
    risk_level: str  # 'low', 'medium', 'high'


class ChurnModel:
    """
    Churn Prediction Model — predicts likelihood of customer churn within 90 days.

    Features:
    - call_frequency_trend: moving average of calls per week (last 12 weeks)
    - email_engagement_trend: moving average of email opens/clicks per week (last 12 weeks)
    - days_since_last_activity: days elapsed since last call/email/login
    - product_usage_score: composite score of feature adoption (0-100)
    - contract_renewal_date: days until contract renewal (positive=upcoming, negative=past)

    Target: churned (1/0) within 90 days
    Algorithm: LightGBM (fast, production-ready)
    Training: 6 months of historical data
    Inference: weekly batch predictions
    """

    def __init__(self):
        """Initialize model."""
        self.is_trained = False
        self.model = None
        self.scaler = None
        self.feature_names = [
            'call_frequency_trend',
            'email_engagement_trend',
            'days_since_last_activity',
            'product_usage_score',
            'contract_renewal_date',
        ]

    def train(self, X: List[List[float]], y: List[int]) -> Dict:
        """
        Train model on 6 months of historical data.

        Args:
            X: feature matrix (n_samples x 5 features)
            y: binary targets (1=churned in 90 days, 0=retained)

        Returns:
            metrics: {
                'auc': float,
                'accuracy': float,
                'precision': float,
                'recall': float,
                'f1': float,
                'feature_importance': dict
            }
        """
        try:
            import lightgbm as lgb
            import sklearn.metrics as metrics
            from sklearn.preprocessing import StandardScaler
            import numpy as np

            # Normalize features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            # Train LightGBM classifier
            self.model = lgb.LGBMClassifier(
                n_estimators=150,
                learning_rate=0.05,
                max_depth=8,
                num_leaves=31,
                min_child_samples=20,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_alpha=0.1,
                reg_lambda=0.1,
                random_state=42,
                verbose=-1,
                is_unbalanced=True,  # Churn is typically minority class
            )
            self.model.fit(X_scaled, y)

            # Evaluate on training data
            y_pred = self.model.predict(X_scaled)
            y_pred_proba = self.model.predict_proba(X_scaled)[:, 1]

            auc = metrics.roc_auc_score(y, y_pred_proba)
            accuracy = metrics.accuracy_score(y, y_pred)
            precision = metrics.precision_score(y, y_pred, zero_division=0)
            recall = metrics.recall_score(y, y_pred, zero_division=0)
            f1 = metrics.f1_score(y, y_pred, zero_division=0)

            # Feature importance
            feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))

            self.is_trained = True

            logger.info(
                f"Churn model trained: AUC={auc:.3f}, Accuracy={accuracy:.3f}, "
                f"Precision={precision:.3f}, Recall={recall:.3f}, F1={f1:.3f}"
            )

            return {
                'auc': float(auc),
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1': float(f1),
                'feature_importance': feature_importance,
                'n_samples': len(X),
                'training_timestamp': datetime.utcnow().isoformat(),
            }

        except ImportError as e:
            logger.warning(f"LightGBM or sklearn not installed: {e}")
            return {}

    def predict(self, features: List[float]) -> ChurnPrediction:
        """
        Predict probability of churn within 90 days.

        Args:
            features: [
                call_frequency_trend (float),
                email_engagement_trend (float),
                days_since_last_activity (int),
                product_usage_score (0-100),
                contract_renewal_date (int, days)
            ]

        Returns:
            ChurnPrediction
        """
        if not self.is_trained or self.model is None:
            return self._heuristic_predict(features)

        try:
            import numpy as np

            features_array = np.array([features])
            features_scaled = self.scaler.transform(features_array)

            prob = float(self.model.predict_proba(features_scaled)[0, 1])
            feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))

            risk_level = self._classify_risk(prob)

            return ChurnPrediction(
                customer_id='',
                probability=prob,
                confidence=0.9,
                feature_importance=feature_importance,
                prediction_date=datetime.utcnow().isoformat(),
                risk_level=risk_level,
            )

        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return ChurnPrediction(
                customer_id='',
                probability=0.5,
                confidence=0.0,
                feature_importance={},
                prediction_date=datetime.utcnow().isoformat(),
                risk_level='unknown',
            )

    def _heuristic_predict(self, features: List[float]) -> ChurnPrediction:
        """Fallback heuristic prediction (model not trained)."""
        call_freq = features[0]
        email_eng = features[1]
        days_inactive = features[2]
        usage_score = features[3]
        renewal_days = features[4]

        prob = 0.2  # base churn risk

        # Inactivity is strong churn signal
        if days_inactive > 30:
            prob += 0.25
        elif days_inactive > 14:
            prob += 0.15
        elif days_inactive > 7:
            prob += 0.05

        # Low engagement trends
        if call_freq < 1.0:
            prob += 0.2
        if email_eng < 0.5:
            prob += 0.15

        # Low product usage
        if usage_score < 30:
            prob += 0.2
        elif usage_score < 50:
            prob += 0.1

        # Contract renewal soon
        if 0 < renewal_days < 60:
            prob += 0.1
        elif renewal_days < 0:
            prob += 0.15  # Contract already expired

        prob = max(0, min(prob, 1))
        risk_level = self._classify_risk(prob)

        return ChurnPrediction(
            customer_id='',
            probability=prob,
            confidence=0.5,  # Low confidence for heuristic
            feature_importance={},
            prediction_date=datetime.utcnow().isoformat(),
            risk_level=risk_level,
        )

    @staticmethod
    def _classify_risk(probability: float) -> str:
        """Classify churn probability into risk levels."""
        if probability >= 0.7:
            return 'high'
        elif probability >= 0.4:
            return 'medium'
        else:
            return 'low'

    def batch_predict(self, customer_data: List[Dict]) -> List[ChurnPrediction]:
        """
        Batch inference for weekly batch predictions.

        Args:
            customer_data: List of dicts with keys:
                - customer_id (str)
                - call_frequency_trend (float)
                - email_engagement_trend (float)
                - days_since_last_activity (int)
                - product_usage_score (float, 0-100)
                - contract_renewal_date (int)

        Returns:
            List[ChurnPrediction]
        """
        predictions = []

        for customer in customer_data:
            customer_id = customer.get('customer_id', '')
            features = [
                customer.get('call_frequency_trend', 0.0),
                customer.get('email_engagement_trend', 0.0),
                customer.get('days_since_last_activity', 0),
                customer.get('product_usage_score', 0.0),
                customer.get('contract_renewal_date', 0),
            ]

            prediction = self.predict(features)
            prediction.customer_id = customer_id
            predictions.append(prediction)

        logger.info(f"Batch prediction completed for {len(predictions)} customers")
        return predictions

    def get_high_risk_customers(
        self,
        predictions: List[ChurnPrediction],
        threshold: float = 0.7,
    ) -> List[ChurnPrediction]:
        """
        Filter high-risk churn customers.

        Args:
            predictions: List of predictions
            threshold: probability threshold for high risk (default 0.7)

        Returns:
            List of ChurnPrediction for high-risk customers
        """
        return [p for p in predictions if p.probability >= threshold]

    def get_model_metrics(self) -> Dict:
        """Return current model metrics."""
        if not self.is_trained:
            return {
                'status': 'not_trained',
                'feature_names': self.feature_names,
            }

        return {
            'status': 'trained',
            'n_estimators': getattr(self.model, 'n_estimators', 0),
            'feature_names': self.feature_names,
            'feature_importances': dict(
                zip(self.feature_names, self.model.feature_importances_)
            ),
        }

    def save_model(self, filepath: str) -> bool:
        """
        Save trained model to disk.

        Args:
            filepath: path to save model pickle file

        Returns:
            True if successful, False otherwise
        """
        if not self.is_trained or self.model is None:
            logger.warning("Model not trained, cannot save")
            return False

        try:
            import pickle

            with open(filepath, 'wb') as f:
                pickle.dump({'model': self.model, 'scaler': self.scaler}, f)
            logger.info(f"Model saved to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return False

    def load_model(self, filepath: str) -> bool:
        """
        Load trained model from disk.

        Args:
            filepath: path to model pickle file

        Returns:
            True if successful, False otherwise
        """
        try:
            import pickle

            with open(filepath, 'rb') as f:
                data = pickle.load(f)
                self.model = data.get('model')
                self.scaler = data.get('scaler')
                self.is_trained = self.model is not None
            logger.info(f"Model loaded from {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
