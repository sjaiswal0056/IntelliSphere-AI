import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.models.prediction import Prediction, PredictionExplanation, AnomalyAlert

router = APIRouter(prefix="/fraud", tags=["Financial Fraud Intelligence"])

REPORTS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "reports")
MODELS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "models")

class TransactionPredictRequest(BaseModel):
    amount: float = Field(..., example=149.50)
    time: float = Field(0.0, example=40520.0)
    v_features: Optional[Dict[str, float]] = Field(default_factory=dict)
    risk_threshold: float = Field(0.50, ge=0.1, le=0.99)

@router.get("/analytics")
def get_fraud_analytics():
    report_file = os.path.join(REPORTS_DIR, "fraud_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Fraud detection models have not been trained yet.")
    with open(report_file, "r") as f:
        data = json.load(f)
    return data

@router.post("/predict")
def score_transaction(req: TransactionPredictRequest, db: Session = Depends(get_db)):
    model_path = os.path.join(MODELS_DIR, "fraud_models.joblib")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Fraud model artifact is not ready.")

    artifact = joblib.load(model_path)
    xgb_model = artifact["xgb_model"]
    iso_forest = artifact["iso_forest"]
    amount_scaler = artifact.get("amount_scaler", artifact.get("scaler"))
    time_scaler = artifact.get("time_scaler")
    feature_cols = artifact["feature_cols"]
    explainer = artifact["explainer"]

    start_time = time.time()

    # Scale amount and time using models fitted strictly on training data
    scaled_amount = float(amount_scaler.transform([[req.amount]])[0][0])
    if time_scaler is not None:
        scaled_time = float(time_scaler.transform([[req.time]])[0][0])
    else:
        scaled_time = float(req.time / 100000.0)

    # Build input feature vector
    input_dict = {f"V{i}": 0.0 for i in range(1, 29)}
    if req.v_features:
        for k, v in req.v_features.items():
            if k in input_dict:
                input_dict[k] = float(v)
    input_dict["scaled_amount"] = scaled_amount
    input_dict["scaled_time"] = scaled_time

    df_row = pd.DataFrame([input_dict])[feature_cols]

    # Predict probability with XGBoost
    prob_fraud = float(xgb_model.predict_proba(df_row)[0][1])
    is_fraud_flagged = bool(prob_fraud >= req.risk_threshold)

    # Anomaly score with Isolation Forest
    iso_score = float(-iso_forest.score_samples(df_row)[0])
    is_anomaly = bool(iso_score > 0.60)

    # Determine risk category
    if prob_fraud >= 0.75:
        risk_level = "CRITICAL_RISK"
    elif prob_fraud >= req.risk_threshold:
        risk_level = "ELEVATED_RISK"
    elif prob_fraud >= 0.20:
        risk_level = "MODERATE_RISK"
    else:
        risk_level = "LOW_RISK"

    # SHAP local feature attributions
    shap_values = explainer.shap_values(df_row)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]
    else:
        shap_vals = shap_values[0]

    shap_dict = {f: round(float(v), 4) for f, v in zip(feature_cols, shap_vals)}
    sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:6]

    top_drivers = [
        {"feature": k, "attribution": v, "impact": "increases_risk" if v > 0 else "decreases_risk"}
        for k, v in sorted_features
    ]

    latency_ms = round((time.time() - start_time) * 1000, 2)

    # Persist in DB
    prediction_record = Prediction(
        module_type="fraud",
        input_data=json.dumps(req.dict()),
        prediction_result=json.dumps({
            "probability": prob_fraud,
            "risk_level": risk_level,
            "is_flagged": is_fraud_flagged,
            "anomaly_score": iso_score
        }),
        prediction_value=prob_fraud,
        risk_score=prob_fraud,
        is_anomaly=is_anomaly,
        latency_ms=latency_ms
    )
    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)

    # Explanation record
    expl = PredictionExplanation(
        prediction_id=prediction_record.id,
        method="SHAP",
        base_value=float(explainer.expected_value) if hasattr(explainer, "expected_value") and not isinstance(explainer.expected_value, (list, np.ndarray)) else 0.0,
        feature_attributions=json.dumps(shap_dict),
        top_positive_features=json.dumps([d for d in top_drivers if d["impact"] == "increases_risk"]),
        top_negative_features=json.dumps([d for d in top_drivers if d["impact"] == "decreases_risk"]),
        natural_language_summary=f"Transaction assigned a risk score of {prob_fraud:.1%}. Principal factors driving this score include {', '.join([d['feature'] for d in top_drivers[:3]])}."
    )
    db.add(expl)

    # Alert if elevated risk
    if is_fraud_flagged:
        alert = AnomalyAlert(
            module_type="fraud",
            severity="critical" if risk_level == "CRITICAL_RISK" else "high",
            title=f"Flagged Transaction - Risk Score {prob_fraud*100:.1f}%",
            message=f"A transaction of ${req.amount:.2f} exceeded the risk threshold ({req.risk_threshold*100:.0f}%).",
            entity_id=str(prediction_record.id),
            entity_type="transaction",
            score=prob_fraud
        )
        db.add(alert)

    db.commit()

    return {
        "prediction_id": prediction_record.id,
        "amount": req.amount,
        "fraud_probability": round(prob_fraud, 4),
        "risk_level": risk_level,
        "is_flagged": is_fraud_flagged,
        "is_anomaly": is_anomaly,
        "anomaly_score": round(iso_score, 4),
        "threshold_applied": req.risk_threshold,
        "top_drivers": top_drivers,
        "latency_ms": latency_ms,
        "disclaimer": "Machine learning risk scoring represents statistical anomaly probability, not conclusive proof of fraud."
    }
