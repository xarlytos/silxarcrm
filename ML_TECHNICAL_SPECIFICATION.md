# ML Technical Specification: Implementation Guide
## CRM Maestro ML Pipeline Architecture
**Version:** 1.0  
**Date:** 2026-06-21

---

## PART 1: DEVELOPMENT ENVIRONMENT SETUP

### 1.1 Python Environment

```bash
# Create virtual environment
python3.10 -m venv venv_ml
source venv_ml/bin/activate  # or venv_ml\Scripts\activate on Windows

# Core ML dependencies
pip install \
  numpy==1.24.3 \
  pandas==2.0.3 \
  scikit-learn==1.3.0 \
  xgboost==1.7.6 \
  lightgbm==4.0.0 \
  scipy==1.11.0 \
  statsmodels==0.14.0 \
  joblib==1.3.0

# NLP & Deep Learning
pip install \
  transformers==4.31.0 \
  torch==2.0.0 \
  sentence-transformers==2.2.2

# Time Series
pip install \
  prophet==1.1.4 \
  pmdarima==2.0.4

# ML Operations
pip install \
  mlflow==2.5.0 \
  wandb==0.15.3 \
  evidently==0.4.6

# API & Serving
pip install \
  fastapi==0.100.0 \
  uvicorn==0.23.1 \
  redis==5.0.0 \
  psycopg2-binary==2.9.7

# Data Pipeline
pip install \
  sqlalchemy==2.0.20 \
  dbt-postgres==1.6.0

# Testing & Validation
pip install \
  pytest==7.4.0 \
  pytest-cov==4.1.0
```

### 1.2 PostgreSQL Schema Extensions

```sql
-- Feature store tables
CREATE SCHEMA IF NOT EXISTS ml;

CREATE TABLE ml.feature_definitions (
  feature_id SERIAL PRIMARY KEY,
  feature_name VARCHAR(255) UNIQUE NOT NULL,
  feature_group VARCHAR(50),  -- temporal, engagement, email, etc
  feature_type VARCHAR(20),   -- numeric, categorical, text, date
  description TEXT,
  computation_logic TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE ml.feature_store (
  feature_store_id SERIAL PRIMARY KEY,
  entity_id VARCHAR(255) NOT NULL,  -- lead_id
  entity_type VARCHAR(50),          -- lead, customer, deal
  feature_id INTEGER REFERENCES ml.feature_definitions(feature_id),
  feature_value FLOAT,
  as_of_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  is_stale BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_feature_store_entity ON ml.feature_store(entity_id, entity_type);
CREATE INDEX idx_feature_store_date ON ml.feature_store(as_of_date);

CREATE TABLE ml.model_predictions (
  prediction_id SERIAL PRIMARY KEY,
  model_name VARCHAR(255),
  model_version VARCHAR(50),
  entity_id VARCHAR(255),
  prediction_value FLOAT,
  prediction_category VARCHAR(50),
  confidence FLOAT,
  feature_importance JSONB,
  predicted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_expired BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_predictions_model ON ml.model_predictions(model_name, model_version);
CREATE INDEX idx_predictions_entity ON ml.model_predictions(entity_id);

CREATE TABLE ml.model_monitoring (
  monitor_id SERIAL PRIMARY KEY,
  model_name VARCHAR(255),
  monitoring_date DATE,
  metric_name VARCHAR(100),
  metric_value FLOAT,
  baseline_value FLOAT,
  drift_detected BOOLEAN,
  alert_level VARCHAR(20),  -- info, warning, critical
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ml.training_log (
  training_id SERIAL PRIMARY KEY,
  model_name VARCHAR(255),
  model_version VARCHAR(50),
  training_start TIMESTAMP,
  training_end TIMESTAMP,
  train_samples INT,
  test_samples INT,
  validation_metric_name VARCHAR(100),
  validation_metric_value FLOAT,
  is_production BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## PART 2: MODEL-SPECIFIC IMPLEMENTATIONS

### 2.1 Model 1: Lead Propensity-to-Close (Python)

```python
# models/propensity_model.py
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import roc_auc_score, precision_recall_curve
import xgboost as xgb
import joblib
import logging

