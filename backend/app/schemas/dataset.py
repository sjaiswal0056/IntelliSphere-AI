from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

class DatasetColumnSchema(BaseModel):
    column_name: str
    data_type: str
    inferred_type: str
    is_nullable: bool
    is_target_candidate: bool

class DatasetProfileSchema(BaseModel):
    missing_cells: int
    missing_percentage: float
    duplicate_rows: int
    memory_usage_bytes: int
    quality_score: float
    summary_statistics: Optional[Dict[str, Any]] = None
    correlations: Optional[Dict[str, Any]] = None
    profile_metadata: Optional[Dict[str, Any]] = None

class DatasetListItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    filename: str
    row_count: int
    column_count: int
    format: str
    source_type: str
    is_sample: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DatasetDetailResponse(DatasetListItem):
    file_size_bytes: int
    schemas: List[DatasetColumnSchema] = []
    profile: Optional[DatasetProfileSchema] = None
    preview: Optional[List[Dict[str, Any]]] = None
