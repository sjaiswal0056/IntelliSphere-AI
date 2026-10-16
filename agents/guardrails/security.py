"""
IntelliSphere AI — Agent Security Guardrails & Prompt Injection Defenses
Protects against prompt injection, unauthorized code execution,
path traversal, and sensitive data leakage.
"""

import re
import os
from typing import Tuple

INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"(?i)disregard\s+(all\s+)?guidelines",
    r"(?i)reveal\s+(system\s+)?prompt",
    r"(?i)show\s+secret\s+key",
    r"(?i)system\s+prompt\s+override",
    r"(?i)jailbreak",
    r"(?i)drop\s+table",
    r"(?i)exec\s*\(",
    r"(?i)eval\s*\(",
    r"(?i)__import__"
]

def sanitize_user_prompt(text: str) -> Tuple[bool, str]:
    """Inspects text for adversarial prompt injection attempts."""
    if not text:
        return True, ""
    
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text):
            return False, "Input rejected by IntelliSphere AI Security Guardrails: adversarial or unauthorized command pattern detected."
    
    return True, text.strip()

def validate_safe_file_path(base_dir: str, file_path: str) -> bool:
    """Verifies that the target file path resides strictly inside the intended directory."""
    try:
        resolved_base = os.path.realpath(base_dir)
        resolved_target = os.path.realpath(file_path)
        return resolved_target.startswith(resolved_base) and os.path.exists(resolved_target)
    except Exception:
        return False