logger = logging.getLogger(__name__)

class PropensityToCloseModel:
    """
    Predicts probability of lead converting to customer in 90 days
    """
    
    def __init__(self, model_version='1.0'):
        self.model_version = model_version
        self.rf_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            scale_pos_weight=2,  # Imbalanced: 1 conversion per 2 non-conversions
            early_stopping_rounds=10,
            use_label_encoder=False
        )
        self.scaler = StandardScaler()
        self.feature_names = []
        self.encoders = {}
        
    def engineer_temporal_features(self, lead_df: pd.DataFrame) -> pd.DataFrame:
        """Extract temporal features from lead data"""
        lead_df = lead_df.copy()
        
        now = pd.Timestamp.now()
        lead_df['days_since_first_contact'] = (now - pd.to_datetime(lead_df['created_at'])).dt.days
        lead_df['days_since_last_contact'] = (now - pd.to_datetime(lead_df['ultimo_contacto'])).dt.days
        lead_df['days_since_last_contact'] = lead_df['days_since_last_contact'].fillna(
            lead_df['days_since_first_contact']
        )
        
        # Contact frequency
        lead_df['contact_frequency_7d'] = lead_df.apply(
            lambda row: self._count_contacts_in_window(row['id'], days=7),
            axis=1
        )
        
        # State duration
        lead_df['time_in_current_state_days'] = (now - pd.to_datetime(lead_df['estado_changed_at'])).dt.days
        
        return lead_df
    
    def engineer_engagement_features(self, lead_df: pd.DataFrame, 
                                    calls_df: pd.DataFrame, 
                                    emails_df: pd.DataFrame) -> pd.DataFrame:
        """Extract engagement metrics"""
        lead_df = lead_df.copy()
        
        # Call metrics
        call_stats = calls_df.groupby('lead_id').agg({
            'duracion_seg': ['count', 'mean', 'sum'],
            'estado': lambda x: (x == 'completada').sum() / len(x) if len(x) > 0 else 0,
        }).fillna(0)
        call_stats.columns = ['calls_count', 'avg_call_duration', 'total_call_duration', 'call_completion_rate']
        
        # Call sentiment
        call_sentiment = calls_df[calls_df['metadata'].notna()].apply(
            lambda row: row['metadata'].get('emotion') if isinstance(row['metadata'], dict) else None,
            axis=1
        )
        
        # Email metrics
        email_stats = emails_df.groupby('lead_id').agg({
            'id': 'count',
            'abierto': 'sum',
            'clicked': 'sum',
        }).fillna(0)
        email_stats.columns = ['emails_sent', 'emails_opened', 'emails_clicked']
        email_stats['email_open_rate'] = email_stats['emails_opened'] / email_stats['emails_sent']
        email_stats['email_click_rate'] = email_stats['emails_clicked'] / email_stats['emails_sent']
        
        # Merge back
        lead_df = lead_df.join(call_stats, on='id', how='left')
        lead_df = lead_df.join(email_stats, on='id', how='left')
        lead_df = lead_df.fillna(0)
        
        return lead_df
    
    def engineer_icp_features(self, lead_df: pd.DataFrame) -> pd.DataFrame:
        """Extract ICP and audit scores"""
        lead_df = lead_df.copy()
        
        # Extract from metadata
        lead_df['audit_score'] = lead_df['metadata'].apply(
            lambda x: x.get('auditoria', {}).get('score', 0) if isinstance(x, dict) else 0
        )
        
        lead_df['radar_score'] = lead_df['metadata'].apply(
            lambda x: x.get('radar', {}).get('score', 0) if isinstance(x, dict) else 0
        )
        
        lead_df['sector'] = lead_df['metadata'].apply(
            lambda x: x.get('iaClassification', {}).get('sector', 'unknown') if isinstance(x, dict) else 'unknown'
        )
        
        return lead_df
    
    def prepare_data(self, features_df: pd.DataFrame, target_df: pd.DataFrame) -> tuple:
        """Prepare features and target for training"""
        # Merge features with target
        data = features_df.merge(target_df[['lead_id', 'converted_90d']], 
                                left_on='id', right_on='lead_id', how='left')
        
        # Remove rows with missing target
        data = data.dropna(subset=['converted_90d'])
        
        # Handle categorical variables
        categorical_cols = ['estado', 'prioridad', 'origen', 'sector', 'pais']
        for col in categorical_cols:
            if col in data.columns:
                le = LabelEncoder()
                data[col] = le.fit_transform(data[col].fillna('unknown').astype(str))
                self.encoders[col] = le
        
        # Select features
        feature_cols = [col for col in data.columns 
                       if col not in ['id', 'lead_id', 'converted_90d', 'metadata', 
                                     'nombre', 'email', 'telefono']]
        self.feature_names = feature_cols
        
        X = data[feature_cols].fillna(0)
        y = data['converted_90d'].astype(int)
        
        # Scale
        X_scaled = self.scaler.fit_transform(X)
        
        return X_scaled, y, X.columns
    
    def train(self, X_train, y_train, X_val, y_val):
        """Train ensemble of RF + XGBoost"""
        
        # Train Random Forest
        logger.info("Training Random Forest...")
        self.rf_model.fit(X_train, y_train)
        rf_auc = roc_auc_score(y_val, self.rf_model.predict_proba(X_val)[:, 1])
        logger.info(f"RF AUC: {rf_auc:.4f}")
        
        # Train XGBoost
        logger.info("Training XGBoost...")
        self.xgb_model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=100
        )
        xgb_auc = roc_auc_score(y_val, self.xgb_model.predict_proba(X_val)[:, 1])
        logger.info(f"XGB AUC: {xgb_auc:.4f}")
        
        # Ensemble prediction
        rf_pred = self.rf_model.predict_proba(X_val)[:, 1]
        xgb_pred = self.xgb_model.predict_proba(X_val)[:, 1]
        ensemble_pred = 0.5 * rf_pred + 0.5 * xgb_pred
        ensemble_auc = roc_auc_score(y_val, ensemble_pred)
        logger.info(f"Ensemble AUC: {ensemble_auc:.4f}")
        
        return {
            'rf_auc': rf_auc,
            'xgb_auc': xgb_auc,
            'ensemble_auc': ensemble_auc,
            'feature_importance': self._get_feature_importance()
        }
    
    def predict(self, X: np.ndarray) -> dict:
        """Make predictions"""
        rf_proba = self.rf_model.predict_proba(X)[:, 1]
        xgb_proba = self.xgb_model.predict_proba(X)[:, 1]
        
        # Ensemble
        ensemble_proba = 0.5 * rf_proba + 0.5 * xgb_proba
        
        # Categorize
        categories = pd.cut(ensemble_proba, bins=[0, 0.4, 0.7, 1.0], 
                           labels=['low', 'medium', 'high'])
        
        return {
            'probability': ensemble_proba[0],
            'category': categories[0],
            'confidence': max(ensemble_proba[0], 1 - ensemble_proba[0])
        }
    
    def _get_feature_importance(self) -> dict:
        """Extract feature importance from models"""
        rf_importance = dict(zip(self.feature_names, 
                                self.rf_model.feature_importances_))
        xgb_importance = dict(zip(self.feature_names, 
                                 self.xgb_model.feature_importances_))
        
        # Average importance
        avg_importance = {
            feat: (rf_importance.get(feat, 0) + xgb_importance.get(feat, 0)) / 2
            for feat in self.feature_names
        }
        
        return sorted(avg_importance.items(), key=lambda x: x[1], reverse=True)[:20]
    
    def save(self, path: str):
        """Save model to disk"""
        joblib.dump({
            'rf_model': self.rf_model,
            'xgb_model': self.xgb_model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'encoders': self.encoders,
            'version': self.model_version
        }, f"{path}/propensity_model_{self.model_version}.pkl")
        logger.info(f"Model saved to {path}")
    
    def load(self, path: str):
        """Load model from disk"""
        data = joblib.load(path)
        self.rf_model = data['rf_model']
        self.xgb_model = data['xgb_model']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.encoders = data['encoders']
        self.model_version = data['version']
