import json
import threading
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.database.session import SessionLocal
from backend.app.models.experiment import TrainingJob
from agents.graph.workflow import autods_graph

def run_autods_pipeline_background(job_id: str, dataset_path: str, target_column: str, task_type: str):
    """Executes the AutoDS LangGraph workflow asynchronously in a worker thread."""
    def worker():
        db = SessionLocal()
        try:
            job = db.query(TrainingJob).filter(TrainingJob.job_id == job_id).first()
            if not job:
                return

            job.status = "running"
            job.progress_pct = 15
            job.status_message = "Inspecting dataset schema and computing statistics..."
            db.commit()

            initial_state = {
                "dataset_path": dataset_path,
                "target_column": target_column,
                "task_type": task_type,
                "user_approval_granted": True,
                "status": "started"
            }

            job.progress_pct = 40
            job.status_message = "Executing Exploratory Data Analysis & Feature Engineering..."
            db.commit()

            # Execute LangGraph
            output_state = autods_graph.invoke(initial_state)

            if output_state.get("status") == "failed" or output_state.get("error_message"):
                job.status = "failed"
                job.error_message = output_state.get("error_message", "Execution error in AutoDS graph.")
                job.status_message = f"Failed: {job.error_message}"
                job.result_summary = json.dumps(output_state.get("final_report", {"error": job.error_message}))
                db.commit()
                return

            job.progress_pct = 80
            job.status_message = "Evaluating baseline vs candidate ML models & generating SHAP importances..."
            db.commit()

            final_report = output_state.get("final_report", {})
            job.status = "completed"
            job.progress_pct = 100
            job.status_message = "Completed AutoDS training and report synthesis."
            job.result_summary = json.dumps(final_report)
            db.commit()

        except Exception as e:
            if 'job' in locals() and job:
                job.status = "failed"
                job.error_message = f"Pipeline execution failed: {str(e)}"
                db.commit()
        finally:
            db.close()

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
