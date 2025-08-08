from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.workflow.state import AlertInvestigationState
import json

class ExplanationAgent(BaseAgent):
    def _get_result_context(self, confidence: float) -> str:
        if confidence >= 0.7:
            return "True Positive"
        elif confidence <= 0.5:
            return "False Positive"
        else:
            return "Human Review"

    async def execute(self, state: AlertInvestigationState) -> Dict[str, Any]:
        """
        Generate a human-readable explanation and structured rationale based on
        the patterns detected and the evidence collected, reflecting True Positive,
        False Positive, or Human Review outcomes.
        """
        alert_id = state.alert_id
        print(f"[{self.agent_name}] Starting for alert {alert_id}.")
        context = state.context_data.get("alert_basic", {})
        
        # Pull the complete patterns output from the state.
        patterns_output = state.agent_outputs.get('PatternRecognitionAgent', {})
        confidence = patterns_output.get("overall_confidence", 0.0)
        result_context = self._get_result_context(confidence)

        # 1. Generate the natural-language explanation, context-aware
        explanation_prompt = f"""
You are an expert fraud analyst writing investigation summaries.

PATTERN ANALYSIS: {json.dumps(patterns_output, indent=2)}
ALERT CONTEXT: {json.dumps(context, indent=2)}

The pattern analysis verdict for this alert is: {result_context}.

Write a concise explanation for a business investigator, making clear the overall verdict (**{result_context}**) and supporting evidence.

- If False Positive: Clearly explain why the observed behavior is normal given historical evidence.
- If True Positive: Clearly explain why this is a likely fraud/true alert, referencing the evidence or pattern.
- If Human Review: Clearly explain the ambiguous points and why human review is recommended.
"""
        explanation = await self.llm_helper.generate_response(explanation_prompt)

        # 2. Generate a structured rationale JSON, also context-aware
        rationale = await self._generate_structured_rationale(context, patterns_output, explanation, result_context)

        # 3. Summarize the evidence and build the investigation trail
        evidence_summary = self._summarize_evidence(state.evidence_collected or {})
        investigation_trail = self._build_investigation_trail(state, result_context)
        
        # 4. Log the judgement
        self.log_judgement(
            alert_id=alert_id,
            action="explanation_generated",
            confidence=rationale.get("confidence", 0.0),
            rationale={
                "explanation_length": len(explanation),
                "key_evidence_points": len(rationale.get("key_points", [])),
                "investigation_summary": rationale.get("investigation_summary", ""),
                "result_context": result_context
            },
            loop_iteration=state.loop_count
        )
        print(f"[{self.agent_name}] Generated explanation and rationale for alert {alert_id}.")

        # 5. Return a single dict payload
        updated_agent_outputs = state.agent_outputs.copy()
        current_agent_output = {
            "explanation": explanation,
            "rationale": rationale,
            "evidence_summary": evidence_summary,
            "investigation_trail": investigation_trail,
            "result_context": result_context,
        }
        updated_agent_outputs[self.agent_name] = current_agent_output

        return {
            "agent_outputs": updated_agent_outputs,
            "success": True,
            "loop_count": state.loop_count,
            "context_data": state.context_data,
            "evidence_collected": state.evidence_collected,
            "queries_executed": state.queries_executed,
            "risk_factors": state.risk_factors + rationale.get("key_points", []),
            "confidence_score": rationale.get("confidence", 0.0),
            "investigation_summary": rationale.get("investigation_summary", ""),
        }
        
    async def _generate_structured_rationale(
        self, context: Dict[str, Any],
        patterns: Dict[str, Any],
        explanation: str,
        result_context: str
    ) -> Dict[str, Any]:
        """Use LLM to generate a structured JSON rationale for decision making."""
        rationale_prompt = f"""
Based on this investigation data, create a structured rationale in JSON format:
ALERT CONTEXT: {json.dumps(context, indent=2)}
PATTERNS DETECTED: {json.dumps(patterns, indent=2)}
RESULT VERDICT: {result_context}
EXPLANATION: {explanation}

Create a JSON response with the following keys:
1. key_points: List of main evidence points
2. risk_level: LOW/MEDIUM/HIGH
3. recommendation: CLOSE/ESCALATE/INVESTIGATE_FURTHER
4. confidence_factors: What increases/decreases confidence
5. investigation_summary: Brief summary of findings
6. confidence: float (0.0-1.0)
        """ 
        response = await self.llm_helper.generate_response(rationale_prompt)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                'key_points': ['Analysis generated'],
                'risk_level': 'MEDIUM',
                'recommendation': 'INVESTIGATE_FURTHER',
                'confidence_factors': ['Pattern analysis completed'],
                'investigation_summary': explanation[:200],
                'confidence': 0.5,
            }

    def _summarize_evidence(self, evidence: Dict[str, Any]) -> Dict[str, Any]:
        total_queries_executed = sum(1 for key in evidence if key.endswith("_sql"))
        total_data_points = sum(len(value) if isinstance(value, list) else 1 for key, value in evidence.items() if not key.endswith("_sql"))
        key_findings: List[str] = [f"{key}: {len(value)} records found" for key, value in evidence.items() if isinstance(value, list) and value]
        return {"total_queries_executed": total_queries_executed, "total_data_points": total_data_points, "key_findings": key_findings}

    def _build_investigation_trail(self, state: AlertInvestigationState, result_context: str) -> List[Dict[str, Any]]:
        trail = []
        for agent_name, output in state.agent_outputs.items():
            trail.append({
                'agent': agent_name,
                'loop_iteration': state.loop_count,
                'key_findings': str(output)[:100] + "..." if len(str(output)) > 100 else str(output),
                'confidence_contributed': output.get('overall_confidence', 0.0) if isinstance(output, dict) else 0.0,
                'result_context': output.get('result_context', result_context) if isinstance(output, dict) else result_context
            })
        return trail
 