"""
Unit tests for Warehouse Service
Tests inventory inbound/outbound operations
"""

import pytest
from unittest.mock import patch, MagicMock
from services.warehouse_service import WarehouseService


class TestProcessInbound:
    """Test inbound inventory processing"""
    
    @patch('data.repository.repo')
    def test_process_inbound_basic(self, mock_repo):
        """Test basic inbound processing"""
        mock_repo.insert_record.return_value = True
        
        result = WarehouseService.process_inbound(
            item_id="ITEM-001",
            qty=100,
            location="WAREHOUSE-A"
        )
        
        assert result == True
        mock_repo.insert_record.assert_called_once()
        
        # Verify transaction log
        call_args = mock_repo.insert_record.call_args
        assert call_args[0][0] == "WMS_Transactions"
        log_data = call_args[0][1]
        assert log_data["Txn_Type"] == "INBOUND"
        assert log_data["Item_ID"] == "ITEM-001"
        assert log_data["Qty"] == 100
    
    @patch('data.repository.repo')
    def test_process_inbound_zero_qty(self, mock_repo):
        """Test inbound with zero quantity"""
        mock_repo.insert_record.return_value = True
        
        result = WarehouseService.process_inbound(
            item_id="ITEM-002",
            qty=0,
            location="WAREHOUSE-B"
        )
        
        assert result == True
        mock_repo.insert_record.assert_called_once()
    
    @patch('data.repository.repo')
    def test_process_inbound_large_qty(self, mock_repo):
        """Test inbound with large quantity"""
        mock_repo.insert_record.return_value = True
        
        result = WarehouseService.process_inbound(
            item_id="ITEM-003",
            qty=10000,
            location="WAREHOUSE-C"
        )
        
        assert result == True
    
    @patch('data.repository.repo')
    def test_process_inbound_different_locations(self, mock_repo):
        """Test inbound to different warehouse locations"""
        mock_repo.insert_record.return_value = True
        
        locations = ["WAREHOUSE-A", "WAREHOUSE-B", "ZONE-1", "ZONE-2"]
        
        for loc in locations:
            result = WarehouseService.process_inbound(
                item_id="ITEM-004",
                qty=50,
                location=loc
            )
            assert result == True
        
        assert mock_repo.insert_record.call_count == len(locations)


class TestProcessOutbound:
    """Test outbound inventory processing"""
    
    @patch('data.repository.repo')
    def test_process_outbound_basic(self, mock_repo):
        """Test basic outbound processing"""
        mock_repo.insert_record.return_value = True
        
        result = WarehouseService.process_outbound(
            item_id="ITEM-001",
            qty=50,
            job_ref="JOB-001"
        )
        
        assert result == True
        mock_repo.insert_record.assert_called_once()
        
        # Verify transaction log
        call_args = mock_repo.insert_record.call_args
        assert call_args[0][0] == "WMS_Transactions"
        log_data = call_args[0][1]
        assert log_data["Txn_Type"] == "OUTBOUND"
        assert log_data["Item_ID"] == "ITEM-001"
        assert log_data["Qty"] == 50
        assert log_data["Ref_Job"] == "JOB-001"
    
    @patch('data.repository.repo')
    def test_process_outbound_multiple_items(self, mock_repo):
        """Test outbound for multiple items"""
        mock_repo.insert_record.return_value = True
        
        items = [
            ("ITEM-001", 10),
            ("ITEM-002", 20),
            ("ITEM-003", 30)
        ]
        
        for item_id, qty in items:
            result = WarehouseService.process_outbound(
                item_id=item_id,
                qty=qty,
                job_ref="JOB-002"
            )
            assert result == True
        
        assert mock_repo.insert_record.call_count == len(items)
    
    @patch('data.repository.repo')
    def test_process_outbound_different_jobs(self, mock_repo):
        """Test outbound for different job references"""
        mock_repo.insert_record.return_value = True
        
        jobs = ["JOB-001", "JOB-002", "JOB-003"]
        
        for job_ref in jobs:
            result = WarehouseService.process_outbound(
                item_id="ITEM-005",
                qty=25,
                job_ref=job_ref
            )
            assert result == True
        
        assert mock_repo.insert_record.call_count == len(jobs)


class TestWarehouseWorkflows:
    """Test complete warehouse workflows"""
    
    @patch('data.repository.repo')
    def test_inbound_then_outbound_workflow(self, mock_repo):
        """Test receiving then picking workflow"""
        mock_repo.insert_record.return_value = True
        
        # Step 1: Receive goods
        inbound_result = WarehouseService.process_inbound(
            item_id="ITEM-WORKFLOW",
            qty=100,
            location="WAREHOUSE-MAIN"
        )
        
        # Step 2: Pick for job
        outbound_result = WarehouseService.process_outbound(
            item_id="ITEM-WORKFLOW",
            qty=30,
            job_ref="JOB-WORKFLOW"
        )
        
        assert inbound_result == True
        assert outbound_result == True
        assert mock_repo.insert_record.call_count == 2
    
    @patch('data.repository.repo')
    def test_batch_inbound_processing(self, mock_repo):
        """Test batch receiving multiple items"""
        mock_repo.insert_record.return_value = True
        
        batch_items = [
            ("ITEM-BATCH-1", 100, "ZONE-A"),
            ("ITEM-BATCH-2", 200, "ZONE-A"),
            ("ITEM-BATCH-3", 150, "ZONE-B")
        ]
        
        for item_id, qty, location in batch_items:
            result = WarehouseService.process_inbound(
                item_id=item_id,
                qty=qty,
                location=location
            )
            assert result == True
        
        assert mock_repo.insert_record.call_count == len(batch_items)
    
    @patch('data.repository.repo')
    def test_batch_outbound_processing(self, mock_repo):
        """Test batch picking for a job"""
        mock_repo.insert_record.return_value = True
        
        job_items = [
            ("ITEM-A", 10),
            ("ITEM-B", 20),
            ("ITEM-C", 15)
        ]
        
        job_ref = "JOB-BATCH-001"
        
        for item_id, qty in job_items:
            result = WarehouseService.process_outbound(
                item_id=item_id,
                qty=qty,
                job_ref=job_ref
            )
            assert result == True
        
        assert mock_repo.insert_record.call_count == len(job_items)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
