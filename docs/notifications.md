# THERMOSAFE AI — Live Alert Operations & Notification Dispatch System
*Automated Citizen & Municipal Heat Alert Delivery via Meta WhatsApp Cloud API & MSG91 SMS (TRAI DLT)*

---

## 1. Architectural Overview

The THERMOSAFE AI Live Alert Operations system fans out an alert event from the existing scientific heat risk engine (HTSI / WBGT) to multi-channel delivery networks (WhatsApp & SMS) without duplicating alert logic or facts.

```
       Scientific Heat Engine (HTSI / WBGT)
                       ↓
            Alert Created (Active)
                       ↓
               RecipientResolver
        (Consent, Scope, Threshold, E.164)
                       ↓
             AlertMessageBuilder
         (Canonical Alert Data Model)
                       ↓
            NotificationOrchestrator
         (Deduplication & Idempotency)
                       ↓
      ┌─────────────────────────────────┐
      ↓                                 ↓
WhatsAppRenderer                   SMSRenderer
      ↓                                 ↓
Meta WhatsApp Cloud API           MSG91 SMS Gateway
(Approved Templates)              (TRAI DLT Compliant)
      ↓                                 ↓
Delivery Webhook Handler          Delivery Webhook Handler
      └────────────────┬────────────────┘
                       ↓
              NotificationDelivery
                       ↓
        Live Alert Operations Dashboard
```

---

## 2. Database Schema & Tables

The notification architecture adds 6 relational models in `backend/app/models/notifications.py`:

| Table Name | Primary Responsibility |
|---|---|
| `notification_preferences` | User/recipient explicit opt-in (`whatsapp_opt_in`, `sms_opt_in`), phone verification status, severity threshold (`MODERATE`, `HIGH`, `VERY_HIGH`, `EXTREME`), and ward scope. |
| `notification_templates` | Versioned regulatory template registry for approved Meta WhatsApp templates and TRAI DLT SMS templates. |
| `notification_jobs` | Database-backed queue with priority ordering, scheduled retry timestamps, attempt counter, and idempotency keys. |
| `notification_deliveries` | Audit log of every message sent, including provider message IDs, rendered message content, delivery status, and timestamps. |
| `notification_audit_logs` | Immutable security audit trail recording dispatch requests, opt-ins, opt-outs, and gateway configuration changes. |
| `notification_provider_configs` | Dynamic provider health status (`CONNECTED`, `DEGRADED`, `NOT_CONFIGURED`, `SIMULATED`). |

---

## 3. Recipient Resolution & Consent Model

Recipients are evaluated dynamically per alert:
1. **Verification**: `phone_verified == True`.
2. **Channel Consent**: Explicit `whatsapp_opt_in` or `sms_opt_in`. Consent is recorded with timestamp and source; consent is never inferred.
3. **Severity Threshold**: User-configured threshold (`MODERATE` ≥ 0.2, `HIGH` ≥ 0.4, `VERY_HIGH` ≥ 0.6, `EXTREME` ≥ 0.8).
4. **Geographic Scope**: Recipient's registered ward or citywide scope matching affected alert wards.
5. **Opt-Out Enforcement**: Immediate exclusion if `opted_out_at` is set.
6. **E.164 Phone Normalization**: Strips spaces, dashes, prepends country code (`+91`), and validates format prior to database queuing.
7. **Privacy Masking**: UI displays numbers in masked format (`+91 ******1234`).

---

## 4. Meta WhatsApp Business Platform Setup

### Prerequisites
1. Meta Business Account registered in [Meta Business Suite](https://business.facebook.com/).
2. WhatsApp Business Account (WABA) with verified phone number.
3. System User Access Token with `whatsapp_business_messaging` permissions.

### Environment Variables
```bash
WHATSAPP_ENABLED=true
WHATSAPP_API_VERSION=v19.0
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret
```

### Approved WhatsApp Template Example
Template name: `thermosafe_heat_extreme`  
Language: `en`
```
🚨 *THERMOSAFE AI — {{1}} HEAT ALERT*
━━━━━━━━━━━━━━━━━━
Dear Citizen,

Severe heat conditions detected for *{{2}}*.

📍 *Affected Wards*: {{3}}
🌡️ *HTSI Stress Index*: {{4}}
⏰ *Active Window*: {{5}}

❄️ *Nearest Cooling Shelter*: {{6}}

📋 *Recommended Safety Actions*:
• Avoid unnecessary outdoor exposure.
• Drink water regularly with ORS.
• Use designated municipal cooling centres.

🔗 *Live Dashboard*: {{7}}
━━━━━━━━━━━━━━━━━━
🏛️ *Issued by*: THERMOSAFE AI • Government of India National Heat Mission
🆔 *Alert ID*: {{8}}
```

---

## 5. Indian SMS Gateway (MSG91 & TRAI DLT Readiness)

### Regulatory Requirements
In accordance with Telecom Regulatory Authority of India (TRAI) guidelines:
1. Register Enterprise Entity on Telecom DLT Portals (Vilpower, PingConnect, Airtel DLT).
2. Approved Header/Sender ID: `JM-GOVTSAFE` (Government/Emergency Service).
3. Approved DLT Content Template ID: `1707169482910481`.

### Environment Variables
```bash
SMS_ENABLED=true
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_ID=JM-GOVTSAFE
MSG91_DLT_TEMPLATE_ID=1707169482910481
MSG91_FLOW_ID=your_msg91_flow_id
```

### Approved SMS Template Format
```
THERMOSAFE ALERT: ##severity## heat risk detected in ##wards##. HTSI ##htsi##. Time: ##window##. Stay hydrated, avoid peak outdoor exposure and use nearby cooling centres. Alert ##alert_id##.
```

---

## 6. Multi-Channel Strategy & Failover

The platform supports two dispatch strategies via `NOTIFICATION_DELIVERY_MODE`:
1. **PARALLEL** (Default): Dispatches WhatsApp and SMS simultaneously to all opted-in recipients for maximum emergency reach.
2. **FAILOVER**: Dispatches WhatsApp first; if the delivery job encounters a terminal provider failure or timeout, the orchestrator automatically escalates the alert to SMS.

---

## 7. Webhook Configuration & Security

- **WhatsApp Webhook URL**: `https://<domain>/api/notifications/webhooks/whatsapp`
- **WhatsApp Verify URL**: `https://<domain>/api/notifications/webhooks/whatsapp/verify`
- **SMS Webhook URL**: `https://<domain>/api/notifications/webhooks/sms`

### Security & Idempotency
- Signature verification: Webhook signatures are checked against `WHATSAPP_APP_SECRET`.
- Idempotency key: `alert:{alert_id}:user:{recipient_id}:chan:{channel}:v1`. If a duplicate delivery webhook is received, it updates the existing delivery record without triggering duplicate side-effects.

---

## 8. Failure Isolation & Resilience

- **Gateway Outage Isolation**: If WhatsApp or SMS APIs fail or have invalid tokens, the scientific heat risk engine, GIS maps, and alert generation continue operating without interruption.
- **Provider Health States**: `CONNECTED`, `DEGRADED`, `NOT_CONFIGURED`, `SIMULATED`.
- **Zero Fake Delivery**: When real credentials are configured, statuses strictly reflect actual provider delivery receipts. In local developer/demo mode, responses are visibly marked `SIMULATED`.
