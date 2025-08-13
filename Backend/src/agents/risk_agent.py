# src/agents/risk_agent.py

from typing import Dict, Any, Tuple, List
from src.agents.base_agent import BaseAgent
from src.data.models import OutcomeType
from src.workflow.state import AlertInvestigationState
import json
import uuid
from datetime import datetime

class RiskAssessmentAgent(BaseAgent):
    def __init__(self, db_manager, llm_helper, config):
        super().__init__(db_manager, llm_helper, config)
        self.risk_threshold = config.get('risk_threshold', 0.7)
        self.auto_close_threshold = config.get('auto_close_threshold', 0.3)
    
    async def execute(self, state: AlertInvestigationState) -> Dict[str, Any]:
        alert_id = state.alert_id
        print(f"[{self.agent_name}] Starting final risk assessment for alert {alert_id}.")

        print(f"[{self.agent_name}] Debug: agent_outputs keys = {list(state.agent_outputs.keys())}")

        context = state.context_data.get("alert_basic", {})
        patterns = state.agent_outputs.get("PatternRecognitionAgent", {})
        print(f"[{self.agent_name}] Debug: received patterns = {patterns!r}")
        explanation = state.agent_outputs.get("ExplanationAgent", {})

        risk_assessment = self._perform_comprehensive_risk_assessment(
            context, patterns, explanation, state
        )
        final_decision = self._make_final_decision(risk_assessment, state)

        self.log_judgement(
            alert_id=alert_id,
            action=final_decision["action"],
            confidence=risk_assessment["final_confidence"],
            rationale=risk_assessment,
            loop_iteration=state.loop_count
        )

        print(
            f"[{self.agent_name}] Final decision for alert {alert_id}: "
            f"{final_decision['action']} (Confidence: {risk_assessment['final_confidence']:.2f})"
        )

        updated_agent_outputs = state.agent_outputs.copy()
        updated_agent_outputs[self.agent_name] = risk_assessment

        result: Dict[str, Any] = {
            "agent_outputs": updated_agent_outputs,
            "final_decision": final_decision["action"],
            "outcome_type": final_decision["outcome_type"],
            "is_suspicious": final_decision["is_suspicious"],
            "investigation_summary": final_decision["summary"],
            "confidence_score": risk_assessment["final_confidence"],
            "risk_factors": risk_assessment.get("risk_factors", []),
            "loop_count": state.loop_count,
            "queries_executed": state.context_data.get("queries_executed", []),
        }

        if final_decision["action"] == "INVESTIGATE_FURTHER" and state.loop_count < state.max_loops:
            print(f"[{self.agent_name}] INVESTIGATE_FURTHER → looping back to ingestion.")
            result["context_data"] = { "need_deeper_analysis": True }
            result["loop_count"] = state.loop_count + 1
            result["success"] = False
            return result

        if result["is_suspicious"] is None:
            result["is_suspicious"] = False
        self._save_investigation_outcome(alert_id, final_decision, risk_assessment, updated_agent_outputs)
        try:
            self.db.set_review_status(alert_id, 1)
        except Exception as e:

            print(f"[{self.agent_name}] Warning: failed to set review_status=1 for {alert_id}: {e}")

        print(f"[{self.agent_name}] Investigation complete for alert {alert_id}.")
        result["success"] = True
        return result

    def _perform_comprehensive_risk_assessment(self, context: Dict[str, Any], patterns: Dict[str, Any],
                                               explanation: Dict[str, Any], state: AlertInvestigationState) -> Dict[str, Any]:
        """Calculates final risk score based on the LLM's new prescriptive analysis."""
        
        # The pattern agent's 'overall_confidence' is now the sole determinant.
        final_confidence = patterns.get('overall_confidence', 0.0)
        
        # We can still extract and aggregate risk factors for the final report.
        risk_factors = patterns.get('risk_factors', [])
        explanation_rationale = explanation.get('rationale', {})
        if explanation_rationale and 'key_points' in explanation_rationale:
            risk_factors.extend(explanation_rationale['key_points'])
        
        # Based on the final confidence, determine the risk level.
        if final_confidence >= 0.8:
            risk_level = 'HIGH'
        elif final_confidence >= 0.5:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        return {
            'final_confidence': final_confidence,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'investigation_loops': state.loop_count,
            'key_indicators': self._extract_key_indicators(patterns, explanation)
        }

    def _make_final_decision(self, risk_assessment: Dict[str, Any], state: AlertInvestigationState) -> Dict[str, Any]:
        """Make a final action decision based on risk assessment.""" 
        confidence = risk_assessment['final_confidence']
        risk_level = risk_assessment['risk_level']
        
        action, outcome_type, is_suspicious, summary = None, None, None, None

        if confidence >= self.risk_threshold:
            action = 'ESCALATE'
            outcome_type = OutcomeType.TRUE_POSITIVE
            is_suspicious = True
            summary = f"HIGH RISK: Confidence {confidence:.2f}. Multiple risk factors detected."
        elif confidence <= self.auto_close_threshold:
            action = 'AUTO_CLOSE'
            outcome_type = OutcomeType.FALSE_POSITIVE
            is_suspicious = False
            summary = f"LOW RISK: Confidence {confidence:.2f}. Likely false positive."
        else:
            if state.loop_count >= state.max_loops:
                action = 'HUMAN_REVIEW'
                outcome_type = OutcomeType.UNDER_INVESTIGATION
                is_suspicious = True
                summary = f"MEDIUM RISK: Confidence {confidence:.2f}. Requires human judgment after max loops."
            else:
                action = 'INVESTIGATE_FURTHER'
                outcome_type = OutcomeType.UNDER_INVESTIGATION
                is_suspicious = None
                summary = f"MEDIUM RISK: Confidence {confidence:.2f}. Need more investigation."

        return {'action': action, 'outcome_type': outcome_type, 'is_suspicious': is_suspicious,
                'summary': summary, 'confidence': confidence, 'risk_level': risk_level}

    def _extract_key_indicators(self, patterns: Dict[str, Any], explanation: Dict[str, Any]) -> List[str]:
        """Extract key risk indicators for reporting and audit trail.""" 
        indicators = []

        if isinstance(patterns, dict):
            llm_indicators = patterns.get('llm_analysis', {}).get('risk_indicators', [])
            indicators.extend(llm_indicators)
        
        if isinstance(explanation, dict) and 'rationale' in explanation:
            rationale = explanation['rationale']
            if isinstance(rationale, dict) and 'key_points' in rationale:
                indicators.extend(rationale['key_points'])
        
        unique_indicators = list(dict.fromkeys(indicators))
        return unique_indicators[:5]

    def _save_investigation_outcome(
        self,
        alert_id: str,
        decision: Dict[str, Any],
        risk_assessment: Dict[str, Any],
        agent_outputs: Dict[str, Any],
    ):
        """Upsert final investigation outcome; store agent_outputs JSON."""
        outcome = {
            "outcome_id": str(uuid.uuid4()),
            "alert_id": alert_id,
            "final_outcome": decision["action"],
            "is_suspicious": decision.get("is_suspicious", False),
            "confidence_score": risk_assessment["final_confidence"],
            "investigation_summary": decision["summary"],
            "human_verified": False,  # preserved on update if previously set
            "timestamp": datetime.now().isoformat(),
            "agent_outputs": json.dumps(agent_outputs, ensure_ascii=False),
        }

        with self.db.get_connection() as conn:
            existing = conn.execute(
                "SELECT outcome_id, human_verified FROM investigation_outcomes WHERE alert_id = ? LIMIT 1",
                (alert_id,),
            ).fetchone()

            if existing:
                prior_hv = existing["human_verified"]
                human_verified = prior_hv if prior_hv is not None else outcome["human_verified"]

                conn.execute(
                    """
                    UPDATE investigation_outcomes
                    SET final_outcome = ?,
                        is_suspicious = ?,
                        confidence_score = ?,
                        investigation_summary = ?,
                        human_verified = ?,
                        timestamp = ?,
                        agent_outputs = ?
                    WHERE alert_id = ?
                    """,
                    (
                        outcome["final_outcome"],
                        int(bool(outcome["is_suspicious"])),
                        float(outcome["confidence_score"]),
                        outcome["investigation_summary"],
                        int(False),
                        outcome["timestamp"],
                        outcome["agent_outputs"],
                        alert_id
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO investigation_outcomes
                    (outcome_id, alert_id, final_outcome, is_suspicious, confidence_score,
                    investigation_summary, human_verified, timestamp, agent_outputs)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        outcome["outcome_id"],
                        outcome["alert_id"],
                        outcome["final_outcome"],
                        int(bool(outcome["is_suspicious"])),
                        float(outcome["confidence_score"]),
                        outcome["investigation_summary"],
                        int(bool(outcome["human_verified"])),
                        outcome["timestamp"],
                        outcome["agent_outputs"],
                    ),
                )
            conn.commit()