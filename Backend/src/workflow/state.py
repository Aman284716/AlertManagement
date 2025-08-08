# src/workflow/state.py
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from src.data.models import OutcomeType

class AlertInvestigationState(BaseModel):
    """The full state for the alert investigation workflow."""
    # Core fields
    alert_id: str
    current_agent: str
    
    # State fields (now without Annotated)
    context_data: Dict[str, Any] = {}
    agent_outputs: Dict[str, Any] = {}
    risk_factors: List[str] = []
    queries_executed: List[str] = []
    evidence_collected: Dict[str, Any] = {}
    
    # Investigation status and outcome
    confidence_score: float = 0.0
    loop_count: int = 0
    max_loops: int = 3
    final_decision: Optional[str] = None
    investigation_summary: Optional[str] = None
    outcome_type: Optional[OutcomeType] = None
    is_suspicious: Optional[bool] = False