```

### 2.2 FastAPI Inference Server

```python
# api/inference_server.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, List
import numpy as np
import redis
import json
from datetime import datetime, timedelta
import logging

app = FastAPI(title="ML Inference Server", version="1.0")
logger = logging.getLogger(__name__)

# Initialize Redis cache
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load models
propensity_model = None
deal_win_model = None
churn_model = None

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    global propensity_model, deal_win_model, churn_model
    
    from models.propensity_model import PropensityToCloseModel
    propensity_model = PropensityToCloseModel()
    propensity_model.load('models/propensity_model_1.0.pkl')
    logger.info("Models loaded successfully")

class PredictionRequest(BaseModel):
    lead_id: str
    features: Dict[str, float]

class PredictionResponse(BaseModel):
    lead_id: str
    model_name: str
    model_version: str
    prediction: float
    category: str
    confidence: float
    feature_importance: List[tuple]
    computed_at: str
    expires_at: str
    cache_hit: bool = False

@app.post("/v1/predict/propensity", response_model=PredictionResponse)
async def predict_propensity(request: PredictionRequest, background_tasks: BackgroundTasks):
    """Predict lead propensity to close"""
    
    # Check cache first
    cache_key = f"propensity_{request.lead_id}"
    cached = redis_client.get(cache_key)
    
    if cached:
        cached_data = json.loads(cached)
        cached_data['cache_hit'] = True
        return PredictionResponse(**cached_data)
    
    # Prepare features
    feature_vector = np.array([list(request.features.values())])
    
    # Make prediction
    try:
        result = propensity_model.predict(feature_vector)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")
    
    # Build response
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=24)
    
    response = PredictionResponse(
        lead_id=request.lead_id,
        model_name="propensity-to-close",
        model_version="1.0",
        prediction=float(result['probability']),
        category=result['category'],
        confidence=float(result['confidence']),
        feature_importance=propensity_model._get_feature_importance(),
        computed_at=now.isoformat(),
        expires_at=expires_at.isoformat(),
        cache_hit=False
    )
    
    # Cache for 24 hours
    background_tasks.add_task(
        cache_prediction,
        cache_key,
        response.dict(),
        expires_at
    )
    
    return response

