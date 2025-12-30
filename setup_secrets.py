import json
import os

# ชื่อไฟล์ JSON ที่คุณโหลดมาจาก Google Cloud
json_file = "service_account.json"
# ID ของ Google Sheet ของคุณ
sheet_id = "10xoemO2oS6a8c7nzqxkE9mlRCbTII2PZMhvv1wTXeYQ"

# สร้างโฟลเดอร์ .streamlit ถ้ายังไม่มี
if not os.path.exists(".streamlit"):
    os.makedirs(".streamlit")

try:
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # เนื้อหาที่จะเขียนลง secrets.toml
    toml_content = f"""[connections.gsheets]
spreadsheet = "https://docs.google.com/spreadsheets/d/{sheet_id}"
type = "{data['type']}"
project_id = "{data['project_id']}"
private_key_id = "{data['private_key_id']}"
private_key = \"\"\"{data['private_key']}\"\"\"
client_email = "{data['client_email']}"
client_id = "{data['client_id']}"
auth_uri = "{data['auth_uri']}"
token_uri = "{data['token_uri']}"
auth_provider_x509_cert_url = "{data['auth_provider_x509_cert_url']}"
client_x509_cert_url = "{data['client_x509_cert_url']}"
"""

    with open(".streamlit/secrets.toml", "w", encoding="utf-8") as f:
        f.write(toml_content)
    
    print("✅ สร้างไฟล์ .streamlit/secrets.toml สำเร็จเรียบร้อย!")
    print("พร้อมรัน Streamlit ได้เลย")

except FileNotFoundError:
    print(f"❌ หาไฟล์ {json_file} ไม่เจอ! โปรดเช็คว่าวางไฟล์ไว้ถูกที่ไหม")