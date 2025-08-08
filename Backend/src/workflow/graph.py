from langgraph.graph import StateGraph, END, START
from src.workflow.state import AlertInvestigationState
from typing import Dict, Any

def create_investigation_workflow(agents: Dict[str, Any]) -> StateGraph:
    """Create the investigation workflow graph."""
    workflow = StateGraph(AlertInvestigationState)

    workflow.add_node("ingestion", agents['ingestion'].execute)
    workflow.add_node("pattern", agents['pattern'].execute)
    workflow.add_node("explanation", agents['explanation'].execute)
    workflow.add_node("risk", agents['risk'].execute)

    workflow.add_edge(START, "ingestion")
    workflow.add_edge("ingestion", "pattern")

    workflow.add_conditional_edges(
        "pattern",
        should_continue_from_pattern,
        {"continue": "explanation", "loop_back": "ingestion"}
    )
    
    workflow.add_edge("explanation", "risk")
    
    workflow.add_conditional_edges(
        "risk",
        should_finalize_or_loop,
        {"finalize": END, "loop_back": "ingestion"}
    )
    
    return workflow.compile()

def should_continue_from_pattern(state: AlertInvestigationState) -> str:
    """Determine the next step after pattern analysis based on confidence.""" 
    patterns = state.agent_outputs.get('PatternRecognitionAgent', {})
    confidence = patterns.get('overall_confidence', 0)
    
    if confidence >= 0.7 or state.loop_count >= state.max_loops:
        return "continue"
    return "loop_back"

def should_finalize_or_loop(state: AlertInvestigationState) -> str:
    """Final decision point for the workflow.""" 
    risk_output = state.agent_outputs.get('RiskAssessmentAgent', {})
    final_decision = state.final_decision
    
    if final_decision == 'INVESTIGATE_FURTHER' and state.loop_count < state.max_loops:
        return "loop_back"
    
    return "finalize"