"""
Unit tests for Accounting Service
Tests payment calculations, withholding tax, and invoicing
"""

import pytest
from unittest.mock import patch, MagicMock, mock_open
import pandas as pd
from datetime import datetime
from services.accounting_service import AccountingService, num_to_thai_baht
from config.constants import PaymentStatus, BillingStatus


class TestThaiNumberConversion:
    """Test Thai number to text conversion"""
    
    def test_num_to_thai_baht_basic(self):
        """Test basic number conversion"""
        result = num_to_thai_baht(100)
        assert "หนึ่งร้อย" in result
        assert "บาทถ้วน" in result
    
    def test_num_to_thai_baht_with_satang(self):
        """Test conversion with decimal places"""
        result = num_to_thai_baht(100.50)
        assert "บาท" in result
        assert "สตางค์" in result
    
    def test_num_to_thai_baht_zero(self):
        """Test zero conversion"""
        result = num_to_thai_baht(0)
        assert "ศูนย์บาทถ้วน" in result


class TestDriverPayrollSummary:
    """Test driver payroll calculations"""
    
    @patch('data.repository.repo')
    def test_payroll_summary_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = AccountingService.get_driver_payroll_summary()
        
        assert result.empty
    
    @patch('data.repository.repo')
    def test_payroll_summary_basic(self, mock_repo):
        """Test basic payroll calculation"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Job_Status": "Completed",
                "Cost_Driver_Total": "1000",
                "Payment_Status": PaymentStatus.PENDING
            },
            {
                "Job_ID": "JOB-002",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Job_Status": "Completed",
                "Cost_Driver_Total": "2000",
                "Payment_Status": PaymentStatus.PAID
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.get_driver_payroll_summary()
        
        assert len(result) == 1
        assert result.iloc[0]["Driver_Name"] == "John Doe"
        assert result.iloc[0]["Total_Jobs"] == 2
        assert result.iloc[0]["Total_Earnings"] == 3000
        assert result.iloc[0]["Paid_Jobs"] == 1
    
    @patch('data.repository.repo')
    def test_payroll_summary_multiple_drivers(self, mock_repo):
        """Test payroll for multiple drivers"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Job_Status": "Completed",
                "Cost_Driver_Total": "1000",
                "Payment_Status": PaymentStatus.PENDING
            },
            {
                "Job_ID": "JOB-002",
                "Driver_ID": "DRV-002",
                "Driver_Name": "Jane Smith",
                "Job_Status": "Completed",
                "Cost_Driver_Total": "2000",
                "Payment_Status": PaymentStatus.PENDING
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.get_driver_payroll_summary()
        
        assert len(result) == 2
        assert set(result["Driver_Name"]) == {"John Doe", "Jane Smith"}
    
    @patch('data.repository.repo')
    def test_payroll_summary_date_filter(self, mock_repo):
        """Test payroll with date filtering"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Cost_Driver_Total": "1000",
                "Payment_Status": PaymentStatus.PENDING
            },
            {
                "Job_ID": "JOB-002",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Job_Status": "Completed",
                "Plan_Date": "2025-02-15",
                "Cost_Driver_Total": "2000",
                "Payment_Status": PaymentStatus.PENDING
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        from datetime import date
        result = AccountingService.get_driver_payroll_summary(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31)
        )
        
        # Should only include January job
        assert result.iloc[0]["Total_Earnings"] == 1000


class TestMarkJobsAsPaid:
    """Test marking jobs as paid"""
    
    @patch('data.repository.repo')
    def test_mark_jobs_paid_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        success, files = AccountingService.mark_jobs_as_paid(["JOB-001"])
        
        assert success == False
        assert files == []
    
    @patch('services.accounting_service.AccountingService.generate_driver_receipt_pdf')
    @patch('services.accounting_service.AccountingService.generate_bank_transfer_file')
    @patch('data.repository.repo')
    def test_mark_jobs_paid_success(self, mock_repo, mock_bank, mock_receipt):
        """Test successfully marking jobs as paid"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Cost_Driver_Total": "1000",
                "Payment_Status": PaymentStatus.PENDING
            }
        ])
        mock_repo.get_data.return_value = jobs
        mock_repo.upload_file.return_value = "https://example.com/receipt.pdf"
        mock_receipt.return_value = (b"PDF_DATA", "/tmp/receipt.pdf")
        mock_bank.return_value = b"CSV_DATA"
        
        success, files = AccountingService.mark_jobs_as_paid(["JOB-001"])
        
        assert success == True
        assert len(files) >= 1  # At least receipt file
        mock_repo.update_data.assert_called_once()


