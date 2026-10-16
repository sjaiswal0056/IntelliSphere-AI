import os
import json
import joblib
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.api.deps import get_current_user
from ml.retail.inventory import calculate_inventory_policy

router = APIRouter(prefix="/retail", tags=["Retail Intelligence"])

REPORTS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "reports")
MODELS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "models")

class ForecastRequest(BaseModel):
    horizon_days: int = Field(28, ge=7, le=28, description="Multi-horizon forecast window in days (7, 14, or 28)")
    scope: Optional[str] = Field("all_store_demand", description="Forecasting scope: aggregate daily sales across all products and stores")

class InventoryRequest(BaseModel):
    daily_demand_mean: float = Field(24.5, ge=1.0)
    daily_demand_std: float = Field(7.2, ge=0.1)
    lead_time_days: int = Field(7, ge=1, le=60)
    current_stock: int = Field(120, ge=0)
    unit_cost: float = Field(35.0, ge=0.01)
    holding_cost_rate: float = Field(0.20, ge=0.01, le=1.0)
    service_level: float = Field(0.95, ge=0.80, le=0.99)

@router.post("/forecast")
def get_sales_forecast(req: ForecastRequest):
    report_file = os.path.join(REPORTS_DIR, "retail_forecast_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Forecasting model has not been trained yet.")
    
    with open(report_file, "r") as f:
        data = json.load(f)
    
    # Slice requested multi-step horizon
    data["future_forecast"] = data["future_forecast"][:req.horizon_days]
    data["requested_horizon_days"] = req.horizon_days
    data["scope"] = "Aggregate Store-Wide Demand (UCI Online Retail II)"
    return data

@router.get("/segments")
def get_customer_segments():
    report_file = os.path.join(REPORTS_DIR, "retail_segmentation_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Customer segmentation model has not been trained yet.")
    
    with open(report_file, "r") as f:
        data = json.load(f)
    return data

@router.get("/repeat-purchase")
def get_repeat_purchase_analytics():
    report_file = os.path.join(REPORTS_DIR, "retail_repeat_purchase_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Repeat purchase model has not been trained yet.")
    
    with open(report_file, "r") as f:
        data = json.load(f)
    return data

@router.post("/inventory")
def run_inventory_simulation(req: InventoryRequest):
    result = calculate_inventory_policy(
        daily_demand_mean=req.daily_demand_mean,
        daily_demand_std=req.daily_demand_std,
        lead_time_days=req.lead_time_days,
        current_stock=req.current_stock,
        unit_cost=req.unit_cost,
        holding_cost_rate=req.holding_cost_rate,
        service_level=req.service_level
    )
    return result
