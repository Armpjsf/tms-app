"""
Unit tests for Alert Service
Tests alert generation, dismissal, and notification logic
"""

import pytest
from unittest.mock import patch, MagicMock, mock_open
import pandas as pd
from datetime import datetime, timedelta
from services.alert_service import AlertService, AlertType, AlertSeverity


class TestAlertTypes:
    """Test alert type constants"""
    
    def test_alert_types_defined(self):
        """Test that all alert types are defined"""
        assert AlertType.JOB_DELAY == "JOB_DELAY"
        assert AlertType.MAINTENANCE == "MAINTENANCE"
        assert AlertType.DOCUMENT_EXPIRY == "DOCUMENT_EXPIRY"
        assert AlertType.PAYMENT_DUE == "PAYMENT_DUE"
        assert AlertType.LOW_STOCK == "LOW_STOCK"
        assert AlertType.GPS_OFFLINE == "GPS_OFFLINE"
    
    def test_alert_icons(self):
        """Test that icons are defined for all types"""
        assert AlertType.JOB_DELAY in AlertType.ICONS
        assert AlertType.MAINTENANCE in AlertType.ICONS
        assert len(AlertType.ICONS) >= 6
    
    def test_alert_labels(self):
        """Test that labels exist for both languages"""
        assert "th" in AlertType.LABELS
        assert "en" in AlertType.LABELS
        assert AlertType.JOB_DELAY in AlertType.LABELS["th"]
        assert AlertType.JOB_DELAY in AlertType.LABELS["en"]


class TestAlertSeverity:
    """Test alert severity levels"""
    
    def test_severity_levels_defined(self):
        """Test that all severity levels are defined"""
        assert AlertSeverity.CRITICAL == "CRITICAL"
        assert AlertSeverity.HIGH == "HIGH"
        assert AlertSeverity.MEDIUM == "MEDIUM"
        assert AlertSeverity.LOW == "LOW"
    
    def test_severity_colors(self):
        """Test that colors are defined for all severities"""
        assert AlertSeverity.CRITICAL in AlertSeverity.COLORS
        assert AlertSeverity.HIGH in AlertSeverity.COLORS
        assert len(AlertSeverity.COLORS) == 4
    
    def test_severity_icons(self):
        """Test that icons are defined for all severities"""
        assert AlertSeverity.CRITICAL in AlertSeverity.ICONS
        assert AlertSeverity.ICONS[AlertSeverity.CRITICAL] == "🔴"


class TestJobDelayAlerts:
    """Test job delay alert generation"""
    
    @patch('data.repository.repo')
    def test_job_delay_alerts_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        alerts = AlertService._get_job_delay_alerts("th")
        
        assert alerts == []
    
    @patch('data.repository.repo')
    def test_job_delay_alerts_overdue(self, mock_repo):
        """Test detection of overdue jobs"""
        # Setup - job that's 2 days late
        past_date = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        jobs_df = pd.DataFrame([{
            "Job_ID": "JOB-001",
            "Plan_Date": past_date,
            "Job_Status": "New"
        }])
        mock_repo.get_data.return_value = jobs_df
        
        alerts = AlertService._get_job_delay_alerts("th")
        
        assert len(alerts) == 1
        assert alerts[0]["type"] == AlertType.JOB_DELAY
        assert alerts[0]["severity"] == AlertSeverity.HIGH
        assert "JOB-001" in alerts[0]["message"]
    
    @patch('data.repository.repo')
    def test_job_delay_critical_severity(self, mock_repo):
        """Test that jobs >3 days late are CRITICAL"""
        # Setup - job that's 5 days late
        past_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        jobs_df = pd.DataFrame([{
            "Job_ID": "JOB-002",
            "Plan_Date": past_date,
            "Job_Status": "Assigned"
        }])
        mock_repo.get_data.return_value = jobs_df
        
        alerts = AlertService._get_job_delay_alerts("th")
        
        assert len(alerts) == 1
        assert alerts[0]["severity"] == AlertSeverity.CRITICAL
    
    @patch('data.repository.repo')
    def test_completed_jobs_no_alert(self, mock_repo):
        """Test that completed jobs don't generate alerts"""
        past_date = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        jobs_df = pd.DataFrame([{
            "Job_ID": "JOB-003",
            "Plan_Date": past_date,
            "Job_Status": "Completed"
        }])
        mock_repo.get_data.return_value = jobs_df
        
        alerts = AlertService._get_job_delay_alerts("th")
        
        assert len(alerts) == 0


