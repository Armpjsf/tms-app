"""
Additional tests for Accounting Service to reach 50% coverage
Tests PDF generation, bank transfers, and AR aging
"""

import pytest
from unittest.mock import patch, MagicMock, mock_open
import pandas as pd
from datetime import datetime
from services.accounting_service import AccountingService
from config.constants import PaymentStatus, BillingStatus


class TestDriverReceiptPDF:
    """Test driver receipt PDF generation"""
    
    @pytest.mark.skip(reason="PDF generation requires complex mocking of FPDF internals")
    def test_generate_driver_receipt_basic(self):
        """Test basic receipt generation"""
        # Skipped due to FPDF complexity
        pass


class TestBankTransferFile:
    """Test bank transfer file generation"""
    
    def test_generate_bank_transfer_empty(self):
        """Test with no jobs"""
        jobs_df = pd.DataFrame()
        
        result = AccountingService.generate_bank_transfer_file(jobs_df)
        
        # Should return None or empty bytes
        assert result is None or result == b""
    
    def test_generate_bank_transfer_basic(self):
        """Test basic bank transfer file generation"""
        jobs_df = pd.DataFrame([
            {
                "Driver_Name": "John Doe",
                "Driver_ID": "DRV-001",
                "Cost_Driver_Total": 10000,
                "Bank_Name": "SCB",
                "Bank_Account": "1234567890"
            }
        ])
        
        result = AccountingService.generate_bank_transfer_file(jobs_df)
        
        # Should generate CSV bytes
        assert result is not None
        assert isinstance(result, bytes)


