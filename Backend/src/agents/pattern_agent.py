# src/agents/pattern_agent.py

import json
import os
from typing import Dict, Any, List
from datetime import datetime, timedelta

from src.agents.base_agent import BaseAgent
from src.data.models import AlertType
from src.workflow.state import AlertInvestigationState

# — Fraud‐pattern thresholds (from your data generator) —
HIGH_VALUE_THRESHOLD = 100_000
FAILED_LOGIN_THRESHOLD = 50_000
VELOCITY_THRESHOLD = 5
VELOCITY_WINDOW_MINUTES = 5
NEW_PAYEE_WINDOW_DAYS = 7
NEW_PAYEE_TRANSACTION_THRESHOLD = 50_000
STRUCTURING_THRESHOLD = 150_000
STRUCTURING_WINDOW_DAYS = 7
CROSS_CHANNEL_WINDOW_MINUTES = 60
HIGH_RISK_COUNTRIES = {"IR", "KP", "SY", "CU"}

# A mapping of alert types to human‐readable rule definitions
RULE_DEFINITIONS = {
    "HighValue": f"Transaction amount > {HIGH_VALUE_THRESHOLD}",
    "GeoMismatch": "Transaction location != user’s registered location",
    "Velocity": f"> {VELOCITY_THRESHOLD} txns in {VELOCITY_WINDOW_MINUTES} minutes",
    "FailedLoginTransfer": f"Failed logins immediately followed by a transfer > {FAILED_LOGIN_THRESHOLD}",
    "NewPayee": f"New payee added < {NEW_PAYEE_WINDOW_DAYS}d, amount > {NEW_PAYEE_TRANSACTION_THRESHOLD}",
    "Structuring": f"Multiple smaller txns > {STRUCTURING_THRESHOLD} over {STRUCTURING_WINDOW_DAYS}d",
    "CrossChannel": f"ATM withdrawal + transfer in different locations within {CROSS_CHANNEL_WINDOW_MINUTES}m",
    "HighRiskLocation": f"Transaction to one of {sorted(HIGH_RISK_COUNTRIES)}"
}

DECISION_RULES = {
    "HighValue": [
        "If historical similar transactions ≤1 → True Positive (>0.7)",
        "If historical similar transactions 2–4 → Human Review (0.5–0.7)",
        "If historical similar transactions ≥5 → False Positive (≤0.5)"
    ],
    "GeoMismatch": [
        "If count of similar location mismatches ≤1 → True Positive (>0.7)",
        "If count of similar location mismatches 2–4 → Human Review (0.5–0.7)",
        "If count of similar location mismatches ≥5 → False Positive (≤0.5)"
    ],
    "Velocity": [
        "If historical velocity events ≤1 → True Positive (>0.7)",
        "If historical velocity events 2–4 → Human Review (0.5–0.7)",
        "If historical velocity events ≥5 → False Positive (≤0.5)"
    ],
    "NewPayee": [
        "If historical new payee events <2 → True Positive (>0.7)",
        "If historical new payee events is 2–4 → Human Review (0.5–0.7)",
        "If historical new payee events ≥5 → False Positive (≤0.5)"
    ],
    "FailedLoginTransfer": [
        "If transfer amount ≥70% of (amount + balance) → True Positive (>0.7)",
        "If transfer amount between 50%–70% → Human Review (0.5–0.7)",
        "If transfer amount ≤50% → False Positive (≤0.5)"
    ],
    "Structuring": [
        "If total amount from smaller transactions ≤ threshold once historically → True Positive (>0.7)",
        "If occurrences between 2–4 → Human Review (0.5–0.7)",
        "If occurrences ≥5 → False Positive (≤0.5)"
    ],
    "CrossChannel": [
        "If ATM withdrawal + transfer in diff. locations within 60m happens ≤1 time → True Positive (>0.7)",
        "If happens 2–4 times → Human Review (0.5–0.7)",
        "If happens ≥5 times → False Positive (≤0.5)"
    ],
    "HighRiskLocation": [
        "If location is in high-risk list → True Positive (>0.7)"
    ]
}



