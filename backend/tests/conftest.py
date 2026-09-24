import pytest
from app.core.config import settings

@pytest.fixture(autouse=True)
def configure_test_mode(monkeypatch):
    """
    Enables mock execution mode for automated test suites so tests can run
    deterministically without requiring live external provider API keys.
    """
    monkeypatch.setattr(settings, "NOTIFICATION_MODE", "mock")
