"""
Unit tests for Analytics Service
Tests KPI calculations and cost analysis
"""

import pytest
from unittest.mock import patch
import pandas as pd
from datetime import datetime, timedelta
from services.analytics_service import AnalyticsService


class TestCostPerKM:
    """Test cost per kilometer calculations"""
    
    @patch('data.repository.repo')
    def test_cost_per_km_empty_data(self, mock_repo):
        """Test with no data"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        assert result.empty
    
    @patch('data.repository.repo')
    def test_cost_per_km_basic_calculation(self, mock_repo):
        """Test basic cost per km calculation"""
        # Setup
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 10000,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-20 10:00:00",
                "Odometer": 10500,  # Traveled 500 km
                "Liters": 50,
                "Price_Total": 1500
            }
        ])
        
        maint_tickets = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Report_Date": "2025-01-18",
                "Cost": 1000
            }
        ])
        
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert
        assert len(result) == 1
        assert result.iloc[0]["Vehicle"] == "AB-1234"
        assert result.iloc[0]["Distance (km)"] == 500
        assert result.iloc[0]["Fuel Cost"] == 3000  # 1500 + 1500
        assert result.iloc[0]["Maint Cost"] == 1000
        assert result.iloc[0]["Total Cost"] == 4000
        assert result.iloc[0]["Cost/KM (THB)"] == 8.0  # 4000 / 500
    
    @patch('data.repository.repo')
    def test_cost_per_km_multiple_vehicles(self, mock_repo):
        """Test calculation for multiple vehicles"""
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 10000,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-20 10:00:00",
                "Odometer": 10500,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "XY-5678",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 20000,
                "Liters": 60,
                "Price_Total": 1800
            },
            {
                "Vehicle_Plate": "XY-5678",
                "Date_Time": "2025-01-20 10:00:00",
                "Odometer": 20600,  # Traveled 600 km
                "Liters": 60,
                "Price_Total": 1800
            }
        ])
        
        maint_tickets = pd.DataFrame()
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert
        assert len(result) == 2
        assert set(result["Vehicle"]) == {"AB-1234", "XY-5678"}
    
    @patch('data.repository.repo')
    def test_km_per_liter_calculation(self, mock_repo):
        """Test fuel efficiency (km/L) calculation"""
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 10000,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-20 10:00:00",
                "Odometer": 10500,  # 500 km
                "Liters": 50,  # Total 100 liters
                "Price_Total": 1500
            }
        ])
        
        maint_tickets = pd.DataFrame()
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert
        assert result.iloc[0]["Km/L"] == 5.0  # 500 km / 100 liters
    
    @patch('data.repository.repo')
    def test_date_range_filtering(self, mock_repo):
        """Test that only logs within date range are included"""
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2024-12-15 10:00:00",  # Before range
                "Odometer": 9000,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",  # In range
                "Odometer": 10000,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-20 10:00:00",  # In range
                "Odometer": 10500,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-02-15 10:00:00",  # After range
                "Odometer": 11000,
                "Liters": 50,
                "Price_Total": 1500
            }
        ])
        
        maint_tickets = pd.DataFrame()
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute - only January
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert - should only use odometer readings from Jan (10000 to 10500)
        assert result.iloc[0]["Distance (km)"] == 500
        assert result.iloc[0]["Fuel Cost"] == 3000  # Only 2 fills in range
    
    @patch('data.repository.repo')
    def test_zero_distance_no_division_error(self, mock_repo):
        """Test that zero distance doesn't cause division error"""
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 10000,
                "Liters": 50,
                "Price_Total": 1500
            }
        ])
        
        maint_tickets = pd.DataFrame()
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert - should handle gracefully
        assert result.iloc[0]["Cost/KM (THB)"] == 0
        assert result.iloc[0]["Km/L"] == 0
    
    @patch('data.repository.repo')
    def test_maintenance_cost_included(self, mock_repo):
        """Test that maintenance costs are included in total"""
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 10000,
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-20 10:00:00",
                "Odometer": 10500,
                "Liters": 50,
                "Price_Total": 1500
            }
        ])
        
        maint_tickets = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Report_Date": "2025-01-18",
                "Cost": 2000
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Report_Date": "2025-01-25",
                "Cost": 1500
            }
        ])
        
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert
        assert result.iloc[0]["Maint Cost"] == 3500  # 2000 + 1500
        assert result.iloc[0]["Total Cost"] == 6500  # 3000 fuel + 3500 maint
    
    @patch('data.repository.repo')
    def test_invalid_odometer_values_ignored(self, mock_repo):
        """Test that zero or invalid odometer values are ignored"""
        fuel_logs = pd.DataFrame([
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-15 10:00:00",
                "Odometer": 0,  # Invalid
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-16 10:00:00",
                "Odometer": 10000,  # Valid
                "Liters": 50,
                "Price_Total": 1500
            },
            {
                "Vehicle_Plate": "AB-1234",
                "Date_Time": "2025-01-20 10:00:00",
                "Odometer": 10500,  # Valid
                "Liters": 50,
                "Price_Total": 1500
            }
        ])
        
        maint_tickets = pd.DataFrame()
        drivers = pd.DataFrame()
        
        mock_repo.get_data.side_effect = [fuel_logs, maint_tickets, drivers]
        
        # Execute
        result = AnalyticsService.get_cost_per_km("2025-01-01", "2025-01-31")
        
        # Assert - should use only valid odometer readings
        assert result.iloc[0]["Distance (km)"] == 500  # 10500 - 10000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
