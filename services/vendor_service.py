
import streamlit as st
import pandas as pd
from datetime import datetime
from data.repository import repo
from utils.logger import logger

class VendorService:
    @staticmethod
    def create_vendor(vendor_data: dict):
        """Register a new sub-contractor/vendor."""
        return repo.insert_record("Master_Vendors", vendor_data)

    @staticmethod
    def assign_job_to_vendor(job_id: str, vendor_id: str, agreed_cost: float):
        """Assigns a job to a sub-contractor."""
        # ... (mock update for now, in real app would update DB) ...
        # For this prototype we assume the view handles the DB update directly 
        # as seen in vendor_view.py _render_assign_jobs
        logger.info(f"Assigned Job {job_id} to Vendor {vendor_id} at {agreed_cost}")
        return True

    @staticmethod
    def get_vendor_payment_summary(start_date=None, end_date=None, vendor_id=None):
        """
        Get vendor payment summary for a date range.
        Returns DataFrame with vendor earnings.
        """
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()
            
        # Ensure Remark column exists
        if 'Remark' not in jobs.columns:
            jobs['Remark'] = ""
        
        # Filter jobs assigned to vendors (Remark contains "Vendor:")
        df = jobs[jobs['Remark'].astype(str).str.contains('Vendor:', na=False)].copy()
        
        # Date filter
        if start_date or end_date:
            df['Plan_Date'] = pd.to_datetime(df['Plan_Date'], errors='coerce')
            if start_date:
                df = df[df['Plan_Date'].dt.date >= start_date]
            if end_date:
                df = df[df['Plan_Date'].dt.date <= end_date]
        
        # Vendor filter
        if vendor_id:
            # Parse Vendor ID from Remark "Assigned to Vendor: V-XXX"
            df = df[df['Remark'].str.contains(f"Vendor: {vendor_id}", na=False)]
        
        # Extract Vendor ID if not filtered
        # df['Vendor_ID'] = df['Remark'].str.extract(r'Vendor: (V-\d+)') # simplified regex
        
        # Convert cost column (Cost_Driver_Total is used for Vendor Cost in this context)
        df['Cost_Driver_Total'] = pd.to_numeric(
            df['Cost_Driver_Total'].astype(str).str.replace(',', ''), 
            errors='coerce'
        ).fillna(0)
        
        # Group by Payment Status
        # Since we don't have a direct Vendor_ID column in Jobs yet (it's in Remark),
        # we'll aggregate by Remark (Vendor) for now.
        summary = df.groupby(['Remark'], dropna=False).agg({
            'Job_ID': 'count',
            'Cost_Driver_Total': 'sum',
            'Payment_Status': lambda x: (x == 'Paid').sum()
        }).reset_index()
        
        # Clean up Vendor Name from Remark
        summary['Vendor_Name'] = summary['Remark'].str.replace('Assigned to Vendor: ', '')
        summary.columns = ['Remark', 'Total_Jobs', 'Total_Earnings', 'Paid_Jobs', 'Vendor_Name_Display']
        
        summary['Pending_Amount'] = summary.apply(
            lambda r: r['Total_Earnings'] * (r['Total_Jobs'] - r['Paid_Jobs']) / r['Total_Jobs'] 
            if r['Total_Jobs'] > 0 else 0, axis=1
        )
        summary['Paid_Amount'] = summary['Total_Earnings'] - summary['Pending_Amount']
        
        return summary

    @staticmethod
    def get_pending_vendor_payments(vendor_id=None):
        """Get all pending vendor payments."""
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()

        # Ensure Remark column exists
        if 'Remark' not in jobs.columns:
            jobs['Remark'] = ""
        
        # Filter Vendor Jobs that are NOT Paid
        pending = jobs[
            (jobs['Remark'].astype(str).str.contains('Vendor:', na=False)) & 
            (jobs['Payment_Status'] != 'Paid')
        ].copy()
        
        if vendor_id:
            pending = pending[pending['Remark'].str.contains(f"Vendor: {vendor_id}", na=False)]
            
        # Ensure numeric cost
        pending['Cost_Driver_Total'] = pd.to_numeric(pending['Cost_Driver_Total'], errors='coerce').fillna(0)
        
        # --- NEW: Include Repair Tickets ---
        tickets = repo.get_data("Repair_Tickets")
        if not tickets.empty:
            # Filter Unpaid Vendor Tickets
            if 'Vendor_ID' not in tickets.columns: tickets['Vendor_ID'] = None
            if 'Payment_Status' not in tickets.columns: tickets['Payment_Status'] = None
            
            # Filter Logic
            t_mask = (tickets['Payment_Status'] != 'Paid') & (tickets['Vendor_ID'].notna()) & (tickets['Vendor_ID'] != "")
            if vendor_id:
                t_mask = t_mask & (tickets['Vendor_ID'] == vendor_id)
                
            pending_tickets = tickets[t_mask].copy()
            
            if not pending_tickets.empty:
                # Map Ticket Schema to Job Schema for Unified View
                pending_tickets['Job_ID'] = pending_tickets['Ticket_ID']
                pending_tickets['Plan_Date'] = pending_tickets['Date_Report']
                pending_tickets['Route_Name'] = "Repair: " + pending_tickets['Issue_Type'].astype(str)
                pending_tickets['Cost_Driver_Total'] = pd.to_numeric(pending_tickets['Cost_Total'], errors='coerce').fillna(0)
                pending_tickets['Remark'] = "Vendor: " + pending_tickets['Vendor_ID'].astype(str) # Mimic format
                
                # Align columns
                common_cols = ['Job_ID', 'Plan_Date', 'Route_Name', 'Cost_Driver_Total', 'Remark', 'Payment_Status']
                
                # Combine
                # Ensure pending has these columns
                for c in common_cols:
                    if c not in pending.columns: pending[c] = None
                    
                combined = pd.concat([
                    pending[common_cols], 
                    pending_tickets[common_cols]
                ], ignore_index=True)
                
                combined['Vendor_Name'] = combined['Remark'].str.replace('Vendor: ', '').str.replace('Assigned to Vendor: ', '')
                return combined
        
        # Extract Vendor Name if tickets empty
        pending['Vendor_Name'] = pending['Remark'].str.replace('Assigned to Vendor: ', '')
        return pending

    @staticmethod
    def mark_vendor_jobs_as_paid(job_ids: list, payment_ref: str = ""):
        """Mark vendor jobs as paid and generate PV."""
        try:
            # Separating Tickets and Jobs
            ticket_ids = [str(x) for x in job_ids if str(x).startswith("TK-")]
            real_job_ids = [x for x in job_ids if not str(x).startswith("TK-")]
            
            # 1. Update Jobs
            jobs = repo.get_data("Jobs_Main")
            if real_job_ids and not jobs.empty:
                jobs.loc[jobs['Job_ID'].isin(real_job_ids), 'Payment_Status'] = 'Paid'
                jobs.loc[jobs['Job_ID'].isin(real_job_ids), 'Payment_Ref'] = payment_ref
                jobs.loc[jobs['Job_ID'].isin(real_job_ids), 'Payment_Date'] = str(datetime.now())
                repo.update_data("Jobs_Main", jobs)
            
            # 2. Update Tickets
            tickets = repo.get_data("Repair_Tickets")
            if ticket_ids and not tickets.empty:
                tickets.loc[tickets['Ticket_ID'].isin(ticket_ids), 'Payment_Status'] = 'Paid'
                tickets.loc[tickets['Ticket_ID'].isin(ticket_ids), 'Payment_Ref'] = payment_ref
                tickets.loc[tickets['Ticket_ID'].isin(ticket_ids), 'Payment_Date'] = str(datetime.now())
                repo.update_data("Repair_Tickets", tickets)
            
            # Generate PV for each vendor involved (Combined)
            # Re-fetch updated data to generate unified PDF ideally, but for MVP we use passed IDs
            # Actually, we need DataFrame to generate PDF.
            # Let's combine them back for PDF generation logic.
            
            all_items = []
            if real_job_ids and not jobs.empty:
                df_j = jobs[jobs['Job_ID'].isin(real_job_ids)].copy()
                df_j['Cost_Driver_Total'] = pd.to_numeric(df_j['Cost_Driver_Total'], errors='coerce').fillna(0)
                all_items.append(df_j)
                
            if ticket_ids and not tickets.empty: # Use tickets logic
                df_t = tickets[tickets['Ticket_ID'].isin(ticket_ids)].copy()
                # Map columns for PDF generator (It expects Route_Name, Cost_Driver_Total)
                df_t['Route_Name'] = "Repair: " + df_t['Issue_Type'].astype(str)
                df_t['Cost_Driver_Total'] = pd.to_numeric(df_t['Cost_Total'], errors='coerce').fillna(0)
                # Ensure Vendor Remark format for grouping
                df_t['Remark'] = "Vendor: " + df_t['Vendor_ID'].astype(str)
                all_items.append(df_t)
            
            if not all_items:
                return True, []
                
            paid_jobs = pd.concat(all_items, ignore_index=True)
            
            # Group by Vendor (Remark)
            files = []
            for vendor_remark, group in paid_jobs.groupby('Remark'):
                # Clean name
                vendor_name = str(vendor_remark).replace('Assigned to Vendor: ', '').replace('Vendor: ', '')
                pdf_bytes = VendorService.generate_payment_voucher(vendor_name, group, payment_ref)
                fname = f"PV_{vendor_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
                files.append((fname, pdf_bytes))
            
            return True, files
            
        except Exception as e:
            logger.error(f"Failed to pay vendor jobs: {e}")
            return False, []

    @staticmethod
    def generate_payment_voucher(vendor_name, jobs_df, payment_ref):
        """Generate Payment Voucher PDF for Vendor."""
        # Reuse AccountingService helpers by importing them here to avoid circular dep if possible
        # Or better, duplicate/refactor. For speed, we will use a local implementation of PDF generation 
        # similar to Accounting but tailored for 'Payment Voucher'
        
        from services.accounting_service import PDFInvoice, num_to_thai_baht
        
        pdf = PDFInvoice()
        pdf.add_page()
        
        # --- Content ---
        pdf.add_font('THSarabun', '', pdf.font_path, uni=True)
        pdf.add_font('THSarabun', 'B', pdf.font_path, uni=True)
        pdf.set_font('THSarabun', 'B', 20)
        
        # Title
        pdf.cell(0, 10, "ใบสำคัญจ่าย (Payment Voucher)", 0, 1, 'C')
        pdf.set_font('THSarabun', '', 14)
        pdf.cell(0, 8, "บริษัท ทีเอ็มเอส อีพอด จำกัด (สำนักงานใหญ่)", 0, 1, 'C')
        pdf.ln(5)
        
        # Header Info
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(30, 8, "จ่ายให้ (Pay To):", 0, 0)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(100, 8, f"{vendor_name}", 0, 0)
        
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(30, 8, "เลขที่ (No):", 0, 0)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(30, 8, f"PV-{datetime.now().strftime('%y%m%d%H%M')}", 0, 1)
        
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(30, 8, "อ้างอิง (Ref):", 0, 0)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(100, 8, f"{payment_ref}", 0, 0)
        
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(30, 8, "วันที่ (Date):", 0, 0)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(30, 8, f"{datetime.now().strftime('%d/%m/%Y')}", 0, 1)
        
        pdf.ln(5)
        
        # Table Header
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(15, 8, "#", 1, 0, 'C', True)
        pdf.cell(40, 8, "Job ID", 1, 0, 'C', True)
        pdf.cell(85, 8, "รายการ (Description)", 1, 0, 'C', True)
        pdf.cell(50, 8, "จำนวนเงิน (Amount)", 1, 1, 'C', True)
        
        # Table Rows
        pdf.set_font('THSarabun', '', 12)
        total_amt = 0
        for i, row in jobs_df.iterrows():
            amt = row.get('Cost_Driver_Total', 0)
            total_amt += amt
            desc = f"ค่าขนส่ง {row.get('Customer_Name', '')} ({row.get('Route_Name', '')})"
            
            pdf.cell(15, 7, str(i+1), 1, 0, 'C')
            pdf.cell(40, 7, str(row['Job_ID']), 1, 0, 'C')
            pdf.cell(85, 7, desc[:50], 1, 0, 'L')
            pdf.cell(50, 7, f"{amt:,.2f}", 1, 1, 'R')
            
        # Totals
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(140, 8, "รวมเป็นเงิน (Total)", 1, 0, 'R')
        pdf.cell(50, 8, f"{total_amt:,.2f}", 1, 1, 'R')
        
        # Baht Text
        pdf.ln(2)
        pdf.set_font('THSarabun', 'B', 12)
        pdf.cell(20, 8, "ตัวอักษร:", 0, 0)
        pdf.set_font('THSarabun', '', 12)
        pdf.cell(0, 8, f"({num_to_thai_baht(total_amt)})", 0, 1)
        
        # Footer Signatures
        pdf.ln(20)
        pdf.cell(60, 0, "____________________", 0, 0, 'C')
        pdf.cell(60, 0, "____________________", 0, 0, 'C')
        pdf.cell(60, 0, "____________________", 0, 1, 'C')
        
        pdf.ln(5)
        pdf.cell(60, 0, "ผู้จัดทำ (Prepared By)", 0, 0, 'C')
        pdf.cell(60, 0, "ผู้ตรวจสอบ (Checked By)", 0, 0, 'C')
        pdf.cell(60, 0, "ผู้รับเงิน (Received By)", 0, 1, 'C')
        
        return pdf.output(dest='S').encode('latin-1')
