import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

db_url = settings.DATABASE_URL
engine_kwargs = {}

if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    # Ensure directory exists for sqlite file
    if "///" in db_url:
        db_path = db_url.split("///")[-1]
        if not os.path.isabs(db_path):
            db_path = os.path.join(settings.BASE_DIR, db_path)
            db_url = f"sqlite:///{db_path}"
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(db_url, **engine_kwargs)

if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend.app.models import (
        user, dataset, model, experiment,
        prediction, recommendation, agent, audit
    )
    Base.metadata.create_all(bind=engine)
