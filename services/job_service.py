
from data.repository import repo
from utils.logger import logger
from datetime import datetime
from services.audit_service import AuditService
import streamlit as st

class JobService:
    @staticmethod
    def generate_job_id() -> str:
        """Generates a unique Job ID: JOB-YYYYMMDD-HHMMSS"""
        import time
        now = datetime.now()
        # Use full timestamp for guaranteed uniqueness
        timestamp = now.strftime('%Y%m%d-%H%M%S')
        # Add milliseconds for extra uniqueness
        ms = int(time.time() * 1000) % 1000
        return f"JOB-{timestamp}-{ms:03d}"

    @staticmethod
    def create_new_job(job_data: dict) -> bool:
        try:
            if not job_data.get('Job_ID'): 
                return False
            
            # CRITICAL FIX: Intercept Base64 Images
            job_data = JobService._process_images(job_data)

            res = repo.insert_record("Jobs_Main", job_data)
            if res:
                AuditService.log_action(
                    user_id=st.session_state.get("user_id", "SYSTEM"), 
                    action="CREATE_JOB", 
                    target=job_data.get('Job_ID'),
                    details=f"Created job for {job_data.get('Customer_Name')}"
                )
            return res
        except Exception as e:
            logger.error(f"Create Job Failed: {e}")
            return False

    @staticmethod
    def update_job_status(job_id, new_status, timestamp=None, **kwargs):
        """
        Updates job status and optionally other fields (photo, signature, etc.)
        """
        try:
            # OPTIMIZED: Use direct Upsert instead of Read-Modify-Write
            updates = {
                "Job_ID": str(job_id),
                "Job_Status": new_status,
                # Ensure Last_Updated is touched? Supabase might do it automatically if trigger exists, 
                # but let's be safe if needed. For now, rely on repo.sanitization
            }
            
            if timestamp:
                 if new_status == "DELIVERED":
                    updates['Arrive_Dest_Time'] = timestamp
                 elif new_status == "Completed":
                    updates['Actual_Delivery_Time'] = timestamp
            
            # ---------------------------------------------------------
            # PHASE 3: GPS Enforcement (Strict Validation)
            # ---------------------------------------------------------
            if new_status in ["DELIVERED", "Completed"]:
                # Check for coordinates in kwargs (support multiple naming conventions)
                lat = kwargs.get('Delivery_Lat') or kwargs.get('lat') or kwargs.get('latitude')
                lon = kwargs.get('Delivery_Lon') or kwargs.get('lon') or kwargs.get('longitude')
                
                try:
                    lat_val = float(lat) if lat else 0.0
                    lon_val = float(lon) if lon else 0.0
                except (ValueError, TypeError):
                    lat_val, lon_val = 0.0, 0.0
                
                if not lat or not lon or lat_val == 0.0 or lon_val == 0.0:
                    error_msg = "Real-time location (GPS) is required to confirm delivery."
                    logger.warning(f"GPS Enforcement Blocked Job {job_id}: {error_msg}")
                    # Raise exception to be caught by caller (or bubble up to UI)
                    raise ValueError(error_msg)
                
                # Standardize to Schema columns
                updates['Delivery_Lat'] = lat_val
                updates['Delivery_Lon'] = lon_val
            # ---------------------------------------------------------

            # Update generic kwargs
            # CRITICAL FIX: Intercept Base64 Images
            kwargs = JobService._process_images(kwargs)

            for k, v in kwargs.items():
                if v is not None and v != "-":
                     updates[k] = v

            return repo.upsert_record("Jobs_Main", updates)
        except Exception as e:
            logger.error(f"Update Job Failed: {e}")
            return False

    @staticmethod
    def _process_images(data: dict) -> dict:
        """
        Scans dictionary for Base64 image strings and uploads them to Supabase Storage.
        Handles both single strings and JSON stringified lists (e.g. Photo_Proof_Url).
        """
        import json
        
        target_keys = ['Slip_Image', 'Photo_Url', 'Signature_Url', 'Photo_Proof_Url']
        
        for key, val in data.items():
            if key not in target_keys or not val:
                continue
                
            # Case 1: JSON Stringified List (e.g. proof images)
            if isinstance(val, str) and val.strip().startswith('['):
                try:
                    items = json.loads(val)
                    if isinstance(items, list):
                        new_items = []
                        modified = False
                        for item in items:
                            if isinstance(item, str) and len(item) > 1000:
                                # Upload
                                url = repo.upload_base64_image("epod_images", "proof", item)
                                if url:
                                    new_items.append(url)
                                    modified = True
                                else:
                                    new_items.append(item) # Keep original if fail
                            else:
                                new_items.append(item)
                        
                        if modified:
                            data[key] = json.dumps(new_items)
                except:
                    pass
            
            # Case 2: Single Base64 String
            elif isinstance(val, str) and len(val) > 1000:
                # Basic check for base64 header or length
                if "data:image" in val or len(val) > 2000:
                    url = repo.upload_base64_image("epod_images", "misc", val)
                    if url:
                        data[key] = url
                        
        return data
