import { createAdminClient } from "./admin";
import { getSession } from "../session";

export type LogModule =
  | "Jobs"
  | "Planning"
  | "Billing"
  | "Users"
  | "Settings"
  | "Auth";
export type LogAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "APPROVE"
  | "EXPORT"
  | "LOGOUT";

interface LogOptions {
  module: LogModule;
  action: LogAction;
  targetId?: string;
  details?: any;
  branchId?: string;
  userId?: string;
  username?: string;
  role?: string;
}

/**
 * Logs a system activity.
 * Attempts to automatically retrieve session info if not provided.
 */
export async function logActivity(options: LogOptions) {
  try {
    const supabase = createAdminClient();

    let {
      userId,
      username,
      role,
      branchId,
      module,
      action,
      targetId,
      details,
    } = options;

    // Try to get session info if missing
    if (!userId || !username) {
      const session = await getSession();
      if (session) {
        userId = userId || session.userId;
        username = username || session.username;
        branchId = branchId || session.branchId || undefined;
        // Map roleId to a string if possible, or just use the ID
        role =
          role ||
          (session.roleId === 1
            ? "Super Admin"
            : session.roleId === 2
              ? "Branch Manager"
              : "Staff");
      }
    }

    const { error } = await supabase.from("System_Logs").insert({
      user_id: userId,
      username,
      role,
      branch_id: branchId,
      module,
      action_type: action,
      target_id: targetId,
      details,
      // IP address logging could be added here if available from request headers
    });

    if (error) {
      console.error("Error logging activity:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in logActivity:", error);
    return { success: false, error };
  }
}

/**
 * Retrieves logs with filtering
 */
export async function getSystemLogs(filters: {
  branchId?: string;
  userId?: string;
  module?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const supabase = createAdminClient();

  let query = supabase
    .from("System_Logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.module) query = query.eq("module", filters.module);
  if (filters.actionType) query = query.eq("action_type", filters.actionType);
  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate);

  if (filters.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching logs:", error);
    throw error;
  }

  return data;
}
