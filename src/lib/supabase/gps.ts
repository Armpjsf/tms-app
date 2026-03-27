"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getUserBranchId, isSuperAdmin, isAdmin } from "@/lib/permissions";

// Type matching actual Supabase schema (ProperCase columns!)
export type GPSLog = {
  Log_ID: string;
  Driver_ID: string;
  Vehicle_Plate?: string;
  Latitude: number;
  Longitude: number;
  Timestamp: string;
  Job_ID?: string;
  Battery_Level?: number;
  Speed?: number;
};

// บันทึกพิกัด GPS
export async function saveGPSLog(data: {
  driverId: string;
  vehiclePlate?: string;
  lat: number;
  lng: number;
  jobId?: string;
  battery?: number;
  speed?: number;
}) {
  try {
    const supabase = await createClient();

    // Note: GPS_Logs table uses lowercase column names
    const { error } = await supabase
      .from("gps_logs") // Use lowercase table name if possible, or verify match
      .insert({
        driver_id: data.driverId,
        vehicle_plate: data.vehiclePlate,
        latitude: data.lat,
        longitude: data.lng,
        job_id: data.jobId,
        battery_level: data.battery,
        speed: data.speed,
        // timestamp is auto-generated
      });

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
}

// ดึงตำแหน่งล่าสุดของ Driver ทุกคน (สำหรับแสดงบน Map)
export async function getLatestDriverLocations() {
  try {
    const isAdmin = await isSuperAdmin();
    const supabase = isAdmin ? await createAdminClient() : await createClient();

    // ดึงข้อมูล GPS ย้อนหลัง 1 ชั่วโมง
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const branchId = await getUserBranchId();

    const query = supabase
      .from("gps_logs")
      .select(
        `
        *,
        Master_Drivers ( Driver_Name, Branch_ID )
      `,
      )
      .gte("timestamp", oneHourAgo);

    if (branchId && branchId !== "All") {
      // Since we need to filter by a nested field in Master_Drivers, we can't easily do .eq() on the main query for normalized data
      // but for GPS logs, usually the driver_id is what matters.
      // We'll filter the resulting array instead for now to keep it simple, or we'd need a more complex join query.
    }

    const { data, error } = await query.order("timestamp", {
      ascending: false,
    });

    if (error) {
      return [];
    }

    // Filter to latest record per driver
    const latestLocations = new Map<
      string,
      GPSLog & { Driver_Name: string; Master_Drivers?: Record<string, unknown> }
    >();

    data?.forEach((log: Record<string, unknown>) => {
      const driverId = (log.driver_id || log.Driver_ID) as string;
      if (!latestLocations.has(driverId)) {
        latestLocations.set(driverId, {
          ...(log as unknown as GPSLog),
          Driver_ID: driverId,
          Driver_Name:
            ((log.Master_Drivers as Record<string, unknown>)
              ?.Driver_Name as string) || "Unknown Driver",
          Latitude: (log.latitude || log.Latitude) as number,
          Longitude: (log.longitude || log.Longitude) as number,
          Timestamp: (log.timestamp || log.Timestamp) as string,
        });
      }
    });

    // Filter by branch manually if needed
    const logs = Array.from(latestLocations.values());
    if (branchId && branchId !== "All") {
      return logs.filter((l) => l.Master_Drivers?.Branch_ID === branchId);
    }

    return logs;
  } catch {
    return [];
  }
}

// ดึงประวัติการเดินทางของ Driver ตามวันที่ (สำหรับแสดงเส้นทาง)
export async function getDriverRouteForDate(driverId: string, date: string) {
  try {
    const supabase = await createClient();

    // Create Start and End timestamps for the day
    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from("gps_logs")
      .select("*") // select * to be safe with casing
      .eq("driver_id", driverId)
      .gte("timestamp", startDate)
      .lte("timestamp", endDate)
      .order("timestamp", { ascending: true });

    if (error) {
      return [];
    }

    // Normalize data
    return (
      data?.map((d) => ({
        Latitude: d.latitude || d.Latitude,
        Longitude: d.longitude || d.Longitude,
        Timestamp: d.timestamp || d.Timestamp,
      })) || []
    );
  } catch {
    return [];
  }
}

// ... (skipping getLatestDriverLocations rework for now as it's less critical than fleet status)

// ... (previous code)

export async function getActiveFleetStatus(branchId?: string | null, customerId?: string | null) {
  try {
    const isSuper = await isSuperAdmin();
    const isAdminUser = await isAdmin();
    const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient();

    // 1. Get all drivers
    const sessionBranchId = await getUserBranchId();
    const effectiveBranchId = branchId || sessionBranchId;

    // 1. Get all drivers with their current location from Master_Drivers
    let driversQuery = supabase
      .from("Master_Drivers")
      .select("*");

    if (customerId) {
      // Find Driver_IDs from Jobs_Main for this customer
      const { data: activeJobs } = await supabase
        .from("Jobs_Main")
        .select("Driver_ID")
        .eq("Customer_ID", customerId)
        .not("Driver_ID", "is", null)
        .not("Job_Status", "in", '("Delivered","Completed","Cancelled")');

      const activeDriverIds = Array.from(
        new Set(activeJobs?.map((j) => j.Driver_ID) || []),
      );
      if (activeDriverIds.length === 0) return [];

      driversQuery = driversQuery.in("Driver_ID", activeDriverIds);
    } else if (effectiveBranchId && effectiveBranchId !== "All") {
      driversQuery = driversQuery.eq("Branch_ID", effectiveBranchId);
    } else if (!isSuper && !isAdminUser && !effectiveBranchId) {
      return [];
    }

    const { data: drivers, error: driverError } = await driversQuery;

    if (driverError || !drivers) {
      console.error('[DEBUG] getActiveFleetStatus driver error:', JSON.stringify(driverError, null, 2))
      return [];
    }

    if (drivers.length > 0) {
        console.log('[DEBUG] Driver Keys:', Object.keys(drivers[0]))
        console.log('[DEBUG] Driver 0 Sample:', {
            ID: drivers[0].Driver_ID || drivers[0].driver_id,
            Lat: drivers[0].Current_Lat,
            lat: drivers[0].current_lat
        })
    }

    // 2. Format the data to match expected return type
    return drivers.map((driver: any) => ({
      Driver_ID: driver.Driver_ID || driver.driver_id,
      Driver_Name: driver.Driver_Name || driver.driver_name || "Unknown",
      Vehicle_Plate: driver.Vehicle_Plate || driver.vehicle_plate || "-",
      Mobile_No: driver.Mobile_No || driver.mobile_no || "",
      Last_Update: driver.Last_Seen || driver.last_seen || null,
      Latitude: driver.Current_Lat ?? driver.current_lat ?? null,
      Longitude: driver.Current_Lon ?? driver.current_lon ?? null,
    }));
  } catch {
    return [];
  }
}
