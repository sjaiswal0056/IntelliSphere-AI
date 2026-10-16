from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    column_count = Column(Integer, default=0, nullable=False)
    format = Column(String(50), default="csv", nullable=False)  # csv, xlsx, parquet
    source_type = Column(String(50), default="custom", nullable=False)  # retail, fraud, maintenance, healthcare, recommendations, autods, custom
    is_sample = Column(Boolean, default=False, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="datasets")
    schemas = relationship("DatasetSchema", back_populates="dataset", cascade="all, delete-orphan")
    profile = relationship("DatasetProfile", back_populates="dataset", uselist=False, cascade="all, delete-orphan")
    experiments = relationship("Experiment", back_populates="dataset")
    training_jobs = relationship("TrainingJob", back_populates="dataset")

class DatasetSchema(Base):
    __tablename__ = "dataset_schemas"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    column_name = Column(String(255), nullable=False)
    data_type = Column(String(100), nullable=False)
    inferred_type = Column(String(50), nullable=False)  # numeric, categorical, datetime, text, boolean
    is_nullable = Column(Boolean, default=True, nullable=False)
    is_target_candidate = Column(Boolean, default=False, nullable=False)

    # Relationship
    dataset = relationship("Dataset", back_populates="schemas")

class DatasetProfile(Base):
    __tablename__ = "dataset_profiles"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    missing_cells = Column(Integer, default=0, nullable=False)
    missing_percentage = Column(Float, default=0.0, nullable=False)
    duplicate_rows = Column(Integer, default=0, nullable=False)
    memory_usage_bytes = Column(Integer, default=0, nullable=False)
    summary_statistics = Column(Text, nullable=True)  # JSON serialized
    correlations = Column(Text, nullable=True)        # JSON serialized
    quality_score = Column(Float, default=100.0, nullable=False)
    profile_metadata = Column(Text, nullable=True)    # JSON serialized preview and column profiles
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    dataset = relationship("Dataset", back_populates="profile")
