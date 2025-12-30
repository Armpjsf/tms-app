"""
Simple test to verify Supabase connection and data
Run this to check if we can connect and fetch data
"""
import os
import sys

# Add project path
sys.path.insert(0, r'c:\Users\Armdd\TMS_ePOD')

print("=" * 70)
print("SUPABASE CONNECTION TEST")
print("=" * 70)

# Test 1: Check environment variables
print("\n[1] Checking Supabase credentials...")
from config import settings

print(f"    URL: {settings.SUPABASE_URL[:30]}...")
print(f"    Key: {settings.SUPABASE_KEY[:20]}...")

# Test 2: Direct connection
print("\n[2] Testing direct Supabase connection...")
try:
    from supabase import create_client
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    print("    ✅ Client created successfully")
except Exception as e:
    print(f"    ❌ Failed to create client: {e}")
    sys.exit(1)

# Test 3: Fetch without branch filter
print("\n[3] Fetching Jobs_Main (NO branch filter)...")
try:
    response = client.table("Jobs_Main").select("*").limit(10).execute()
    data = response.data
    print(f"    ✅ Fetched {len(data)} rows")
    
    if data:
        print(f"\n    Sample row 1:")
        first = data[0]
        print(f"      - Job_ID: {first.get('Job_ID', 'N/A')}")
        print(f"      - Job_Status: {first.get('Job_Status', 'N/A')}")
        print(f"      - Branch_ID: {first.get('Branch_ID', 'N/A')}")
        print(f"      - Customer_Name: {first.get('Customer_Name', 'N/A')}")
        print(f"      - Payment_Status: {first.get('Payment_Status', 'N/A')}")
        print(f"      - Billing_Status: {first.get('Billing_Status', 'N/A')}")
        
        # Check all Branch_IDs
        print(f"\n    Unique Branch_IDs in data:")
        branches = set(row.get('Branch_ID') for row in data)
        for b in branches:
            count = sum(1 for row in data if row.get('Branch_ID') == b)
            print(f"      - '{b}': {count} rows")
    else:
        print("    ⚠️  No data returned from Supabase!")
        
except Exception as e:
    print(f"    ❌ Fetch failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Check what branch_id is in session
print("\n[4] Checking Streamlit session state...")
try:
    import streamlit as st
    branch_in_session = st.session_state.get("branch_id", "NOT_SET")
    print(f"    Current branch_id in session: '{branch_in_session}'")
except Exception as e:
    print(f"    ⚠️  Cannot check session (not in Streamlit context): {e}")

# Test 5: Test with branch filter
print("\n[5] Testing with Branch_ID filter...")
try:
    # Try with "ALL"
    response_all = client.table("Jobs_Main").select("*").limit(10).execute()
    print(f"    No filter: {len(response_all.data)} rows")
    
    # Try filtering by actual branch from data
    if data and data[0].get('Branch_ID'):
        test_branch = data[0]['Branch_ID']
        response_filtered = client.table("Jobs_Main").select("*").eq("Branch_ID", test_branch).limit(10).execute()
        print(f"    Filtered by '{test_branch}': {len(response_filtered.data)} rows")
except Exception as e:
    print(f"    ❌ Branch filter test failed: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)