def cache_prediction(cache_key: str, data: dict, expires_at: datetime):
    """Background task to cache prediction"""
    ttl_seconds = int((expires_at - datetime.utcnow()).total_seconds())
    redis_client.setex(cache_key, ttl_seconds, json.dumps(data))

@app.get("/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": propensity_model is not None,
        "redis_connected": redis_client.ping(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/v1/models/retrain")
async def trigger_retrain():
    """Trigger model retraining"""
    background_tasks = BackgroundTasks()
    background_tasks.add_task(retrain_all_models)
    return {"status": "retraining_initiated"}

async def retrain_all_models():
    """Retrain all models"""
    logger.info("Starting model retraining...")
    # Implementation details...
    logger.info("Model retraining complete")
```

---

## PART 3: DATA PIPELINE WITH DBT

### 3.1 dbt Models (SQL)

```sql
-- models/staging/stg_leads.sql
{{ config(
    materialized='table',
    indexes = [
        {'columns': ['id', 'software_id'], 'unique': False},
        {'columns': ['created_at'], 'unique': False},
    ]
) }}

WITH source_leads AS (
    SELECT 
        id,
        nombre,
        email,
        telefono,
        empresa,
        cargo,
        pais,
        origen,
        software_id,
        estado,
        prioridad,
        ultimo_contacto,
        asignado_a,
        metadata,
        created_at,
        updated_at
    FROM {{ source('crm', 'leads') }}
    WHERE estado != 'ELIMINADO'  -- Filter out deleted
)

SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY email, software_id ORDER BY created_at DESC) as email_rn
FROM source_leads

-- models/mart/lead_features.sql
{{ config(materialized='incremental') }}

WITH leads AS (
    SELECT * FROM {{ ref('stg_leads') }}
),

calls AS (
    SELECT 
        lead_id,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completed_calls,
        AVG(duracion_seg) as avg_call_duration,
        MAX(iniciada_at) as last_call_date,
        AVG(CAST(metadata->>'engagementScore' as FLOAT)) as avg_engagement_score
    FROM {{ source('crm', 'llamadas_reales') }}
    WHERE estado IN ('completada', 'en_curso')
    GROUP BY lead_id
),

emails AS (
    SELECT 
        lead_id,
        COUNT(*) as emails_sent,
        COUNT(CASE WHEN abierto THEN 1 END) as emails_opened,
        COUNT(CASE WHEN clicked THEN 1 END) as emails_clicked
    FROM {{ source('crm', 'email_envios') }}
    GROUP BY lead_id
),

propuestas AS (
    SELECT 
        lead_id,
        COUNT(*) as propuestas_count,
        COUNT(CASE WHEN estado = 'ACEPTADA' THEN 1 END) as propuestas_accepted,
        AVG(CAST(total AS FLOAT)) as avg_propuesta_value
    FROM {{ source('crm', 'propuestas') }}
    WHERE estado != 'BORRADOR'
    GROUP BY lead_id
)

SELECT 
    leads.id as lead_id,
    leads.nombre,
    leads.email,
    leads.empresa,
    leads.sector,
    leads.created_at,
    leads.estado,
    leads.prioridad,
    COALESCE(calls.total_calls, 0) as total_calls,
    COALESCE(calls.completed_calls, 0) as completed_calls,
    COALESCE(calls.avg_call_duration, 0) as avg_call_duration,
    COALESCE(calls.avg_engagement_score, 0) as avg_engagement_score,
    COALESCE(emails.emails_sent, 0) as emails_sent,
    COALESCE(emails.emails_opened, 0) as emails_opened,
    COALESCE(SAFE_DIVIDE(emails.emails_opened, emails.emails_sent), 0) as email_open_rate,
    COALESCE(propuestas.propuestas_count, 0) as propuestas_count,
    COALESCE(SAFE_DIVIDE(propuestas.propuestas_accepted, propuestas.propuestas_count), 0) as propuestas_acceptance_rate,
    CURRENT_TIMESTAMP() as dbt_updated_at
FROM leads
LEFT JOIN calls ON leads.id = calls.lead_id
LEFT JOIN emails ON leads.id = emails.lead_id
LEFT JOIN propuestas ON leads.id = propuestas.lead_id

WHERE leads.email_rn = 1  -- Only latest version of each lead

{% if execute %}
    AND leads.created_at >= '{{ var("start_date", "2024-01-01") }}'
{% endif %}
```

---

## PART 4: DEPLOYMENT & MONITORING

### 4.1 Docker Container

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/v1/health || exit 1

# Run server
CMD ["uvicorn", "api.inference_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4.2 Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
  labels:
    app: ml-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
      - name: ml-inference
        image: crm-ml:latest
        ports:
        - containerPort: 8000
        env:
        - name: REDIS_URL
          value: redis://redis-service:6379
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ml-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /v1/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /v1/health
            port: 8000
          initialDelaySeconds: 20
          periodSeconds: 5
```

### 4.3 Monitoring with Evidently

```python
# monitoring/drift_detection.py
from evidently.report import Report
from evidently.metric_preset import RegressionPreset
from evidently.metrics import *
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class ModelDriftMonitor:
    
    def __init__(self, reference_data: pd.DataFrame):
        self.reference_data = reference_data
        self.reference_stats = reference_data.describe()
    
    def check_data_drift(self, current_data: pd.DataFrame) -> Dict:
        """Check for data drift using statistical tests"""
        
        report = Report(metrics=[
            DatasetDriftMetric(),
            DatasetMissingValuesMetric(),
            DatasetCorrelationsMetric(),
        ])
        
        report.run(reference_data=self.reference_data, current_data=current_data)
        
        drift_results = {
            'dataset_drifted': report.as_dict()['metrics'][0]['result']['dataset_drift'],
            'number_of_drifted_features': report.as_dict()['metrics'][0]['result']['number_of_drifted_features'],
            'metrics': report.as_dict()['metrics']
        }
        
        if drift_results['dataset_drifted']:
            logger.warning(f"Data drift detected! {drift_results['number_of_drifted_features']} features drifted")
        
        return drift_results
    
    def check_prediction_drift(self, y_true: pd.Series, y_pred: pd.Series) -> Dict:
        """Check for prediction drift"""
        
        from sklearn.metrics import roc_auc_score, precision_score, recall_score
        
        baseline_auc = 0.88
        current_auc = roc_auc_score(y_true, y_pred)
        
        degradation = (baseline_auc - current_auc) / baseline_auc * 100
        
        metrics = {
            'baseline_auc': baseline_auc,
            'current_auc': current_auc,
            'degradation_pct': degradation,
            'alert': degradation > 5,
            'precision': precision_score(y_true, (y_pred > 0.5).astype(int)),
            'recall': recall_score(y_true, (y_pred > 0.5).astype(int))
        }
        
        if metrics['alert']:
            logger.critical(f"Model degradation detected: {degradation:.2f}%")
        
        return metrics
```

---

## PART 5: TRAINING PIPELINE (Airflow)

```python
# dags/model_retraining_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.docker_operator import DockerOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'ml_model_retraining',
    default_args=default_args,
    description='Weekly model retraining pipeline',
    schedule_interval='0 1 * * 0',  # Every Sunday at 1 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
)

def extract_features():
    """Extract features from database"""
    import pandas as pd
    from sqlalchemy import create_engine
    
    engine = create_engine('postgresql://...')
    
    # Run dbt models
    os.system('dbt run --models lead_features')
    
    # Extract data
    features_df = pd.read_sql(
        'SELECT * FROM mart.lead_features WHERE created_at > NOW() - INTERVAL 90 DAY',
        engine
    )
    
    features_df.to_parquet('/tmp/features.parquet')

def train_propensity_model():
    """Train propensity model"""
    import pandas as pd
    from models.propensity_model import PropensityToCloseModel
    
    features_df = pd.read_parquet('/tmp/features.parquet')
    
    # Train
    model = PropensityToCloseModel(model_version='1.1')
    X_train, y_train, X_val, y_val = prepare_data(features_df)
    results = model.train(X_train, y_train, X_val, y_val)
    
    # Save
    model.save('models/')
    
    # Log to MLflow
    import mlflow
    with mlflow.start_run():
        mlflow.log_params({'model_version': '1.1'})
        mlflow.log_metrics(results)
        mlflow.sklearn.log_model(model, 'propensity-model')

def validate_model():
    """Validate model quality"""
    pass

def deploy_model():
    """Deploy model to production"""
    pass

# Define tasks
extract_task = PythonOperator(
    task_id='extract_features',
    python_callable=extract_features,
    dag=dag
)

train_task = PythonOperator(
    task_id='train_model',
    python_callable=train_propensity_model,
    dag=dag
)

validate_task = PythonOperator(
    task_id='validate_model',
    python_callable=validate_model,
    dag=dag
)

deploy_task = PythonOperator(
    task_id='deploy_model',
    python_callable=deploy_model,
    dag=dag
)

# Define dependencies
extract_task >> train_task >> validate_task >> deploy_task
```

---

## PART 6: INTEGRATION WITH BACKEND

### 6.1 Node.js API Layer (TypeScript)

```typescript
// backend/src/services/mlPredictionService.ts
import axios from 'axios';
import { logger } from '../utils/logger';

const ML_API_BASE = process.env.ML_API_URL || 'http://localhost:8000/v1';

interface PredictionResult {
  lead_id: string;
  model_name: string;
  prediction: number;
  category: string;
  confidence: number;
  feature_importance: Array<[string, number]>;
  computed_at: string;
  cache_hit: boolean;
}

export async function getPropensityScore(
  leadId: string,
  features: Record<string, number>
): Promise<PredictionResult> {
  try {
    const response = await axios.post(
      `${ML_API_BASE}/predict/propensity`,
      {
        lead_id: leadId,
        features,
      },
      {
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error) {
    logger.error('ML prediction error:', error);
    throw error;
  }
}

// Middleware to attach propensity score to leads
export async function enrichLeadWithPredictions(lead: any) {
  try {
    const features = extractFeaturesFromLead(lead);
    const predictions = await getPropensityScore(lead.id, features);
    
    return {
      ...lead,
      ml_predictions: {
        propensity: predictions,
      },
    };
  } catch (error) {
    logger.warn('Could not enrich lead with predictions:', error);
    return lead;
  }
}

function extractFeaturesFromLead(lead: any): Record<string, number> {
  return {
    days_since_first_contact: calculateDaysSince(lead.created_at),
    days_since_last_contact: calculateDaysSince(lead.ultimo_contacto),
    total_calls: lead._count?.llamadas || 0,
    emails_sent: lead._count?.emails || 0,
    audit_score: lead.metadata?.auditoria?.score || 0,
    radar_score: lead.metadata?.radar?.score || 0,
    // ... more features
  };
}
```

### 6.2 GraphQL Query Extension

```graphql
extend type Lead {
  mlPredictions: MLPredictions
}

type MLPredictions {
  propensityScore: Float!
  propensityCategory: String!  # "high", "medium", "low"
  propensityConfidence: Float!
  dealWinProbability: Float
  churnRisk: Float
  recommendedNextAction: String
  topFeatures: [FeatureImportance!]!
  computedAt: DateTime!
  expiresAt: DateTime!
}

type FeatureImportance {
  name: String!
  importance: Float!
}

extend type Query {
  leadWithPredictions(id: ID!): Lead
  leadsRankedByPropensity(limit: Int, offset: Int): [Lead!]!
  leadsAtRisk(churnThreshold: Float = 0.7): [Lead!]!
}
```

---

## PART 7: TESTING & VALIDATION

### 7.1 Unit Tests

```python
# tests/test_propensity_model.py
import pytest
import numpy as np
import pandas as pd
from models.propensity_model import PropensityToCloseModel

@pytest.fixture
def sample_data():
    return pd.DataFrame({
        'days_since_contact': np.random.randint(0, 100, 100),
        'calls_count': np.random.randint(0, 10, 100),
        'email_open_rate': np.random.random(100),
        'audit_score': np.random.randint(0, 100, 100),
    })

def test_model_initialization():
    model = PropensityToCloseModel()
    assert model.model_version == '1.0'
    assert model.rf_model is not None

def test_prediction_output_shape(sample_data):
    model = PropensityToCloseModel()
    # Assume model is trained
    
    prediction = model.predict(sample_data.iloc[0].values)
    
    assert 'probability' in prediction
    assert 0 <= prediction['probability'] <= 1
    assert prediction['category'] in ['low', 'medium', 'high']
    assert 0.5 <= prediction['confidence'] <= 1.0

def test_model_save_load(tmp_path):
    model = PropensityToCloseModel()
    model.save(str(tmp_path))
    
    model2 = PropensityToCloseModel()
    model2.load(str(tmp_path / 'propensity_model_1.0.pkl'))
    
    assert model2.model_version == model.model_version
```

### 7.2 Integration Tests

```python
# tests/test_inference_api.py
import pytest
from fastapi.testclient import TestClient
from api.inference_server import app

client = TestClient(app)

def test_health_check():
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_propensity_prediction():
    request_body = {
        "lead_id": "test_lead_123",
        "features": {
            "days_since_contact": 5,
            "calls_count": 3,
            "email_open_rate": 0.65,
            "audit_score": 75,
        }
    }
    
    response = client.post("/v1/predict/propensity", json=request_body)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "prediction" in data
    assert 0 <= data["prediction"] <= 1
    assert data["category"] in ["low", "medium", "high"]
```

---

## PART 8: PERFORMANCE TUNING

### 8.1 Model Inference Optimization

```python
# Quantize XGBoost for faster inference
import xgboost as xgb
from sklearn.preprocessing import QuantileTransformer

# Convert to binary format for faster loading
model.save_model('model.ubj')  # UBJ format

# Pre-compute feature scaling
scaler = QuantileTransformer()
X_scaled = scaler.fit_transform(X_train)
scaler.dump('scaler.pkl')

# Use numba for feature computation
from numba import jit

@jit(nopython=True)
def compute_temporal_features(timestamps):
    """Vectorized temporal feature computation"""
    result = np.zeros(len(timestamps))
    now = np.datetime64('today')
    for i in range(len(timestamps)):
        result[i] = (now - timestamps[i]).astype('int32')
    return result
```

### 8.2 Inference Latency Benchmarks

```python
# tests/test_inference_latency.py
import time
import numpy as np

def test_inference_latency():
    X_test = np.random.randn(100, 35)  # 100 samples, 35 features
    
    # Warm up
    for _ in range(10):
        model.predict(X_test[:1])
    
    # Benchmark
    start = time.time()
    for i in range(1000):
        model.predict(X_test[i % len(X_test)].reshape(1, -1))
    elapsed = time.time() - start
    
    latency_ms = elapsed / 1000 * 1000
    throughput = 1000 / elapsed
    
    assert latency_ms < 200, f"Latency {latency_ms:.2f}ms exceeds SLA"
    assert throughput > 5, f"Throughput {throughput:.2f} ops/sec below target"
```

---

## IMPLEMENTATION CHECKLIST

```
Week 1-2: Foundation
  ☐ Set up Python environment & dependencies
  ☐ Configure PostgreSQL feature store schema
  ☐ Create MLflow server
  ☐ Initialize dbt project

Week 3-4: Data Pipeline
  ☐ Build dbt models for feature extraction
  ☐ ETL pipeline for historical data
  ☐ Data quality checks
  ☐ Label target variable (conversions)

Week 5-6: Model Development
  ☐ EDA & feature engineering
  ☐ Train Model 1 (Propensity)
  ☐ Hyperparameter tuning
  ☐ Cross-validation & performance tests

Week 7-8: Inference & Serving
  ☐ Build FastAPI inference server
  ☐ Redis caching layer
  ☐ Docker containerization
  ☐ Unit & integration tests

Week 9-10: Monitoring & Operations
  ☐ Set up monitoring with Evidently
  ☐ Drift detection alerts
  ☐ Grafana dashboards
  ☐ Airflow retraining DAG

Week 11-12: Production Deployment
  ☐ Kubernetes setup
  ☐ Load testing
  ☐ A/B test framework
  ☐ Sales team training
  ☐ Go-live monitoring
```

---

**This specification can be used as an implementation guide for the ML team to build out the 8-model pipeline over the next 12 months.**
