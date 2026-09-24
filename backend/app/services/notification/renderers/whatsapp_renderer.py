from app.services.notification.message_builder import CanonicalAlertMessage

class WhatsAppRenderer:
    @staticmethod
    def render(msg: CanonicalAlertMessage, recipient_name: str = "Citizen") -> str:
        """
        Renders a rich WhatsApp alert formatted with bold markers, emojis,
        vital heat indicators, cooling shelter guidance, and emergency links.
        """
        severity_emoji = "🚨" if msg.severity in ["EXTREME", "VERY_HIGH"] else "⚠️"
        wards_str = ", ".join(msg.affected_wards[:3])
        
        actions_str = "\n".join([f"• {action}" for action in msg.recommended_actions[:4]])
        
        cooling_line = ""
        if msg.cooling_centre_name:
            cooling_line = f"\n❄️ *Nearest Cooling Shelter*: {msg.cooling_centre_name} (Helpline: {msg.cooling_centre_contact or '1077'})\n"

        text = (
            f"{severity_emoji} *THERMOSAFE AI — {msg.severity} HEAT ALERT*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"Dear {recipient_name},\n\n"
            f"Severe heat conditions detected for *{msg.location_label}*.\n\n"
            f"📍 *Affected Wards*: {wards_str}\n"
            f"🌡️ *HTSI Stress Index*: {msg.htsi:.2f}\n"
            f"⏰ *Active Window*: {msg.time_window}\n"
            f"{cooling_line}\n"
            f"📋 *Recommended Safety Actions*:\n"
            f"{actions_str}\n\n"
            f"🔗 *Live Dashboard & Routing*: {msg.dashboard_url}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🏛️ *Issued by*: {msg.issued_by}\n"
            f"🆔 *Alert ID*: {msg.alert_id} • {msg.issued_at_ist}"
        )
        return text.strip()
