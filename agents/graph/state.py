from typing import TypedDict, List, Dict, Any, Optional

class AutoDSState(TypedDict):
    dataset_path: str
    target_column: Optional[str]
    task_type: Optional[str]
    user_approval_granted: bool
    
    # Inspection & EDA results
    inspection_results: Optional[Dict[str, Any]]
    cleaning_plan: Optional[Dict[str, Any]]
    eda_summary: Optional[Dict[str, Any]]
    feature_plan: Optional[Dict[str, Any]]
    
    # Model evaluation
    model_candidates: Optional[List[str]]
    evaluation_results: Optional[Dict[str, Any]]
    explainability: Optional[Dict[str, Any]]
    
    # Final synthesized report
    final_report: Optional[Dict[str, Any]]
    status: str
    error_message: Optional[str]
