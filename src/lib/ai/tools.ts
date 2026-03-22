import { getJobById, getAllJobs, getTodayJobs } from "@/lib/supabase/jobs"
import { getDriverById, getAllDriversFromTable } from "@/lib/supabase/drivers"
import { getVehicleByPlate, getAllVehiclesFromTable } from "@/lib/supabase/vehicles"
import { getFinancialStats } from "@/lib/supabase/financial-analytics"
import { getOperationalStats } from "@/lib/supabase/fleet-analytics"

/**
 * Gemini Tool Definitions (Declaration)
 */
export const aiToolsDeclaration = [
  {
    name: "search_jobs",
    description: "Search for transport jobs/orders by ID, customer name, or status. Returns a list of matching jobs.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search keyword (ID, customer name, route, etc.)" },
        status: { type: "STRING", description: "Filter by status (e.g., Pending, In Progress, Delivered, Canceled)" }
      }
    }
  },
  {
    name: "get_job_details",
    description: "Get full details of a specific transport job including addresses, costs, and proof of delivery.",
    parameters: {
      type: "OBJECT",
      properties: {
        jobId: { type: "STRING", description: "The unique Job ID (e.g., JOB-12345678)" }
      },
      required: ["jobId"]
    }
  },
  {
    name: "get_today_summary",
    description: "Get an operational summary of today's activities including total jobs, completed jobs, and active vehicles.",
    parameters: {
      type: "OBJECT",
      properties: {
        branchId: { type: "STRING", description: "Optional branch ID to filter the summary." }
      }
    }
  },
  {
    name: "get_driver_info",
    description: "Retrieve information about a driver by name or ID. Includes license plate, mobile number, and active status.",
    parameters: {
      type: "OBJECT",
      properties: {
        nameOrId: { type: "STRING", description: "Driver's name or Driver ID" }
      },
      required: ["nameOrId"]
    }
  },
  {
    name: "get_vehicle_info",
    description: "Get details of a vehicle by its license plate. Includes brand, model, and current mileage.",
    parameters: {
      type: "OBJECT",
      properties: {
        plate: { type: "STRING", description: "Vehicle license plate" }
      },
      required: ["plate"]
    }
  },
  {
    name: "get_financial_summary",
    description: "Get financial statistics including total income, expenses, and net profit for a branch or all branches.",
    parameters: {
      type: "OBJECT",
      properties: {
        branchId: { type: "STRING", description: "Optional branch ID" }
      }
    }
  }
]

/**
 * Tool Executor Functions
 */
export const aiToolExecutors: Record<string, Function> = {
  search_jobs: async (args: { query?: string, status?: string }) => {
    // We use getAllJobs with search
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
    const stats = await getOperationalStats(args.branchId)
    const todayJobs = await getTodayJobs()
    return {
        stats: stats?.fleet || {},
        todayJobCount: todayJobs.length,
        jobs: todayJobs.slice(0, 5).map(j => ({ id: j.Job_ID, customer: j.Customer_Name, status: j.Job_Status }))
    }
  },

  get_driver_info: async (args: { nameOrId: string }) => {
    // Try by ID first
    let driver = await getDriverById(args.nameOrId)
    if (!driver) {
        // Try searching all
        const all = await getAllDriversFromTable()
        driver = all.find(d => 
            d.Driver_Name?.toLowerCase().includes(args.nameOrId.toLowerCase()) || 
            d.Driver_ID === args.nameOrId
        ) || null
    }
    return driver || { error: "Driver not found" }
  },

  get_vehicle_info: async (args: { plate: string }) => {
    const vehicle = await getVehicleByPlate(args.plate)
    return vehicle || { error: "Vehicle not found" }
  },

  get_financial_summary: async (args: { branchId?: string }) => {
    const stats = await getFinancialStats(undefined, undefined, args.branchId)
    return {
        revenue: stats.revenue,
        cost: stats.cost?.total,
        netProfit: stats.netProfit,
        margin: stats.profitMargin
    }
  }
}
