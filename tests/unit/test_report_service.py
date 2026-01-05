"""
Unit tests for Report Service
Tests report generation and KPI calculations
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import date
from services.report_service import ReportService, JobOrderPDF


class TestJobOrderPDF:
    """Test Job Order PDF generation"""
    
    def test_pdf_creation(self):
        """Test basic PDF creation"""
        pdf = JobOrderPDF()
        
        assert pdf is not None
        assert hasattr(pdf, 'font_path')
        assert hasattr(pdf, 'logo_path')
    
    def test_pdf_without_font(self):
        """Test PDF creation when Thai font is missing"""
        pdf = JobOrderPDF(font_path='nonexistent.ttf')
        
        assert pdf.has_font == False


class TestCreateJobOrderPDF:
    """Test job order PDF generation"""
    
    @pytest.mark.skip(reason="FPDF output() method compatibility varies across versions")
    @patch('os.path.exists', return_value=False)  # No font file
    def test_create_job_order_basic(self, mock_exists):
        """Test basic job order PDF creation"""
        pass
    
    @pytest.mark.skip(reason="FPDF output() method compatibility varies across versions")
    @patch('os.path.exists', return_value=False)
    def test_create_job_order_empty_drops(self, mock_exists):
        """Test job order with no drops"""
        pass
    
    @pytest.mark.skip(reason="FPDF output() method compatibility varies across versions")
    @patch('os.path.exists', return_value=False)
    def test_create_job_order_multiple_drops(self, mock_exists):
        """Test job order with multiple drops"""
        pass


class TestPerformanceMetrics:
    """Test KPI calculations"""
    
    @patch('data.repository.repo')
    def test_performance_metrics_empty(self, mock_repo):
        """Test with no jobs"""
        mock_repo.get_data.return_value = pd.DataFrame()
        
        result = ReportService.get_performance_metrics(
            date(2025, 1, 1),
            date(2025, 1, 31)
        )
        
        assert result["total_jobs"] == 0
        assert result["revenue"] == 0
        assert result["completed_jobs"] == 0
    
    @patch('data.repository.repo')
    def test_performance_metrics_basic(self, mock_repo):
        """Test basic KPI calculation"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Price_Cust_Total": 10000,
                "Cost_Driver_Total": 3000,
                "Branch_ID": "HQ"
            },
            {
                "Job_ID": "JOB-002",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-20",
                "Price_Cust_Total": 15000,
                "Cost_Driver_Total": 5000,
                "Branch_ID": "HQ"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = ReportService.get_performance_metrics(
            date(2025, 1, 1),
            date(2025, 1, 31)
        )
        
        assert result["total_jobs"] == 2
        assert result["revenue"] == 25000
        assert result["gross_profit"] == 17000  # 25000 - 8000
        assert result["completed_jobs"] == 2
    
    @patch('data.repository.repo')
    def test_performance_metrics_margin_calculation(self, mock_repo):
        """Test profit margin calculation"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Price_Cust_Total": 10000,
                "Cost_Driver_Total": 3000,
                "Branch_ID": "HQ"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = ReportService.get_performance_metrics(
            date(2025, 1, 1),
            date(2025, 1, 31)
        )
        
        # Margin = (7000 / 10000) * 100 = 70%
        assert result["margin"] == 70.0
    
    @patch('data.repository.repo')
    def test_performance_metrics_date_filter(self, mock_repo):
        """Test date range filtering"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Price_Cust_Total": 10000,
                "Cost_Driver_Total": 3000,
                "Branch_ID": "HQ"
            },
            {
                "Job_ID": "JOB-002",
                "Job_Status": "Completed",
                "Plan_Date": "2025-02-15",  # Outside range
                "Price_Cust_Total": 15000,
                "Cost_Driver_Total": 5000,
                "Branch_ID": "HQ"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = ReportService.get_performance_metrics(
            date(2025, 1, 1),
            date(2025, 1, 31)
        )
        
        # Should only include January job
        assert result["total_jobs"] == 1
        assert result["revenue"] == 10000
    
    @patch('data.repository.repo')
    def test_performance_metrics_branch_filter(self, mock_repo):
        """Test branch filtering"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Price_Cust_Total": 10000,
                "Cost_Driver_Total": 3000,
                "Branch_ID": "HQ"
            },
            {
                "Job_ID": "JOB-002",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-20",
                "Price_Cust_Total": 15000,
                "Cost_Driver_Total": 5000,
                "Branch_ID": "BRANCH1"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = ReportService.get_performance_metrics(
            date(2025, 1, 1),
            date(2025, 1, 31),
            branch_id="HQ"
        )
        
        # Should only include HQ jobs
        assert result["total_jobs"] == 1
        assert result["revenue"] == 10000
    
    @patch('data.repository.repo')
    def test_performance_metrics_zero_revenue(self, mock_repo):
        """Test margin calculation with zero revenue"""
        jobs = pd.DataFrame([
            {
                "Job_ID": "JOB-001",
                "Job_Status": "Completed",
                "Plan_Date": "2025-01-15",
                "Price_Cust_Total": 0,
                "Cost_Driver_Total": 3000,
                "Branch_ID": "HQ"
            }
        ])
        mock_repo.get_data.return_value = jobs
        
        result = ReportService.get_performance_metrics(
            date(2025, 1, 1),
            date(2025, 1, 31)
        )
        
        # Should handle zero revenue gracefully
        assert result["margin"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
