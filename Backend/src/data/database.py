import sqlite3
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_path: str = "data/alerts.db"):
        self.db_path = db_path
        self.schema_info = self._get_schema_info()
        self.init_agent_tables()
        self.ensure_review_status_column()
        self.ensure_agent_outputs_column()


    def set_review_and_update_outcome(self, alert_id: str, is_suspicious: bool, investigation_summary: str) -> None:
        """
        Atomically set alerts.review_status=2 and update investigation_outcomes fields for the same alert_id.
        Raises ValueError if alert or outcome row doesn't exist.
        """
        with self.get_connection() as conn:
            # Ensure alert exists
            row = conn.execute(
                "SELECT 1 FROM alerts WHERE alert_id = ? LIMIT 1",
                (alert_id,)
            ).fetchone()
            if not row:
                raise ValueError(f"Alert not found: {alert_id}")

            # Update outcome; require an existing outcome row
            ts = datetime.now().isoformat()
            cur = conn.execute(
                    """
                    UPDATE investigation_outcomes
                    SET is_suspicious = ?,
                        investigation_summary = ?,
                        human_verified = ?,
                        timestamp = ?
                    WHERE alert_id = ?
                    """,
                    (int(bool(is_suspicious)), investigation_summary, int(True), ts, alert_id)
                )
            if cur.rowcount == 0:
                # No outcome row present for this alert
                raise ValueError(f"Investigation outcome not found for alert: {alert_id}")

            # Set review_status=2 on alerts
            conn.execute(
                "UPDATE alerts SET review_status = 2 WHERE alert_id = ?",
                (alert_id,)
            )

            conn.commit()    

    def ensure_agent_outputs_column(self) -> None:
        """Add agent_outputs TEXT to investigation_outcomes if it doesn't exist."""
        with self.get_connection() as conn:
            cols = conn.execute("PRAGMA table_info(investigation_outcomes)").fetchall()
            names = {c["name"] for c in cols}
            if "agent_outputs" not in names:
                conn.execute("ALTER TABLE investigation_outcomes ADD COLUMN agent_outputs TEXT;")
                conn.commit()
    
    def ensure_review_status_column(self) -> None:
        """Ensure alerts.review_status (INTEGER DEFAULT 0) exists; backfill existing rows to 0."""
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cols = conn.execute("PRAGMA table_info(alerts)").fetchall()
            names = {c["name"] for c in cols}
            if "review_status" not in names:
                conn.execute("ALTER TABLE alerts ADD COLUMN review_status INTEGER DEFAULT 0;")
                # existing rows will be NULL unless explicitly updated
                conn.execute("UPDATE alerts SET review_status = 0 WHERE review_status IS NULL;")
                conn.commit()

    def set_review_status(self, alert_id: str, status: int) -> None:
        """Update review_status for one alert."""
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE alerts SET review_status = ? WHERE alert_id = ?",
                (int(status), alert_id)
            )
            conn.commit()

    def get_review_status_counts(self) -> list[dict]:
        """Return counts per distinct review_status value."""
        query = """
        SELECT COALESCE(review_status, 0) AS review_status, COUNT(*) AS count
        FROM alerts
        GROUP BY COALESCE(review_status, 0)
        ORDER BY review_status
        """
        return self.execute_query(query)            

    def upsert_investigation_outcome(self, outcome: Dict[str, Any]) -> None:
        """
        Update the existing investigation_outcomes row for this alert_id, or insert a new row if none exists.
        Preserves human_verified if it was already set (so a re-run won't reset it to False).
        """
        with self.get_connection() as conn:
            existing = conn.execute(
                "SELECT outcome_id, human_verified FROM investigation_outcomes WHERE alert_id = ? LIMIT 1",
                (outcome["alert_id"],)
            ).fetchone()

            if existing:
                # preserve prior human_verified if True (or not null)
                prior_hv = existing["human_verified"]
                human_verified = prior_hv if prior_hv is not None else outcome.get("human_verified", False)

                conn.execute(
                    """
                    UPDATE investigation_outcomes
                    SET final_outcome = ?,
                        is_suspicious = ?,
                        confidence_score = ?,
                        investigation_summary = ?,
                        human_verified = ?,
                        timestamp = ?
                    WHERE alert_id = ?
                    """,
                    (
                        outcome["final_outcome"],
                        int(bool(outcome["is_suspicious"])),
                        float(outcome["confidence_score"]),
                        outcome.get("investigation_summary"),
                        int(bool(human_verified)),
                        outcome["timestamp"],
                        outcome["alert_id"],
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO investigation_outcomes
                    (outcome_id, alert_id, final_outcome, is_suspicious, confidence_score,
                     investigation_summary, human_verified, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        outcome["outcome_id"],
                        outcome["alert_id"],
                        outcome["final_outcome"],
                        int(bool(outcome["is_suspicious"])),
                        float(outcome["confidence_score"]),
                        outcome.get("investigation_summary"),
                        int(bool(outcome.get("human_verified", False))),
                        outcome["timestamp"],
                    ),
                )
            conn.commit()

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
    
    def alert_exists(self, alert_id: str) -> bool:
        """Return True if the alert exists in the alerts table."""
        rows = self.execute_query(
            "SELECT 1 AS one FROM alerts WHERE alert_id = ? LIMIT 1",
            (alert_id,),
        )
        return bool(rows)

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
                agent_outputs TEXT,
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