from data.repository import repo

def delete_all_jobs():
    try:
        print("🗑️ Deleting all data from Jobs_Main...")
        # Delete all rows where Job_ID is not 'NON_EXISTENT_ID' (effectively all rows)
        response = repo.client.table("Jobs_Main").delete().neq("Job_ID", "NON_EXISTENT_ID").execute()
        print("✅ Successfully deleted all data from Jobs_Main.")
    except Exception as e:
        print(f"❌ Error deleting data: {e}")

if __name__ == "__main__":
    delete_all_jobs()
