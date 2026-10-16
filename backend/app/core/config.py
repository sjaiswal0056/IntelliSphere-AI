import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelliSphere AI — Unified Predictive Intelligence Platform"
    TAGLINE: str = "One Platform. Multiple Intelligence Engines. Smarter Decisions."
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Security & Auth
    SECRET_KEY: str = "intellisphere-ai-super-secret-production-grade-jwt-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = "sqlite:///./data/intellisphere.db"

    # MLOps
    MLFLOW_TRACKING_URI: str = "sqlite:///./data/mlflow.db"
    MLFLOW_EXPERIMENT_NAME: str = "IntelliSphere-Unified-Platform"

    # GenAI
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    MAX_LLM_TOKENS: int = 4096
    TEMPERATURE: float = 0.2

    # Storage & Limits
    MAX_UPLOAD_SIZE_MB: int = 50
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
