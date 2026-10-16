"""
IntelliSphere AI — LangGraph Workflow Builder for Autonomous Data Scientist
Orchestrates multi-agent execution pipeline.
"""

from langgraph.graph import StateGraph, END
from agents.graph.state import AutoDSState
from agents.graph.nodes import (
    inspect_dataset_node,
    clean_data_planner_node,
    eda_node,
    feature_engineering_node,
    model_selection_node,
    train_and_evaluate_node,
    explainability_node,
    reporting_node,
    error_handler_node
)

def check_pipeline_health(state: AutoDSState) -> str:
    """Evaluates whether the current pipeline stage succeeded or encountered a terminal failure."""
    if state.get("status") == "failed" or bool(state.get("error_message")):
        return "error_handler"
    return "continue"

def build_autods_graph():
    """Builds and compiles the end-to-end AutoDS StateGraph with robust short-circuit error routing."""
    builder = StateGraph(AutoDSState)

    builder.add_node("inspect", inspect_dataset_node)
    builder.add_node("clean_planner", clean_data_planner_node)
    builder.add_node("eda", eda_node)
    builder.add_node("feature_planner", feature_engineering_node)
    builder.add_node("model_selector", model_selection_node)
    builder.add_node("trainer", train_and_evaluate_node)
    builder.add_node("explainer", explainability_node)
    builder.add_node("reporter", reporting_node)
    builder.add_node("error_handler", error_handler_node)

    # Graph edge transitions with conditional short-circuit error branching
    builder.set_entry_point("inspect")
    builder.add_conditional_edges("inspect", check_pipeline_health, {"continue": "clean_planner", "error_handler": "error_handler"})
    builder.add_conditional_edges("clean_planner", check_pipeline_health, {"continue": "eda", "error_handler": "error_handler"})
    builder.add_conditional_edges("eda", check_pipeline_health, {"continue": "feature_planner", "error_handler": "error_handler"})
    builder.add_conditional_edges("feature_planner", check_pipeline_health, {"continue": "model_selector", "error_handler": "error_handler"})
    builder.add_conditional_edges("model_selector", check_pipeline_health, {"continue": "trainer", "error_handler": "error_handler"})
    builder.add_conditional_edges("trainer", check_pipeline_health, {"continue": "explainer", "error_handler": "error_handler"})
    builder.add_conditional_edges("explainer", check_pipeline_health, {"continue": "reporter", "error_handler": "error_handler"})

    builder.add_edge("reporter", END)
    builder.add_edge("error_handler", END)

    return builder.compile()

# Precompiled instance
autods_graph = build_autods_graph()
