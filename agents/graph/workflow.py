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
    reporting_node
)

def build_autods_graph():
    """Builds and compiles the end-to-end AutoDS StateGraph."""
    builder = StateGraph(AutoDSState)

    builder.add_node("inspect", inspect_dataset_node)
    builder.add_node("clean_planner", clean_data_planner_node)
    builder.add_node("eda", eda_node)
    builder.add_node("feature_planner", feature_engineering_node)
    builder.add_node("model_selector", model_selection_node)
    builder.add_node("trainer", train_and_evaluate_node)
    builder.add_node("explainer", explainability_node)
    builder.add_node("reporter", reporting_node)

    # Graph edge transitions
    builder.set_entry_point("inspect")
    builder.add_edge("inspect", "clean_planner")
    builder.add_edge("clean_planner", "eda")
    builder.add_edge("eda", "feature_planner")
    builder.add_edge("feature_planner", "model_selector")
    builder.add_edge("model_selector", "trainer")
    builder.add_edge("trainer", "explainer")
    builder.add_edge("explainer", "reporter")
    builder.add_edge("reporter", END)

    return builder.compile()

# Precompiled instance
autods_graph = build_autods_graph()
