from typing import Dict, Any, List, Optional
import json

class IntelligentQueryGenerator:
    def __init__(self, schema_info: Dict[str, Dict[str, str]], llm_helper):
        self.schema_info = schema_info
        self.llm_helper = llm_helper

    async def generate_contextual_queries(self, alert_context: Dict[str, Any],
                                        investigation_goal: str,
                                        previous_context: Optional[Dict[str, Any]] = None) -> List[str]:
        """Generate intelligent queries based on alert context and investigation needs.""" 
        schema_prompt = self._build_schema_prompt()
        context_prompt = self._build_context_prompt(alert_context, investigation_goal, previous_context)
        prompt = f"""
You are an expert SQL analyst for banking fraud investigation. Based on the database schema below and the current alert context, generate 3-5 targeted SQL queries that will help investigate this alert effectively.

{schema_prompt}

{context_prompt}

Focus on:
1. Pattern detection queries
2. Historical behavior analysis
3. Cross-reference queries for anomalies
4. Risk factor identification

Return ONLY valid SQL queries, one per line, without explanations or markdown.
        """ 
        response = await self.llm_helper.generate_response(prompt)
        queries = [q.strip() for q in response.split('\n') if q.strip() and q.strip().upper().startswith('SELECT')]
        return queries[:5]

    def _build_schema_prompt(self) -> str:
        """Build schema information prompt for the LLM.""" 
        schema_desc = "DATABASE SCHEMA:\n"
        for table_name, columns in self.schema_info.items():
            schema_desc += f"\n{table_name}:\n"
            for col_name, col_type in columns.items():
                schema_desc += f" - {col_name}: {col_type}\n"
        return schema_desc

    def _build_context_prompt(self, alert_context: Dict[str, Any],
                             investigation_goal: str,
                             previous_context: Optional[Dict[str, Any]] = None) -> str:
        """Build context-specific prompt for the LLM.""" 

        prompt = f"""
CURRENT ALERT CONTEXT:
Alert ID: {alert_context.get('alert_id')}
Alert Type: {alert_context.get('alert_type')}
User ID: {alert_context.get('user_id')}
Transaction ID: {alert_context.get('transaction_id')}
Amount: {alert_context.get('amount', 'N/A')}
Location: {alert_context.get('location', 'N/A')}
Timestamp: {alert_context.get('timestamp')}

INVESTIGATION GOAL: {investigation_goal}
"""
        if previous_context:
            prompt += f"\nPREVIOUS INVESTIGATION FINDINGS: \n{json.dumps(previous_context, indent=2)}\n"
            prompt += "Build upon these findings with more targeted queries.\n"
        return prompt

    def generate_specific_queries(self, alert_type: str, user_id: str,
                                transaction_id: Optional[str] = None,
                                account_id: Optional[str] = None) -> List[str]:
        """Generate pre-built queries for specific alert types based on the schema.""" 
        base_queries = {
            "HighValue": [
                f"SELECT AVG(amount) as avg_amount, MAX(amount) as max_amount, COUNT(*) as txn_count FROM transactions WHERE user_id = '{user_id}' AND timestamp > date('now', '-90 days')",
                f"SELECT * FROM transactions WHERE user_id = '{user_id}' AND amount > 100000"
            ],
            "Velocity": [
                f"SELECT COUNT(*) as txn_count, SUM(amount) as total_amount FROM transactions WHERE user_id = '{user_id}' AND timestamp > datetime('now', '-1 hour')",
                f"SELECT COUNT(DISTINCT payee_id) as unique_payees FROM transactions WHERE user_id = '{user_id}' AND timestamp > datetime('now', '-1 hour')"
            ],
            "NewPayee": [
                f"SELECT t.*, up.date_added_by_user FROM transactions t JOIN user_payees up ON t.payee_id = up.payee_id WHERE t.user_id = '{user_id}' AND datetime(up.date_added_by_user) >= datetime('now', '-48 hours')"
            ],
            "FailedLoginTransfer": [
                f"SELECT COUNT(*) as failed_count FROM login_attempts WHERE user_id = '{user_id}' AND status = 'failed' AND timestamp > datetime('now', '-24 hours')"
            ],
            "Structuring": [
                f"SELECT * FROM transactions WHERE user_id = '{user_id}' AND amount % 10000 = 0 AND timestamp > datetime('now', '-7 days')"
            ],
            "GeoMismatch": [
                f"SELECT DISTINCT location FROM transactions WHERE user_id = '{user_id}' AND timestamp > datetime('now', '-30 days')"
            ],
            "CrossChannel": [
                f"SELECT DISTINCT transaction_type FROM transactions WHERE user_id = '{user_id}' AND timestamp > datetime('now', '-1 hour')"
            ]
        }
        return base_queries.get(alert_type, [])