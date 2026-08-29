-- แยกประเภทการเติมน้ำมันต่อจ็อบ: 'end' = เติมจบงาน/ก่อนเริ่มงาน (ลิตร = ต้นทุนงานที่จบ),
-- 'enroute' = เติมระหว่างทาง (งานยังไม่จบ ต้องเอาลิตรไปสะสมรวมกับบิลถัดไปของงานเดียวกัน)
-- บริษัทบังคับเติมเต็มถังทุกครั้ง ดังนั้น km/L ไม่กระทบ — field นี้ใช้เฉพาะการคิดต้นทุนต่อจ็อบ
alter table "Fuel_Logs"
  add column if not exists "Trip_Fill_Type" text not null default 'end';

-- กันค่าแปลกปลอม
alter table "Fuel_Logs"
  drop constraint if exists "Fuel_Logs_Trip_Fill_Type_check";
alter table "Fuel_Logs"
  add constraint "Fuel_Logs_Trip_Fill_Type_check"
  check ("Trip_Fill_Type" in ('end', 'enroute'));
