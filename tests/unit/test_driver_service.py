"""
Comprehensive tests for Driver Service
Tests scorecard, ranking, and performance metrics
"""

import pytest
from unittest.mock import patch
import pandas as pd
from datetime import datetime, timedelta
from services.driver_service import DriverService


class TestDriverScorecard:
    """Test driver performance scorecard calculations"""
    
    @patch('data.repository.repo')
    def test_scorecard_basic(self, mock_repo):
        """Test basic scorecard calculation"""
        # Mock jobs data
        jobs = pd.DataFrame([
            {
                "Driver_ID": "DRV-001",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Actual_Delivery_Time": "2025-01-15 14:00",
                "Planned_Delivery_Time": "2025-01-15 14:00",
                "Distance_KM": 100,
                "Fuel_Used_L": 10
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = DriverService.get_driver_scorecard("DRV-001")
        
        assert result is not None
        assert isinstance(result, dict)
    
    @patch('data.repository.repo')
    def test_scorecard_empty_data(self, mock_repo):
        """Test scorecard with no data"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = DriverService.get_driver_scorecard("DRV-999")
        
        assert result is not None


class TestDriverRanking:
    """Test driver ranking algorithms"""
    
    @patch('data.repository.repo')
    def test_ranking_basic(self, mock_repo):
        """Test basic ranking"""
        drivers = pd.DataFrame([
            {"Driver_ID": "DRV-001", "Driver_Name": "John", "Overall_Score": 95},
            {"Driver_ID": "DRV-002", "Driver_Name": "Jane", "Overall_Score": 88},
            {"Driver_ID": "DRV-003", "Driver_Name": "Bob", "Overall_Score": 92}
        ])
        mock_repo.get_data.return_value = drivers
        
        result = DriverService.get_driver_ranking(metric="Overall_Score", limit=10)
        
        assert result is not None
        assert isinstance(result, pd.DataFrame)
    
    @patch('data.repository.repo')
    def test_ranking_limit(self, mock_repo):
        """Test ranking with limit"""
        drivers = pd.DataFrame([
            {"Driver_ID": f"DRV-{i:03d}", "Driver_Name": f"Driver{i}", "Overall_Score": 90-i}
            for i in range(20)
        ])
        mock_repo.get_data.return_value = drivers
        
        result = DriverService.get_driver_ranking(limit=5)
        
        assert len(result) <= 5


class TestDriverPerformanceTrend:
    """Test driver performance trend analysis"""
    
    @patch('data.repository.repo')
    def test_performance_trend_basic(self, mock_repo):
        """Test basic performance trend"""
        jobs = pd.DataFrame([
            {
                "Driver_ID": "DRV-001",
                "Plan_Date": (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'),
                "Job_Status": "Completed"
            }
            for i in range(10)
        ])
        mock_repo.get_data.return_value = jobs
        
        result = DriverService.get_driver_performance_trend("DRV-001", days=30)
        
        assert result is not None


class TestDriverAlerts:
    """Test driver alert generation"""
    
    @patch('data.repository.repo')
    def test_driver_alerts_basic(self, mock_repo):
        """Test basic alert generation"""
        drivers = pd.DataFrame([
            {
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "License_Expiry": (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
            }
        ])
        mock_repo.get_data.return_value = drivers
        
        result = DriverService.get_driver_alerts()
        
        assert result is not None


class TestDriverComparison:
    """Test driver comparison functionality"""
    
    @patch('data.repository.repo')
    def test_compare_drivers_basic(self, mock_repo):
        """Test basic driver comparison"""
        jobs = pd.DataFrame([
            {"Driver_ID": "DRV-001", "Job_Status": "Completed"},
            {"Driver_ID": "DRV-002", "Job_Status": "Completed"}
        ])
        mock_repo.get_data.return_value = jobs
        
        result = DriverService.compare_drivers(["DRV-001", "DRV-002"])
        
        assert result is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
