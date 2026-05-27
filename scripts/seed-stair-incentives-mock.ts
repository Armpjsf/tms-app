import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedMockupData() {
  console.log('🚀 กำลังเริ่มสร้างข้อมูลจำลอง (Mockup) สำหรับสาขา ESA (ระนอง)...')

  const timeString = new Date().toTimeString().split(' ')[0]
  const dateString = new Date().toISOString().split('T')[0]
  
  // 1. สร้างลูกค้าจำลองสำหรับสาขา ESA
  const mockCustomerID = 'CUST-ESA-001'
  const mockCustomer = {
    Customer_ID: mockCustomerID,
    Customer_Name: 'บริษัท ระนองเทรดดิ้ง จำกัด (สาขา ESA)',
    Contact_Person: 'คุณสมชาย ยอดรัก',
    Phone: '089-999-8888',
    Address: '123/4 ถนนเรืองราษฎร์ ต.เขานิเวศน์ อ.เมืองระนอง จ.ระนอง 85000',
    Incentive_Sensor_Check: true // เปิดใช้งานการดักเซนเซอร์ย้อนหลัง
  }

  console.log('1. กำลังบันทึกข้อมูลลูกค้า...')
  const { error: custErr } = await supabase
    .from('Master_Customers')
    .upsert(mockCustomer, { onConflict: 'Customer_ID' })

  if (custErr) {
    console.error('❌ ไม่สามารถสร้างลูกค้าได้:', custErr)
    return
  }
  console.log('✅ ลูกค้าจำลองถูกลงทะเบียนสำเร็จ!')

  // 2. สร้างคนขับจำลองสำหรับสาขา ESA
  const mockDriverID = 'DRV-ESA-999'
  const mockDriver = {
    Driver_ID: mockDriverID,
    Driver_Name: 'นายศักดิ์สิทธิ์ ยิ้มแย้ม (สายใต้ ESA)',
    Mobile_No: '099-123-4567',
    Password: 'password123',
    Vehicle_Plate: 'บข-9999 ระนอง',
    Vehicle_Type: '4-Wheel',
    Role: 'Driver',
    Active_Status: 'Active',
    Branch_ID: 'ESA'
  }

  console.log('2. กำลังบันทึกข้อมูลคนขับ...')
  const { error: drvErr } = await supabase
    .from('Master_Drivers')
    .upsert(mockDriver, { onConflict: 'Driver_ID' })

  if (drvErr) {
    console.error('❌ ไม่สามารถสร้างคนขับได้:', drvErr)
    return
  }
  console.log('✅ คนขับจำลองถูกลงทะเบียนสำเร็จ!')

  // 3. สร้างออเดอร์จำลอง 2 เคส (ผ่าน 1 เคส / ทุจริต 1 เคส) เข้าไปที่สาขา ESA
  
  // เคส 3.1: ส่งจริงและระบบยืนยัน (Verified)
  const jobVerifiedID = 'JOB-ESA-PASS-' + Math.floor(Math.random() * 1000)
  const jobVerified = {
    Job_ID: jobVerifiedID,
    Job_Status: 'Completed',
    Plan_Date: dateString,
    Delivery_Date: dateString,
    Created_At: new Date().toISOString(),
    Customer_ID: mockCustomerID,
    Customer_Name: mockCustomer.Customer_Name,
    Driver_ID: mockDriverID,
    Driver_Name: mockDriver.Driver_Name,
    Vehicle_Plate: mockDriver.Vehicle_Plate,
    Vehicle_Type: mockDriver.Vehicle_Type,
    Branch_ID: 'ESA',
    Origin_Location: 'คลังสินค้า ESA ระนอง',
    Dest_Location: 'คอนโดเรืองราษฎร์ (ตึก 3 ชั้น)',
    Price_Cust_Total: 1500,
    Cost_Driver_Total: 450,
    Notes: 'จัดส่งกล่องสินค้าขนาดใหญ่ขึ้นชั้น 3 เรียบร้อย',
    Incentive_Claimed: true,                  // มีการเคลมเงินพิเศษ
    Requires_Incentive_Check: true,           // ต้องตรวจเซนเซอร์
    Sensor_Verified: 'Verified',              // อนุมัติผ่านระบบ
    Sensor_Max_Elevation_Diff: 6.85,          // สูง 6.85 เมตร (ชั้น 3)
    Sensor_Total_Steps_Upward: 32,            // เดินไป 32 ก้าว
    Sensor_Logs_Json: [
      { timestamp: 1, pressure: 1013.25, steps_upward: 0 },
      { timestamp: 2, pressure: 1012.70, steps_upward: 14 },
      { timestamp: 3, pressure: 1012.43, steps_upward: 32 }, // จุดสูงสุด
      { timestamp: 4, pressure: 1013.25, steps_upward: 32 }
    ]
  }

  // เคส 3.2: เคลมแต่ไม่ขึ้นจริง (Suspect)
  const jobSuspectID = 'JOB-ESA-FRAUD-' + Math.floor(Math.random() * 1000)
  const jobSuspect = {
    Job_ID: jobSuspectID,
    Job_Status: 'Completed',
    Plan_Date: dateString,
    Delivery_Date: dateString,
    Created_At: new Date().toISOString(),
    Customer_ID: mockCustomerID,
    Customer_Name: mockCustomer.Customer_Name,
    Driver_ID: mockDriverID,
    Driver_Name: mockDriver.Driver_Name,
    Vehicle_Plate: mockDriver.Vehicle_Plate,
    Vehicle_Type: mockDriver.Vehicle_Type,
    Branch_ID: 'ESA',
    Origin_Location: 'คลังสินค้า ESA ระนอง',
    Dest_Location: 'ห้างค้าปลีกระนอง (ส่งแค่นิติบุคคลชั้น 1)',
    Price_Cust_Total: 1200,
    Cost_Driver_Total: 400,
    Notes: 'คนขับแจ้งว่าขอเคลมขึ้นชั้น 2 แต่ระบบเซนเซอร์ตรวจพบความผิดปกติ',
    Incentive_Claimed: true,                  // เคลมเงินพิเศษ
    Requires_Incentive_Check: true,           // ต้องตรวจ
    Sensor_Verified: 'Suspect',               // ระบบแจ้งเตือนทุจริต!
    Sensor_Max_Elevation_Diff: 0.12,          // ความสูงไม่ต่างเลย
    Sensor_Total_Steps_Upward: 2,             // ก้าวเดินขึ้นบันไดเป็น 0-2 ก้าว
    Sensor_Logs_Json: [
      { timestamp: 1, pressure: 1013.25, steps_upward: 0 },
      { timestamp: 2, pressure: 1013.24, steps_upward: 1 },
      { timestamp: 3, pressure: 1013.25, steps_upward: 2 }
    ]
  }

  console.log('3. กำลังบันทึกข้อมูลจ๊อบจำลอง...')
  const { error: job1Err } = await supabase.from('Jobs_Main').insert(jobVerified)
  const { error: job2Err } = await supabase.from('Jobs_Main').insert(jobSuspect)

  if (job1Err || job2Err) {
    console.error('❌ ไม่สามารถสร้างจ๊อบจำลองได้:', job1Err || job2Err)
    return
  }

  console.log('\n======================================================')
  console.log('🎉 การบันทึกข้อมูล Mockup สำเร็จเรียบร้อย!')
  console.log(`- ได้เพิ่ม 1 ลูกค้าใหม่: ${mockCustomer.Customer_Name}`)
  console.log(`- ได้เพิ่ม 1 คนขับใหม่: ${mockDriver.Driver_Name} (สาขา ESA)`)
  console.log(`- ได้สร้าง 1 จ๊อบผ่านเซนเซอร์สำเร็จ: รหัส ${jobVerifiedID} (อนุมัติจ่ายอัตโนมัติ)`)
  console.log(`- ได้สร้าง 1 จ๊อบต้องสงสัยทุจริต: รหัส ${jobSuspectID} (ระบบเตือนสีแดงให้แอดมินตรวจ)`)
  console.log('======================================================')
}

seedMockupData()