class PatternRecognitionAgent(BaseAgent):
    def __init__(self, db_manager, llm_helper, config: Dict[str, Any]):
        super().__init__(db_manager, llm_helper, config)
        self.confidence_threshold = float(config.get('pattern_confidence_threshold', 0.7))
        self.default_max_loops = int(config.get('max_loops', 3))
        self.prompt_dir = "llm_prompts"

    async def execute(self, state: AlertInvestigationState) -> Dict[str, Any]:
        alert_id = state.alert_id
        loop_count = state.loop_count if isinstance(state.loop_count, int) else 0
        max_loops = getattr(state, 'max_loops', self.default_max_loops)

        # 1) Gather context, evidence, queries
        context = state.context_data.get("alert_basic", {}) or {}
        evidence = state.evidence_collected or {}
        queries = getattr(state, 'queries_executed', [])
        
        # --- NEW LOGIC: Differentiate between Velocity and other alerts ---
        alert_type = context.get("alert_type")
        enhanced: Dict[str, Any] = {}

        if alert_type == "Velocity":
            # Handle Velocity alerts with a custom Python function
            historical_velocity_count = self._count_velocity_events(evidence)
            
            # Apply the confidence rules directly
            confidence = 0.0
            if historical_velocity_count >= 5:
                confidence = 0.2  # False positive scenario
            elif historical_velocity_count > 1 and historical_velocity_count < 5:
                confidence = 0.6  # Human review scenario
            else: # historical_velocity_count <= 1
                confidence = 0.85 # True positive scenario

            conf_val = float(confidence)
            base_rule = f"{alert_type}: {RULE_DEFINITIONS.get(alert_type)}"

            if conf_val >= 0.7:
                true_rule_index = 0
            elif conf_val <= 0.5:
                true_rule_index = 2
            else:
                true_rule_index = 1

            rules_used = [{"rule": base_rule, "matched": True}]
            for idx, r in enumerate(DECISION_RULES.get(alert_type, [])):
                rules_used.append({"rule": r, "matched": idx == true_rule_index})

            
            # Build the enhanced dictionary for the return payload
            enhanced = {
                "llm_analysis": {}, # LLM analysis is skipped
                "overall_confidence": conf_val,
                "risk_factors": ["High velocity activity"],
                "evidence": {"historical_velocity_events_count": historical_velocity_count},
                "rules_used": rules_used
            }

            print(f"[{self.agent_name}]     Velocity alert handled with custom logic. Historical count: {historical_velocity_count}")

        # elif alert_type == "NewPayee":
        #     # --- NEW LOGIC FOR NEW PAYEE ALERT ---
        #     # The IngestionAgent now returns a pre-filtered list of new payee events.
        #     # We just need to count them.
        #     new_payee_events = self._find_evidence_by_query_text(evidence, "JOIN user_payees")
        #     historical_payee_count = len(new_payee_events)
            
        #     confidence = 0.0
        #     if historical_payee_count >= 5:
        #         confidence = 0.2
        #     elif historical_payee_count > 1 and historical_payee_count < 5:
        #         confidence = 0.6
        #     else:
        #         confidence = 0.85
            
        #     enhanced = {
        #         "llm_analysis": {},
        #         "overall_confidence": confidence,
        #         "risk_factors": ["New payee activity"],
        #         "evidence": {"historical_new_payee_count": historical_payee_count}
        #     }
        #     print(f"[{self.agent_name}]     NewPayee alert handled with custom logic. Historical count: {historical_payee_count}")
            
        else:
            # Handle all other alerts with the LLM
             # 2) Build the new, highly prescriptive prompt
            prompt = f"""You are a fraud-detection assistant.
Your task is to identify fraud patterns by strictly following the provided rules and user behavior analysis instructions.

**RULES**:
{json.dumps(RULE_DEFINITIONS, indent=2)}

**ALERT_TYPE**: {context.get("alert_type", "Unknown")}

**CONTEXT**:
{json.dumps(context, indent=2)}

**EVIDENCE**:
{json.dumps(evidence, indent=2, default=str)}

**ANALYSIS_RULES**:
1.  **HighValue, GeoMismatch**:
    -   Search the EVIDENCE for a pattern of similar historical transactions.
    -   If the pattern is **anomalous** (count <= 1), treat it as a **True Positive** and set confidence > 0.7.
    -   If the pattern is **normal behavior** (count >= 5), treat it as a **False Positive** and set confidence <= 0.5.
    -   If the pattern is in between (count > 1 and < 5), set confidence between 0.5 and 0.7.

2.  **Velocity**:
    -   A "velocity event" is defined as a cluster of 5 or more transactions within a 5-minute window.
    -   Analyze the EVIDENCE to count the number of historical velocity events, not individual transactions.
    -   Use the same confidence thresholds as rule 1 based on the count of these velocity events.

3.  **NewPayee**:
    -   A "new payee event" is defined as a transaction of over **$50,000** to a payee who was added within **7 days** of the transaction timestamp.
    -   You must carefully analyze the EVIDENCE to count the total number of these distinct historical "new payee events" for this user.
    -   Once you have the count, strictly apply these confidence rules:
        -   If the count of historical new payee events is **less than 2** (i.e., 0 or 1), this is an **anomalous** behavior. Set confidence **> 0.7**.
        -   If the count is **less than 5 but more than 1** (i.e., 2, 3, or 4), this is somewhat frequent behavior. Set confidence **between 0.5 and 0.7**.
        -   If the count is **5 or more**, this is a **normal behavior**. Set confidence **<= 0.5**.
    
4.  **FailedLoginTransfer**:
    -   Fetch the transaction amount from CONTEXT and the current balance from the EVIDENCE (account details).
    -   Calculate the percentage of the transaction amount relative to the sum of the transaction amount and current balance: `(amount / (amount + current_balance)) * 100`.
    -   If the percentage is >= 70%, treat as a **True Positive** (confidence > 0.7).
    -   If the percentage is <= 50%, treat as a **False Positive** (confidence <= 0.5).
    -   If the percentage is between 50-70%, set confidence between 0.5 and 0.7 for human review.
    -   Make sure to follow the percentage rules. % <= 50 false positive and make confidence value <= 0.5 and % >= 70 true positive and make confidence value >= 0.7 and % > 50 and < 70 human review and make confidence value between 0.5 and 0.7.
    -   For example if "percentage" >= 70 then confidence value should be > 0.7, if "percentage" <= 50 then confidence value should be <= 0.5, if "percentage" between 50 and 70 then confidence value should be between 0.5 and 0.7.
    -   For example If % = 68 then consider confidence also as 0.68 and if % = 72 then consider confidence as 0.72.   
    
5.  **HighRiskLocation**:
    -   If the transaction location is one of the high-risk locations in the RULES, it is automatically a **True Positive**.
    -   Do not perform historical checks. Set confidence > 0.7.

Return a valid JSON object with the following keys:
• **patterns**: (list of rule-names triggered)
• **risk_indicators**: (list of high-level risk factors)
• **confidence**: (float 0.0–1.0, adjusted based on the above rules)
• **evidence**: (optional supporting details, including historical counts or percentages)

make sure to give just one complete json response and return a valid JSON object, like this:

{{
    "patterns": ["HighValue"],
    "risk_indicators": ["Transaction amount above threshold for a non-frequent user."],
    "confidence": 0.85,
    "evidence": {{
        "historical_high_value_transactions_count": 0
    }}
}}
"""
            # Call the LLM
            raw_llm = await self.llm_helper.generate_response(prompt)
            print(f"[{self.agent_name}] 📥 RAW LLM RESPONSE:\n{raw_llm}\n")
            
            # Strip ``` fences & parse JSON
            if isinstance(raw_llm, str):
                text = raw_llm.strip()
                if text.startswith("```"):
                    lines = text.splitlines()
                    if lines[0].startswith("```"): lines = lines[1:]
                    if lines and lines[-1].startswith("```"): lines = lines[:-1]
                    text = "\n".join(lines).strip()
                try:
                    start_index = text.find('{')
                    end_index = text.rfind('}')
                    if start_index != -1 and end_index != -1:
                        json_text = text[start_index : end_index + 1]
                        llm_analysis = json.loads(json_text)
                    else:
                        print(f"[{self.agent_name}] ❗️ No JSON object found in LLM response, defaulting empty")
                        llm_analysis = {"patterns": [], "risk_indicators": [], "confidence": 0.0, "evidence": {}}
                except json.JSONDecodeError:
                    print(f"[{self.agent_name}] ❗️ Failed to parse LLM JSON from extracted text, defaulting empty")
                    llm_analysis = {"patterns": [], "risk_indicators": [], "confidence": 0.0, "evidence": {}}
            else:
                llm_analysis = raw_llm

            conf_val = float(llm_analysis.get("confidence", 0.0))
            base_rule = f"{alert_type}: {RULE_DEFINITIONS.get(alert_type)}"

            if conf_val >= 0.7:
                true_rule_index = 0
            elif conf_val <= 0.5:
                true_rule_index = 2
            else:
                true_rule_index = 1

            rules_used = [{"rule": base_rule, "matched": True}]
            for idx, r in enumerate(DECISION_RULES.get(alert_type, [])):
                rules_used.append({"rule": r, "matched": idx == true_rule_index})

            enhanced = {
                "llm_analysis": llm_analysis,
                "overall_confidence": conf_val,
                "risk_factors": llm_analysis.get("risk_indicators", []),
                "rules_used": rules_used
            }


            # Build the enhanced dictionary from LLM output
            # enhanced = {
            #     "llm_analysis": llm_analysis,
            #     "overall_confidence": float(llm_analysis.get("confidence", 0.0)),
            #     "risk_factors": llm_analysis.get("risk_indicators", []),
            #     "rules_used": [f"{alert_type}: {RULE_DEFINITIONS.get(alert_type)}"] + DECISION_RULES.get(alert_type, [])
            # }
        
        # --- Common logic for both paths ---
        print(f"[{self.agent_name}]     overall_confidence: {enhanced['overall_confidence']:.2f}")

        # Persist this step’s judgment
        self.log_judgement(
            alert_id=alert_id,
            action="pattern_analysis_complete",
            confidence=enhanced["overall_confidence"],
            rationale=enhanced,
            loop_iteration=loop_count
        )

        # Build the return payload
        updated_agent_outputs = state.agent_outputs.copy()
        updated_agent_outputs[self.agent_name] = enhanced

        result: Dict[str, Any] = {
            "agent_outputs": updated_agent_outputs,
            "confidence_score": enhanced["overall_confidence"],
            "risk_factors": enhanced.get("risk_factors", []),
            "loop_count": state.loop_count,
            "context_data": state.context_data,
            "evidence_collected": state.evidence_collected,
            "rules_used": enhanced.get("rules_used", {})
        }

        # Loop back if confidence too low
        if enhanced["overall_confidence"] < self.confidence_threshold and loop_count < max_loops:
            print(f"[{self.agent_name}] 🔄 looping ingestion (confidence {enhanced['overall_confidence']:.2f} < {self.confidence_threshold})")
            result["context_data"] = {
                "need_deeper_analysis": True,
                "ambiguous_patterns": enhanced.get("llm_analysis", {}) # Pass LLM analysis if it exists
            }
            result["loop_count"] = loop_count + 1
            result["success"] = False
            return result

        print(f"[{self.agent_name}] ✅ Proceeding to next agent")
        result["success"] = True
        return result
    
    # def _count_new_payee_events(self, context: Dict[str, Any], evidence: Dict[str, Any]) -> int:
    #     txns_list = self._find_evidence_list(evidence, "transaction_id", 'transactions')
    #     payee_list = context.get('payee_relationships', [])
        
    #     if not payee_list or not txns_list:
    #         return 0

    #     payee_added_dates = {p['payee_id']: datetime.fromisoformat(p['date_added_by_user']) for p in payee_list if 'date_added_by_user' in p}
        
    #     event_count = 0
    #     for tx in txns_list:
    #         payee_id = tx.get('payee_id')
    #         tx_timestamp = datetime.fromisoformat(tx.get('timestamp'))
    #         tx_amount = tx.get('amount', 0)
            
    #         if payee_id in payee_added_dates:
    #             payee_added_date = payee_added_dates[payee_id]
    #             if payee_added_date <= tx_timestamp <= payee_added_date + timedelta(days=NEW_PAYEE_WINDOW_DAYS):
    #                 if tx_amount > NEW_PAYEE_TRANSACTION_THRESHOLD:
    #                     event_count += 1
    #     return event_count

    def _count_velocity_events(self, evidence: Dict[str, Any]) -> int:
        """
        Counts the number of distinct velocity events in a user's transaction history.
        A velocity event is a cluster of 5 or more transactions within a 5-minute window.
        """
        txns_list = self._find_evidence_list(evidence, "transaction_id")
        if not txns_list:
            return 0
        
        sorted_txns = sorted(txns_list, key=lambda x: datetime.fromisoformat(x["timestamp"]))
        
        velocity_events_count = 0
        i = 0
        while i < len(sorted_txns):
            current_tx = sorted_txns[i]
            window_end_time = datetime.fromisoformat(current_tx["timestamp"]) + timedelta(minutes=VELOCITY_WINDOW_MINUTES)
            
            transactions_in_window = 0
            j = i
            while j < len(sorted_txns) and datetime.fromisoformat(sorted_txns[j]["timestamp"]) <= window_end_time:
                transactions_in_window += 1
                j += 1
            
            if transactions_in_window >= VELOCITY_THRESHOLD:
                velocity_events_count += 1
            
            i = j
            
        return velocity_events_count

    def _find_evidence_by_query_text(self, evidence: Dict[str, Any], query_part: str) -> List[Dict[str, Any]]:
        """
        Finds the results list for a query that contains a specific text part.
        Returns an empty list if not found.
        """
        for key, value in evidence.items():
            if key.endswith('_sql') and query_part in value:
                results_key = key.replace('_sql', '_results')
                return evidence.get(results_key, [])
        return []

    
    def _find_evidence_list(self, evidence: Dict[str, Any], key_field: str, preferred_key_name: str = '') -> List[Dict[str, Any]]:
        if preferred_key_name:
            for key, value in evidence.items():
                if preferred_key_name in key and isinstance(value, list) and value and key_field in value[0]:
                    return value

        candidates = [
            lst for lst in evidence.values()
            if isinstance(lst, list)
            and lst
            and isinstance(lst[0], dict)
            and key_field in lst[0]
        ]
        return max(candidates, key=lambda l: len(l)) if candidates else []
    









