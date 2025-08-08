from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum

class TransactionType(str, Enum):
    ATM_WITHDRAWAL = "ATM Withdrawal"
    CREDIT = "credit"
    DEBIT = "debit"
    TRANSFER = "transfer"

class AlertType(str, Enum):
    CROSS_CHANNEL = "CrossChannel"
    FAILED_LOGIN_TRANSFER = "FailedLoginTransfer"
    GEO_MISMATCH = "GeoMismatch"
    HIGH_RISK_LOCATION = "HighRiskLocation"
    HIGH_VALUE = "HighValue"
    NEW_PAYEE = "NewPayee"
    STRUCTURING = "Structuring"
    VELOCITY = "Velocity"

class OutcomeType(str, Enum):
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"
    UNDER_INVESTIGATION = "under_investigation"
    AUTO_CLOSED = "auto_closed"

# Note: The WorkflowState class is now removed from this file.