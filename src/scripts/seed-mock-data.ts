import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🚀 Starting Seeding...')

  // 1. Mock Customers
  const customers = [
    {
      Customer_ID: 'CUST-SCG-001',
      Customer_Name: 'บริษัท เอสซีจี เจดับเบิ้ลยูดี โลจิสติกส์ จำกัด (มหาชน)',
      Contact_Person: 'คุณวิชัย',
      Phone: '02-710-4000',
      Address: 'Bangkok, Thailand',
      Branch_ID: 'PTE'
    },
    {
      Customer_ID: 'CUST-TBEV-001',
      Customer_Name: 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)',
      Contact_Person: 'คุณสมชาย',
      Phone: '02-783-9000',
      Address: 'Bangkok, Thailand',
      Branch_ID: 'PTE'
    },
    {
      Customer_ID: 'CUST-PTT-001',
      Customer_Name: 'บริษัท ปตท. จำกัด (มหาชน)',
      Contact_Person: 'คุณวิจิตร',
      Phone: '02-537-2000',
      Address: 'Bangkok, Thailand',
      Branch_ID: 'PTE'
    },
    {
       Customer_ID: 'CUST-CPALL-001',
       Customer_Name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
       Contact_Person: 'คุณนรินทร์',
       Phone: '02-071-9000',
       Address: 'Bangkok, Thailand',
       Branch_ID: 'PTE'
    }
  ]

  console.log('📦 Seeding Customers...')
  await supabase.from('Master_Customers').upsert(customers)

  const today = new Date().toISOString().split('T')[0]
  const dateStr = today.replace(/-/g, '')

  // 2. Jobs "In Transit" (assigned to real drivers)
  const inTransitJobs = [
    {
      Job_ID: `JOB-${dateStr}-IT01`,
      Job_Status: 'In Transit',
      Plan_Date: today,
      Customer_ID: 'CUST-SCG-001',
      Customer_Name: 'บริษัท เอสซีจี เจดับเบิ้ลยูดี โลจิสติกส์ จำกัด (มหาชน)',
      Driver_ID: 'DRV-001',
      Driver_Name: 'สมเกียรติ พลาผล',
      Vehicle_Plate: '70-1234',
      Route_Name: 'Bangkok - Pathum Thani',
      Price_Cust_Total: 3500,
      Cost_Driver_Total: 2500,
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString()
    },
    {
      Job_ID: `JOB-${dateStr}-IT02`,
      Job_Status: 'In Transit',
      Plan_Date: today,
      Customer_ID: 'CUST-TBEV-001',
      Customer_Name: 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)',
      Driver_ID: 'DRV-002',
      Driver_Name: 'ประสาท โสนาพูน',
      Vehicle_Plate: '70-5678',
      Route_Name: 'Bangkok - Samut Sakhon',
      Price_Cust_Total: 2800,
      Cost_Driver_Total: 1800,
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString()
    }
  ]

  // 3. Jobs "Waiting for Bidding" (status New, no driver)
  const biddingJobs = [
    {
      Job_ID: `JOB-${dateStr}-BID01`,
      Job_Status: 'New',
      Plan_Date: today,
      Customer_ID: 'CUST-PTT-001',
      Customer_Name: 'บริษัท ปตท. จำกัด (มหาชน)',
      Driver_ID: null,
      Route_Name: 'Chonburi - Rayong',
      Price_Cust_Total: 4500,
      Cost_Driver_Total: 3200,
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString()
    },
    {
      Job_ID: `JOB-${dateStr}-BID02`,
      Job_Status: 'New',
      Plan_Date: today,
      Customer_ID: 'CUST-CPALL-001',
      Customer_Name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
      Driver_ID: null,
      Route_Name: 'Bangkok - Ayutthaya',
      Price_Cust_Total: 2200,
      Cost_Driver_Total: 1500,
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString()
    }
  ]

  // 4. Jobs "Requested by Customer"
  const requestedJobs = [
    {
      Job_ID: `REQ-${dateStr}-001`,
      Job_Status: 'Requested',
      Plan_Date: today,
      Customer_ID: 'CUST-SCG-001',
      Customer_Name: 'บริษัท เอสซีจี เจดับเบิ้ลยูดี โลจิสติกส์ จำกัด (มหาชน)',
      Origin_Location: 'Bangkok Port',
      Dest_Location: 'SCG Warehouse Bang Na',
      Cargo_Type: 'Construction Materials',
      Notes: 'ต้องการรถ 6 ล้อตู้ทึบ',
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString()
    },
    {
       Job_ID: `REQ-${dateStr}-002`,
       Job_Status: 'Requested',
       Plan_Date: today,
       Customer_ID: 'CUST-TBEV-001',
       Customer_Name: 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)',
       Origin_Location: 'ThaiBev Factory Pathum',
       Dest_Location: 'DC Wang Noi',
       Cargo_Type: 'Beverages',
       Notes: 'รถ 10 ล้อ สภาพดี',
       Branch_ID: 'PTE',
       Created_At: new Date().toISOString()
    }
  ]

  console.log('🚚 Seeding Jobs...')
  await supabase.from('Jobs_Main').upsert([...inTransitJobs, ...biddingJobs, ...requestedJobs])

  // 5. Driver Payment History
  console.log('💰 Seeding Driver Payments...')
  const paymentId = `DP-${dateStr.slice(0,6)}-001`
  await supabase.from('Driver_Payments').upsert([
    {
      Driver_Payment_ID: paymentId,
      Driver_Name: 'สมเกียรติ พลาผล',
      Payment_Date: today,
      Total_Amount: 15400,
      Status: 'Paid',
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString()
    }
  ])
  
  // Link some completed jobs to this payment
  const completedJobsForPayment = [
    {
       Job_ID: `JOB-${dateStr}-COMP01`,
       Job_Status: 'Completed',
       Plan_Date: '2024-03-20',
       Customer_Name: 'บริษัท เอสซีจี เจดับเบิ้ลยูดี โลจิสติกส์ จำกัด (มหาชน)',
       Driver_ID: 'DRV-001',
       Driver_Name: 'สมเกียรติ พลาผล',
       Price_Cust_Total: 3000,
       Cost_Driver_Total: 2200,
       Driver_Payment_ID: paymentId,
       Branch_ID: 'PTE',
       Created_At: new Date().toISOString()
    }
  ]
  await supabase.from('Jobs_Main').upsert(completedJobsForPayment)


  // 6. Billing History
  console.log('📄 Seeding Billing Notes...')
  const billingId = `BN-${dateStr.slice(0,6)}-001`
  await supabase.from('Billing_Notes').upsert([
    {
      Billing_Note_ID: billingId,
      Customer_Name: 'บริษัท เอสซีจี เจดับเบิ้ลยูดี โลจิสติกส์ จำกัด (มหาชน)',
      Billing_Date: today,
      Total_Amount: 45000,
      Status: 'Pending',
      Branch_ID: 'PTE',
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString()
    }
  ])

  // 7. Update GPS positions (Vehicles on map)
  console.log('📍 Updating GPS Positions...')
  const mockLocations = [
    { id: 'DRV-001', lat: 13.7563, lng: 100.5018 }, // Bangkok Center
    { id: 'DRV-002', lat: 13.8123, lng: 100.6123 }, // Lat Phrao
    { id: 'DRV-003', lat: 13.6789, lng: 100.4567 }, // Rama 2
    { id: 'DRV-004', lat: 13.9012, lng: 100.5678 }, // Don Mueang
    { id: 'DRV-005', lat: 14.1234, lng: 100.6234 }  // Pathum Thani
  ]

  for (const loc of mockLocations) {
    await supabase.from('Master_Drivers').update({
      Current_Lat: loc.lat,
      Current_Lon: loc.lng,
      Last_Seen: new Date().toISOString()
    }).eq('Driver_ID', loc.id)

    // Also add to logs for history
    await supabase.from('gps_logs').insert({
      driver_id: loc.id,
      latitude: loc.lat,
      longitude: loc.lng,
      timestamp: new Date().toISOString()
    })
  }

  console.log('✅ Seeding Complete!')
}

seed().catch(console.error)
