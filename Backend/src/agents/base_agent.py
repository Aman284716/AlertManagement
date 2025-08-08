from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, List, Optional
import uuid
import json
from datetime import datetime

class BaseAgent(ABC):
    def __init__(self, db_manager, llm_helper, config: Dict[str, Any]):
        self.db = db_manager
        self.llm_helper = llm_helper
        self.config = config
        self.agent_name = self.__class__.__name__

    @abstractmethod
    async def execute(self, state) -> Tuple[Any, bool]:
        """Execute agent logic and return the next state and a flag to continue."""
        pass

    def log_judgement(self, alert_id: str, action: str, confidence: float,
                      rationale: Dict[str, Any], loop_iteration: int = 0,
                      queries_executed: Optional[List[str]] = None):
        """Log agent decision to the database for audit trail."""
        judgement = {
            'judgement_id': str(uuid.uuid4()),
            'alert_id': alert_id,
            'agent_name': self.agent_name,
            'action': action,
            'confidence': confidence,
            'rationale_json': json.dumps(rationale),
            'timestamp': datetime.now().isoformat(),
            'loop_iteration': loop_iteration,
            'queries_executed': json.dumps(queries_executed or [])
        }
        with self.db.get_connection() as conn:
            conn.execute("""
            INSERT INTO agent_judgements
            (judgement_id, alert_id, agent_name, action, confidence, rationale_json, timestamp, loop_iteration, queries_executed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (judgement['judgement_id'], judgement['alert_id'], judgement['agent_name'],
                  judgement['action'], judgement['confidence'], judgement['rationale_json'],
                  judgement['timestamp'], judgement['loop_iteration'], judgement['queries_executed']))
            conn.commit()
    
    def get_previous_judgements(self, alert_id: str) -> List[Dict[str, Any]]:
        """Get previous judgments for a specific alert."""
        return self.db.execute_query(
            "SELECT * FROM agent_judgements WHERE alert_id = ? ORDER BY timestamp",
            (alert_id,)
        )