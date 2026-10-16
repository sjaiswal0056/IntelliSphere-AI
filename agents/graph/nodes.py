"""
IntelliSphere AI — Autonomous Data Scientist Graph Nodes
Implements deterministic, tool-driven reasoning nodes for each stage of the data science lifecycle.
"""

from typing import Dict, Any
from agents.graph.state import AutoDSState
from agents.tools.data_tools import inspect_dataset_deterministic, compute_eda_summary
from agents.tools.ml_tools import train_and_evaluate_autods_models

def inspect_dataset_node(state: AutoDSState) -> Dict[str, Any]:
    try:
        results = inspect_dataset_deterministic(state["dataset_path"])
        suggested_target = results["target_candidates"][0]["column"] if results["target_candidates"] else None
        suggested_task = results["target_candidates"][0]["suggested_task"] if results["target_candidates"] else "classification"
        
        return {
            "inspection_results": results,
            "target_column": state.get("target_column") or suggested_target,
            "task_type": state.get("task_type") or suggested_task,
            "status": "inspected"
        }
    except Exception as e:
        return {"status": "failed", "error_message": f"Inspection failed: {str(e)}"}

def error_handler_node(state: AutoDSState) -> Dict[str, Any]:
    """Captures failure at any stage, stops downstream execution, and formats a diagnostic report."""
    err = state.get("error_message", "AutoDS pipeline execution failed.")
    return {
        "status": "failed",
        "error_message": err,
        "final_report": {
            "status": "failed",
            "error_message": err,
            "failed_stage": state.get("status", "failed"),
            "target_column": state.get("target_column"),
            "inspection": state.get("inspection_results", {}),
            "eda": state.get("eda_summary", {})
        }
    }

def clean_data_planner_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return state

    insp = state.get("inspection_results", {})
    plan = {
        "missing_strategy": "Impute numeric columns with median; impute categorical columns with mode.",
        "duplicates_strategy": f"Remove {insp.get('duplicate_rows', 0)} exact duplicate rows.",
        "target_strategy": f"Drop records with missing values in target column '{state.get('target_column')}'.",
        "data_quality_assessment": "High" if insp.get("missing_percentage", 0) < 5.0 else "Medium"
    }
    return {"cleaning_plan": plan}

def eda_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return state

    try:
        summary = compute_eda_summary(state["dataset_path"])
        insp = state.get("inspection_results", {})
        num_cols = insp.get("numeric_columns", [])
        
        recommended_charts = []
        if len(num_cols) >= 1:
            recommended_charts.append({
                "type": "histogram",
                "column": num_cols[0],
                "title": f"Distribution Analysis of {num_cols[0]}"
            })
        if len(num_cols) >= 2:
            recommended_charts.append({
                "type": "scatter",
                "x": num_cols[0],
                "y": num_cols[1],
                "title": f"Bivariate Interaction: {num_cols[0]} vs {num_cols[1]}"
            })
        if len(num_cols) >= 3:
            recommended_charts.append({
                "type": "correlation_heatmap",
                "title": "Cross-Feature Pearson Correlation Heatmap"
            })

        summary["recommended_visualizations"] = recommended_charts
        return {"eda_summary": summary}
    except Exception as e:
        return {"status": "failed", "error_message": f"EDA failed: {str(e)}"}

def feature_engineering_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return state

    plan = {
        "numeric_transformations": ["StandardScaler (Z-Score normalization)", "Median Imputation"],
        "categorical_transformations": ["One-Hot Encoding (pd.get_dummies)", "Mode Imputation"],
        "dimensionality_policy": "Retain top informative features to preserve signal-to-noise ratio."
    }
    return {"feature_plan": plan}

def model_selection_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return state

    task = state.get("task_type", "classification")
    if task == "classification":
        candidates = ["Logistic Regression (Baseline)", "Random Forest Classifier", "LightGBM Classifier"]
    else:
        candidates = ["Ridge Regression (Baseline)", "Random Forest Regressor", "LightGBM Regressor"]
    return {"model_candidates": candidates}

def train_and_evaluate_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return state

    if not state.get("user_approval_granted", False):
        return {
            "status": "failed",
            "error_message": "Training blocked: Explicit user approval was not granted.",
            "evaluation_results": None
        }

    try:
        results = train_and_evaluate_autods_models(
            file_path=state["dataset_path"],
            target_column=state["target_column"],
            task_type=state.get("task_type", "classification")
        )
        return {
            "evaluation_results": results,
            "status": "trained"
        }
    except Exception as e:
        return {"status": "failed", "error_message": f"Training failed: {str(e)}"}

def explainability_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return state

    eval_res = state.get("evaluation_results")
    if not eval_res:
        return {"explainability": None}

    top_feats = eval_res.get("top_features", [])
    best_model = eval_res.get("best_model_selected", "Model")
    
    summary = f"The {best_model} achieved optimal performance. The top predictive drivers identified are {', '.join([f['feature'] for f in top_feats[:3]])}."
    
    return {
        "explainability": {
            "best_model": best_model,
            "top_features": top_feats,
            "narrative_explanation": summary
        }
    }

def reporting_node(state: AutoDSState) -> Dict[str, Any]:
    if state.get("status") == "failed" or state.get("error_message"):
        return error_handler_node(state)

    eval_res = state.get("evaluation_results")
    insp = state.get("inspection_results", {})
    eda = state.get("eda_summary", {})
    expl = state.get("explainability", {})

    report = {
        "executive_summary": {
            "target_column": state.get("target_column"),
            "task_type": state.get("task_type"),
            "best_model": expl.get("best_model") if expl else None,
            "dataset_rows": insp.get("row_count"),
            "dataset_columns": insp.get("col_count"),
            "status": "completed"
        },
        "inspection": insp,
        "eda": eda,
        "model_comparison": eval_res.get("models_comparison") if eval_res else [],
        "feature_importance": expl.get("top_features") if expl else [],
        "explainability_summary": expl.get("narrative_explanation") if expl else None,
        "limitations": [
            "Evaluated on held-out test splits. Real-world temporal shift may require ongoing performance monitoring.",
            "Assumes independent and identically distributed (i.i.d.) observations unless time-series mode is selected.",
            "Categorical cardinalities above 20 were omitted to prevent overfitting."
        ]
    }
    return {"final_report": report, "status": "completed"}
