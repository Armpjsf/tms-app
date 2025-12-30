"""
Alert Service for LOGIS-PRO 360
Centralized alert/notification management
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from data.repository import repo
from config.constants import JobStatus, PaymentStatus

class AlertType:
    JOB_DELAY = "JOB_DELAY"
    MAINTENANCE = "MAINTENANCE"
    DOCUMENT_EXPIRY = "DOCUMENT_EXPIRY"
    PAYMENT_DUE = "PAYMENT_DUE"
    LOW_STOCK = "LOW_STOCK"
    GPS_OFFLINE = "GPS_OFFLINE"
    
    ALL = [JOB_DELAY, MAINTENANCE, DOCUMENT_EXPIRY, PAYMENT_DUE, LOW_STOCK, GPS_OFFLINE]
    
    ICONS = {
        JOB_DELAY: "🚨",
        MAINTENANCE: "🔧",
        DOCUMENT_EXPIRY: "📄",
        PAYMENT_DUE: "💰",
        LOW_STOCK: "📦",
        GPS_OFFLINE: "📍"
    }
    
    LABELS = {
        "th": {
            JOB_DELAY: "งานล่าช้า",
            MAINTENANCE: "ซ่อมบำรุง",
            DOCUMENT_EXPIRY: "เอกสารหมดอายุ",
            PAYMENT_DUE: "รอชำระเงิน",
            LOW_STOCK: "สต็อกต่ำ",
            GPS_OFFLINE: "GPS ออฟไลน์"
        },
        "en": {
            JOB_DELAY: "Job Delay",
            MAINTENANCE: "Maintenance",
            DOCUMENT_EXPIRY: "Document Expiry",
            PAYMENT_DUE: "Payment Due",
            LOW_STOCK: "Low Stock",
            GPS_OFFLINE: "GPS Offline"
        }
    }

class AlertSeverity:
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    
    COLORS = {
        CRITICAL: "#d32f2f",
        HIGH: "#f57c00",
        MEDIUM: "#fbc02d",
        LOW: "#388e3c"
    }
    
    ICONS = {
        CRITICAL: "🔴",
        HIGH: "🟠",
        MEDIUM: "🟡",
        LOW: "🟢"
    }


class AlertService:
    
    @staticmethod
    def _get_dismissed_file():
        return "data/local_storage/dismissed_alerts.json"
        
    @staticmethod
    def _get_seen_file():
        return "data/local_storage/seen_timestamps.json"

    @staticmethod
    def _get_state_file():
        return "data/local_storage/alert_state.json"

    @staticmethod
    def _load_seen_timestamps():
        """Load {id: timestamp} map."""
        if 'seen_timestamps' not in st.session_state:
             st.session_state.seen_timestamps = {}
             try:
                 import json, os
                 path = AlertService._get_seen_file()
                 if os.path.exists(path):
                     with open(path, 'r') as f:
                         st.session_state.seen_timestamps = json.load(f)
             except: pass
        return st.session_state.seen_timestamps

    @staticmethod
    def _save_seen_timestamps():
        try:
             import json, os
             path = AlertService._get_seen_file()
             os.makedirs(os.path.dirname(path), exist_ok=True)
             with open(path, 'w') as f:
                 json.dump(st.session_state.seen_timestamps, f)
        except: pass

    @staticmethod
    def _load_dismissed_alerts():
        """Load dismissed IDs from file."""
        if 'dismissed_alerts' not in st.session_state:
             st.session_state.dismissed_alerts = set()
             try:
                 import json, os
                 path = AlertService._get_dismissed_file()
                 if os.path.exists(path):
                     with open(path, 'r') as f:
                         saved = json.load(f)
                         st.session_state.dismissed_alerts = set(saved)
             except: pass
        return st.session_state.dismissed_alerts

    @staticmethod
    def _save_dismissed_alerts():
        try:
             import json, os
             path = AlertService._get_dismissed_file()
             os.makedirs(os.path.dirname(path), exist_ok=True)
             with open(path, 'w') as f:
                 json.dump(list(st.session_state.dismissed_alerts), f)
        except: pass

    @staticmethod
    def get_last_viewed_time():
        """Get timestamp when user last opened the alerts page."""
        try:
            import json, os
            path = AlertService._get_state_file()
            if os.path.exists(path):
                with open(path, 'r') as f:
                    data = json.load(f)
                    return datetime.fromisoformat(data.get("last_viewed", "2000-01-01"))
        except: pass
        return datetime.min

    @staticmethod
    def mark_all_read():
        """Update last viewed timestamp to NOW."""
        try:
            import json, os
            path = AlertService._get_state_file()
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w') as f:
                json.dump({"last_viewed": datetime.now().isoformat()}, f)
        except: pass

    @staticmethod
    def get_unread_count() -> int:
        """Count alerts created AFTER last view."""
        last_viewed = AlertService.get_last_viewed_time()
        # Get raw active alerts (ignoring dismissed)
        alerts = AlertService.get_all_alerts()
        
        count = 0
        for a in alerts:
            try:
                created = datetime.fromisoformat(a['created_at'])
                if created > last_viewed:
                    count += 1
            except: pass
        return count

    @staticmethod
    def dismiss_alert(alert_id: str):
        """Dismiss an alert (delete from history)."""
        AlertService._load_dismissed_alerts()
        st.session_state.dismissed_alerts.add(alert_id)
        AlertService._save_dismissed_alerts()

    @staticmethod
    def dismiss_all_alerts(alerts: list):
        """Dismiss all provided alerts."""
        AlertService._load_dismissed_alerts()
        for a in alerts:
            st.session_state.dismissed_alerts.add(a['id'])
        AlertService._save_dismissed_alerts()

    @staticmethod
    def get_all_alerts(lang: str = "th") -> list:
        """Get all active alerts filters by dismissed."""
        # Ensure loaded
        dismissed = AlertService._load_dismissed_alerts()
        seen_map = AlertService._load_seen_timestamps()
        
        raw_alerts = []
        # 1. Job Delays
        raw_alerts.extend(AlertService._get_job_delay_alerts(lang))
        # 2. Maintenance Alerts
        raw_alerts.extend(AlertService._get_maintenance_alerts(lang))
        # 3. Document Expiry
        raw_alerts.extend(AlertService._get_document_expiry_alerts(lang))
        # 4. Payment Due
        raw_alerts.extend(AlertService._get_payment_due_alerts(lang))
        
        # Process Timestamps
        updated_seen = False
        processed_alerts = []
        
        for a in raw_alerts:
            aid = a['id']
            if aid in dismissed: continue
            
            # Use stored timestamp if exists, else keep existing (which is Now) and store it
            if aid in seen_map:
                a['created_at'] = seen_map[aid]
            else:
                # First time seeing this ID
                seen_map[aid] = a['created_at']
                updated_seen = True
            
            processed_alerts.append(a)
            
        if updated_seen:
            AlertService._save_seen_timestamps()
        
        # Sort by severity
        severity_order = {
            AlertSeverity.CRITICAL: 0,
            AlertSeverity.HIGH: 1,
            AlertSeverity.MEDIUM: 2,
            AlertSeverity.LOW: 3
        }
        
        processed_alerts.sort(key=lambda x: severity_order.get(x.get("severity"), 99))
        
        return processed_alerts

    @staticmethod
    def detect_new_alerts() -> list:
        """Check for NEW alerts since last check."""
        try:
            # Get current alerts
            current_alerts = AlertService.get_all_alerts()
            current_ids = {a['id'] for a in current_alerts}
            
            # Get previous alerts from session
            if 'last_alert_ids' not in st.session_state:
                st.session_state.last_alert_ids = current_ids
                return [] # First run, no 'new' alerts
                
            previous_ids = st.session_state.last_alert_ids
            
            # Find new IDs
            new_ids = current_ids - previous_ids
            new_alerts = [a for a in current_alerts if a['id'] in new_ids]
            
            # Update session
            st.session_state.last_alert_ids = current_ids
            
            return new_alerts
        except Exception as e:
            return []
    
    @staticmethod
    def _get_job_delay_alerts(lang: str) -> list:
        """Check for delayed jobs."""
        alerts = []
        jobs = repo.get_data("Jobs_Main")
        
        if jobs.empty:
            return alerts
        
        today = datetime.now().date()
        jobs['Plan_Date'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        
        # Jobs that are past due but not completed
        overdue = jobs[
            (jobs['Plan_Date'].dt.date < today) & 
            (~jobs['Job_Status'].isin([JobStatus.COMPLETED, JobStatus.CANCELLED]))
        ]
        
        for _, job in overdue.iterrows():
            days_late = (today - job['Plan_Date'].date()).days
            
            severity = AlertSeverity.CRITICAL if days_late > 3 else (
                AlertSeverity.HIGH if days_late > 1 else AlertSeverity.MEDIUM
            )
            
            msg_th = f"งาน {job['Job_ID']} ล่าช้า {days_late} วัน"
            msg_en = f"Job {job['Job_ID']} is {days_late} days late"
            
            alerts.append({
                "id": f"delay_{job['Job_ID']}",
                "type": AlertType.JOB_DELAY,
                "severity": severity,
                "title": AlertType.LABELS[lang][AlertType.JOB_DELAY],
                "message": msg_th if lang == "th" else msg_en,
                "ref_id": job['Job_ID'],
                "created_at": datetime.now().isoformat()
            })
        
        return alerts
    
    @staticmethod
    def _get_maintenance_alerts(lang: str) -> list:
        """Check for maintenance due."""
        alerts = []
        drivers = repo.get_data("Master_Drivers")
        
        if drivers.empty:
            return alerts
        
        for _, d in drivers.iterrows():
            try:
                current_km = pd.to_numeric(d.get('Current_Mileage', 0), errors='coerce') or 0
                next_service = pd.to_numeric(d.get('Next_Service_Mileage', 0), errors='coerce') or 0
                
                if next_service > 0:
                    km_left = next_service - current_km
                    
                    if km_left <= 0:
                        severity = AlertSeverity.CRITICAL
                        msg_th = f"รถ {d['Vehicle_Plate']} เลยกำหนดเซอร์วิส {abs(km_left):.0f} กม."
                        msg_en = f"Vehicle {d['Vehicle_Plate']} is {abs(km_left):.0f} km overdue for service"
                    elif km_left < 500:
                        severity = AlertSeverity.HIGH
                        msg_th = f"รถ {d['Vehicle_Plate']} ใกล้ถึงกำหนดเซอร์วิส (เหลือ {km_left:.0f} กม.)"
                        msg_en = f"Vehicle {d['Vehicle_Plate']} service due in {km_left:.0f} km"
                    else:
                        continue
                    
                    alerts.append({
                        "id": f"maint_{d['Vehicle_Plate']}",
                        "type": AlertType.MAINTENANCE,
                        "severity": severity,
                        "title": AlertType.LABELS[lang][AlertType.MAINTENANCE],
                        "message": msg_th if lang == "th" else msg_en,
                        "ref_id": d['Vehicle_Plate'],
                        "created_at": datetime.now().isoformat()
                    })
            except:
                pass
        
        return alerts
    
    @staticmethod
    def _get_document_expiry_alerts(lang: str) -> list:
        """Check for expiring documents."""
        alerts = []
        drivers = repo.get_data("Master_Drivers")
        
        if drivers.empty:
            return alerts
        
        today = datetime.now()
        doc_cols = {
            'Insurance_Expiry': 'ประกันภัย' if lang == 'th' else 'Insurance',
            'Tax_Expiry': 'ภาษีรถ' if lang == 'th' else 'Road Tax',
            'Act_Expiry': 'พ.ร.บ.' if lang == 'th' else 'Act'
        }
        
        for _, d in drivers.iterrows():
            for col, doc_name in doc_cols.items():
                if col in drivers.columns:
                    try:
                        exp_date = pd.to_datetime(d[col], errors='coerce')
                        if pd.notna(exp_date):
                            days_left = (exp_date - today).days
                            
                            if days_left < 0:
                                severity = AlertSeverity.CRITICAL
                                msg_th = f"รถ {d['Vehicle_Plate']} - {doc_name} หมดอายุแล้ว!"
                                msg_en = f"Vehicle {d['Vehicle_Plate']} - {doc_name} has expired!"
                            elif days_left < 14:
                                severity = AlertSeverity.HIGH
                                msg_th = f"รถ {d['Vehicle_Plate']} - {doc_name} จะหมดอายุใน {days_left} วัน"
                                msg_en = f"Vehicle {d['Vehicle_Plate']} - {doc_name} expires in {days_left} days"
                            elif days_left < 30:
                                severity = AlertSeverity.MEDIUM
                                msg_th = f"รถ {d['Vehicle_Plate']} - {doc_name} จะหมดอายุใน {days_left} วัน"
                                msg_en = f"Vehicle {d['Vehicle_Plate']} - {doc_name} expires in {days_left} days"
                            else:
                                continue
                            
                            alerts.append({
                                "id": f"doc_{d['Vehicle_Plate']}_{col}",
                                "type": AlertType.DOCUMENT_EXPIRY,
                                "severity": severity,
                                "title": AlertType.LABELS[lang][AlertType.DOCUMENT_EXPIRY],
                                "message": msg_th if lang == "th" else msg_en,
                                "ref_id": d['Vehicle_Plate'],
                                "created_at": datetime.now().isoformat()
                            })
                    except:
                        pass
        
        return alerts
    
    @staticmethod
    def _get_payment_due_alerts(lang: str) -> list:
        """Check for pending payments."""
        alerts = []
        jobs = repo.get_data("Jobs_Main")
        
        if jobs.empty:
            return alerts
        
        # Driver payments pending
        pending_driver = jobs[jobs['Payment_Status'].isin(['รอจ่าย', 'Pending', PaymentStatus.PENDING])]
        
        if len(pending_driver) > 0:
            total = pd.to_numeric(
                pending_driver['Cost_Driver_Total'].astype(str).str.replace(',', ''),
                errors='coerce'
            ).sum()
            
            msg_th = f"มี {len(pending_driver)} งานรอจ่ายคนขับ รวม ฿{total:,.0f}"
            msg_en = f"{len(pending_driver)} jobs pending driver payment, total ฿{total:,.0f}"
            
            alerts.append({
                "id": "payment_driver",
                "type": AlertType.PAYMENT_DUE,
                "severity": AlertSeverity.HIGH if len(pending_driver) > 10 else AlertSeverity.MEDIUM,
                "title": AlertType.LABELS[lang][AlertType.PAYMENT_DUE],
                "message": msg_th if lang == "th" else msg_en,
                "ref_id": "driver_payment",
                "created_at": datetime.now().isoformat()
            })
        
        # Customer billing pending
        pending_billing = jobs[jobs['Billing_Status'].isin(['รอวางบิล', 'Pending'])]
        
        if len(pending_billing) > 0:
            total = pd.to_numeric(
                pending_billing['Price_Cust_Total'].astype(str).str.replace(',', ''),
                errors='coerce'
            ).sum()
            
            msg_th = f"มี {len(pending_billing)} งานรอวางบิล รวม ฿{total:,.0f}"
            msg_en = f"{len(pending_billing)} jobs pending billing, total ฿{total:,.0f}"
            
            alerts.append({
                "id": "payment_billing",
                "type": AlertType.PAYMENT_DUE,
                "severity": AlertSeverity.MEDIUM,
                "title": AlertType.LABELS[lang][AlertType.PAYMENT_DUE],
                "message": msg_th if lang == "th" else msg_en,
                "ref_id": "customer_billing",
                "created_at": datetime.now().isoformat()
            })
        
        return alerts
    
    @staticmethod
    def get_alert_count() -> dict:
        """Get count of alerts by severity."""
        alerts = AlertService.get_all_alerts()
        
        counts = {
            "total": len(alerts),
            AlertSeverity.CRITICAL: 0,
            AlertSeverity.HIGH: 0,
            AlertSeverity.MEDIUM: 0,
            AlertSeverity.LOW: 0
        }
        
        for alert in alerts:
            sev = alert.get("severity")
            if sev in counts:
                counts[sev] += 1
        return counts
