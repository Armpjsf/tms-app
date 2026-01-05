"""
Unit tests for Job Service
Tests job creation, status updates using actual API
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from services.job_service import JobService


class TestJobService:
    """Test job service functionality"""
    
    @patch('data.repository.repo')
    @patch('services.job_service.st')
    def test_create_new_job_success(self, mock_st, mock_repo):
        """Test successful job creation using create_new_job()"""
        # Setup
        mock_st.session_state.get.return_value = "admin"
        mock_repo.insert_record.return_value = True
        
        job_data = {
            "Job_ID": "TEST-001",
            "Customer_Name": "Test Customer",
            "Plan_Date": "2025-01-15",
            "Job_Status": "New"
        }
        
        # Execute
        result = JobService.create_new_job(job_data)
        
        # Assert
        assert result == True
        mock_repo.insert_record.assert_called_once()
    
    @patch('data.repository.repo')
    def test_update_job_status_success(self, mock_repo):
        """Test job status update using update_job_status()"""
        # Setup
        mock_repo.upsert_record.return_value = True
        
        # Execute
        result = JobService.update_job_status("TEST-001", "In Transit")
        
        # Assert
        assert result == True
        mock_repo.upsert_record.assert_called_once()
    
    @patch('data.repository.repo')
    def test_update_job_status_with_gps(self, mock_repo):
        """Test job status update with GPS coordinates"""
        # Setup
        mock_repo.upsert_record.return_value = True
        
        # Execute
        result = JobService.update_job_status(
            "TEST-001", 
            "DELIVERED",
            Delivery_Lat=13.7563,
            Delivery_Lon=100.5018
        )
        
        # Assert
        assert result == True
    
    @patch('data.repository.repo')
    @patch('services.job_service.logger')
    def test_update_job_status_requires_gps_for_delivery(self, mock_logger, mock_repo):
        """Test that delivery status requires GPS coordinates"""
        # Setup
        mock_repo.upsert_record.return_value = True
        
        # Execute - should raise ValueError or return False
        try:
            result = JobService.update_job_status("TEST-001", "DELIVERED")
            # If no exception, check that it failed
            assert result == False
        except ValueError as e:
            # Expected behavior
            assert "GPS" in str(e) or "location" in str(e).lower()
    
    def test_generate_job_id(self):
        """Test job ID generation"""
        job_id = JobService.generate_job_id()
        
        assert job_id.startswith("JOB-")
        assert len(job_id) > 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
