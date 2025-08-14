# main.py
import asyncio
import os
import sys
import json
from fastapi import FastAPI, BackgroundTasks, HTTPException
from dotenv import load_dotenv
from src.workflow.orchestrator import AlertInvestigationOrchestrator
from typing import Dict, Any, List
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from pydantic import BaseModel

class ReviewFinalizeRequest(BaseModel):
    is_suspicious: bool
    investigation_summary: str

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Banking Alert Investigation System")
print("FastAPI application instance created, now defining routes...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Centralized Configuration
config = {
    'database_path': 'data/alerts.db',
    'max_loops': 3,
    'pattern_confidence_threshold': 0.7,
    'risk_threshold': 0.7,
    'auto_close_threshold': 0.5,
    
    # Azure OpenAI Configuration loaded from environment
    'AZURE_OPENAI_ENDPOINT': os.getenv('AZURE_OPENAI_ENDPOINT'),
    'AZURE_OPENAI_API_KEY': os.getenv('AZURE_OPENAI_API_KEY'),
    'AZURE_API_VERSION': os.getenv('OPENAI_API_VERSION', '2024-02-15-preview'),
    'AZURE_OPENAI_DEPLOYMENT_NAME': os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o')
}

orchestrator = None
try:
    print("Initializing AlertInvestigationOrchestrator...")
    if not config['AZURE_OPENAI_ENDPOINT'] or not config['AZURE_OPENAI_API_KEY']:
        print("CRITICAL ERROR: AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY not found in environment variables.", file=sys.stderr)
        print("Please ensure your .env file is configured correctly.", file=sys.stderr)
        sys.exit(1)

    orchestrator = AlertInvestigationOrchestrator(config)
    print("Orchestrator initialized successfully.")
    
    try:
        stats = orchestrator.get_investigation_statistics()
        print(f"Database connection successful. Total investigations: {stats['total_investigations']}.")
    except Exception as db_e:
        print(f"CRITICAL ERROR: Failed to connect to the database at '{config['database_path']}'.", file=sys.stderr)
        print(f"Details: {db_e}", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print("CRITICAL ERROR: Failed to initialize AlertInvestigationOrchestrator.", file=sys.stderr)
    print(f"Details: {e}", file=sys.stderr)
    sys.exit(1)

# Helper function to save the full investigation payload
def _save_investigation_result(alert_id: str, result: Dict[str, Any]):
    try:
        with orchestrator.db.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS full_investigation_results (
                    alert_id TEXT PRIMARY KEY,
                    result_json TEXT,
                    timestamp TEXT
                )
            """)
            conn.execute("""
                INSERT OR REPLACE INTO full_investigation_results (alert_id, result_json, timestamp)
                VALUES (?, ?, ?)
            """, (alert_id, json.dumps(result, default=str), datetime.now().isoformat()))
            conn.commit()
    except Exception as e:
        print(f"Error saving full investigation result for alert {alert_id}: {e}")

from datetime import datetime


@app.get("/review_status_counts")
def review_status_counts():
    if orchestrator is None:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized.")
    try:
        return orchestrator.db.get_review_status_counts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch counts: {e}")

@app.post("/investigate_alert/{alert_id}")
async def investigate_alert(alert_id: str):
    if orchestrator is None:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized.")

    # quick check before invoking the workflow
    if not orchestrator.db.alert_exists(alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")

    try:
        result = await orchestrator.investigate_alert(alert_id)
        return result
    except ValueError as ve:
        # belt-and-suspenders: if orchestrator also raised the guard
        if "Alert not found" in str(ve):
            raise HTTPException(status_code=404, detail="Alert not found")
        raise

@app.post("/process_pending_alerts")
async def process_pending_alerts(limit: int = 2) -> Dict[str, Any]:
    """Process a batch of pending alerts."""
    results = await orchestrator.process_pending_alerts(limit)
    for result in results:
        alert_id = result.get('alert_id')
        if alert_id:
            _save_investigation_result(alert_id, result)
    return {'processed_count': len(results), 'results': results}

@app.get("/investigation_stats")
async def get_investigation_stats() -> Dict[str, Any]:
    """Get statistics about investigations."""
    if orchestrator:
        return orchestrator.get_investigation_statistics()
    else:
        return {"error": "Orchestrator not initialized."}

@app.get("/alert/{alert_id}/history")
async def get_alert_history(alert_id: str) -> Dict[str, Any]:
    """Get investigation history for an alert."""
    judgements = orchestrator.db.execute_query(
        "SELECT * FROM agent_judgements WHERE alert_id = ? ORDER BY timestamp",
        (alert_id,)
    )
    outcome = orchestrator.db.execute_query(
        "SELECT * FROM investigation_outcomes WHERE alert_id = ?",
        (alert_id,)
    )
    return {
        'alert_id': alert_id,
        'judgements': judgements,
        'outcome': outcome[0] if outcome else None
    }

# NEW: Endpoint to retrieve the full stored investigation result
@app.get("/alert/{alert_id}/result")
async def get_alert_result(alert_id: str) -> Dict[str, Any]:
    """Retrieve the investigation outcome for a given alert_id (from investigation_outcomes)."""
    if orchestrator is None:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized.")

    rows = orchestrator.db.execute_query(
        """
        SELECT outcome_id, alert_id, final_outcome, is_suspicious, confidence_score,
               investigation_summary, human_verified, timestamp, agent_outputs
        FROM investigation_outcomes
        WHERE alert_id = ?
        LIMIT 1
        """,
        (alert_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Result not found for this alert_id")

    rec = rows[0]
    # Parse agent_outputs JSON (stored as TEXT)
    ao = rec.get("agent_outputs")
    if isinstance(ao, str) and ao.strip():
        try:
            rec["agent_outputs"] = json.loads(ao)
        except Exception:
            # leave as raw string if parsing fails
            pass
    elif ao is None:
        rec["agent_outputs"] = {}

    return rec
 
@app.get("/investigation_outcomes")
async def get_investigation_outcomes() -> List[Dict[str, Any]]:
    """Fetches all records from the investigation_outcomes table."""
    if orchestrator:
        query = "SELECT * FROM investigation_outcomes ORDER BY timestamp DESC"
        results = orchestrator.db.execute_query(query)
        return results
    else:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized.")
    
@app.post("/alerts/{alert_id}/finalize_review")
def finalize_review(alert_id: str, body: ReviewFinalizeRequest):
    if orchestrator is None:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized.")
    try:
        orchestrator.db.set_review_and_update_outcome(
            alert_id=alert_id,
            is_suspicious=body.is_suspicious,
            investigation_summary=body.investigation_summary,
        )
        return {
            "alert_id": alert_id,
            "review_status": 2,
            "updated_fields": {
                "is_suspicious": body.is_suspicious,
                "investigation_summary": body.investigation_summary,
            },
            "message": "Review finalized and outcome updated."
        }
    except ValueError as ve:
        # bubble up not founds as 404s
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to finalize review: {e}")

@app.get("/__routes")
def list_routes():
    return [
      {"path": route.path, "methods": list(route.methods)}
      for route in app.routes
      if hasattr(route, "methods")
    ]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agents": list(orchestrator.agents.keys())}

async def continuous_processing():
    """Continuously process pending alerts."""
    while True:
        try:
            results = await orchestrator.process_pending_alerts(5)
            if results:
                print(f"Processed {len(results)} alerts")
            await asyncio.sleep(30)
        except Exception as e:
            print(f"Error in continuous processing: {e}")
            await asyncio.sleep(60)

if __name__ == "__main__":
    import uvicorn
    if orchestrator:
        uvicorn.run(app, host="0.0.0.0", port=8001)
    else:
        print("Uvicorn will not run due to critical initialization errors.", file=sys.stderr)