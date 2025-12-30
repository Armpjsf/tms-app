# services/accounting_service.py
"""
Accounting Service for TMS ePOD
Handles billing, invoicing, and payment workflows
"""

import streamlit as st
import pandas as pd
from datetime import datetime
import os
import math
from fpdf import FPDF

from data.repository import repo
from utils.logger import logger
from config.constants import PaymentStatus, BillingStatus

# --- Enterprise Helpers for PDF ---
def num_to_thai_baht(number):
    """แปลงตัวเลขเป็นคำอ่านภาษาไทย (BahtText) สำหรับงานเอกสารบัญชี"""
    if not number: return "ศูนย์บาทถ้วน"
    
    number_str = "{:.2f}".format(number)
    baht, satang = number_str.split('.')
    if baht == '0' and satang == '00': return "ศูนย์บาทถ้วน"
    
    thai_nums = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
    unit_baht = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"]
    
    def convert(n_str):
        text = ""
        length = len(n_str)
        for i, digit in enumerate(n_str):
            d = int(digit)
            if d != 0:
                pos = length - i - 1
                if pos == 1 and d == 2: text += "ยี่" # 20
                elif pos == 1 and d == 1: text += ""  # 10 (ไม่พูดหนึ่งสิบ)
                elif pos == 0 and d == 1 and length > 1: text += "เอ็ด" # ลงท้าย 1
                else: text += thai_nums[d]
                
                text += unit_baht[pos]
        return text

    text_baht = convert(baht)
    text_satang = convert(satang)
    
    result = ""
    if float(baht) > 0: result += text_baht + "บาท"
    if float(satang) > 0:
        result += text_satang + "สตางค์"
    else:
        result += "ถ้วน"
        
    return result

class PDFInvoice(FPDF):
    """Custom PDF Class for Header/Footer Management"""
    def __init__(self, orientation='L', unit='mm', format='A4'):
        super().__init__(orientation, unit, format)
        # *** ตรวจสอบ Path ไฟล์ Font และ Logo ให้ถูกต้อง ***
        # *** ตรวจสอบ Path ไฟล์ Font และ Logo ให้ถูกต้อง ***
        self.font_path = os.path.abspath('THSarabunNew.ttf')
        self.logo_path = 'company_logo.png'
        
        # Load Font
        if not os.path.exists(self.font_path):
             raise FileNotFoundError(f"Font file not found at: {self.font_path}")
             
        try:
            self.add_font('THSarabun', '', self.font_path, uni=True)
            self.add_font('THSarabun', 'B', self.font_path, uni=True)
        except Exception as e:
            # If font fails, we MUST fail because invoice needs Thai
            raise Exception(f"Failed to load Thai font: {e}")

    def header(self):
        # Header ถูกจัดการแบบ Manual ในฟังก์ชัน generate เพื่อความยืดหยุ่น
        pass

    def footer(self):
        self.set_y(-15)
        if 'THSarabun' in self.fonts:
            self.set_font('THSarabun', '', 10)
        else:
            self.set_font('Arial', '', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'R')

