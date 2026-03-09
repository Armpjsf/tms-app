import { getUnassignedJobs } from "@/lib/actions/marketplace-actions";
import { MarketplaceClient } from "./marketplace-client";
import { getDriverSession } from "@/lib/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function MobileMarketplacePage() {
  // 1. Get current driver context
  const session = await getDriverSession();

  if (!session) {
    redirect("/mobile/login");
  }

  // 2. Fetch unassigned jobs from server
  const jobs = await getUnassignedJobs();

  return (
    <MarketplaceClient
      initialJobs={jobs}
      driverId={session.driverId || ""}
      driverName={session.driverName || "ไม่ทราบชื่อ"}
    />
  );
}
