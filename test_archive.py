
from services.archive_service import archive_service
import pandas as pd
from datetime import datetime
from data.repository import repo

# Mock Data Injection (for safety, we just check connection and logic flow)
if archive_service.connected:
    print("✅ Archive Service Connected to Google API")
    
    # Try logic but dry run
    try:
        success, res = archive_service.check_and_archive(days_threshold=45)
        print(f"Run Result: Success={success}, Items={res}")
    except Exception as e:
        print(f"❌ Logic Error: {e}")

else:
    print("⚠️ Archive Service NOT Connected (Check credentials.json)")