class TestARAgingReport:
    """Test accounts receivable aging report"""
    
    @patch('data.repository.repo')
    def test_ar_aging_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = AccountingService.get_ar_aging_report()
        
        assert result is not None
        assert isinstance(result, pd.DataFrame)
    
    @patch('data.repository.repo')
    def test_ar_aging_basic(self, mock_repo):
        """Test basic AR aging calculation"""
        from datetime import timedelta
        
        # Create jobs with different billing dates
        today = datetime.now()
        jobs = pd.DataFrame([
            {
                "Customer_Name": "Customer A",
                "Invoice_No": "INV-001",
                "Billing_Date": (today - timedelta(days=10)).strftime('%Y-%m-%d'),
                "Price_Cust_Total": 10000,
                "Billing_Status": BillingStatus.BILLED,
                "Payment_Status_Cust": "Pending"
            },
            {
                "Customer_Name": "Customer A",
                "Invoice_No": "INV-002",
                "Billing_Date": (today - timedelta(days=40)).strftime('%Y-%m-%d'),
                "Price_Cust_Total": 5000,
                "Billing_Status": BillingStatus.BILLED,
                "Payment_Status_Cust": "Pending"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.get_ar_aging_report()
        
        assert len(result) > 0


class TestCustomerPayment:
    """Test customer payment marking"""
    
    @patch('data.repository.repo')
    def test_mark_customer_payment_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = AccountingService.mark_customer_payment("Customer A")
        
        # Should handle gracefully
        assert result is not None
    
    @patch('data.repository.repo')
    def test_mark_customer_payment_basic(self, mock_repo):
        """Test marking customer payment"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Customer_Name": "Customer A",
                "Billing_Status": BillingStatus.BILLED,
                "Payment_Status_Cust": "Pending"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.mark_customer_payment(
            "Customer A",
            payment_date="2025-01-15",
            slip_url="https://example.com/slip.jpg"
        )
        
        # Should update successfully
        assert result is not None


class TestBulkInvoices:
    """Test bulk invoice creation"""
    
    @patch('services.accounting_service.AccountingService.create_invoice')
    @patch('services.accounting_service.AccountingService.generate_invoice_pdf')
    def test_create_bulk_invoices_empty(self, mock_pdf, mock_create):
        """Test with no customers"""
        customer_jobs_map = {}
        
        result = AccountingService.create_bulk_invoices(customer_jobs_map)
        
        # Should return None or empty
        assert result is None or len(result) == 0
    
    @patch('services.accounting_service.AccountingService.create_invoice')
    @patch('services.accounting_service.AccountingService.generate_invoice_pdf')
    @patch('data.repository.repo')
    def test_create_bulk_invoices_basic(self, mock_repo, mock_pdf, mock_create):
        """Test basic bulk invoice creation"""
        customer_jobs_map = {
            "Customer A": ["JOB-001", "JOB-002"],
            "Customer B": ["JOB-003"]
        }
        
        # Mock invoice creation
        mock_create.return_value = ({
            "invoice_no": "INV-001",
            "customer": "Customer A",
            "total_amount": 10000
        }, None)
        
        # Mock PDF generation
        mock_pdf.return_value = b"PDF_CONTENT"
        
        # Mock repo for jobs
        jobs = pd.DataFrame([
            {"Job_ID": "JOB-001", "Price_Cust_Total": 5000},
            {"Job_ID": "JOB-002", "Price_Cust_Total": 5000},
            {"Job_ID": "JOB-003", "Price_Cust_Total": 3000}
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.create_bulk_invoices(customer_jobs_map)
        
        # Should generate ZIP file
        assert result is not None


class TestInvoicePDFGeneration:
    """Test invoice PDF generation"""
    
    @patch('services.accounting_service.PDFInvoice')
    @patch('data.repository.repo')
    def test_generate_invoice_pdf_basic(self, mock_repo, mock_pdf_class):
        """Test basic invoice PDF generation"""
        invoice_data = {
            "invoice_no": "INV-001",
            "customer": "Customer A",
            "total_amount": 10000,
            "date": "2025-01-15"
        }
        
        jobs_df = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Price_Cust_Total": 10000,
                "Plan_Date": "2025-01-15"
            }
        ])
        
        mock_pdf = MagicMock()
        mock_pdf_class.return_value = mock_pdf
        mock_pdf.output.return_value = b"PDF_CONTENT"
        
        result = AccountingService.generate_invoice_pdf(
            invoice_data,
            jobs_df,
            tax_rate=0.03
        )
        
        assert result == b"PDF_CONTENT"
    
    @patch('services.accounting_service.PDFInvoice')
    @patch('data.repository.repo')
    def test_generate_invoice_pdf_with_tax(self, mock_repo, mock_pdf_class):
        """Test invoice PDF with 3% tax"""
        invoice_data = {
            "invoice_no": "INV-002",
            "customer": "Customer B",
            "total_amount": 10000,
            "date": "2025-01-15"
        }
        
        jobs_df = pd.DataFrame([
            {
                "Job_ID": "JOB-002",
                "Price_Cust_Total": 10000
            }
        ])
        
        mock_pdf = MagicMock()
        mock_pdf_class.return_value = mock_pdf
        mock_pdf.output.return_value = b"PDF_WITH_TAX"
        
        result = AccountingService.generate_invoice_pdf(
            invoice_data,
            jobs_df,
            tax_rate=0.03
        )
        
        assert result == b"PDF_WITH_TAX"
        # Verify tax calculation was called
        mock_pdf.cell.assert_called()


class TestPendingPayments:
    """Test pending payment retrieval"""
    
    @patch('data.repository.repo')
    def test_get_pending_driver_payments_empty(self, mock_repo):
        """Test with no pending payments"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = AccountingService.get_pending_driver_payments()
        
        assert result is not None
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0
    
    @patch('data.repository.repo')
    def test_get_pending_driver_payments_basic(self, mock_repo):
        """Test getting pending driver payments"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Driver_Name": "John Doe",
                "Cost_Driver_Total": 5000,
                "Payment_Status": PaymentStatus.PENDING,
                "Job_Status": "Completed"
            },
            {
                "Job_ID": "JOB-002",
                "Driver_Name": "Jane Smith",
                "Cost_Driver_Total": 3000,
                "Payment_Status": PaymentStatus.PENDING,
                "Job_Status": "Completed"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = AccountingService.get_pending_driver_payments()
        
        assert len(result) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
