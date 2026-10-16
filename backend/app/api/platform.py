from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.session import get_db
from backend.app.models import (
    Dataset, MLModel, ModelVersion, Experiment,
    Prediction, AnomalyAlert, TrainingJob
)
from backend.app.api.deps import get_current_user

router = APIRouter(tags=["Platform & Overview"])

@router.get("/overview/metrics")
def get_overview_metrics(db: Session = Depends(get_db)):
    """Summary KPI metrics for the executive overview dashboard."""
    total_datasets = db.query(func.count(Dataset.id)).scalar() or 0
    active_models = db.query(func.count(MLModel.id)).filter(MLModel.is_active == True).scalar() or 0
    total_predictions = db.query(func.count(Prediction.id)).scalar() or 0
    active_anomalies = db.query(func.count(AnomalyAlert.id)).filter(AnomalyAlert.is_resolved == False).scalar() or 0
    total_experiments = db.query(func.count(Experiment.id)).scalar() or 0

    recent_alerts = db.query(AnomalyAlert).order_by(AnomalyAlert.created_at.desc()).limit(5).all()
    recent_jobs = db.query(TrainingJob).order_by(TrainingJob.created_at.desc()).limit(5).all()

    return {
        "kpis": {
            "total_datasets": total_datasets,
            "active_models": active_models,
            "total_predictions": total_predictions,
            "detected_anomalies": active_anomalies,
            "total_experiments": total_experiments
        },
        "recent_alerts": [
            {
                "id": a.id,
                "module": a.module_type,
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "score": a.score,
                "created_at": a.created_at.isoformat()
            } for a in recent_alerts
        ],
        "recent_training_jobs": [
            {
                "id": j.id,
                "job_id": j.job_id,
                "target": j.target_column,
                "task_type": j.task_type,
                "status": j.status,
                "progress_pct": j.progress_pct,
                "created_at": j.created_at.isoformat()
            } for j in recent_jobs
        ]
    }

@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    """List all registered models across the 6 intelligence engines."""
    models = db.query(MLModel).all()
    results = []
    for m in models:
        latest_version = db.query(ModelVersion).filter(
            ModelVersion.model_id == m.id
        ).order_by(ModelVersion.created_at.desc()).first()
        
        results.append({
            "id": m.id,
            "name": m.name,
            "module_type": m.module_type,
            "task_type": m.task_type,
            "algorithm": m.algorithm,
            "description": m.description,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat(),
            "latest_version": {
                "version": latest_version.version if latest_version else "v1.0.0",
                "status": latest_version.status if latest_version else "uninitialized",
                "target_column": latest_version.target_column if latest_version else None,
                "metrics": latest_version.metrics if latest_version else None
            } if latest_version else None
        })
    return results

@router.get("/experiments")
def list_experiments(db: Session = Depends(get_db)):
    """List all tracked training experiments with parameters and metrics."""
    experiments = db.query(Experiment).order_by(Experiment.created_at.desc()).limit(50).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "module_type": e.module_type,
            "dataset_id": e.dataset_id,
            "mlflow_run_id": e.mlflow_run_id,
            "status": e.status,
            "metrics": e.metrics,
            "parameters": e.parameters,
            "created_at": e.created_at.isoformat(),
            "finished_at": e.finished_at.isoformat() if e.finished_at else None
        } for e in experiments
    ]
