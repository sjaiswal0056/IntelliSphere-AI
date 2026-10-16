import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    module_type = Column(String(50), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    mlflow_run_id = Column(String(255), nullable=True)
    status = Column(String(50), default="started", nullable=False)  # started, completed, failed
    metrics = Column(Text, nullable=True)       # JSON string
    parameters = Column(Text, nullable=True)    # JSON string
    best_model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    # Relationships
    dataset = relationship("Dataset", back_populates="experiments")

class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, default=lambda: str(uuid.uuid4()), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    target_column = Column(String(255), nullable=False)
    task_type = Column(String(50), nullable=False)  # regression, classification, clustering, forecasting
    status = Column(String(50), default="pending", nullable=False)  # pending, running, completed, failed
    progress_pct = Column(Integer, default=0, nullable=False)
    status_message = Column(String(255), default="Job queued", nullable=False)
    result_summary = Column(Text, nullable=True)   # JSON string of training results & comparisons
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="training_jobs")
    dataset = relationship("Dataset", back_populates="training_jobs")
