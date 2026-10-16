import os
import shutil
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.models.dataset import Dataset, DatasetSchema, DatasetProfile
from backend.app.models.user import User
from backend.app.api.deps import get_current_user
from backend.app.schemas.dataset import DatasetListItem, DatasetDetailResponse
from backend.app.services.dataset_service import save_and_profile_dataset, ALLOWED_EXTENSIONS

router = APIRouter(prefix="/datasets", tags=["Dataset Management"])

@router.post("/upload", response_model=DatasetDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    source_type: str = Form("custom"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension {ext}. Allowed: {list(ALLOWED_EXTENSIONS)}"
        )

    # Save to disk
    upload_dir = os.path.join(settings.BASE_DIR, "data", "processed")
    os.makedirs(upload_dir, exist_ok=True)
    clean_filename = f"{current_user.id}_{file.filename}"
    target_path = os.path.join(upload_dir, clean_filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check size limit
    file_size_mb = os.path.getsize(target_path) / (1024 * 1024)
    if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        os.remove(target_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        dataset = save_and_profile_dataset(
            db=db,
            user=current_user,
            file_path=target_path,
            name=name,
            source_type=source_type,
            description=description,
            is_sample=False
        )
    except Exception as e:
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse and profile dataset: {str(e)}"
        )

    return get_dataset_details(dataset.id, db, current_user)

@router.get("", response_model=List[DatasetListItem])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    datasets = db.query(Dataset).filter(
        (Dataset.owner_id == current_user.id) | (Dataset.is_sample == True)
    ).order_by(Dataset.created_at.desc()).all()
    return datasets

@router.get("/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset_details(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id and not dataset.is_sample and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized access to this dataset")

    schemas = db.query(DatasetSchema).filter(DatasetSchema.dataset_id == dataset.id).all()
    profile = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset.id).first()

    summary_stats = json.loads(profile.summary_statistics) if profile and profile.summary_statistics else {}
    correlations = json.loads(profile.correlations) if profile and profile.correlations else {}
    preview_data = []
    if profile and profile.profile_metadata:
        try:
            preview_data = json.loads(profile.profile_metadata).get("preview", [])
        except Exception:
            pass

    return {
        "id": dataset.id,
        "name": dataset.name,
        "description": dataset.description,
        "filename": dataset.filename,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "format": dataset.format,
        "source_type": dataset.source_type,
        "is_sample": dataset.is_sample,
        "created_at": dataset.created_at,
        "file_size_bytes": dataset.file_size_bytes,
        "schemas": schemas,
        "profile": {
            "missing_cells": profile.missing_cells if profile else 0,
            "missing_percentage": profile.missing_percentage if profile else 0.0,
            "duplicate_rows": profile.duplicate_rows if profile else 0,
            "memory_usage_bytes": profile.memory_usage_bytes if profile else 0,
            "quality_score": profile.quality_score if profile else 100.0,
            "summary_statistics": summary_stats,
            "correlations": correlations,
            "profile_metadata": {}
        } if profile else None,
        "preview": preview_data
    }

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized to delete this dataset")

    if os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except Exception:
            pass

    db.delete(dataset)
    db.commit()
    return None
