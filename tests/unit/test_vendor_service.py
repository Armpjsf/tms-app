"""
Comprehensive tests for Vendor Service
Tests vendor management and performance tracking
"""

import pytest
from unittest.mock import patch
import pandas as pd
from datetime import datetime
from services.vendor_service import VendorService


class TestVendorCRUD:
    """Test vendor CRUD operations"""
    
    @patch('data.repository.repo')
    def test_get_all_vendors(self, mock_repo):
        """Test getting all vendors"""
        vendors = pd.DataFrame([
            {"Vendor_ID": "VEN-001", "Vendor_Name": "Vendor A"},
            {"Vendor_ID": "VEN-002", "Vendor_Name": "Vendor B"}
        ])
        mock_repo.get_data.return_value = vendors
        
        result = VendorService.get_all_vendors()
        
        assert len(result) == 2
    
    @patch('data.repository.repo')
    def test_get_vendor_by_id(self, mock_repo):
        """Test getting specific vendor"""
        vendors = pd.DataFrame([
            {"Vendor_ID": "VEN-001", "Vendor_Name": "Vendor A"}
        ])
        mock_repo.get_data.return_value = vendors
        
        result = VendorService.get_vendor_by_id("VEN-001")
        
        assert result is not None


class TestVendorPerformance:
    """Test vendor performance tracking"""
    
    @patch('data.repository.repo')
    def test_vendor_performance_basic(self, mock_repo):
        """Test basic performance metrics"""
        purchases = pd.DataFrame([
            {
                "Vendor_ID": "VEN-001",
                "Amount": 10000,
                "Status": "Completed"
            }
        ])
        mock_repo.get_data.return_value = purchases
        
        result = VendorService.get_vendor_performance("VEN-001")
        
        assert result is not None


class TestPurchaseOrders:
    """Test purchase order management"""
    
    @patch('data.repository.repo')
    def test_create_purchase_order(self, mock_repo):
        """Test creating purchase order"""
        mock_repo.insert_record.return_value = True
        
        po_data = {
            "PO_ID": "PO-001",
            "Vendor_ID": "VEN-001",
            "Amount": 5000
        }
        
        result = VendorService.create_purchase_order(po_data)
        
        assert result == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
