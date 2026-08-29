/**
 * TMS Database Schema Context & Knowledge Definitions
 * Provides complete schema definitions, column descriptions, and business logic for the Gemini AI.
 */

export const TMS_SCHEMA_PROMPT = `
═══ 📚 โครงสร้างฐานข้อมูลระบบ TMS (TMS Database Schema Reference) ═══
คุณสามารถเข้าถึงและคิวรี่ข้อมูลจากตารางหลักๆ ของระบบ TMS ได้ดังนี้:

1. 📦 ตารางงานขนส่ง (Jobs_Main):
   - Job_ID (string): รหัสใบงาน (เช่น JOB-20260828-001)
   - Plan_Date (YYYY-MM-DD): วันนัดหมายวิ่งงาน / วันวางแผน
   - Delivery_Date (YYYY-MM-DD): วันที่ส่งของจริง
   - Customer_ID, Customer_Name (string): รหัสและชื่อลูกค้า
   - Route_Name (string): ชื่อเส้นทาง เช่น "สุราษฎร์ธานี - ภูเก็ต"
   - Origin_Location, Dest_Location (string): ต้นทาง และ ปลายทาง
   - Total_Drop (number): จำนวนจุดส่งสินค้า
   - Driver_ID, Driver_Name (string): คนขับที่รับผิดชอบ
   - Vehicle_Plate, Vehicle_Type (string): ทะเบียนรถ และ ประเภทรถ (4-Wheel, 6-Wheel, 10-Wheel, Trailer)
   - Job_Status (string): สถานะงาน
     * กำลังดำเนินการ / วิ่งอยู่: 'Assigned', 'Confirmed', 'Picked Up', 'In Transit', 'Arrived', 'In Progress'
     * เสร็จสิ้น / รับรู้รายได้: 'Completed', 'Delivered', 'Verified', 'Billed', 'Paid'
     * รอดำเนินการ: 'New', 'Pending', 'Draft', 'Requested'
     * ยกเลิก / มีปัญหา: 'Cancelled', 'SOS', 'Rejected'
   - Price_Cust_Total (number): รายได้รวมจากลูกค้า (บาท)
   - Cost_Driver_Total (number): ต้นทุนค่าเที่ยวคนขับรวม (บาท)
   - Est_Distance_KM (number): ระยะทางประเมิน (กม.)
   - Loaded_Qty, Loaded_Weight, Loaded_CBM: จำนวนชิ้น, น้ำหนัก (กก.), ปริมาตร (คิว)
   - Branch_ID (string): สาขาของงาน (เช่น URT, SKN, PTE, CNX, ESA)

2. ⛽ ตารางประวัติการเติมน้ำมัน (Fuel_Logs):
   - Log_ID (string): รหัสบิลน้ำมัน (เช่น FUEL-20260828-1234)
   - Date_Time (ISO timestamp): วัน-เวลาที่เติมน้ำมัน
   - Vehicle_Plate (string): ทะเบียนรถที่เติม
   - Driver_ID, Driver_Name (string): คนขับที่เติม
   - Liters (number): จำนวนลิตรที่เติม
   - Price_Total (number): ราคารวม (บาท)
   - Odometer (number): เลขไมล์หน้าปัดรถขณะเติม (กม.)
   - Station_Name (string): ชื่อสถานีบริการ/ปั๊มน้ำมัน
   - Photo_Url (string): รูปภาพใบเสร็จ/บิลน้ำมัน
   - Branch_ID (string): สาขา
   - Status (string): สถานะบิล ('Pending', 'Approved', 'Rejected')

3. 🚛 ตารางข้อมูลยานพาหนะ (Master_Vehicles):
   - Vehicle_Plate (string - PK): ทะเบียนรถ
   - Brand, Model, Year, Color (string): ยี่ห้อ, รุ่น, ปี, สี
   - Vehicle_Type (string): ประเภทรถ (4-Wheel, 6-Wheel, 10-Wheel, Trailer)
   - Tank_Capacity (number): ความจุถังน้ำมัน (ลิตร) เช่น 50, 70, 200, 350
   - Current_Mileage (number): เลขไมล์ปัจจุบัน
   - Active_Status (string): 'Active', 'Inactive', 'Maintenance'
   - Driver_ID, Primary_Driver_Name: คนขับประจำรถ
   - Branch_ID (string): สาขาประจำรถ

4. 👨‍✈️ ตารางข้อมูลคนขับรถ (Master_Drivers):
   - Driver_ID (string - PK): รหัสคนขับ
   - Driver_Name (string): ชื่อ-นามสกุลคนขับ
   - Mobile_No (string): เบอร์โทรศัพท์
   - Vehicle_Plate (string): ทะเบียนรถประจำตัว
   - Active_Status (string): 'Active', 'Inactive', 'Suspended'
   - Branch_ID (string): สาขาสังกัด
   - Sub_ID (string): สังกัดผู้รับเหมาช่วง (ถ้ามี)

5. 👥 ตารางลูกค้า (Master_Customers):
   - Customer_ID (string - PK): รหัสลูกค้า
   - Customer_Name (string): ชื่อบริษัท/ลูกค้า
   - Contact_Person, Phone_No (string): ผู้ติดต่อ, เบอร์โทร
   - Branch_ID (string): สาขาที่ดูแล
   - Active_Status (string): 'Active', 'Inactive'

6. 🏢 ตารางสาขา (Master_Branches):
   - Branch_ID (string - PK): รหัสสาขา (URT: สุราษฎร์ธานี, SKN: สมุทรสาคร, PTE: ปทุมธานี, CNX: เชียงใหม่, ESA: ระนอง)
   - Branch_Name (string): ชื่อสาขา

7. 🔧 ตารางแจ้งซ่อมบำรุง (Maintenance_Tickets):
   - Ticket_ID, Vehicle_Plate, Problem_Description, Status ('Pending', 'In Progress', 'Completed'), Cost, Reported_At

8. 📋 ตารางใบวางบิล (Billing_Notes):
   - Note_ID, Customer_Name, Total_Amount, Status ('Draft', 'Pending', 'Sent', 'Paid'), Created_At

9. 💥 ตารางรายงานสินค้าเสียหาย (Damage_Reports):
   - Report_ID, Job_ID, Driver_Name, Description, Estimated_Cost, Status, Created_At
`.trim()
