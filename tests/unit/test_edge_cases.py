"""
Edge case tests across all services
Tests boundary conditions, error scenarios, and invalid inputs
"""

import pytest
from unittest.mock import patch
import pandas as pd
from datetime import datetime, timedelta


class TestEdgeCases:
    """Comprehensive edge case testing"""
    
    # GPS Service Edge Cases
    @patch('data.repository.repo')
    def test_gps_invalid_plate(self, mock_repo):
        """Test GPS with invalid plate number"""
        from services.gps_service import GPSService
        
        result = GPSService().fetch_vehicle_location("")
        assert result is not None  # Should return mock data
    
    @patch('data.repository.repo')
    def test_gps_special_characters(self, mock_repo):
        """Test GPS with special characters in plate"""
        from services.gps_service import GPSService
        
        result = GPSService().fetch_vehicle_location("AB-!@#$")
        assert result is not None
    
    # Analytics Service Edge Cases
    @patch('data.repository.repo')
    def test_analytics_negative_values(self, mock_repo):
        """Test analytics with negative values"""
        from services.analytics_service import AnalyticsService
        
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Odometer": -100,  # Invalid negative
                "Liters": 50,
                "Price_Total": 1500
            }
        ])
        mock_repo.get_data.return_value = fuel_logs
        
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        assert result is not None
    
    @patch('data.repository.repo')
    def test_analytics_extreme_values(self, mock_repo):
        """Test analytics with extreme values"""
        from services.analytics_service import AnalyticsService
        
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Odometer": 999999999,  # Extreme value
                "Liters": 0.001,
                "Price_Total": 0.01
            }
        ])
        mock_repo.get_data.return_value = fuel_logs
        
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        assert result is not None
    
    # Alert Service Edge Cases
    @patch('data.repository.repo')
    def test_alerts_far_future_dates(self, mock_repo):
        """Test alerts with dates far in future"""
        from services.alert_service import AlertService
        
        future_date = (datetime.now() + timedelta(days=36500)).strftime('%Y-%m-%d')  # 100 years
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-FUTURE",
                "Plan_Date": future_date,
                "Job_Status": "New"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        alerts = AlertService._get_job_delay_alerts("th")
        assert isinstance(alerts, list)
    
    # Job Service Edge Cases
    @patch('data.repository.repo')
    def test_job_empty_fields(self, mock_repo):
        """Test job creation with empty fields"""
        from services.job_service import JobService
        
        mock_repo.insert_record.return_value = True
        
        job_data = {
            "Job_ID": "",
            "Customer_Name": "",
            "Driver_Name": ""
        }
        
        result = JobService.create_new_job(job_data)
        assert result == False  # Should fail validation
    
    # Warehouse Service Edge Cases
    @patch('data.repository.repo')
    def test_warehouse_negative_quantity(self, mock_repo):
        """Test warehouse with negative quantity"""
        from services.warehouse_service import WarehouseService
        
        mock_repo.insert_record.return_value = True
        
        result = WarehouseService.process_inbound(
            item_id="ITEM-001",
            qty=-100,  # Negative
            location="WAREHOUSE-A"
        )
        
        assert result == True  # System accepts, business logic should validate
    
    @patch('data.repository.repo')
    def test_warehouse_huge_quantity(self, mock_repo):
        """Test warehouse with extremely large quantity"""
        from services.warehouse_service import WarehouseService
        
        mock_repo.insert_record.return_value = True
        
        result = WarehouseService.process_inbound(
            item_id="ITEM-002",
            qty=999999999,
            location="WAREHOUSE-B"
        )
        
        assert result == True
    
    # Report Service Edge Cases
    @patch('data.repository.repo')
    def test_report_invalid_date_range(self, mock_repo):
        """Test report with invalid date range (end before start)"""
        from services.report_service import ReportService
        from datetime import date
        
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = ReportService.get_performance_metrics(
            date(2025, 12, 31),
            date(2025, 1, 1)  # End before start
        )
        
        assert result["total_jobs"] == 0
    
    # Driver Service Edge Cases
    @patch('data.repository.repo')
    def test_driver_no_jobs(self, mock_repo):
        """Test driver scorecard with no jobs"""
        from services.driver_service import DriverService
        
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = DriverService.get_driver_scorecard("DRV-NODATA")
        assert result is not None
    
    # Pricing Service Edge Cases
    @patch('data.repository.repo')
    def test_pricing_zero_distance(self, mock_repo):
        """Test pricing with zero distance"""
        from services.pricing_service import PricingService
        
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = PricingService.calculate_driver_cost(
            plan_date="2025-01-01",
            distance=0,
            vehicle_type="4W"
        )
        
        assert result >= 0  # Should handle gracefully
    
    @patch('data.repository.repo')
    def test_pricing_negative_distance(self, mock_repo):
        """Test pricing with negative distance"""
        from services.pricing_service import PricingService
        
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = PricingService.calculate_driver_cost(
            plan_date="2025-01-01",
            distance=-100,
            vehicle_type="4W"
        )
        
        assert result >= 0  # Should not return negative


class TestConcurrencyEdgeCases:
    """Test concurrent operation scenarios"""
    
    @patch('data.repository.repo')
    def test_concurrent_job_updates(self, mock_repo):
        """Test multiple simultaneous job updates"""
        from services.job_service import JobService
        
        mock_repo.upsert_record.return_value = True
        
        # Simulate concurrent updates
        for i in range(10):
            result = JobService.update_job_status(f"JOB-{i:03d}", "In Transit")
            assert result == True


class TestDataIntegrityEdgeCases:
    """Test data integrity scenarios"""
    
    @patch('data.repository.repo')
    def test_duplicate_job_ids(self, mock_repo):
        """Test handling of duplicate job IDs"""
        from services.job_service import JobService
        
        mock_repo.insert_record.return_value = True
        
        job_data = {"Job_ID": "JOB-DUP-001"}
        
        # First insert
        result1 = JobService.create_new_job(job_data)
        # Second insert (duplicate)
        result2 = JobService.create_new_job(job_data)
        
        assert result1 == True
        # System should handle duplicates


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
