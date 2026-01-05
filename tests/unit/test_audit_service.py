"""
Unit tests for Audit Service
Tests audit logging functionality
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from services.audit_service import AuditService


class TestAuditService:
    """Test audit service functionality"""
    
    @patch('data.repository.repo')
    def test_log_action_success(self, mock_repo):
        """Test successful audit log creation"""
        # Setup
        mock_repo.insert_record.return_value = True
        
        # Execute
        AuditService.log_action(
            user_id="admin",
            action="CREATE_JOB",
            target="JOB-001",
            details="Created new job"
        )
        
        # Assert - should not raise exception
        mock_repo.insert_record.assert_called_once()
        
        # Check log entry structure
        call_args = mock_repo.insert_record.call_args[0]
        log_entry = call_args[1]
        
        assert log_entry["User_ID"] == "admin"
        assert log_entry["Action"] == "CREATE_JOB"
        assert log_entry["Target"] == "JOB-001"
    
    @patch('data.repository.repo')
    def test_log_action_with_status(self, mock_repo):
        """Test audit log with custom status"""
        # Setup
        mock_repo.insert_record.return_value = True
        
        # Execute
        AuditService.log_action(
            user_id="admin",
            action="DELETE_JOB",
            target="JOB-001",
            details="Job deleted",
            status="Failed"
        )
        
        # Assert
        call_args = mock_repo.insert_record.call_args[0]
        log_entry = call_args[1]
        
        assert log_entry["Status"] == "Failed"
    
    @patch('data.repository.repo')
    @patch('services.audit_service.logger')
    def test_log_action_handles_errors(self, mock_logger, mock_repo):
        """Test that logging errors don't crash the system"""
        # Setup
        mock_repo.insert_record.side_effect = Exception("Database error")
        
        # Execute - should not raise exception
        AuditService.log_action(
            user_id="admin",
            action="TEST",
            target="TEST-001"
        )
        
        # Assert - should log error
        mock_logger.error.assert_called_once()
    
    @patch('data.repository.repo')
    def test_get_logs(self, mock_repo):
        """Test retrieving audit logs"""
        # Setup
        logs_df = pd.DataFrame([
            {
                "Log_ID": "LOG-001",
                "User_ID": "admin",
                "Action": "CREATE_JOB",
                "Target": "JOB-001",
                "Timestamp": "2025-01-01 10:00:00"
            },
            {
                "Log_ID": "LOG-002",
                "User_ID": "user1",
                "Action": "UPDATE_JOB",
                "Target": "JOB-002",
                "Timestamp": "2025-01-01 11:00:00"
            }
        ])
        mock_repo.get_data.return_value = logs_df
        
        # Execute
        result = AuditService.get_logs(limit=100)
        
        # Assert
        assert len(result) == 2
        assert result.iloc[0]["User_ID"] in ["admin", "user1"]
    
    @patch('data.repository.repo')
    def test_get_logs_with_limit(self, mock_repo):
        """Test retrieving logs with limit"""
        # Setup
        logs_df = pd.DataFrame([
            {"Log_ID": f"LOG-{i:03d}", "Action": "TEST"} 
            for i in range(200)
        ])
        mock_repo.get_data.return_value = logs_df
        
        # Execute
        result = AuditService.get_logs(limit=50)
        
        # Assert
        assert len(result) <= 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
