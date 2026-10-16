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

router = APIRouter(prefix="/maintenance", tags=["Industrial Predictive Maintenance"])

REPORTS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "reports")
MODELS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "models")

class MachineSensorRequest(BaseModel):
    machine_type: str = Field("M", example="M", description="Machine product type: L, M, or H")
    air_temp_k: float = Field(300.0, ge=250.0, le=350.0, example=300.5)
    process_temp_k: float = Field(310.0, ge=250.0, le=380.0, example=310.8)
    rotational_speed_rpm: float = Field(1500.0, ge=500.0, le=3500.0, example=1450.0)
    torque_nm: float = Field(40.0, ge=1.0, le=100.0, example=45.0)
    tool_wear_min: float = Field(100.0, ge=0.0, le=300.0, example=120.0)
    threshold: float = Field(0.50, ge=0.1, le=0.99)

@router.get("/analytics")
def get_maintenance_analytics():
    report_file = os.path.join(REPORTS_DIR, "maintenance_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Maintenance models have not been trained yet.")
    with open(report_file, "r") as f:
        data = json.load(f)
    return data

@router.post("/predict")
def predict_equipment_failure(req: MachineSensorRequest, db: Session = Depends(get_db)):
    model_path = os.path.join(MODELS_DIR, "maintenance_model.joblib")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Maintenance model artifact is not ready.")

    artifact = joblib.load(model_path)
    model = artifact["model"]
    feature_cols = artifact["feature_cols"]
    explainer = artifact["explainer"]

    start_time = time.time()

    type_map = {"L": 0, "M": 1, "H": 2}
    type_enc = type_map.get(req.machine_type.upper(), 1)
    temp_diff = req.process_temp_k - req.air_temp_k
    mech_power = (2 * np.pi * req.rotational_speed_rpm * req.torque_nm) / 60.0
    overstrain = req.tool_wear_min * req.torque_nm
    torque_speed_ratio = req.torque_nm / (req.rotational_speed_rpm + 1e-5)

    input_dict = {
        "Type_encoded": type_enc,
        "Air_temperature_K": req.air_temp_k,
        "Process_temperature_K": req.process_temp_k,
        "Rotational_speed_rpm": req.rotational_speed_rpm,
        "Torque_Nm": req.torque_nm,
        "Tool_wear_min": req.tool_wear_min,
        "Temp_Difference": temp_diff,
        "Mechanical_Power": mech_power,
        "Overstrain_Index": overstrain,
        "Torque_Speed_Ratio": torque_speed_ratio
    }

    df_row = pd.DataFrame([input_dict])[feature_cols]

    prob_failure = float(model.predict_proba(df_row)[0][1])
    is_failure_risk = bool(prob_failure >= req.threshold)

    # Determine status
    if prob_failure >= 0.70:
        health_status = "CRITICAL_MAINTENANCE_REQUIRED"
    elif prob_failure >= req.threshold:
        health_status = "WARNING_INSPECTION_RECOMMENDED"
    elif prob_failure >= 0.20:
        health_status = "ELEVATED_MONITORING"
    else:
        health_status = "OPTIMAL_OPERATING_CONDITION"

    # SHAP local feature attributions
    shap_values = explainer.shap_values(df_row)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]
    else:
        shap_vals = shap_values[0]

    shap_dict = {f: round(float(v), 4) for f, v in zip(feature_cols, shap_vals)}
    sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5]

    top_drivers = [
        {"feature": k, "attribution": v, "impact": "increases_failure_risk" if v > 0 else "promotes_stability"}
        for k, v in sorted_features
    ]

    latency_ms = round((time.time() - start_time) * 1000, 2)

    # Persist in DB
    prediction_record = Prediction(
        module_type="maintenance",
        input_data=json.dumps(req.dict()),
        prediction_result=json.dumps({
            "failure_probability": prob_failure,
            "status": health_status,
            "is_failure_risk": is_failure_risk
        }),
        prediction_value=prob_failure,
        risk_score=prob_failure,
        is_anomaly=is_failure_risk,
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
        top_positive_features=json.dumps([d for d in top_drivers if d["impact"] == "increases_failure_risk"]),
        top_negative_features=json.dumps([d for d in top_drivers if d["impact"] == "promotes_stability"]),
        natural_language_summary=f"Machine health assessed with a failure risk score of {prob_failure:.1%}. Primary physical contributors: {', '.join([d['feature'] for d in top_drivers[:3]])}."
    )
    db.add(expl)

    if is_failure_risk:
        alert = AnomalyAlert(
            module_type="maintenance",
            severity="critical" if health_status == "CRITICAL_MAINTENANCE_REQUIRED" else "high",
            title=f"Equipment Wear Alert - Risk {prob_failure*100:.1f}%",
            message=f"Machine type {req.machine_type} operating parameters exceeded threshold with power {mech_power:.1f}W and tool wear {req.tool_wear_min:.0f} min.",
            entity_id=f"machine_{req.machine_type}",
            entity_type="equipment",
            score=prob_failure
        )
        db.add(alert)

    db.commit()

    return {
        "prediction_id": prediction_record.id,
        "failure_probability": round(prob_failure, 4),
        "health_status": health_status,
        "is_failure_risk": is_failure_risk,
        "threshold": req.threshold,
        "physical_telemetry": {
            "temp_gradient_k": round(temp_diff, 2),
            "mechanical_power_watts": round(mech_power, 1),
            "overstrain_index": round(overstrain, 1)
        },
        "top_drivers": top_drivers,
        "latency_ms": latency_ms,
        "scientific_disclaimer": "The AI4I 2020 dataset benchmark evaluates instantaneous sensor failure likelihood. It does not provide continuous run-to-failure histories required for remaining useful life (RUL) estimation."
    }