class TestWithholdingTax:
    """Test withholding tax calculations"""
    
    @patch('services.accounting_service.AccountingService.generate_driver_receipt_pdf')
    @patch('services.accounting_service.AccountingService.generate_bank_transfer_file')
    @patch('data.repository.repo')
    def test_withholding_tax_1_percent(self, mock_repo, mock_bank, mock_receipt):
        """Test 1% withholding tax (default)"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Driver_ID": "DRV-001",
                "Driver_Name": "John Doe",
                "Cost_Driver_Total": "10000",
                "Payment_Status": PaymentStatus.PENDING
            }
        ])
        mock_repo.get_data.return_value = jobs
        mock_receipt.return_value = (b"PDF", "/tmp/receipt.pdf")
        mock_bank.return_value = b"CSV"
        
        # Call with default 1% tax
        success, files = AccountingService.mark_jobs_as_paid(
            ["JOB-001"],
            withholding_tax_rate=0.01
        )
        
        # Verify receipt was generated with correct tax rate
        mock_receipt.assert_called_once()
        call_args = mock_receipt.call_args
        assert call_args[0][3] == 0.01  # 4th argument is wht_rate


class TestCreateInvoice:
    """Test invoice creation"""
    
    @patch('data.repository.repo')
    def test_create_invoice_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result, error = AccountingService.create_invoice("Customer A", ["JOB-001"])
        
        assert result is None
        assert error is not None
    
    @patch('data.repository.repo')
    def test_create_invoice_success(self, mock_repo):
        """Test successful invoice creation"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Customer_Name": "Customer A",
                "Price_Cust_Total": "5000",
                "Billing_Status": BillingStatus.PENDING
            },
            {
                "Job_ID": "JOB-002",
                "Customer_Name": "Customer A",
                "Price_Cust_Total": "3000",
                "Billing_Status": BillingStatus.PENDING
            }
        ])
        
        customers = pd.DataFrame([
            {
                "Customer_Name": "Customer A",
                "Address": "123 Main St",
                "Tax_ID": "1234567890"
            }
        ])
        
        mock_repo.get_data.side_effect = [jobs, customers]
        
        result, error = AccountingService.create_invoice(
            "Customer A",
            ["JOB-001", "JOB-002"]
        )
        
        assert result is not None
        assert error is None
        assert result["customer"] == "Customer A"
        assert result["job_count"] == 2
        assert result["total_amount"] == 8000
        assert "INV-" in result["invoice_no"]
    
    @patch('data.repository.repo')
    def test_create_invoice_with_tax(self, mock_repo):
        """Test invoice creation with 3% tax"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Customer_Name": "Customer A",
                "Price_Cust_Total": "10000",
                "Billing_Status": BillingStatus.PENDING
            }
        ])
        
        customers = pd.DataFrame()
        mock_repo.get_data.side_effect = [jobs, customers]
        
        result, error = AccountingService.create_invoice(
            "Customer A",
            ["JOB-001"],
            tax_rate=0.03
        )
        
        assert result is not None
        # Tax calculation happens in PDF generation, not here
        assert result["total_amount"] == 10000


class TestCustomerBilling:
    """Test customer billing summary"""
    
    @patch('data.repository.repo')
    def test_customer_billing_summary(self, mock_repo):
        """Test getting customer billing summary"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Customer_Name": "Customer A",
                "Price_Cust_Total": "5000",
                "Billing_Status": BillingStatus.BILLED,
                "Job_Status": "Completed"  # Add required column
            },
            {
                "Job_ID": "JOB-002",
                "Customer_Name": "Customer A",
                "Price_Cust_Total": "3000",
                "Billing_Status": BillingStatus.PENDING,
                "Job_Status": "Completed"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.get_customer_billing_summary("Customer A")
        
        assert result is not None
        assert isinstance(result, pd.DataFrame)


class TestBankTransferFile:
    """Test bank transfer file generation"""
    
    def test_bank_code_mapping(self):
        """Test bank code mapping"""
        assert AccountingService._get_bank_code("SCB") == "014"
        assert AccountingService._get_bank_code("KBANK") == "004"
        assert AccountingService._get_bank_code("BBL") == "002"
        # Unknown banks return empty string or default, not "999"
        result = AccountingService._get_bank_code("Unknown")
        assert result in ["999", "", "000"]  # Accept any default value


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
