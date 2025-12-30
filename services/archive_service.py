
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pandas as pd
from datetime import datetime, timedelta
import streamlit as st
from data.repository import repo

# Scope
SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

CREDENTIALS_FILE = "service_account.json"
ARCHIVE_SHEET_NAME = "TMS_Archive_2025"

class ArchiveService:
    def __init__(self):
        self.client = None
        self.connected = False
        self._connect()
        
    def _connect(self):
        try:
            creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, SCOPE)
            self.client = gspread.authorize(creds)
            self.connected = True
        except Exception as e:
            print(f"Archive Service Error: {e}")
            self.connected = False

    def check_and_archive(self, days_threshold=45):
        """
        Main function to run the archive process for Jobs, Fuel, and Tickets.
        Returns: (success, summary_text)
        """
        if not self.connected:
            return False, "Google API not connected"

        cutoff_date = datetime.now() - timedelta(days=days_threshold)
        summary = []
        
        # 1. Jobs (Existing Logic)
        count_jobs = self._archive_jobs(cutoff_date)
        if count_jobs > 0: summary.append(f"Jobs: {count_jobs}")
        
        # 2. Fuel Logs (No status, just date)
        count_fuel = self._archive_fuel(cutoff_date)
        if count_fuel > 0: summary.append(f"Fuel: {count_fuel}")
        
        # 3. Repair Tickets (Status = Completed/Closed)
        count_tickets = self._archive_tickets(cutoff_date)
        if count_tickets > 0: summary.append(f"Tickets: {count_tickets}")

        if not summary:
            return True, "No old items found."
            
        return True, ", ".join(summary)

    def _archive_jobs(self, cutoff_date):
        jobs = repo.get_data("Jobs_Main")
        if jobs.empty: return 0
        
        # Coalesce Date
        if 'Actual_Delivery_Time' in jobs.columns and 'Plan_Date' in jobs.columns:
             jobs['Archive_Date_Check'] = pd.to_datetime(jobs['Actual_Delivery_Time'].fillna(jobs['Plan_Date']), errors='coerce')
        elif 'Actual_Delivery_Time' in jobs.columns:
             jobs['Archive_Date_Check'] = pd.to_datetime(jobs['Actual_Delivery_Time'], errors='coerce')
        else:
             jobs['Archive_Date_Check'] = pd.to_datetime(jobs.get('Plan_Date'), errors='coerce')
        
        # Filter
        candidates = jobs[
            (jobs['Job_Status'].str.upper() == 'COMPLETED') & 
            (jobs['Archive_Date_Check'] < cutoff_date)
        ]
        
        # Use 'Sheet1' for Jobs to keep backward compatibility or use new name
        return self._execute_archive(candidates, "Jobs_Main", "Job_ID", sheet_name="Jobs_Archive")

    def _archive_fuel(self, cutoff_date):
        fuel = repo.get_data("Fuel_Logs")
        if fuel.empty: return 0
        
        # Date Check
        fuel['Archive_Date_Check'] = pd.to_datetime(fuel['Date_Time'], errors='coerce')
        
        # Filter (No status check needed, just old logs)
        candidates = fuel[fuel['Archive_Date_Check'] < cutoff_date]
        
        return self._execute_archive(candidates, "Fuel_Logs", "Log_ID", sheet_name="Fuel_Archive")

    def _archive_tickets(self, cutoff_date):
        tickets = repo.get_data("Repair_Tickets")
        if tickets.empty: return 0
        
        # Date Check (Use Date_Finish or Date_Report)
        if 'Date_Finish' in tickets.columns:
            tickets['Archive_Date_Check'] = pd.to_datetime(tickets['Date_Finish'].fillna(tickets['Date_Report']), errors='coerce')
        else:
            tickets['Archive_Date_Check'] = pd.to_datetime(tickets['Date_Report'], errors='coerce')
            
        # Filter (Completed/Closed)
        candidates = tickets[
            (tickets['Status'].isin(['Completed', 'Closed', 'Rejected'])) & 
            (tickets['Archive_Date_Check'] < cutoff_date)
        ]
        
        return self._execute_archive(candidates, "Repair_Tickets", "Ticket_ID", sheet_name="Tickets_Archive")

    def _execute_archive(self, candidates, table_name, id_col, sheet_name):
        if candidates.empty: return 0
        
        try:
            # Drop the helper col
            export_df = candidates.drop(columns=['Archive_Date_Check'], errors='ignore')
            self._write_to_sheet(export_df, sheet_name=sheet_name)
            
            # Purge
            ids = candidates[id_col].tolist()
            if ids:
                repo.delete_records(table_name, ids, id_col=id_col)
                print(f"[{table_name}] Archived & Purged {len(ids)} records.")
                
            return len(candidates)
        except Exception as e:
            print(f"[{table_name}] Archive Failed: {e}")
            return 0

    def _write_to_sheet(self, df, sheet_name):
        """Writes dataframe to the Archive Sheet (append mode)."""
        try:
            try:
                # Try to open specific worksheet
                worksheet = self.client.open(ARCHIVE_SHEET_NAME).worksheet(sheet_name)
            except gspread.WorksheetNotFound:
                # Create if not exists
                sh = self.client.open(ARCHIVE_SHEET_NAME)
                worksheet = sh.add_worksheet(title=sheet_name, rows="100", cols="20")
            except Exception:
                 # Fallback for "Jobs_Archive" -> "Sheet1" mapping if user didn't rename
                 if sheet_name == "Jobs_Archive":
                     worksheet = self.client.open(ARCHIVE_SHEET_NAME).sheet1
                 else:
                     raise

            # Check Headers
            existing_data = worksheet.get_values('A1:A1')
            if not existing_data:
                 worksheet.append_row(df.columns.tolist())
                 
            # Convert timestamps
            export_df = df.copy()
            for col in export_df.columns:
                if pd.api.types.is_datetime64_any_dtype(export_df[col]):
                    export_df[col] = export_df[col].dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Sanitize
            export_df = export_df.fillna('')

            # CRITICAL FIX: Prevent Base64 Image Bombs
            # Google Sheets has a limit of 50,000 chars per cell. Base64 images often exceed this.
            def sanitize_large_text(val):
                if isinstance(val, str):
                    if len(val) > 1000:
                        # Check if it's likely a Base64 image
                        if "data:image" in val or val.strip().startswith("JVBERi0") or len(val) > 4000:
                            return "[IMAGE_TOO_LARGE_VIEW_IN_APP]"
                        # For other long text, truncate
                        return val[:1000] + "...(truncated)"
                return val

            # Apply sanitization to all object columns
            for col in export_df.select_dtypes(include=['object']):
                export_df[col] = export_df[col].apply(sanitize_large_text)
            
            data = export_df.values.tolist()
            worksheet.append_rows(data)
            
        except Exception as e:
            raise e

# Singleton
archive_service = ArchiveService()
