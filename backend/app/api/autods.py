import os
import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.models.dataset import Dataset
from backend.app.models.experiment import TrainingJob
from backend.app.models.user import User
from backend.app.api.deps import get_current_user
from agents.tools.data_tools import inspect_dataset_deterministic
from backend.app.services.autods_service import run_autods_pipeline_background
from agents.guardrails.security import validate_safe_file_path

router = APIRouter(prefix="/autods", tags=["Autonomous AI Data Scientist"])

class AnalyzeDatasetRequest(BaseModel):
    dataset_id: int

class StartTrainingRequest(BaseModel):
    dataset_id: int
    target_column: str
    task_type: str = Field("classification", pattern="^(classification|regression)$")
    user_approval_granted: bool = Field(..., description="Explicit user confirmation to start training models.")

@router.post("/analyze")
def analyze_dataset(req: AnalyzeDatasetRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id and not dataset.is_sample and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to dataset")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset source file is missing from storage.")

    try:
        inspection = inspect_dataset_deterministic(dataset.file_path)
        return {
            "dataset_id": dataset.id,
            "name": dataset.name,
            "row_count": inspection["row_count"],
            "col_count": inspection["col_count"],
            "missing_cells": inspection["missing_cells"],
            "missing_percentage": inspection["missing_percentage"],
            "duplicate_rows": inspection["duplicate_rows"],
            "columns": inspection["columns"],
            "target_candidates": inspection["target_candidates"],
            "recommended_preprocessing": [
                {"step": "Missing Imputation", "method": "Median for numeric, Mode for categorical"},
                {"step": "Outlier Treatment", "method": "Robust standardization via StandardScaler"},
                {"step": "Categorical Encoding", "method": "One-Hot Encoding for low cardinality categories"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/train", status_code=status.HTTP_202_ACCEPTED)
def start_model_training(req: StartTrainingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not req.user_approval_granted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Training cannot proceed without explicit user approval."
        )

    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id and not dataset.is_sample and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to dataset")

    job_id = str(uuid.uuid4())
    job = TrainingJob(
        job_id=job_id,
        user_id=current_user.id,
        dataset_id=dataset.id,
        target_column=req.target_column,
        task_type=req.task_type,
        status="pending",
        progress_pct=5,
        status_message="Training job scheduled in autonomous engine."
    )
    db.add(job)
    db.commit()

    # Launch background worker
    run_autods_pipeline_background(
        job_id=job_id,
        dataset_path=dataset.file_path,
        target_column=req.target_column,
        task_type=req.task_type
    )

    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Autonomous Data Scientist training job initiated.",
        "poll_url": f"/api/autods/jobs/{job_id}"
    }

@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jobs = db.query(TrainingJob).order_by(TrainingJob.created_at.desc()).limit(50).all()
    return [
        {
            "id": j.id,
            "job_id": j.job_id,
            "target_column": j.target_column,
            "task_type": j.task_type,
            "status": j.status,
            "progress_pct": j.progress_pct,
            "status_message": j.status_message,
            "created_at": j.created_at.isoformat()
        } for j in jobs
    ]

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return {
        "job_id": job.job_id,
        "status": job.status,
        "progress_pct": job.progress_pct,
        "status_message": job.status_message,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat()
    }

@router.get("/results/{job_id}")
def get_job_results(job_id: str, db: Session = Depends(get_db)):
    job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    if job.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet. Current status: {job.status} ({job.progress_pct}%)"
        )
    return json.loads(job.result_summary) if job.result_summary else {}