class AccountingService:
    
    @staticmethod
    def get_driver_payroll_summary(start_date=None, end_date=None, driver_name=None):
        """
        Get driver payroll summary for a date range.
        Returns DataFrame with driver earnings.
        """
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()
        
        # Filter completed jobs (Case Insensitive)
        df = jobs[jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED'].copy()
        
        # Date filter
        if start_date or end_date:
            df['Plan_Date'] = pd.to_datetime(df['Plan_Date'], errors='coerce')
            if start_date:
                df = df[df['Plan_Date'].dt.date >= start_date]
            if end_date:
                df = df[df['Plan_Date'].dt.date <= end_date]
        
        # Driver filter by name
        if driver_name:
            df = df[df['Driver_Name'] == driver_name]
        
        # Convert cost column
        df['Cost_Driver_Total'] = pd.to_numeric(
            df['Cost_Driver_Total'].astype(str).str.replace(',', ''), 
            errors='coerce'
        ).fillna(0)
        
        # Group by driver
        summary = df.groupby(['Driver_ID', 'Driver_Name'], dropna=False).agg({
            'Job_ID': 'count',
            'Cost_Driver_Total': 'sum',
            'Payment_Status': lambda x: (x == PaymentStatus.PAID).sum()
        }).reset_index()
        
        summary.columns = ['Driver_ID', 'Driver_Name', 'Total_Jobs', 'Total_Earnings', 'Paid_Jobs']
        summary['Pending_Amount'] = summary.apply(
            lambda r: r['Total_Earnings'] * (r['Total_Jobs'] - r['Paid_Jobs']) / r['Total_Jobs'] 
            if r['Total_Jobs'] > 0 else 0, axis=1
        )
        summary['Paid_Amount'] = summary['Total_Earnings'] - summary['Pending_Amount']
        
        return summary
    
    @staticmethod
    def get_pending_driver_payments():
        """Get all pending driver payments."""
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()
        
        pending = jobs[
            (jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED') & 
            (jobs['Payment_Status'] != PaymentStatus.PAID)
        ].copy()
        
        pending['Cost_Driver_Total'] = pd.to_numeric(
            pending['Cost_Driver_Total'].astype(str).str.replace(',', ''), 
            errors='coerce'
        ).fillna(0)
        
        return pending
    
    @staticmethod
    def mark_jobs_as_paid(job_ids: list, payment_date: str = None, payment_ref: str = None, withholding_tax_rate: float = 0.01):
        """
        Mark multiple jobs as paid and return generated receipt PDFs.
        withholding_tax_rate: Default 0.01 (1%) for Transportation
        """
        try:
            jobs = repo.get_data("Jobs_Main")
            if jobs.empty:
                return False, []
            
            payment_date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            
            # Auto-gen ref if empty
            if not payment_ref:
                payment_ref = f"PAY-{datetime.now().strftime('%y%m%d%H%M')}"
                
            # 1. Update Status & Ref
            jobs.loc[jobs['Job_ID'].isin(job_ids), 'Payment_Status'] = PaymentStatus.PAID
            jobs.loc[jobs['Job_ID'].isin(job_ids), 'Payment_Date'] = payment_date_str
            jobs.loc[jobs['Job_ID'].isin(job_ids), 'Payment_Slip_Url'] = payment_ref
            
            # 2. Generate Receipts & Update Receipt Path
            paid_jobs = jobs[jobs['Job_ID'].isin(job_ids)].copy()
            # Ensure numeric
            paid_jobs['Cost_Driver_Total'] = pd.to_numeric(
                paid_jobs['Cost_Driver_Total'].astype(str).str.replace(',', ''), 
                errors='coerce'
            ).fillna(0)
            
            receipt_files = []
            
            # 3. Generate Receipts (Grouped by Driver)
            for driver_id, group in paid_jobs.groupby('Driver_ID'):
                driver_name = group.iloc[0]['Driver_Name']
                pdf_bytes, pdf_path = AccountingService.generate_driver_receipt_pdf(group, driver_name, payment_date_str, withholding_tax_rate)
                
                if pdf_bytes:
                    filename = f"Receipt_{driver_name}_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
                    receipt_files.append((filename, pdf_bytes))
                    
                    # Upload to Cloud Storage (Enable Mobile App Access)
                    # Bucket: 'receipts'
                    cloud_path = f"{driver_name}/{filename}"
                    public_url = repo.upload_file("receipts", cloud_path, pdf_bytes)
                    
                    if public_url:
                        logger.info(f"Uploaded receipt to {public_url}")
                    else:
                        logger.warning("Failed to upload receipt to cloud, using local path")
                    
                    # Use Cloud URL if available, else Local Path
                    final_url = public_url if public_url else pdf_path
                    
                    # Update Receipt Path in DB DataFrame using Job_IDs
                    g_ids = group['Job_ID'].tolist()
                    jobs.loc[jobs['Job_ID'].isin(g_ids), 'Payment_Slip_Url'] = final_url

            # 3. Save Changes to DB
            repo.update_data("Jobs_Main", jobs)
            
            # 4. Generate Bank Transfer File (CSV)
            bank_csv_bytes = AccountingService.generate_bank_transfer_file(paid_jobs)
            if bank_csv_bytes:
                bank_filename = f"SCB_Payroll_{datetime.now().strftime('%Y%m%d%H%M')}.csv"
                receipt_files.append((bank_filename, bank_csv_bytes))
                    
            return True, receipt_files
            
        except Exception as e:
            logger.error(f"Mark paid error: {e}")
            return False, []

    @staticmethod
    def generate_driver_receipt_pdf(jobs_df: pd.DataFrame, driver_name: str, date: str, wht_rate: float):
        """Generate PDF Receipt for Driver Payment"""
        try:
            import tempfile
            # ================= CONFIGURATION =================
            C_NAVY = (0, 51, 102)
            C_BLACK = (0, 0, 0)
            
            pdf = PDFInvoice(orientation='P', format='A4') # Portrait for Receipt
            pdf.set_margins(10, 10, 10)
            pdf.add_page()
            
            font_fam = 'THSarabun'
            
            # ================= 1. HEADER SECTION =================
            # Logo
            if os.path.exists(pdf.logo_path):
                pdf.image(pdf.logo_path, x=10, y=8, w=20)
            
            # Company Info (Left)
            pdf.set_xy(32, 8)
            pdf.set_text_color(*C_NAVY)
            pdf.set_font(font_fam, 'B', 18)
            pdf.cell(0, 8, "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด", ln=True)
            
            pdf.set_xy(32, 15)
            pdf.set_font(font_fam, '', 12)
            pdf.set_text_color(*C_BLACK)
            pdf.cell(0, 5, "เลขที่ 99/2 หมู่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000", ln=True)
            pdf.set_xy(32, 20)
            pdf.cell(0, 5, "เลขประจำตัวผู้เสียภาษี: 0745559001353 (สำนักงานใหญ่)", ln=True)
            
            # Document Title (Right)
            pdf.set_xy(140, 8)
            pdf.set_text_color(*C_NAVY)
            pdf.set_font(font_fam, 'B', 20)
            pdf.cell(60, 10, "ใบสำคัญจ่าย", align='R', ln=True)
            pdf.set_xy(140, 16)
            pdf.set_font(font_fam, '', 12)
            pdf.cell(60, 6, "(Payment Voucher)", align='R', ln=True)
            
            pdf.ln(10)
            
            # Recipient Info
            pdf.set_text_color(*C_BLACK)
            pdf.set_font(font_fam, 'B', 14)
            pdf.cell(20, 7, "ผู้รับเงิน:", 0, 0)
            pdf.set_font(font_fam, '', 14)
            pdf.cell(100, 7, f"{driver_name}", 0, 0)
            
            pdf.set_font(font_fam, 'B', 14)
            pdf.cell(25, 7, "วันที่จ่าย:", 0, 0, 'R')
            pdf.set_font(font_fam, '', 14)
            pdf.cell(45, 7, f"{date}", 0, 1, 'R')
            
            # ================= 2. TABLE SECTION =================
            pdf.ln(5)
            pdf.set_font(font_fam, 'B', 12)
            pdf.set_fill_color(240, 240, 240)
            
            # Cols: No(10), JobID(25), Origin(30), Dest(30), Wage(20), Return(15), Wait(15), Other(15), Total(25)
            cols = [10, 25, 30, 30, 20, 15, 15, 15, 30] 
            headers = ["No.", "Job ID", "Origin", "Dest", "Wage", "Return", "Wait", "Other", "Total"]
            
            for i, h in enumerate(headers):
                pdf.cell(cols[i], 8, h, 1, 0, 'C', True)
            pdf.ln()
            
            pdf.set_font(font_fam, '', 10) # Smaller font for more columns
            total_earnings = 0
            total_wht = 0
            
            for i, row in jobs_df.iterrows():
                try:
                    total_amt = float(str(row.get('Cost_Driver_Total', 0)).replace(',', ''))
                except: total_amt = 0
                
                # Extract specifics (Default to 0 if columns don't exist)
                try: ret_amt = float(str(row.get('Cost_Return', 0)).replace(',', ''))
                except: ret_amt = 0
                
                try: wait_amt = float(str(row.get('Cost_Wait', 0)).replace(',', ''))
                except: wait_amt = 0
                
                try: other_amt = float(str(row.get('Cost_Other', 0)).replace(',', ''))
                except: other_amt = 0
                
                # Wage = Total - Extras (To avoid double counting if Total is aggregate)
                # Assumption: Cost_Driver_Total IS the sum.
                wage_amt = total_amt - (ret_amt + wait_amt + other_amt)
                if wage_amt < 0: wage_amt = 0 # Safety
                
                wht = total_amt * wht_rate
                total_earnings += total_amt
                total_wht += wht
                
                # Origin / Destination Logic
                route = str(row.get('Route_Name', ''))
                origin = str(row.get('Origin_Location', row.get('Origin', '')))
                dest = str(row.get('Dest_Location', row.get('Destination', '')))
                
                if not origin and not dest:
                    # Try split
                    parts = route.split('->')
                    if len(parts) > 1:
                        origin = parts[0].strip()
                        dest = parts[1].strip()
                    elif '-' in route:
                        parts = route.split('-')
                        if len(parts) > 1:
                            origin = parts[0].strip()
                            dest = parts[1].strip()
                        else:
                            origin = route
                            dest = "-"
                    else:
                        origin = route
                        dest = "-"
                
                # Truncate
                origin = (origin[:15] + '..') if len(origin) > 18 else origin
                dest = (dest[:15] + '..') if len(dest) > 18 else dest
                
                pdf.cell(cols[0], 7, str(i + 1), 1, 0, 'C')
                pdf.cell(cols[1], 7, str(row.get('Job_ID')), 1, 0, 'L')
                pdf.cell(cols[2], 7, origin, 1, 0, 'L')
                pdf.cell(cols[3], 7, dest, 1, 0, 'L')
                pdf.cell(cols[4], 7, f"{wage_amt:,.0f}", 1, 0, 'R')
                pdf.cell(cols[5], 7, f"{ret_amt:,.0f}" if ret_amt else "-", 1, 0, 'R')
                pdf.cell(cols[6], 7, f"{wait_amt:,.0f}" if wait_amt else "-", 1, 0, 'R')
                pdf.cell(cols[7], 7, f"{other_amt:,.0f}" if other_amt else "-", 1, 0, 'R')
                pdf.cell(cols[8], 7, f"{total_amt:,.2f}", 1, 0, 'R')
                pdf.ln()
                
            # ================= 3. FOOTER SUMMARY =================
            pdf.ln(5)
            
            # Draw separator line
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(3)
            
            # Calculate net
            net_total = total_earnings - total_wht
            
            # Summary with clear labels - Right-aligned 2-column layout
            pdf.set_font(font_fam, 'B', 13)
            
            # Total Line
            pdf.cell(150, 7, "รวมค่าจ้างทั้งหมด (Total Earnings)", 0, 0, 'R')
            pdf.cell(40, 7, f"{total_earnings:,.2f}", 0, 1, 'R')
            
            # WHT Deduction Line
            pdf.set_font(font_fam, '', 12)
            pdf.cell(150, 7, f"หักภาษี ณ ที่จ่าย {int(wht_rate*100)}% (Withholding Tax)", 0, 0, 'R')
            pdf.cell(40, 7, f"{total_wht:,.2f}", 0, 1, 'R')
            
            # Net Payment Line - Highlighted
            pdf.ln(2)
            pdf.set_font(font_fam, 'B', 14)
            pdf.set_fill_color(240, 240, 240)
            pdf.cell(150, 9, "ยอดสุทธิ (Net Payment)", 1, 0, 'R', True)
            pdf.cell(40, 9, f"{net_total:,.2f}", 1, 1, 'R', True)
            
            # Baht Text for Net
            pdf.ln(2)
            pdf.set_font(font_fam, 'B', 12)
            baht_text = f"({num_to_thai_baht(net_total)})"
            pdf.cell(0, 7, baht_text, 0, 1, 'R')
            
            # ================= 4. SIGNATURE =================
            pdf.ln(15)
            pdf.set_font(font_fam, '', 12)
            
            # 3. Signature Block
            pdf.ln(10)
            pdf.set_font(font_fam, '', 12)
            
            # Driver name ON the signature line (not below)
            pdf.cell(0, 6, f"........... {driver_name} ...........", 0, 1, 'C')
            pdf.cell(0, 6, "ผู้รับเงิน / Receiver", 0, 1, 'C')

            # Output
            filename = f"Receipt_{driver_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
            # Sanitize
            filename = "".join([c for c in filename if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
            
            save_dir = "assets/receipts"
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
            
            full_path = os.path.join(save_dir, filename)
            pdf.output(full_path)
            
            with open(full_path, "rb") as f:
                data = f.read()
                
            return data, full_path
            
        except Exception as e:
            logger.error(f"Receipt Gen Error: {e}")
            return None, None
    
    @staticmethod
    def get_customer_billing_summary(customer_name: str = None):
        """Get billing summary by customer."""
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()
        
        # Filter completed/unbilled
        # Filter completed/unbilled
        df = jobs[
            (jobs['Job_Status'].astype(str).str.upper() == 'COMPLETED') & 
            (jobs['Billing_Status'] != BillingStatus.BILLED)
        ].copy()
        
        if customer_name:
            df = df[df['Customer_Name'] == customer_name]
        
        df['Price_Cust_Total'] = pd.to_numeric(
            df['Price_Cust_Total'].astype(str).str.replace(',', ''), 
            errors='coerce'
        ).fillna(0)
        
        return df
    
    @staticmethod
    def _get_bank_code(bank_name):
        """Map Bank Name to 3-digit Code."""
        if not bank_name: return "014" # Default to SCB if unknown? Or empty.
        bn = bank_name.upper()
        mapping = {
            "SCB": "014", "ไทยพาณิชย์": "014",
            "BBL": "002", "กรุงเทพ": "002",
            "KBANK": "004", "กสิกร": "004", "K-BANK": "004",
            "KTB": "006", "กรุงไทย": "006",
            "TTB": "011", "ทีทีบี": "011", "TMB": "011", "THANACHART": "011",
            "BAY": "025", "กรุงศรี": "025",
            "GSB": "030", "ออมสิน": "030",
            "UOB": "024", "ยูโอบี": "024",
            "BAAC": "034", "ธกส": "034",
            "TISCO": "067", "ทิสโก้": "067",
            "KKP": "069", "เกียรตินาคิน": "069",
            "CIMB": "022", "ซีไอเอ็มบี": "022",
            "LHBANK": "073", "แลนด์แอนด์เฮาส์": "073"
        }
        for k, v in mapping.items():
            if k in bn: return v
        return "" # Unknown

    @staticmethod
    def generate_bank_transfer_file(paid_jobs_df: pd.DataFrame) -> bytes:
        """Generate SCB Bulk Transfer CSV file."""
        try:
            # 1. Aggregate by Driver
            summary = paid_jobs_df.groupby('Driver_Name')['Cost_Driver_Total'].sum().reset_index()
            summary.columns = ['Driver_Name', 'Amount']
            
            # 2. Get Bank Details
            drivers = repo.get_data("Master_Drivers")
            
            # Ensure columns exist
            for col in ['Bank_Name', 'Bank_Account', 'Driver_ID']:
                if col not in drivers.columns:
                    drivers[col] = ""
                    
            if 'Driver_ID' in paid_jobs_df.columns:
                 # Group with ID
                 summary = paid_jobs_df.groupby(['Driver_ID', 'Driver_Name'])['Cost_Driver_Total'].sum().reset_index()
                 summary.columns = ['Driver_ID', 'Driver_Name', 'Amount']
                 if not drivers.empty:
                    # Merge on Driver_ID
                    summary = pd.merge(summary, drivers[['Driver_ID', 'Bank_Name', 'Bank_Account']], on='Driver_ID', how='left')
            else:
                 if not drivers.empty:
                    # Fallback to Name match
                    summary = pd.merge(summary, drivers[['Driver_Name', 'Bank_Name', 'Bank_Account']], on='Driver_Name', how='left')
            
            # 3. Format Output (SCB Format)

            # 3. Format Output (SCB Format)
            # Layout: Account, Amount, BankCode, Name, Ref1(Payroll), Ref2(DriverID)
            
            # Helper to clean account
            def clean_acc(x):
                s = str(x).strip()
                clean = "".join(filter(str.isdigit, s))
                return clean if clean else "MISSING_ACCOUNT"

            summary['Bank_Account'] = summary['Bank_Account'].apply(clean_acc)
            summary['Bank_Name'] = summary['Bank_Name'].fillna('')
            summary['Bank_Code'] = summary['Bank_Name'].apply(AccountingService._get_bank_code)
            summary['Driver_ID'] = summary['Driver_ID'].fillna('') if 'Driver_ID' in summary.columns else ''
            
            # Ensure Bank Code 014 (SCB) if internal transfer, otherwise use code. 
            # If default blank -> 014 (Assuming internal)
            summary['Bank_Code'] = summary['Bank_Code'].replace('', '014')

            final_df = pd.DataFrame()
            final_df['Receiving_Account'] = summary['Bank_Account']
            final_df['Amount'] = summary['Amount'].apply(lambda x: "{:.2f}".format(x))
            final_df['Receiving_Bank_Code'] = summary['Bank_Code']
            final_df['Receiving_Name'] = summary['Driver_Name'].str.strip().str[:50] # Limit length
            final_df['Ref1_Company'] = "TMS Payroll"
            final_df['Ref2_Employee'] = summary['Driver_ID']
            final_df['Email_SMS'] = "" # Optional

            # Return CSV without Header (Common for SCB) or With Header?
            # Safe bet: With Header for readable, or user can delete. 
            # Let's simple standard CSV.
            return final_df.to_csv(index=False, header=False).encode('utf-8-sig')
            
        except Exception as e:
            logger.error(f"Failed to generate SCB bank file: {e}")
            return b""

    @staticmethod
    def create_bulk_invoices(customer_jobs_map: dict, tax_rate: float = 0.03):
        """
        Create invoices for multiple customers at once.
        customer_jobs_map: { 'CustomerA': [job_id1, job_id2], 'CustomerB': [...] }
        Returns a ZIP file containing all invoices.
        """
        try:
            generated_files = []
            
            for cust_name, job_ids in customer_jobs_map.items():
                invoice_data, error = AccountingService.create_invoice(cust_name, job_ids, tax_rate)
                if invoice_data:
                    # Fetch job data for PDF
                    jobs = repo.get_data("Jobs_Main")
                    jobs_for_pdf = jobs[jobs['Job_ID'].isin(job_ids)].copy()
                    
                    pdf_bytes = AccountingService.generate_invoice_pdf(invoice_data, jobs_for_pdf, tax_rate)
                    if pdf_bytes:
                        filename = f"Invoice_{invoice_data['invoice_no']}_{cust_name}.pdf"
                        generated_files.append((filename, pdf_bytes))
            
            if not generated_files:
                return None, "No invoices generated"
                
            return generated_files, None # Return list of files, let View handle Zipping
            
        except Exception as e:
            logger.error(f"Bulk invoice error: {e}")
            return None, str(e)

    @staticmethod
    def create_invoice(customer_name: str, job_ids: list, tax_rate: float = 0.0):
        """Create invoice for selected jobs with Tax option."""
        try:
            jobs = repo.get_data("Jobs_Main")
            if jobs.empty:
                return None, "No jobs found"
            
            # --- Fetch Customer Details ---
            cust_addr = "-"
            cust_tax = "-"
            try:
                masters = repo.get_data("Master_Customers")
                if not masters.empty:
                    cust_row = masters[masters['Customer_Name'] == customer_name]
                    if not cust_row.empty:
                        cust_addr = str(cust_row.iloc[0].get('Address', '-'))
                        cust_tax = str(cust_row.iloc[0].get('Tax_ID', '-'))
            except: pass
            # ------------------------------

            inv_no = f"INV-{datetime.now().strftime('%y%m%d%H%M%S')}-{os.urandom(2).hex().upper()}"
            bill_date = datetime.now().strftime("%Y-%m-%d")
            
            total_amount = 0
            for job_id in job_ids:
                idx = jobs[jobs['Job_ID'] == job_id].index
                if not idx.empty:
                    jobs.loc[idx[0], 'Billing_Status'] = BillingStatus.BILLED
                    jobs.loc[idx[0], 'Invoice_No'] = inv_no
                    jobs.loc[idx[0], 'Billing_Date'] = bill_date
                    
                    amt = pd.to_numeric(str(jobs.loc[idx[0], 'Price_Cust_Total']).replace(',', ''), errors='coerce')
                    total_amount += amt if pd.notna(amt) else 0
            
            repo.update_data("Jobs_Main", jobs)
            
            return {
                'invoice_no': inv_no,
                'customer': customer_name,
                'customer_address': cust_addr, 
                'customer_tax_id': cust_tax,
                'job_count': len(job_ids),
                'total_amount': total_amount,
                'date': bill_date
            }, None
            
        except Exception as e:
            logger.error(f"Create invoice error: {e}")
            return None, str(e)

    @staticmethod
    def create_zip_archive(files: list):
        """Create a ZIP archive from a list of (filename, bytes) tuples."""
        import zipfile
        import io
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for fname, fbytes in files:
                zip_file.writestr(fname, fbytes)
        
        return zip_buffer.getvalue()

    @staticmethod
    def get_ar_aging_report():
        """Get Accounts Receivable aging report."""
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty:
            return pd.DataFrame()
        
        # Get billed but not paid
        df = jobs[
            (jobs['Billing_Status'] == BillingStatus.BILLED) & 
            (jobs.get('Customer_Payment_Status', 'Pending') != 'Paid')
        ].copy()
        
        if df.empty:
            return pd.DataFrame()
        
        df['Billing_Date'] = pd.to_datetime(df['Billing_Date'], errors='coerce')
        df['Days_Outstanding'] = (datetime.now() - df['Billing_Date']).dt.days
        
        df['Price_Cust_Total'] = pd.to_numeric(
            df['Price_Cust_Total'].astype(str).str.replace(',', ''), 
            errors='coerce'
        ).fillna(0)
        
        # Aging buckets
        df['Aging_Bucket'] = pd.cut(
            df['Days_Outstanding'],
            bins=[-1, 30, 60, 90, 999],
            labels=['0-30 days', '31-60 days', '61-90 days', '90+ days']
        )
        
        # Group by customer
        aging = df.groupby(['Customer_Name', 'Aging_Bucket']).agg({
            'Price_Cust_Total': 'sum',
            'Invoice_No': 'count'
        }).reset_index()
        aging.columns = ['Customer', 'Aging', 'Amount', 'Invoices']
        
        return aging

    @staticmethod
    def mark_customer_payment(customer_name: str, payment_date: str = None, slip_url: str = None) -> bool:
        """Mark all billed jobs for a customer as paid."""
        try:
            jobs = repo.get_data("Jobs_Main")
            if jobs.empty:
                return False
            mask = (jobs['Customer_Name'] == customer_name) & (jobs['Billing_Status'] == BillingStatus.BILLED)
            if not mask.any():
                return False
            today_str = datetime.now().strftime('%Y-%m-%d')
            jobs.loc[mask, 'Customer_Payment_Status'] = 'Paid'
            jobs.loc[mask, 'Customer_Payment_Date'] = payment_date or today_str
            if slip_url:
                jobs.loc[mask, 'Customer_Payment_Slip_Url'] = slip_url
            repo.update_data("Jobs_Main", jobs)
            return True
        except Exception as e:
            logger.error(f"Mark payment error for {customer_name}: {e}")
            return False

    @staticmethod
    def generate_invoice_pdf(invoice_data: dict, jobs_df: pd.DataFrame, tax_rate: float = 0.0):
        """
        Generate Enterprise Standard Billing Note PDF
        tax_rate: 0.03 for 3% Tax deduction/addition
        """
        import tempfile
        # ================= CONFIGURATION =================

        C_NAVY = (0, 51, 102)
        C_BLACK = (0, 0, 0)
        C_LIGHT_BG = (242, 248, 255) # Light Blue-ish Background
        
        pdf = PDFInvoice(orientation='L', format='A4')
        pdf.set_margins(7, 10, 7)
        pdf.add_page()
        
        # ตรวจสอบ Font
        # FPDF keys are lowercase ('thsarabun')
        font_fam = 'THSarabun' # Always use Thai font because we validated it in __init__
        
        
        # ================= 1. HEADER SECTION =================
        # Logo
        if os.path.exists(pdf.logo_path):
            pdf.image(pdf.logo_path, x=7, y=8, w=22) # ปรับขนาดให้พอดี
        
        # Company Info (Left)
        pdf.set_xy(32, 8)
        pdf.set_text_color(*C_NAVY)
        pdf.set_font(font_fam, 'B', 20)
        pdf.cell(0, 8, "บริษัท ดีดีเซอร์วิสแอนด์ทรานสปอร์ต จำกัด", ln=True)
        
        pdf.set_xy(32, 16)
        pdf.set_font(font_fam, '', 14)
        pdf.set_text_color(*C_BLACK)
        pdf.cell(0, 5, "เลขที่ 99/2 หมู่ 3 ตำบลท่าทราย อำเภอเมือง จังหวัดสมุทรสาคร 74000", ln=True)
        
        pdf.set_xy(32, 22)
        pdf.cell(0, 5, "เลขประจำตัวผู้เสียภาษี: 0745559001353 (สำนักงานใหญ่)", ln=True)
        
        # Title (Right)
        pdf.set_xy(230, 8)
        pdf.set_text_color(*C_NAVY) # เปลี่ยนเป็นสีน้ำเงินตามภาพ หรือ แดงตามต้องการ
        pdf.set_font(font_fam, '', 16)
        pdf.cell(55, 8, "BILLING NOTE", align='R', ln=True)
        
        pdf.set_xy(230, 16) # ปรับตำแหน่ง "ใบวางบิล"
        pdf.set_font(font_fam, 'B', 24) # ตัวใหญ่
        pdf.cell(55, 8, "ใบวางบิล", align='R', ln=True)

        # ================= 2. INFO BOXES =================
        box_y = 35
        box_h = 28
        
        pdf.set_line_width(0.3)
        pdf.set_draw_color(*C_NAVY)
        pdf.set_fill_color(*C_LIGHT_BG) # Set Fill Color
        
        # Box 1: Customer Info (Left) - ขยายให้กว้างขึ้น
        pdf.rect(7, box_y, 200, box_h, 'FD') # 'FD' = Fill & Draw
        
        pdf.set_xy(9, box_y + 2)
        pdf.set_font(font_fam, 'B', 14)
        pdf.set_text_color(*C_NAVY)
        pdf.cell(0, 6, f"ลูกค้า: {invoice_data.get('customer', '-')}", ln=True)
        
        pdf.set_xy(9, box_y + 9)
        pdf.set_font(font_fam, '', 12) # ลดขนาดนิดหน่อยให้พอดี
        pdf.set_text_color(*C_BLACK)
        cust_addr = invoice_data.get('customer_address', '-')
        # Limit at 130 chars (enough for long Thai address)
        pdf.cell(0, 6, f"ที่อยู่: {cust_addr[:130]}", ln=True)
        
        pdf.set_xy(9, box_y + 16)
        pdf.cell(0, 6, f"เลขผู้เสียภาษี: {invoice_data.get('customer_tax_id', '-')}", ln=True)

        # Box 2: Document Info (Right)
        pdf.rect(210, box_y, 80, box_h, 'FD') # 'FD' = Fill & Draw
        
        pdf.set_xy(212, box_y + 4)
        pdf.set_font(font_fam, 'B', 14)
        pdf.cell(0, 7, f"เลขที่เอกสาร: {invoice_data.get('invoice_no', '-')}", ln=True)
        
        pdf.set_xy(212, box_y + 14)
        pdf.set_font(font_fam, '', 14)
        pdf.cell(0, 7, f"วันที่: {invoice_data.get('date', datetime.now().strftime('%Y-%m-%d'))}", ln=True)

        # ================= 3. TABLE HEADER =================
        # กำหนด Grid Column (รวม 283mm เต็มหน้า)
        # Old: [8, 18, 12, 12, 35, 38, 18, 18, 18, 18, 18, 15, 22] = 250mm
        # New: [10, 20, 14, 50, 53, 20, 20, 20, 20, 18, 15, 23] = 283mm
        cols = [10, 20, 14, 50, 53, 20, 20, 20, 20, 18, 15, 23] 
        # Headers: (Title Line 1, Title Line 2)
        headers = [
            ("No.", ""),
            ("Date", ""),
            ("Type", ""),
            # ("Total", "Drops"), <-- REMOVED
            ("Origin", ""),
            ("Destination", ""),
            ("Carbon", "(kgCO2e)"),
            ("Wage", ""),
            ("Extra", "Point"),   
            ("Labor", ""),     
            ("Wait", "Time"),     
            ("Other", ""),
            ("Total", "")
        ]
        
        start_y = box_y + box_h + 5
        row_h = 12 # ความสูง Header
        
        pdf.set_xy(7, start_y)
        # Ensure we use Thai font (Force THSarabun to avoid Latin1 error fallback)
        pdf.set_font('THSarabun', 'B', 12) 
        
        pdf.set_fill_color(*C_LIGHT_BG) # Use Standard Light Color
        pdf.set_draw_color(100, 100, 100)
        
        current_x = 7
        for i, (w, (txt1, txt2)) in enumerate(zip(cols, headers)):
            pdf.set_xy(current_x, start_y)
            # วาดกรอบ
            pdf.rect(current_x, start_y, w, row_h, 'FD')
            
            # วาดข้อความ
            if txt2: # 2 lines
                pdf.set_xy(current_x, start_y + 2)
                pdf.cell(w, 4, txt1, 0, 2, 'C')
                pdf.cell(w, 4, txt2, 0, 0, 'C')
            else: # 1 line centered vertically
                # Adjust Y to center single line (row_h 12, font approx 4-5)
                # set_xy to start_y + 4 looks about right for vertical center
                pdf.set_xy(current_x, start_y + 4)
                pdf.cell(w, 4, txt1, 0, 0, 'C')
            
            current_x += w
        
        # ================= 4. DATA ROWS =================
        current_y = start_y + row_h
        pdf.set_font(font_fam, '', 12)
        pdf.set_fill_color(255, 255, 255)
        
        total_amount = 0
        
        for idx, row in jobs_df.iterrows():
            # Helper to clean currency
            def get_val(key, default=0):
                val = row.get(key, default)
                if pd.isna(val): return 0.0
                try:
                    if isinstance(val, str):
                        return float(val.replace(',', ''))
                    return float(val)
                except (ValueError, TypeError):
                    return 0.0

            # Data Extraction Logic
            price_total = get_val('Price_Cust_Total')
            labor = get_val('Charge_Labor') # หรือ Price_Cust_Labor แล้วแต่ Data Structure
            extra_pt = get_val('Charge_Extra_Point')
            wait = get_val('Charge_Wait')
            other = get_val('Price_Cust_Other')
            
            # คำนวณ Base Wage (ค่าจ้างรถ) ย้อนกลับ
            base_wage = price_total - (labor + extra_pt + wait + other)
            if base_wage < 0: base_wage = 0
            
            co2 = get_val('Est_Distance_KM', 0) * 0.12 # Example logic

            total_amount += price_total
            
            # Prepare row text
            data = [
                str(idx + 1),
                str(row.get('Plan_Date', ''))[:10],
                str(row.get('Vehicle_Type', '')).replace('.0', '')[:10], # Fix: Remove .0
                # str(row.get('Total_Drop', '1')), <-- REMOVED
                str(row.get('Origin_Location', ''))[:35],
                str(row.get('Dest_Location', ''))[:35],
                f"{co2:.2f}",
                f"{base_wage:,.2f}",
                f"{extra_pt:,.2f}" if extra_pt > 0 else "-",
                f"{labor:,.2f}" if labor > 0 else "-",
                f"{wait:,.2f}" if wait > 0 else "-",
                f"{other:,.2f}" if other > 0 else "-",
                f"{price_total:,.2f}"
            ]
            
            # Check page break
            if current_y > 180:
                pdf.add_page()
                current_y = 10 # Reset Y (ควรวาด Header ใหม่ตรงนี้ถ้าเป็น full loop)
            
            current_x = 7
            h_line = 7 # ความสูงแถวข้อมูล
            
            for i, (w, txt) in enumerate(zip(cols, data)):
                align = 'C'
                if i in [3, 4]: align = 'L' # Origin, Dest ชิดซ้าย (Shifted)
                if i >= 5: align = 'R'      # ตัวเลขชิดขวา (Shifted)
                
                pdf.set_xy(current_x, current_y)
                pdf.cell(w, h_line, txt, 1, 0, align)
                current_x += w
            
            current_y += h_line
            
        # ================= 5. FOOTER SUMMARY =================
        # Draw summary section
        pdf.ln(3)
        
        # Calculate Widths
        total_width = sum(cols)
        value_col_width = cols[-1]
        label_col_width = total_width - value_col_width
        
        pdf.set_font(font_fam, 'B', 13)
        
        # 1. Subtotal Row
        pdf.set_xy(7, current_y + 3)
        pdf.cell(label_col_width, 8, "ยอดรวม (Subtotal)   ", 1, 0, 'R')
        pdf.cell(value_col_width, 8, f"{total_amount:,.2f}", 1, 1, 'R')
        
        # 2. Tax Row (if applicable)
        grand_total = total_amount
        if tax_rate > 0:
            tax_amount = total_amount * tax_rate
            grand_total += tax_amount
            
            # Tax label
            tax_label = f"ภาษีมูลค่าเพิ่ม {int(tax_rate*100)}% (VAT)"
            
            pdf.set_xy(7, pdf.get_y())
            pdf.set_font(font_fam, '', 12)
            pdf.cell(label_col_width, 8, f"{tax_label}   ", 1, 0, 'R')
            pdf.cell(value_col_width, 8, f"{tax_amount:,.2f}", 1, 1, 'R')

        # 3. Grand Total Row - Clear Label
        pdf.set_xy(7, pdf.get_y())
        pdf.set_font(font_fam, 'B', 14)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(label_col_width, 10, "ยอดสุทธิ (Grand Total)   ", 1, 0, 'R', True)
        pdf.cell(value_col_width, 10, f"{grand_total:,.2f}", 1, 1, 'R', True)
        
        # Baht Text below
        pdf.set_font(font_fam, 'B', 12)
        baht_text = f"({num_to_thai_baht(grand_total)})"
        pdf.cell(0, 6, baht_text, 0, 1, 'R')
        
        # ================= 6. SIGNATURE SECTION =================
        sig_y = pdf.get_y() + 15
        
        # ผู้รับวางบิล (ซ้าย)
        pdf.set_xy(30, sig_y)
        pdf.cell(60, 5, ".......................................................", 0, 1, 'C')
        pdf.set_xy(30, sig_y + 6)
        pdf.cell(60, 5, "ผู้รับวางบิล / Received by", 0, 1, 'C')
        pdf.set_xy(30, sig_y + 12)
        pdf.cell(60, 5, "วันที่ (Date) ......./......./.......", 0, 1, 'C')
        
        # ผู้วางบิล (ขวา)
        pdf.set_xy(200, sig_y)
        pdf.cell(60, 5, ".......................................................", 0, 1, 'C')
        pdf.set_xy(200, sig_y + 6)
        pdf.cell(60, 5, "ผู้วางบิล / Collector", 0, 1, 'C')
        pdf.set_xy(200, sig_y + 12)
        pdf.cell(60, 5, "วันที่ (Date) ......./......./.......", 0, 1, 'C')
        
        # ================= RETURN BYTES (FIXED) =================
        try:
            # Create a closed temp file path
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp_path = tmp.name
            
            # Write PDF to the closed file path
            pdf.output(tmp_path)
            
            # Read back
            with open(tmp_path, "rb") as f:
                pdf_bytes = f.read()
                
            os.remove(tmp_path)
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"PDF Generation Error: {e}")
            st.error(f"PDF Gen Error: {e}") # Show in UI for debugging
            return None