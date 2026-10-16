import os
import json
import uuid
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from backend.app.core.config import settings
from backend.app.models.dataset import Dataset, DatasetSchema, DatasetProfile
from backend.app.models.user import User

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".parquet"}

def infer_column_kind(series: pd.Series) -> str:
    """Infer high-level column role for ML."""
    if pd.api.types.is_numeric_dtype(series):
        if series.nunique() <= 2 and set(series.dropna().unique()).issubset({0, 1, 0.0, 1.0}):
            return "boolean"
        return "numeric"
    elif pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    elif pd.api.types.is_bool_dtype(series):
        return "boolean"
    else:
        # Check if date string
        sample_non_null = series.dropna().astype(str).head(20)
        try:
            pd.to_datetime(sample_non_null, errors="raise")
            return "datetime"
        except Exception:
            pass
        if series.nunique() < 50:
            return "categorical"
        return "text"

def profile_dataframe(df: pd.DataFrame) -> Tuple[Dict[str, Any], Dict[str, Any], List[Dict[str, Any]]]:
    """Calculate summary stats, correlation matrix, and column schemas."""
    total_cells = df.size
    missing_cells = int(df.isna().sum().sum())
    missing_pct = float((missing_cells / total_cells * 100) if total_cells > 0 else 0)
    duplicate_rows = int(df.duplicated().sum())
    memory_bytes = int(df.memory_usage(deep=True).sum())

    # Summary Statistics
    summary_stats = {}
    for col in df.columns:
        s = df[col]
        col_type = infer_column_kind(s)
        col_summary: Dict[str, Any] = {
            "type": col_type,
            "non_null_count": int(s.count()),
            "null_count": int(s.isna().sum()),
            "null_percentage": float(round((s.isna().sum() / len(df) * 100), 2)) if len(df) > 0 else 0,
            "unique_count": int(s.nunique()),
        }
        if col_type == "numeric":
            valid = s.dropna()
            if len(valid) > 0:
                col_summary.update({
                    "mean": float(valid.mean()),
                    "std": float(valid.std()) if len(valid) > 1 else 0.0,
                    "min": float(valid.min()),
                    "q25": float(valid.quantile(0.25)),
                    "median": float(valid.median()),
                    "q75": float(valid.quantile(0.75)),
                    "max": float(valid.max()),
                    "skewness": float(valid.skew()) if len(valid) > 2 else 0.0
                })
        elif col_type in ("categorical", "text", "boolean"):
            valid = s.dropna()
            if len(valid) > 0:
                val_counts = valid.value_counts().head(5).to_dict()
                col_summary["top_values"] = {str(k): int(v) for k, v in val_counts.items()}
        summary_stats[str(col)] = col_summary

    # Correlation matrix for numeric columns
    numeric_df = df.select_dtypes(include=[np.number])
    correlations: Dict[str, Any] = {}
    if numeric_df.shape[1] > 1:
        corr_matrix = numeric_df.corr().fillna(0.0)
        correlations = corr_matrix.round(4).to_dict()

    # Column Schemas
    schemas = []
    for col in df.columns:
        s = df[col]
        kind = infer_column_kind(s)
        schemas.append({
            "column_name": str(col),
            "data_type": str(s.dtype),
            "inferred_type": kind,
            "is_nullable": bool(s.isna().any()),
            "is_target_candidate": bool(kind in ("numeric", "boolean", "categorical") and s.nunique() >= 2)
        })

    # Overall Data Quality Score (0 - 100)
    dup_pct = (duplicate_rows / len(df) * 100) if len(df) > 0 else 0
    quality_score = max(0.0, min(100.0, 100.0 - (missing_pct * 0.4) - (dup_pct * 0.6)))

    profile_data = {
        "missing_cells": missing_cells,
        "missing_percentage": round(missing_pct, 2),
        "duplicate_rows": duplicate_rows,
        "memory_usage_bytes": memory_bytes,
        "quality_score": round(quality_score, 1),
        "summary_statistics": summary_stats,
        "correlations": correlations
    }
    return profile_data, summary_stats, schemas

def save_and_profile_dataset(
    db: Session,
    user: User,
    file_path: str,
    name: str,
    source_type: str = "custom",
    description: str = "",
    is_sample: bool = False
) -> Dataset:
    """Read file from path, generate schema & profile, save to DB."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(file_path, low_memory=False)
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(file_path)
    elif ext == ".parquet":
        df = pd.read_parquet(file_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")

    row_count = len(df)
    column_count = len(df.columns)
    file_size_bytes = os.path.getsize(file_path)

    profile_dict, summary_stats, schemas_list = profile_dataframe(df)

    # Preview rows
    preview_records = df.head(50).replace({np.nan: None}).to_dict(orient="records")

    dataset = Dataset(
        name=name,
        description=description,
        filename=os.path.basename(file_path),
        file_path=file_path,
        file_size_bytes=file_size_bytes,
        row_count=row_count,
        column_count=column_count,
        format=ext.replace(".", ""),
        source_type=source_type,
        is_sample=is_sample,
        owner_id=user.id
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Save Schemas
    for s in schemas_list:
        schema_obj = DatasetSchema(
            dataset_id=dataset.id,
            column_name=s["column_name"],
            data_type=s["data_type"],
            inferred_type=s["inferred_type"],
            is_nullable=s["is_nullable"],
            is_target_candidate=s["is_target_candidate"]
        )
        db.add(schema_obj)

    # Save Profile
    profile_obj = DatasetProfile(
        dataset_id=dataset.id,
        missing_cells=profile_dict["missing_cells"],
        missing_percentage=profile_dict["missing_percentage"],
        duplicate_rows=profile_dict["duplicate_rows"],
        memory_usage_bytes=profile_dict["memory_usage_bytes"],
        quality_score=profile_dict["quality_score"],
        summary_statistics=json.dumps(profile_dict["summary_statistics"]),
        correlations=json.dumps(profile_dict["correlations"]),
        profile_metadata=json.dumps({"preview": preview_records})
    )
    db.add(profile_obj)
    db.commit()
    db.refresh(dataset)
    return dataset
