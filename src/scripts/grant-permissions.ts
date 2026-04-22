import { saveRolePermissions, getPermissionsByRole } from "./src/lib/actions/permission-actions";

async function grantMonitorPermission() {
    const role = "Super Admin";
    const existing = await getPermissionsByRole(role) || [];
    
    if (!existing.includes("navigation.user_monitor")) {
        console.log("Adding navigation.user_monitor to Super Admin...");
        const updated = [...existing, "navigation.user_monitor"];
        const result = await saveRolePermissions(role, updated);
        console.log("Result:", result);
    } else {
        console.log("Super Admin already has the permission.");
    }
}

grantMonitorPermission();
