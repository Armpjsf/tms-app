"""
Additional integration tests for complete workflows
Tests complex multi-service scenarios
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import datetime, timedelta


class TestCompleteOrderToCash:
    """Test complete order-to-cash workflow"""
    
    @patch('data.repository.repo')
    def test_full_order_to_cash_cycle(self, mock_repo):
        """Test: Create Job → Assign → Deliver → Invoice → Payment"""
        from services.job_service import JobService
        from services.accounting_service import AccountingService
        
        # Setup
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-CYCLE-001",
                "Customer_Name": "Test Customer",
                "Driver_Name": "Test Driver",
                "Job_Status": "New",
                "Price_Cust_Total": 10000,
                "Cost_Driver_Total": 3000
            }
        ])
        mock_repo.get_data.return_value = jobs
        mock_repo.insert_record.return_value = True
        mock_repo.upsert_record.return_value = True
        
        # Step 1: Create job
        job_data = {"Job_ID": "JOB-CYCLE-001"}
        create_result = JobService.create_new_job(job_data)
        
        # Step 2: Assign driver
        assign_result = JobService.update_job_status("JOB-CYCLE-001", "Assigned")
        
        # Step 3: Deliver
        deliver_result = JobService.update_job_status(
            "JOB-CYCLE-001",
            "Delivered",
            Delivery_Lat=13.7563,
            Delivery_Lon=100.5018
        )
        
        # Step 4: Create invoice
        invoice_result, error = AccountingService.create_invoice(
            "Test Customer",
            ["JOB-CYCLE-001"]
        )
        
        # Verify
        assert create_result == True
        assert assign_result == True
        assert deliver_result == True
        assert invoice_result is not None


class TestInventoryJobIntegration:
    """Test inventory and job integration"""
    
    @patch('data.repository.repo')
    def test_inventory_allocation_for_job(self, mock_repo):
        """Test: Pick inventory → Assign to job → Deliver"""
        from services.warehouse_service import WarehouseService
        from services.job_service import JobService
        
        mock_repo.insert_record.return_value = True
        mock_repo.upsert_record.return_value = True
        
        # Step 1: Pick items
        pick_result = WarehouseService.process_outbound(
            item_id="ITEM-001",
            qty=10,
            job_ref="JOB-INV-001"
        )
        
        # Step 2: Update job
        job_result = JobService.update_job_status("JOB-INV-001", "In Transit")
        
        assert pick_result == True
        assert job_result == True


class TestMultiBranchScenarios:
    """Test multi-branch operations"""
    
    @patch('data.repository.repo')
    def test_cross_branch_job_assignment(self, mock_repo):
        """Test job assignment across branches"""
        from services.job_service import JobService
        
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-BR-001",
                "Branch_ID": "BRANCH-A",
                "Job_Status": "New"
            }
        ])
        mock_repo.get_data.return_value = jobs
        mock_repo.upsert_record.return_value = True
        
        result = JobService.update_job_status("JOB-BR-001", "Assigned")
        
        assert result == True


class TestErrorRecoveryWorkflows:
    """Test error recovery scenarios"""
    
    @patch('data.repository.repo')
    def test_failed_job_recovery(self, mock_repo):
        """Test: Job fails → Reassign → Complete"""
        from services.job_service import JobService
        
        mock_repo.upsert_record.return_value = True
        
        # Step 1: Mark as failed
        fail_result = JobService.update_job_status("JOB-FAIL-001", "Failed")
        
        # Step 2: Reassign
        reassign_result = JobService.update_job_status("JOB-FAIL-001", "Assigned")
        
        # Step 3: Complete
        complete_result = JobService.update_job_status(
            "JOB-FAIL-001",
            "Delivered",
            Delivery_Lat=13.7563,
            Delivery_Lon=100.5018
        )
        
        assert fail_result == True
        assert reassign_result == True
        assert complete_result == True


class TestDataConsistencyAcrossServices:
    """Test data consistency across multiple services"""
    
    @patch('data.repository.repo')
    def test_payment_status_sync(self, mock_repo):
        """Test payment status consistency"""
        from services.accounting_service import AccountingService
        from config.constants import PaymentStatus
        
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-SYNC-001",
                "Driver_ID": "DRV-001",
                "Driver_Name": "Test Driver",
                "Cost_Driver_Total": 5000,
                "Payment_Status": PaymentStatus.PENDING,
                "Job_Status": "Completed"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        # Get pending payments
        pending = AccountingService.get_pending_driver_payments()
        
        assert len(pending) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
