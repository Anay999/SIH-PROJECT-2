"""Early Warning Decision Support Engine.

Translates predicted heatwave probability into operational decision-support tiers:
- NORMAL: Probability < Watch Threshold (default < 0.35)
- WATCH: Moderate elevated risk [0.35 - 0.55) -> Advisory preparedness
- WARNING: Significant heatwave probability [0.55 - 0.75) -> Municipal action, cooling shelters
- SEVERE WARNING: Extreme probability [>= 0.75) -> Emergency health response

DISCLAIMER: Model-based decision-support levels for municipal planning, not official statutory government warnings.
"""

from typing import Dict, Any

class EarlyWarningEngine:
    def __init__(
        self,
        watch_threshold: float = 0.35,
        warning_threshold: float = 0.55,
        severe_threshold: float = 0.75
    ):
        self.watch_threshold = watch_threshold
        self.warning_threshold = warning_threshold
        self.severe_threshold = severe_threshold

    def determine_risk_tier(self, probability: float) -> Dict[str, Any]:
        """Categorizes heatwave probability into an operational decision-support level."""
        p = float(probability)
        if p >= self.severe_threshold:
            tier = "SEVERE_WARNING"
            color = "#EF4444" # red-500
            description = "High probability of severe heatwave event. Immediate community protection & hospital surge activation advised."
        elif p >= self.warning_threshold:
            tier = "WARNING"
            color = "#F97316" # orange-500
            description = "Heatwave conditions probable. Municipal cooling centers, outdoor work restrictions, and water distribution recommended."
        elif p >= self.watch_threshold:
            tier = "WATCH"
            color = "#F59E0B" # amber-500
            description = "Elevated thermal risk. Public advisories and vulnerable cohort monitoring recommended."
        else:
            tier = "NORMAL"
            color = "#10B981" # emerald-500
            description = "Conditions within seasonal tolerance bounds. Standard operational state."

        return {
            "tier": tier,
            "color_hex": color,
            "probability": round(p, 4),
            "description": description,
            "disclaimer": "Model-based decision-support level for heat-action planning."
        }
