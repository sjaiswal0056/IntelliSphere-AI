"""
IntelliSphere AI — Deterministic Data Science Calculation Tools
Provides guaranteed-accurate numerical calculations for dataset analysis,
schema detection, and statistical profiling.
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

def inspect_dataset_deterministic(file_path: str) -> Dict[str, Any]:
    """Inspects a dataset file and computes schema, nulls, duplicates, and memory usage."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(file_path, low_memory=False)
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
    else:
        df = pd.read_parquet(file_path)

    row_count, col_count = df.shape
    total_cells = df.size
    missing_cells = int(df.isna().sum().sum())
    missing_pct = float(round((missing_cells / total_cells * 100), 2)) if total_cells > 0 else 0.0
    duplicates = int(df.duplicated().sum())

    columns_info = []
    numeric_cols = []
    categorical_cols = []

    for col in df.columns:
        s = df[col]
        dtype_str = str(s.dtype)
        is_num = pd.api.types.is_numeric_dtype(s)
        nunique = int(s.nunique())
        null_count = int(s.isna().sum())

        if is_num:
            numeric_cols.append(col)
            inferred = "boolean" if nunique <= 2 else "numeric"
        elif pd.api.types.is_datetime64_any_dtype(s):
            inferred = "datetime"
        elif nunique < 50:
            categorical_cols.append(col)
            inferred = "categorical"
        else:
            inferred = "text"

        columns_info.append({
            "name": str(col),
            "dtype": dtype_str,
            "inferred_type": inferred,
            "null_count": null_count,
            "null_pct": round(float(null_count / row_count * 100), 2) if row_count > 0 else 0.0,
            "unique_count": nunique
        })

    # Suggest plausible prediction targets
    target_candidates = []
    for c in columns_info:
        if c["null_pct"] < 30.0 and c["unique_count"] >= 2:
            if c["inferred_type"] in ["numeric", "categorical", "boolean"]:
                task_type = "classification" if (c["unique_count"] <= 20 or c["inferred_type"] == "boolean") else "regression"
                target_candidates.append({
                    "column": c["name"],
                    "suggested_task": task_type,
                    "unique_values": c["unique_count"],
                    "rationale": f"High quality column with {c['unique_count']} distinct values and low missingness."
                })

    return {
        "row_count": row_count,
        "col_count": col_count,
        "missing_cells": missing_cells,
        "missing_percentage": missing_pct,
        "duplicate_rows": duplicates,
        "columns": columns_info,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "target_candidates": target_candidates[:6]
    }

def compute_eda_summary(file_path: str, max_cols: int = 15) -> Dict[str, Any]:
    """Generates numerical summary stats and correlation matrix deterministically."""
    ext = os.path.splitext(file_path)[1].lower()
    df = pd.read_csv(file_path, low_memory=False) if ext == ".csv" else pd.read_excel(file_path)

    numeric_df = df.select_dtypes(include=[np.number])
    stats_dict = {}
    for col in numeric_df.columns[:max_cols]:
        s = numeric_df[col].dropna()
        if len(s) > 0:
            stats_dict[col] = {
                "mean": round(float(s.mean()), 2),
                "std": round(float(s.std()), 2) if len(s) > 1 else 0.0,
                "min": round(float(s.min()), 2),
                "q25": round(float(s.quantile(0.25)), 2),
                "median": round(float(s.median()), 2),
                "q75": round(float(s.quantile(0.75)), 2),
                "max": round(float(s.max()), 2),
                "skewness": round(float(s.skew()), 2) if len(s) > 2 else 0.0
            }

    correlations = {}
    if numeric_df.shape[1] > 1:
        corr_matrix = numeric_df.iloc[:, :max_cols].corr().fillna(0.0)
        correlations = corr_matrix.round(3).to_dict()

    return {
        "descriptive_statistics": stats_dict,
        "correlations": correlations
    }
