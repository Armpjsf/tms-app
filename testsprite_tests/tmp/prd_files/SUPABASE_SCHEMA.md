# Supabase Database Schema Reference

## 📊 ตารางทั้งหมด และ Columns

---

### `Jobs_Main` (งานหลัก)
| Column | Type | Notes |
|--------|------|-------|
| Job_ID | text | PK |
| Job_Status | text | |
| Plan_Date | date | |
| Customer_ID | text | |
| Customer_Name | text | |
| Route_Name | text | |
| Vehicle_Type | text | |
| Cargo_Qty | text | |
| Origin_Location | text | |
| Dest_Location | text | |
| Est_Distance_KM | double | |
| GoogleMap_Link | text | |
| Driver_ID | text | |
| Driver_Name | text | |
| Vehicle_Plate | text | |
| Actual_Pickup_Time | time | |
| Actual_Delivery_Time | time | |
| Arrive_Dest_Time | time | |
| Photo_Proof_Url | text | |
| Signature_Url | text | |
| Delivery_Lat | text | |
| Delivery_Lon | text | |
| Price_Cust_* | numeric | Multiple price columns |
| Cost_Driver_* | numeric | Multiple cost columns |
| lat, lon | double | |
| Created_At | text | |
| Failed_Reason | text | |
| Total_Drop | bigint | |
| Branch_ID | text | |

---

### `Master_Drivers` (ข้อมูลคนขับ)
| Column | Type | Notes |
|--------|------|-------|
| Driver_ID | text | PK |
| Driver_Name | text | ⚠️ ไม่ใช่ 'Name' |
| Role | text | |
| Mobile_No | text | ⚠️ ไม่ใช่ 'Phone' |
| Line_User_ID | text | |
| Password | text | |
| Vehicle_Plate | text | |
| Vehicle_Type | text | |
| Max_Weight_kg | numeric | |
| Max_Volume_cbm | numeric | |
| Insurance_Expiry | text | |
| Tax_Expiry | text | |
| Act_Expiry | text | |
| Current_Mileage | numeric | |

---

### `master_vehicles` (ข้อมูลรถ - lowercase)
| Column | Type | Notes |
|--------|------|-------|
| vehicle_plate | text | PK ⚠️ lowercase |
| vehicle_type | text | |
| brand | text | |
| model | text | |
| year | integer | |
| color | text | |
| engine_no | text | |
| chassis_no | text | |
| max_weight_kg | numeric | |
| max_volume_cbm | numeric | |
| insurance_company | text | |
| insurance_expiry | date | |
| tax_expiry | date | |
| act_expiry | date | |
| current_mileage | integer | |
| last_service_date | date | |
| next_service_mileage | integer | |
| driver_id | text | |
| branch_id | text | |
| active_status | text | |
| notes | text | |

---

### `gps_logs` (พิกัด GPS - lowercase)
| Column | Type | Notes |
|--------|------|-------|
| log_id | uuid | PK ⚠️ lowercase |
| driver_id | text | |
| vehicle_plate | text | |
| latitude | double | |
| longitude | double | |
| timestamp | timestamptz | |
| job_id | text | |
| battery_level | integer | |
| speed | double | |

---

### `Fuel_Logs` (เติมน้ำมัน)
| Column | Type |
|--------|------|
| Log_ID | text |
| Date_Time | text |
| Driver_ID | text |
| Vehicle_Plate | text |
| Odometer | numeric |
| Liters | numeric |
| Price_Total | numeric |
| Station_Name | text |
| Photo_Url | text |
| Branch_ID | text |

---

### `Repair_Tickets` (ใบแจ้งซ่อม)
| Column | Type |
|--------|------|
| Ticket_ID | text |
| Date_Report | text |
| Driver_ID | text |
| Vehicle_Plate | text |
| Issue_Type | text |
| Description | text |
| Photo_Url | text |
| Status | text |
| Approver | text |
| Cost_Total | numeric |
| Date_Finish | text |

---

### `chat_messages` (แชท - lowercase)
| Column | Type |
|--------|------|
| id | integer |
| driver_id | text |
| driver_name | text |
| sender | text |
| message | text |
| created_at | timestamp |
| read | boolean |

---

### `sos_alerts` (SOS)
| Column | Type |
|--------|------|
| alert_id | text |
| driver_id | text |
| driver_name | text |
| latitude | real |
| longitude | real |
| status | text |
| created_at | timestamp |
| resolved_at | timestamp |
| resolved_by | text |

---

### `Master_Customers` (ลูกค้า)
| Column | Type |
|--------|------|
| Customer_ID | text |
| Customer_Name | text |
| Default_Origin | text |
| Contact_Person | text |
| Phone | text |
| Address | text |
| Tax_ID | text |
| Branch_ID | text |
| lat, lon | text |
| GoogleMap_Link | text |

---

### `Maintenance_Logs` (บำรุงรักษา)
| Column | Type |
|--------|------|
| Log_ID | text |
| Date_Service | text |
| Vehicle_Plate | text |
| Service_Type | text |
| Odometer | numeric |
| Next_Due_Odometer | numeric |
| Notes | text |
