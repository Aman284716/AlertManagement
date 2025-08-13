# src/workflow/orchestrator.py
import asyncio
from src.workflow.graph import create_investigation_workflow
from src.workflow.state import AlertInvestigationState
from src.agents.ingestion_agent import IngestionAgent
from src.agents.pattern_agent import PatternRecognitionAgent
from src.agents.explanation_agent import ExplanationAgent
from src.agents.risk_agent import RiskAssessmentAgent
from src.data.database import DatabaseManager
from src.utils.llm_helper import LLMHelper
from typing import Dict, Any, List

class AlertInvestigationOrchestrator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db = DatabaseManager(config['database_path'])
        
        self.llm_helper = LLMHelper(
            azure_endpoint=config.get('AZURE_OPENAI_ENDPOINT'),
            api_key=config.get('AZURE_OPENAI_API_KEY'),
            api_version=config.get('AZURE_API_VERSION'),
            azure_deployment=config.get('AZURE_OPENAI_DEPLOYMENT_NAME')
        )

        self.agents = {
            'ingestion': IngestionAgent(self.db, self.llm_helper, config),
            'pattern': PatternRecognitionAgent(self.db, self.llm_helper, config),
            'explanation': ExplanationAgent(self.db, self.llm_helper, config),
            'risk': RiskAssessmentAgent(self.db, self.llm_helper, config)
        }
        self.workflow = create_investigation_workflow(self.agents)

    async def investigate_alert(self, alert_id: str) -> Dict[str, Any]:
        if not self.db.alert_exists(alert_id):
            raise ValueError(f"Alert not found: {alert_id}")
        """Investigate a single alert and log the full result."""
        print(f"\n--- Starting investigation for alert {alert_id} ---")
        initial_state = AlertInvestigationState(
            alert_id=alert_id,
            current_agent="ingestion",
            max_loops=self.config.get("max_loops", 3),
        )
        try:
            # Run the Pregel workflow
            result = await self.workflow.ainvoke(initial_state)

            # Extract all the top-level fields
            final_decision        = result["final_decision"]
            confidence_score      = result["confidence_score"]
            outcome_type          = result["outcome_type"]
            is_suspicious         = result["is_suspicious"]
            investigation_summary = result["investigation_summary"]
            risk_factors          = result.get("risk_factors", [])
            loop_count            = result.get("loop_count", 0)
            queries_executed      = result.get("queries_executed", [])
            agent_outputs         = result.get("agent_outputs", {})

            # Build the payload we return
            payload = {
                "alert_id": alert_id,
                "outcome": final_decision,
                "outcome_type": (
                    outcome_type.value if hasattr(outcome_type, "value") else outcome_type
                ),
                "is_suspicious": is_suspicious,
                "confidence": confidence_score,
                "investigation_summary": investigation_summary,
                "risk_factors": risk_factors,
                "loops_executed": loop_count,
                "total_queries": len(queries_executed),
                "agent_outputs": agent_outputs,
            }

            # **NEW**: Log the full payload so you can see the final output
            print(f"[Orchestrator] Final result for alert {alert_id}: {payload}")

            print(f"--- Investigation for alert {alert_id} complete ---")
            print(f"Final Decision: {final_decision} (Confidence: {confidence_score:.2f})")
            return payload

        except Exception as e:
            print(f"--- Error during investigation for alert {alert_id}: {e} ---")
            return {
                "alert_id": alert_id,
                "error": str(e),
                "outcome": "ERROR",
                "is_suspicious": None
            }


    async def process_pending_alerts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Process multiple pending alerts."""
        print("\n[Orchestrator] Checking for new alerts to process...")
        pending_alerts = self.db.get_pending_alerts(limit)
        if not pending_alerts:
            print("[Orchestrator] No new alerts found.")
            return []
        
        print(f"[Orchestrator] Found {len(pending_alerts)} new alerts. Starting batch processing...")
        results = []
        for alert in pending_alerts:
            result = await self.investigate_alert(alert['alert_id'])
            results.append(result)
            await asyncio.sleep(0.1)
        print(f"[Orchestrator] Batch processing complete. Processed {len(results)} alerts.")
        return results

    def get_investigation_statistics(self) -> Dict[str, Any]:
        """Get statistics about past investigations."""
        query = """
        SELECT final_outcome, is_suspicious, COUNT(*) as count, AVG(confidence_score) as avg_confidence
        FROM investigation_outcomes
        GROUP BY final_outcome, is_suspicious
        """
        results = self.db.execute_query(query)
        
        # --- FIX: Update the under_investigation count to include HUMAN_REVIEW ---
        under_investigation_count = sum(
            r['count'] for r in results
            if r['final_outcome'] in ['INVESTIGATE_FURTHER', 'HUMAN_REVIEW']
        )

        stats = {
            'total_investigations': sum(r['count'] for r in results),
            'outcomes': results,
            'true_positives': sum(r['count'] for r in results if r['is_suspicious'] == 1),
            'false_positives': sum(r['count'] for r in results if r['is_suspicious'] == 0),
            'under_investigation': under_investigation_count
        }
        return stats