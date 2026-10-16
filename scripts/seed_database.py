"""
IntelliSphere AI — Database Seeding Script
Populates initial sample datasets, registered ML models, versions, and experiments.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import json
from datetime import datetime
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal, init_db
from backend.app.models import (
    User, Dataset, DatasetSchema, DatasetProfile,
    MLModel, ModelVersion, Experiment, AnomalyAlert
)
from backend.app.core.security import hash_password
from backend.app.services.dataset_service import save_and_profile_dataset

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW = os.path.join(BASE_DIR, "data", "raw")
DATA_PROCESSED = os.path.join(BASE_DIR, "data", "processed")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

def seed():
    print("[*] Initializing Database Schema...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Admin / Lead Data Scientist User
        user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not user:
            user = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                full_name="Lead AI Scientist",
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[+] Created admin user: {user.email}")

        # 2. Register Active Trained Models
        models_metadata = [
            {
                "name": "LightGBM Demand Forecaster",
                "module_type": "retail",
                "task_type": "regression",
                "algorithm": "LightGBM Regressor",
                "description": "Multi-horizon daily and weekly sales forecasting with 95% confidence intervals and lag-rolling features.",
                "artifact": "artifacts/models/retail_forecast_lgb.joblib",
                "target": "TotalSales",
                "report_file": "retail_forecast_report.json"
            },
            {
                "name": "K-Means RFM Customer Segmenter",
                "module_type": "retail",
                "task_type": "clustering",
                "algorithm": "K-Means Clustering",
                "description": "Customer behavioral clustering on log-transformed Recency, Frequency, and Monetary attributes.",
                "artifact": "artifacts/models/retail_kmeans.joblib",
                "target": "Cluster",
                "report_file": "retail_segmentation_report.json"
            },
            {
                "name": "Cost-Sensitive Fraud Interceptor",
                "module_type": "fraud",
                "task_type": "classification",
                "algorithm": "XGBoost + Isolation Forest",
                "description": "Extreme class-imbalance transaction fraud classifier with scale_pos_weight and unsupervised anomaly detection.",
                "artifact": "artifacts/models/fraud_models.joblib",
                "target": "Class",
                "report_file": "fraud_report.json"
            },
            {
                "name": "Equipment Failure Predictor",
                "module_type": "maintenance",
                "task_type": "classification",
                "algorithm": "XGBoost Classifier",
                "description": "Milling machine failure classification leveraging mechanical power and thermal gradient features.",
                "artifact": "artifacts/models/maintenance_model.joblib",
                "target": "Machine failure",
                "report_file": "maintenance_report.json"
            },
            {
                "name": "Cardiovascular Risk Estimator",
                "module_type": "healthcare",
                "task_type": "classification",
                "algorithm": "XGBoost Classifier (Research Only)",
                "description": "Statistical risk modeling on de-identified Cleveland cohort with probability calibration curve.",
                "artifact": "artifacts/models/healthcare_model.joblib",
                "target": "binary_target",
                "report_file": "healthcare_report.json"
            },
            {
                "name": "Hybrid Latent Collaborative Recommender",
                "module_type": "recommendations",
                "task_type": "collaborative_filtering",
                "algorithm": "TruncatedSVD + Cosine Similarity",
                "description": "Latent matrix factorization combined with item cosine similarity and Bayesian popularity fallback.",
                "artifact": "artifacts/models/recommender_models.joblib",
                "target": "rating",
                "report_file": "recommendations_report.json"
            }
        ]

        for m_info in models_metadata:
            existing_m = db.query(MLModel).filter(MLModel.name == m_info["name"]).first()
            if not existing_m:
                m_obj = MLModel(
                    name=m_info["name"],
                    module_type=m_info["module_type"],
                    task_type=m_info["task_type"],
                    algorithm=m_info["algorithm"],
                    description=m_info["description"],
                    is_active=True
                )
                db.add(m_obj)
                db.commit()
                db.refresh(m_obj)

                # Load metrics from report if available
                metrics_dict = {}
                r_path = os.path.join(REPORTS_DIR, m_info["report_file"])
                if os.path.exists(r_path):
                    try:
                        with open(r_path, "r") as rf:
                            rep = json.load(rf)
                            metrics_dict = rep.get("models_comparison") or rep.get("evaluation_metrics") or {}
                    except Exception:
                        pass

                version_obj = ModelVersion(
                    model_id=m_obj.id,
                    version="v1.0.0",
                    artifact_path=m_info["artifact"],
                    metrics=json.dumps(metrics_dict),
                    target_column=m_info["target"],
                    validation_strategy="Holdout Validation",
                    status="ready"
                )
                db.add(version_obj)

                # Experiment entry
                exp_obj = Experiment(
                    name=f"Benchmark-{m_info['name']}",
                    module_type=m_info["module_type"],
                    status="completed",
                    metrics=json.dumps(metrics_dict),
                    parameters=json.dumps({"algorithm": m_info["algorithm"]}),
                    best_model_version_id=version_obj.id,
                    finished_at=datetime.utcnow()
                )
                db.add(exp_obj)
                db.commit()
                print(f"[+] Registered model: {m_info['name']}")

        # 3. Register Sample Datasets in DB
        sample_datasets = [
            {
                "path": os.path.join(DATA_PROCESSED, "retail_daily_sales.csv"),
                "name": "UCI Online Retail II (Daily Sales Series)",
                "source_type": "retail",
                "desc": "Clean aggregated daily transaction volume and sales totals (374 days)."
            },
            {
                "path": os.path.join(DATA_RAW, "ai4i2020.csv"),
                "name": "UCI AI4I 2020 Predictive Maintenance",
                "source_type": "maintenance",
                "desc": "10,000 synthetic milling machine telemetry observations with tool wear and torque."
            },
            {
                "path": os.path.join(DATA_RAW, "ml-latest-small", "ratings.csv"),
                "name": "MovieLens Latest Small (Ratings)",
                "source_type": "recommendations",
                "desc": "100,836 movie ratings from 610 users for collaborative filtering evaluation."
            }
        ]

        for s_ds in sample_datasets:
            if os.path.exists(s_ds["path"]):
                existing_ds = db.query(Dataset).filter(Dataset.name == s_ds["name"]).first()
                if not existing_ds:
                    save_and_profile_dataset(
                        db=db,
                        user=user,
                        file_path=s_ds["path"],
                        name=s_ds["name"],
                        source_type=s_ds["source_type"],
                        description=s_ds["desc"],
                        is_sample=True
                    )
                    print(f"[+] Seeded sample dataset: {s_ds['name']}")

        # 4. Initial Anomaly Alert for Overview Dashboard
        alert_count = db.query(AnomalyAlert).count()
        if alert_count == 0:
            db.add(AnomalyAlert(
                module_type="maintenance",
                severity="high",
                title="Milling Machine Vibration Spikes",
                message="Sensors detected abnormal torque-speed ratio (>0.038) on Machine L47181.",
                entity_id="machine_L47181",
                entity_type="equipment",
                score=0.88,
                is_resolved=False
            ))
            db.add(AnomalyAlert(
                module_type="fraud",
                severity="medium",
                title="Cross-border velocity spike flagged",
                message="Rapid sequential transactions from foreign terminal exceeded risk threshold (64.2%).",
                entity_id="tx_9812",
                entity_type="transaction",
                score=0.642,
                is_resolved=False
            ))
            db.commit()
            print("[+] Seeded initial operational alerts.")

        print("[*] Database seeding finished successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
