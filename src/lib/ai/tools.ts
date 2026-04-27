import { getJobById, getAllJobs, getTodayJobs } from "@/lib/supabase/jobs"
import { getDriverById, getAllDriversFromTable } from "@/lib/supabase/drivers"
import { getVehicleByPlate, getAllVehiclesFromTable } from "@/lib/supabase/vehicles"
import { getFinancialStats } from "@/lib/supabase/financial-analytics"
import { getOperationalStats } from "@/lib/supabase/fleet-analytics"
import { getAllCustomers } from "@/lib/supabase/customers"
import { getDamageReports } from "@/lib/supabase/damage-reports"
import { getDriverLeaves } from "@/lib/supabase/driver-leaves"
import { getAllRepairTickets, getRepairTicketStats, getPendingRepairTickets } from "@/lib/supabase/maintenance"
import { getFuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { getFleetHealthAlerts } from "@/lib/supabase/fleet-health"
import { getWorkforceAnalytics } from "@/lib/supabase/workforce-analytics"

/**
 * Tool Executors - all system data accessible to the AI
 */
export const aiToolExecutors: Record<string, Function> = {
  // ---- JOBS ----
  search_jobs: async (args: { query?: string, status?: string }) => {
    const results = await getAllJobs(1, 20, args.query || '', args.status)
    return results.map(j => ({
        id: j.Job_ID,
        status: j.Job_Status,
        customer: j.Customer_Name,
        driver: j.Driver_Name,
        plate: j.Vehicle_Plate,
        route: j.Route_Name,
        planDate: j.Plan_Date
    }))
  },

  get_job_details: async (args: { jobId: string }) => {
    const job = await getJobById(args.jobId)
    if (!job) return { error: "Job not found" }
    return job
  },

  get_today_summary: async (args: { branchId?: string }) => {
    const todayJobs = await getTodayJobs()
    const active = todayJobs.filter(j => ['In Progress', 'Picked Up', 'In Transit', 'Assigned', 'Confirmed', 'Arrived'].includes(j.Job_Status || '')).length
    const completed = todayJobs.filter(j => ['Completed', 'Delivered', 'Complete'].includes(j.Job_Status || '')).length
    const pending = todayJobs.filter(j => ['New', 'Pending', 'Requested'].includes(j.Job_Status || '')).length
    const sos = todayJobs.filter(j => j.Job_Status === 'SOS').length
    return {
        stats: { active, completed, pending, sos },
        todayJobCount: todayJobs.length,
        jobs: todayJobs.slice(0, 5).map(j => ({ id: j.Job_ID, customer: j.Customer_Name, status: j.Job_Status, driver: j.Driver_Name }))
    }
  },

  // ---- DRIVERS ----
  get_driver_info: async (args: { nameOrId: string }) => {
    let driver = await getDriverById(args.nameOrId)
    if (!driver) {
        const all = await getAllDriversFromTable()
        driver = all.find(d => 
            d.Driver_Name?.toLowerCase().includes(args.nameOrId.toLowerCase()) || 
            d.Driver_ID === args.nameOrId
        ) || null
    }
    return driver || { error: "Driver not found" }
  },

  get_all_drivers: async () => {
    const drivers = await getAllDriversFromTable()
    return drivers.map(d => ({
        id: d.Driver_ID,
        name: d.Driver_Name,
        phone: d.Mobile_No,
        plate: d.Vehicle_Plate,
        status: d.Status,
        branch: d.Branch_ID
    }))
  },

  // ---- VEHICLES ----
  get_vehicle_info: async (args: { plate: string }) => {
    const vehicle = await getVehicleByPlate(args.plate)
    return vehicle || { error: "Vehicle not found" }
  },

  get_all_vehicles: async () => {
    const vehicles = await getAllVehiclesFromTable()
    return vehicles.map(v => ({
        plate: v.Vehicle_Plate,
        brand: v.Brand,
        model: v.Model,
        type: v.Vehicle_Type,
        status: v.Status,
        mileage: v.Current_Mileage
    }))
  },

  // ---- FINANCIAL ----
  get_financial_summary: async (args: { branchId?: string }) => {
    const stats = await getFinancialStats(undefined, undefined, args.branchId)
    return {
        revenue: stats.revenue,
        cost: stats.cost?.total,
        netProfit: stats.netProfit,
        margin: stats.profitMargin
    }
  },

  // ---- CUSTOMERS ----
  get_customers: async (args: { query?: string }) => {
    const customers = await getAllCustomers(1, 20, args.query || '')
    return customers.map((c: any) => ({
        id: c.Customer_ID,
        name: c.Customer_Name,
        contact: c.Contact_Person,
        phone: c.Phone_No,
        branch: c.Branch_ID
    }))
  },

  // ---- MAINTENANCE / REPAIR ----
  get_maintenance_stats: async () => {
    const stats = await getRepairTicketStats()
    return stats
  },

  get_pending_repairs: async () => {
    const tickets = await getPendingRepairTickets()
    return tickets.map((t: any) => ({
        id: t.Ticket_ID,
        vehicle: t.Vehicle_Plate,
        problem: t.Problem_Description,
        status: t.Status,
        reportedAt: t.Reported_At
    }))
  },

  get_all_repairs: async (args: { plate?: string, status?: string }) => {
    const tickets = await getAllRepairTickets(1, 30, args.plate, args.status)
    return tickets.map((t: any) => ({
        id: t.Ticket_ID,
        vehicle: t.Vehicle_Plate,
        problem: t.Problem_Description,
        status: t.Status,
        driver: t.Driver_Name,
        reportedAt: t.Reported_At
    }))
  },

  // ---- FUEL ----
  get_fuel_analytics: async () => {
    const fuel = await getFuelAnalytics()
    return {
        totalFuelCost: fuel.totalFuelCost,
        totalLiters: fuel.totalLiters,
        avgPerTrip: fuel.avgFuelPerTrip,
        recentRecords: fuel.records?.slice(0, 5)
    }
  },

  // ---- FLEET HEALTH ----
  get_fleet_health: async () => {
    const alerts = await getFleetHealthAlerts()
    return alerts.map((a: any) => ({
        vehicle: a.Vehicle_Plate,
        alert: a.Alert_Type,
        severity: a.Severity,
        message: a.Message
    }))
  },

  // ---- DRIVER LEAVES ----
  get_driver_leaves: async (args: { month?: number, year?: number }) => {
    const leaves = await getDriverLeaves(args.month, args.year)
    return leaves.map((l: any) => ({
        driver: l.Driver_Name,
        type: l.Leave_Type,
        from: l.Date_From,
        to: l.Date_To,
        status: l.Status,
        reason: l.Reason
    }))
  },

  // ---- DAMAGE REPORTS ----
  get_damage_reports: async () => {
    const reports = await getDamageReports()
    return reports.map((r: any) => ({
        id: r.Report_ID,
        driver: r.Driver_Name,
        jobId: r.Job_ID,
        description: r.Description,
        status: r.Status,
        amount: r.Estimated_Cost
    }))
  },

  // ---- WORKFORCE ----
  get_workforce_analytics: async () => {
    const analytics = await getWorkforceAnalytics()
    return analytics
  },

  create_job: async (args: { 
    customerName: string, 
    planDate?: string, 
    routeName?: string, 
    price?: number, 
    notes?: string, 
    vehicleType?: string 
  }) => {
    const result = await createJob({
        Customer_Name: args.customerName,
        Plan_Date: args.planDate || new Date().toISOString().split('T')[0],
        Route_Name: args.routeName,
        Price_Cust_Total: args.price,
        Notes: args.notes,
        Vehicle_Type: args.vehicleType
    })
    return result
  },

  create_fuel_log: async (args: {
    plate: string,
    liters: number,
    price: number,
    odometer?: number,
    station?: string
  }) => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('Fuel_Logs').insert({
        Vehicle_Plate: args.plate,
        Liters: args.liters,
        Price_Total: args.price,
        Odometer: args.odometer,
        Station_Name: args.station,
        Date_Time: new Date().toISOString()
    }).select().single()
    return error ? { success: false, error: error.message } : { success: true, data }
  },

  create_damage_report: async (args: {
    jobId: string,
    description: string,
    estimatedCost?: number
  }) => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('Damage_Reports').insert({
        Job_ID: args.jobId,
        Description: args.description,
        Estimated_Cost: args.estimatedCost,
        Status: 'Pending',
        Created_At: new Date().toISOString()
    }).select().single()
    return error ? { success: false, error: error.message } : { success: true, data }
  },
}
