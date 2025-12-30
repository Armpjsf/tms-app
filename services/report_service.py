
from fpdf import FPDF
import pandas as pd
import os
import io
import streamlit as st

class JobOrderPDF(FPDF):
    def __init__(self, font_path='THSarabunNew.ttf', logo_path='company_logo.png'):
        super().__init__()
        self.font_path = font_path
        self.logo_path = logo_path
        self.has_font = os.path.exists(font_path)

    def header(self):
        if os.path.exists(self.logo_path): 
            self.image(self.logo_path, 10, 8, 20)
        
        if self.has_font: 
            self.add_font('THSarabun', 'B', self.font_path, uni=True)
            self.set_font('THSarabun', 'B', 20)
        else:
            self.set_font('Arial', 'B', 20)
            
        self.cell(0, 10, "JOB ORDER (ใบสั่งงาน)", 0, 1, 'C')
        self.ln(5)

class ReportService:
    @staticmethod
    def create_job_order_pdf(job_data: dict, drops_data: pd.DataFrame) -> bytes:
        pdf = JobOrderPDF()
        pdf.add_page()
        
        def s(t): 
            return str(t) if pdf.has_font else str(t).encode('latin-1','ignore').decode('latin-1')

        pdf.set_font('THSarabun' if pdf.has_font else 'Arial', 'B', 14)
        pdf.cell(100, 8, s(f"Job: {job_data.get('Job_ID')}"), 0, 0)
        pdf.cell(90, 8, s(f"Date: {job_data.get('Plan_Date')}"), 0, 1, 'R')
        pdf.cell(100, 8, s(f"Driver: {job_data.get('Driver_Name')}"), 0, 1)
        pdf.ln(5)

        # Table Header
        pdf.set_fill_color(220,220,220)
        headers = ["Seq", "Type", "Location", "Sign"]
        for h in headers: 
            pdf.cell(47, 8, h, 1, 0, 'C', True)
        pdf.ln()

        # Table Body
        pdf.set_font('THSarabun' if pdf.has_font else 'Arial', '', 12)
        if not drops_data.empty:
            for i, r in drops_data.iterrows():
                pdf.cell(47, 8, str(i+1), 1, 0, 'C')
                pdf.cell(47, 8, s(r.get('Type','')), 1, 0, 'C')
                pdf.cell(47, 8, s(str(r.get('Location',''))[:20]), 1, 0, 'L')
                pdf.cell(47, 8, "", 1, 1, 'C')
        
        # Return bytes
        res = pdf.output(dest='S')
        # Compatibility with different FPDF versions/encodings
        if isinstance(res, str):
            return res.encode('latin-1','ignore')
        return bytes(res)

    @staticmethod
    @st.cache_data(ttl=300)
    def get_performance_metrics(start_date, end_date, branch_id="ALL"):
        """
        Calculates Key Performance Indicators (KPIs) for the given date range.
        Cached for 5 minutes (ttl=300) to optimize Dashboard loading.
        """
        from data.repository import repo
        
        # 1. Fetch only necessary columns
        jobs = repo.get_data("Jobs_Main", columns="Job_ID,Job_Status,Plan_Date,Price_Cust_Total,Cost_Driver_Total,Branch_ID")
        
        if jobs.empty:
            return {"total_jobs": 0, "revenue": 0, "profit": 0, "margin": 0, "completed_jobs": 0}
            
        # 2. Filter by date
        jobs['PD'] = pd.to_datetime(jobs['Plan_Date'], errors='coerce')
        # Apply branch filter if not ALL or HEAD
        if branch_id not in ["ALL", "HEAD"] and "Branch_ID" in jobs.columns:
            view = jobs[(jobs['PD'].dt.date >= start_date) & (jobs['PD'].dt.date <= end_date) & (jobs['Branch_ID'] == branch_id)]
        else:
            view = jobs[(jobs['PD'].dt.date >= start_date) & (jobs['PD'].dt.date <= end_date)]
        
        if view.empty:
             return {"total_jobs": 0, "revenue": 0, "profit": 0, "margin": 0, "completed_jobs": 0}

        # 3. Aggregate
        total_jobs = len(view)
        revenue = view['Price_Cust_Total'].fillna(0).sum()
        driver_cost = view['Cost_Driver_Total'].fillna(0).sum()
        
        # Estimate Fuel (Optional: Fetching Fuel_Logs might be too heavy for this quick stat, 
        # so maybe we skip it or estimate it? Let's skip for pure speed or specific Fuel KPI)
        gross_profit = revenue - driver_cost
        margin = (gross_profit / revenue * 100) if revenue > 0 else 0
        
        return {
            "total_jobs": total_jobs,
            "revenue": revenue,
            "gross_profit": gross_profit,
            "margin": margin,
            "completed_jobs": len(view[view['Job_Status'] == 'Completed'])
        }
