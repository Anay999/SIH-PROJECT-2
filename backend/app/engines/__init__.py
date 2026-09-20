from app.engines.heat_index_engine import calculate_heat_index, HeatIndexResult
from app.engines.wbgt_engine import calculate_wbgt, WBGTResult
from app.engines.utci_engine import calculate_utci, UTCIResult
from app.engines.htsi_engine import calculate_htsi, HTSIResult
from app.engines.vulnerability_engine import (
    compute_vulnerability,
    VulnerabilityResult,
    VulnerabilityBreakdown,
    DEFAULT_VULNERABILITY_WEIGHTS,
)
from app.engines.mortality_engine import (
    calculate_hamri_and_surge,
    HealthRiskResult,
    UncertaintyBand,
    ExcessMortalityEstimate,
    HospitalSurgeDemand,
    MORTALITY_DISCLAIMER,
)

__all__ = [
    "calculate_heat_index",
    "HeatIndexResult",
    "calculate_wbgt",
    "WBGTResult",
    "calculate_utci",
    "UTCIResult",
    "calculate_htsi",
    "HTSIResult",
    "compute_vulnerability",
    "VulnerabilityResult",
    "VulnerabilityBreakdown",
    "DEFAULT_VULNERABILITY_WEIGHTS",
    "calculate_hamri_and_surge",
    "HealthRiskResult",
    "UncertaintyBand",
    "ExcessMortalityEstimate",
    "HospitalSurgeDemand",
    "MORTALITY_DISCLAIMER",
]
