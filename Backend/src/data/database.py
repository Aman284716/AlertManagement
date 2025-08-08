import sqlite3
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
import json

class DatabaseManager:
    def __init__(self, db_path: str = "data/alerts.db"):
        self.db_path = db_path
        self.schema_info = self._get_schema_info()
        self.init_agent_tables()

    def _get_schema_info(self) -> Dict[str, Dict[str, str]]:
        """Get complete database schema information for intelligent query generation.""" 
        return {
            "users": {
                "user_id": "TEXT PRIMARY KEY",
                "name": "TEXT", "email": "TEXT", "phone_number": "TEXT",
                "registered_location": "TEXT", "account_creation_date": "TEXT"
            },
            "accounts": {
                "account_id": "TEXT PRIMARY KEY", "user_id": "TEXT",
                "account_type": "TEXT", "current_balance": "REAL", "is_active": "BOOLEAN"
            },
            "transactions": {
                "transaction_id": "TEXT PRIMARY KEY", "user_id": "TEXT", "account_id": "TEXT",
                "timestamp": "TEXT", "amount": "REAL", "currency": "TEXT", "merchant": "TEXT",
                "transaction_type": "TEXT", "location": "TEXT", "device_id": "TEXT",
                "ip_address": "TEXT", "payee_id": "TEXT"
            },
            "alerts": {
                "alert_id": "TEXT PRIMARY KEY", "user_id": "TEXT", "account_id": "TEXT",
                "transaction_id": "TEXT", "alert_type": "TEXT", "timestamp": "TEXT",
                "description": "TEXT"
            },
            "devices": {
                "device_id": "TEXT PRIMARY KEY", "device_type": "TEXT", "os": "TEXT",
                "last_seen_ip": "TEXT"
            },
            "login_attempts": {
                "login_id": "TEXT PRIMARY KEY", "user_id": "TEXT", "timestamp": "TEXT",
                "status": "TEXT", "ip_address": "TEXT", "device_id": "TEXT"
            },
            "payees": {
                "payee_id": "TEXT PRIMARY KEY", "payee_name": "TEXT", "email": "TEXT",
                "phone_number": "TEXT", "registered_location": "TEXT", "account_creation_date": "TEXT"
            },
            "user_devices": { "user_id": "TEXT", "device_id": "TEXT" },
            "user_payees": { "user_id": "TEXT", "payee_id": "TEXT", "date_added_by_user": "TEXT" }
        }

    def init_agent_tables(self):
        """Initialize tables for agent operations and audit trail.""" 
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS agent_judgements (
                judgement_id TEXT PRIMARY KEY,
                alert_id TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                action TEXT NOT NULL,
                confidence REAL NOT NULL,
                rationale_json TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                loop_iteration INTEGER DEFAULT 0,
                queries_executed TEXT,
                FOREIGN KEY (alert_id) REFERENCES alerts (alert_id)
            );
            CREATE TABLE IF NOT EXISTS investigation_outcomes (
                outcome_id TEXT PRIMARY KEY,
                alert_id TEXT NOT NULL,
                final_outcome TEXT NOT NULL,
                is_suspicious BOOLEAN NOT NULL,
                confidence_score REAL NOT NULL,
                investigation_summary TEXT,
                human_verified BOOLEAN DEFAULT FALSE,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (alert_id) REFERENCES alerts (alert_id)
            );
            CREATE INDEX IF NOT EXISTS idx_judgements_alert ON agent_judgements (alert_id);
            CREATE INDEX IF NOT EXISTS idx_outcomes_alert ON investigation_outcomes (alert_id);
            """)

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dictionaries.""" 
        with self.get_connection() as conn:
            results = conn.execute(query, params).fetchall()
            return [dict(row) for row in results]

    def get_pending_alerts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get alerts that haven't been investigated yet.""" 
        query = """
        SELECT a.* FROM alerts a
        LEFT JOIN investigation_outcomes io ON a.alert_id = io.alert_id
        WHERE io.alert_id IS NULL
        ORDER BY a.timestamp DESC
        LIMIT ?
        """
        return self.execute_query(query, (limit,))