class TestMaintenanceAlerts:
    """Test maintenance alert generation"""
    
    @patch('data.repository.repo')
    def test_maintenance_alerts_empty(self, mock_repo):
        """Test with no drivers"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        alerts = AlertService._get_maintenance_alerts("th")
        
        assert alerts == []
    
    @patch('data.repository.repo')
    def test_maintenance_overdue(self, mock_repo):
        """Test detection of overdue maintenance"""
        drivers_df = pd.DataFrame([{
            "Vehicle_Plate": "AB-1234",
            "Current_Mileage": 50000,
            "Next_Service_Mileage": 49000  # Overdue!
        }])
        mock_repo.get_data.return_value = drivers_df
        
        alerts = AlertService._get_maintenance_alerts("th")
        
        assert len(alerts) == 1
        assert alerts[0]["type"] == AlertType.MAINTENANCE
        assert alerts[0]["severity"] == AlertSeverity.CRITICAL
        assert "AB-1234" in alerts[0]["message"]
    
    @patch('data.repository.repo')
    def test_maintenance_due_soon(self, mock_repo):
        """Test detection of maintenance due soon"""
        drivers_df = pd.DataFrame([{
            "Vehicle_Plate": "XY-5678",
            "Current_Mileage": 49600,
            "Next_Service_Mileage": 50000  # 400 km left
        }])
        mock_repo.get_data.return_value = drivers_df
        
        alerts = AlertService._get_maintenance_alerts("th")
        
        assert len(alerts) == 1
        assert alerts[0]["severity"] == AlertSeverity.HIGH


class TestDocumentExpiryAlerts:
    """Test document expiry alert generation"""
    
    @patch('data.repository.repo')
    def test_document_expiry_alerts_empty(self, mock_repo):
        """Test with no drivers"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        alerts = AlertService._get_document_expiry_alerts("th")
        
        assert alerts == []
    
    @patch('data.repository.repo')
    def test_document_expired(self, mock_repo):
        """Test detection of expired documents"""
        past_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        drivers_df = pd.DataFrame([{
            "Vehicle_Plate": "AB-1234",
            "Insurance_Expiry": past_date
        }])
        mock_repo.get_data.return_value = drivers_df
        
        alerts = AlertService._get_document_expiry_alerts("th")
        
        assert len(alerts) == 1
        assert alerts[0]["type"] == AlertType.DOCUMENT_EXPIRY
        assert alerts[0]["severity"] == AlertSeverity.CRITICAL
    
    @patch('data.repository.repo')
    def test_document_expiring_soon(self, mock_repo):
        """Test detection of documents expiring soon"""
        future_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        drivers_df = pd.DataFrame([{
            "Vehicle_Plate": "XY-5678",
            "Tax_Expiry": future_date
        }])
        mock_repo.get_data.return_value = drivers_df
        
        alerts = AlertService._get_document_expiry_alerts("th")
        
        assert len(alerts) == 1
        assert alerts[0]["severity"] == AlertSeverity.HIGH


class TestPaymentDueAlerts:
    """Test payment due alert generation"""
    
    @patch('data.repository.repo')
    def test_payment_due_alerts_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        alerts = AlertService._get_payment_due_alerts("th")
        
        assert alerts == []
    
    @patch('data.repository.repo')
    def test_driver_payment_pending(self, mock_repo):
        """Test detection of pending driver payments"""
        jobs_df = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Payment_Status": "Pending",
                "Cost_Driver_Total": "1000",
                "Billing_Status": "Completed"  # Add this column
            },
            {
                "Job_ID": "JOB-002",
                "Payment_Status": "รอจ่าย",
                "Cost_Driver_Total": "2000",
                "Billing_Status": "Completed"
            }
        ])
        mock_repo.get_data.return_value = jobs_df
        
        alerts = AlertService._get_payment_due_alerts("th")
        
        # Should have 1 alert for driver payment
        driver_alerts = [a for a in alerts if a["id"] == "payment_driver"]
        assert len(driver_alerts) == 1
        assert "3000" in driver_alerts[0]["message"] or "3,000" in driver_alerts[0]["message"]
    
    @patch('data.repository.repo')
    def test_billing_pending(self, mock_repo):
        """Test detection of pending billing"""
        jobs_df = pd.DataFrame([
            {
                "Job_ID": "JOB-003",
                "Billing_Status": "รอวางบิล",
                "Price_Cust_Total": "5000",
                "Payment_Status": "Paid"  # Add this column
            }
        ])
        mock_repo.get_data.return_value = jobs_df
        
        alerts = AlertService._get_payment_due_alerts("th")
        
        billing_alerts = [a for a in alerts if a["id"] == "payment_billing"]
        assert len(billing_alerts) == 1


class TestAlertDismissal:
    """Test alert dismissal functionality"""
    
    @patch('services.alert_service.st')
    @patch('builtins.open', new_callable=mock_open)
    def test_dismiss_alert(self, mock_file, mock_st):
        """Test dismissing a single alert"""
        mock_st.session_state.dismissed_alerts = set()
        
        AlertService.dismiss_alert("test_alert_1")
        
        assert "test_alert_1" in mock_st.session_state.dismissed_alerts
    
    @patch('services.alert_service.st')
    @patch('builtins.open', new_callable=mock_open)
    def test_dismiss_all_alerts(self, mock_file, mock_st):
        """Test dismissing multiple alerts"""
        mock_st.session_state.dismissed_alerts = set()
        
        alerts = [
            {"id": "alert_1"},
            {"id": "alert_2"},
            {"id": "alert_3"}
        ]
        
        AlertService.dismiss_all_alerts(alerts)
        
        assert len(mock_st.session_state.dismissed_alerts) == 3


class TestAlertCount:
    """Test alert counting"""
    
    @patch('services.alert_service.AlertService.get_all_alerts')
    def test_get_alert_count(self, mock_get_alerts):
        """Test counting alerts by severity"""
        mock_get_alerts.return_value = [
            {"severity": AlertSeverity.CRITICAL},
            {"severity": AlertSeverity.CRITICAL},
            {"severity": AlertSeverity.HIGH},
            {"severity": AlertSeverity.MEDIUM}
        ]
        
        counts = AlertService.get_alert_count()
        
        assert counts["total"] == 4
        assert counts[AlertSeverity.CRITICAL] == 2
        assert counts[AlertSeverity.HIGH] == 1
        assert counts[AlertSeverity.MEDIUM] == 1
        assert counts[AlertSeverity.LOW] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
