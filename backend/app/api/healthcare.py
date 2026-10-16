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
from backend.app.models.prediction import Prediction, PredictionExplanation

router = APIRouter(prefix="/healthcare", tags=["Healthcare Risk Analytics (Research Only)"])

REPORTS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "reports")
MODELS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "models")

class HealthResearchRequest(BaseModel):
    age: float = Field(54.0, ge=18.0, le=100.0, example=58.0)
    sex: int = Field(1, ge=0, le=1, description="0: Female, 1: Male", example=1)
    cp: int = Field(2, ge=0, le=3, description="Chest pain type: 0: typical, 1: atypical, 2: non-anginal, 3: asymptomatic", example=2)
    trestbps: float = Field(130.0, ge=80.0, le=220.0, description="Resting blood pressure (mm Hg)", example=140.0)
    chol: float = Field(240.0, ge=100.0, le=600.0, description="Serum cholesterol (mg/dl)", example=245.0)
    fbs: int = Field(0, ge=0, le=1, description="Fasting blood sugar > 120 mg/dl (1: true, 0: false)", example=0)
    restecg: int = Field(0, ge=0, le=2, description="Resting ECG (0: normal, 1: ST-T wave abnormality, 2: left ventricular hypertrophy)", example=0)
    thalach: float = Field(150.0, ge=60.0, le=220.0, description="Maximum heart rate achieved", example=160.0)
    exang: int = Field(0, ge=0, le=1, description="Exercise induced angina (1: yes, 0: no)", example=0)
    oldpeak: float = Field(1.0, ge=0.0, le=10.0, description="ST depression induced by exercise relative to rest", example=1.2)
    slope: int = Field(1, ge=0, le=2, description="Slope of the peak exercise ST segment", example=1)
    ca: float = Field(0.0, ge=0.0, le=4.0, description="Number of major vessels colored by flourosopy", example=0.0)
    thal: float = Field(2.0, ge=0.0, le=3.0, description="Thallium stress test result", example=2.0)

@router.get("/analytics")
def get_healthcare_analytics():
    report_file = os.path.join(REPORTS_DIR, "healthcare_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Healthcare research model has not been trained yet.")
    with open(report_file, "r") as f:
        data = json.load(f)
    return data

@router.post("/research-predict")
def estimate_research_risk(req: HealthResearchRequest, db: Session = Depends(get_db)):
    model_path = os.path.join(MODELS_DIR, "healthcare_model.joblib")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Healthcare research model is not ready.")

    artifact = joblib.load(model_path)
    model = artifact["model"]
    feature_cols = artifact["feature_cols"]
    explainer = artifact["explainer"]

    start_time = time.time()
    df_row = pd.DataFrame([req.dict()])[feature_cols]

    prob_risk = float(model.predict_proba(df_row)[0][1])

    # Model confidence & uncertainty assessment
    uncertainty_margin = round(abs(prob_risk - 0.5) * 2, 2)  # Distance from decision boundary
    confidence_level = "HIGH_CONFIDENCE" if uncertainty_margin >= 0.6 else "MODERATE_CONFIDENCE" if uncertainty_margin >= 0.3 else "BORDERLINE_UNCERTAINTY"

    # SHAP local feature attributions
    shap_values = explainer.shap_values(df_row)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]
    else:
        shap_vals = shap_values[0]

    shap_dict = {f: round(float(v), 4) for f, v in zip(feature_cols, shap_vals)}
    sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    top_drivers = [
        {"feature": k, "attribution": v, "impact": "elevates_statistical_risk" if v > 0 else "lowers_statistical_risk"}
        for k, v in sorted_features
    ]

    latency_ms = round((time.time() - start_time) * 1000, 2)

    # Persist in DB
    prediction_record = Prediction(
        module_type="healthcare",
        input_data=json.dumps(req.dict()),
        prediction_result=json.dumps({
            "statistical_risk_score": prob_risk,
            "confidence_level": confidence_level
        }),
        prediction_value=prob_risk,
        risk_score=prob_risk,
        latency_ms=latency_ms
    )
    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)

    expl = PredictionExplanation(
        prediction_id=prediction_record.id,
        method="SHAP",
        base_value=float(explainer.expected_value) if hasattr(explainer, "expected_value") and not isinstance(explainer.expected_value, (list, np.ndarray)) else 0.0,
        feature_attributions=json.dumps(shap_dict),
        top_positive_features=json.dumps([d for d in top_drivers if d["impact"] == "elevates_statistical_risk"]),
        top_negative_features=json.dumps([d for d in top_drivers if d["impact"] == "lowers_statistical_risk"]),
        natural_language_summary=f"Statistical cohort model estimated risk at {prob_risk:.1%}. Primary contributory variables: {', '.join([d['feature'] for d in top_drivers[:3]])}."
    )
    db.add(expl)
    db.commit()

    return {
        "prediction_id": prediction_record.id,
        "statistical_risk_estimate": round(prob_risk, 4),
        "confidence_level": confidence_level,
        "uncertainty_margin": uncertainty_margin,
        "top_contributory_features": top_drivers,
        "latency_ms": latency_ms,
        "mandatory_disclaimer": "FOR RESEARCH & EDUCATIONAL DEMONSTRATION ONLY. This output is a statistical prediction generated by an academic ML model trained on the historical UCI Cleveland cohort. It is NOT a clinical diagnosis, should not be used as medical advice, and does not replace professional medical evaluation."
    }
