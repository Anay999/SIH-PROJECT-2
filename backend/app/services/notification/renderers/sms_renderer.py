from app.services.notification.message_builder import CanonicalAlertMessage

class SMSRenderer:
    @staticmethod
    def render(msg: CanonicalAlertMessage) -> str:
        """
        Renders a concise, regulatory-compliant SMS text message conforming to
        TRAI / DLT template constraints while preserving identical facts.
        """
        wards_str = ", ".join(msg.affected_wards[:3])
        text = (
            f"THERMOSAFE ALERT: {msg.severity} heat risk detected in {wards_str}. "
            f"HTSI {msg.htsi:.2f}. Time: {msg.time_window}. Stay hydrated, avoid peak outdoor exposure and "
            f"use municipal cooling centres. Helpline: 1077. Alert {msg.alert_id}."
        )
        return text.strip()
