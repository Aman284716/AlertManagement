# src/agents/ingestion_agent.py

from typing import Dict, Any, List
from src.agents.base_agent import BaseAgent
from src.data.query_generator import IntelligentQueryGenerator
from src.workflow.state import AlertInvestigationState
import asyncio
import json
import os

NEW_PAYEE_WINDOW_DAYS = 7
NEW_PAYEE_TRANSACTION_THRESHOLD = 50_000

class IngestionAgent(BaseAgent):
    def __init__(self, db_manager, llm_helper, config):
        super().__init__(db_manager, llm_helper, config)
        self.query_generator = IntelligentQueryGenerator(db_manager.schema_info, llm_helper)
        self.output_dir = "ingestion_outputs" # Define output directory

    async def execute(self, state: AlertInvestigationState) -> Dict[str, Any]:
        alert_id = state.alert_id
        loop_iteration = state.loop_count
        print(f"[{self.agent_name}] Starting for alert {alert_id}. Loop iteration: {loop_iteration}")

        alert_basic = self._get_alert_basic_info(alert_id)
        if not alert_basic:
            print(f"[{self.agent_name}] Error: Alert {alert_id} not found.")
            return {"agent_outputs": {self.agent_name: {"error": "Alert not found"}}, "success": False}

        investigation_goal = self._determine_investigation_goal(alert_basic, state.context_data)
        print(f"[{self.agent_name}] Investigation goal: '{investigation_goal}'")

        contextual = await self.query_generator.generate_contextual_queries(
            alert_basic, investigation_goal, state.context_data
        )
        specific = self.query_generator.generate_specific_queries(
            alert_basic.get("alert_type", ""),
            alert_basic.get("user_id", ""),
            alert_basic.get("transaction_id"),
            alert_basic.get("account_id")
        )

        user_id = alert_basic["user_id"]
        account_id = alert_basic["account_id"]
        
        all_queries: List[str] = contextual + specific
        
        if alert_basic.get("alert_type") == "NewPayee":
             all_queries.append(f"""
                SELECT
                    t.transaction_id,
                    t.timestamp,
                    t.amount,
                    t.payee_id,
                    up.date_added_by_user
                FROM transactions AS t
                JOIN user_payees AS up
                    ON t.user_id = up.user_id AND t.payee_id = up.payee_id
                WHERE
                    t.user_id = '{user_id}'
                    AND t.amount >= {NEW_PAYEE_TRANSACTION_THRESHOLD}
                    AND (
                        (
                            julianday(t.timestamp) - julianday(up.date_added_by_user)
                        ) BETWEEN 0 AND {NEW_PAYEE_WINDOW_DAYS}
                    )
                ORDER BY
                    t.timestamp DESC;
            """)
        else:
            all_queries.extend([
                f"SELECT * FROM user_payees WHERE user_id = '{user_id}';",
                f"SELECT * FROM transactions WHERE user_id = '{user_id}' ORDER BY timestamp DESC;",
                f"""SELECT * FROM login_attempts WHERE user_id = '{user_id}' ORDER BY timestamp DESC;""",
                f"SELECT * FROM accounts WHERE account_id = '{account_id}';",
                f"""SELECT d.* FROM devices d JOIN user_devices ud ON d.device_id = ud.device_id WHERE ud.user_id = '{user_id}';""",
            ])
        
        print(f"[{self.agent_name}] Generated {len(all_queries)} total queries.")

        # Execute all queries
        full_evidence = await self._execute_intelligent_queries(all_queries)
        print(f"[{self.agent_name}] Collected {len(full_evidence)} pieces of evidence.")

        # --- NEW LOGIC: FILTER EVIDENCE FOR NEWPAYEE ALERTS ---
        if alert_basic.get("alert_type") == "NewPayee":
            # Find the specific query output for new payee events
            new_payee_query_results_list = self._find_results_for_query_part(full_evidence, "JOIN user_payees AS up")
            
            # Create a new, filtered evidence dictionary
            evidence_to_pass = {
                "historical_new_payee_events": new_payee_query_results_list
            }
        else:
            evidence_to_pass = full_evidence
        
        # --- END OF NEW LOGIC ---

        try:
            # if not os.path.exists(self.output_dir):
            #     os.makedirs(self.output_dir)
            # output_file_path = os.path.join(self.output_dir, f"{alert_id}.json")
            # with open(output_file_path, 'w') as f:
            #     json.dump(evidence_to_pass, f, indent=4, default=str)
            print(f"[{self.agent_name}] Successfully saved collected evidence.")
            # print(f"[{self.agent_name}] Successfully saved collected evidence to {output_file_path}")
        except Exception as e:
            print(f"[{self.agent_name}] Error saving evidence to JSON file: {e}")

        self.log_judgement(
            alert_id=alert_id,
            action="data_ingestion_complete",
            confidence=1.0,
            rationale={"dynamic_queries": len(contextual) + len(specific), "total_queries": len(all_queries), "total_evidence": len(full_evidence)},
            loop_iteration=loop_iteration,
            queries_executed=all_queries
        )
        print(f"[{self.agent_name}] Finished ingestion for alert {alert_id}.")

        return {
            "context_data": {"alert_basic": alert_basic, "investigation_goal": investigation_goal, "loop_iteration": loop_iteration},
            "queries_executed": all_queries,
            "evidence_collected": evidence_to_pass, # Pass the filtered evidence
            "success": True
        }

    def _get_alert_basic_info(self, alert_id: str) -> Dict[str, Any]:
        """Get basic alert and transaction information via a join query.""" 
        query = """
        SELECT
            a.*,
            t.amount, t.currency, t.merchant, t.transaction_type, t.location, t.device_id, t.ip_address, t.payee_id,
            u.name as user_name, u.registered_location as user_location,
            acc.account_type, acc.current_balance
        FROM alerts a
        JOIN transactions t ON a.transaction_id = t.transaction_id
        JOIN users u ON a.user_id = u.user_id
        JOIN accounts acc ON a.account_id = acc.account_id
        WHERE a.alert_id = ?
        """
        results = self.db.execute_query(query, (alert_id,))
        return results[0] if results else {}

    def _determine_investigation_goal(self, alert_basic: Dict[str, Any], previous_context: Dict[str, Any]) -> str:
        """Intelligently determine what to investigate based on alert type and previous context.""" 
        alert_type = alert_basic.get('alert_type', '')
        investigation_goals = {
            'HighValue': 'Analyze transaction amount against user patterns and risk thresholds',
            'Velocity': 'Examine transaction frequency and timing patterns for unusual activity',
            'NewPayee': 'Investigate new payee additions and subsequent transaction patterns',
            'FailedLoginTransfer': 'Correlate failed login attempts with transaction timing',
            'GeoMismatch': 'Analyze location patterns and geographical anomalies',
            'Structuring': 'Detect potential money laundering through amount patterns',
            'CrossChannel': 'Examine cross-channel transaction patterns',
            'HighRiskLocation': 'Assess location-based risk factors'
        }
        base_goal = investigation_goals.get(alert_type, 'General suspicious activity investigation.')

        if previous_context.get('need_deeper_analysis'):
            base_goal += ' with deeper historical analysis.'
        if previous_context.get('ambiguous_patterns'):
            base_goal += ' focusing on pattern clarification.'
        return base_goal

    async def _execute_intelligent_queries(self, queries: List[str]) -> Dict[str, Any]:
        """Execute a list of queries and organize the results intelligently.""" 
        evidence = {}
        for i, query in enumerate(queries):
            try:
                results = self.db.execute_query(query)
                evidence[f'query_{i+1}_results'] = results
                evidence[f'query_{i+1}_sql'] = query
                evidence[f'query_{i+1}_count'] = len(results)
            except Exception as e:
                evidence[f'query_{i+1}_error'] = str(e)
                evidence[f'query_{i+1}_sql'] = query
        return evidence
    
    def _find_results_for_query_part(self, evidence: Dict[str, Any], query_part: str) -> List[Dict[str, Any]]:
        """
        Finds the results list for a query that contains a specific text part.
        Returns an empty list if not found.
        """
        for key, value in evidence.items():
            if key.endswith('_sql') and query_part in value:
                results_key = key.replace('_sql', '_results')
                return evidence.get(results_key, [])
        return []
