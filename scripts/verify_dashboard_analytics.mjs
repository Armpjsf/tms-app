import {
  getProvincialMileageStats,
  getFleetComplianceMetrics,
  getFleetHealthScore,
} from "./src/lib/supabase/analytics.ts";

async function verify() {
  console.log("--- Verifying Dashboard Analytics ---");

  try {
    const provincial = await getProvincialMileageStats("All");
    console.log(
      "Provincial Mileage Stats:",
      JSON.stringify(provincial, null, 2),
    );

    const compliance = await getFleetComplianceMetrics("All");
    console.log(
      "Fleet Compliance Metrics:",
      JSON.stringify(compliance, null, 2),
    );

    const health = await getFleetHealthScore("All");
    console.log("Fleet Health Score:", health + "%");

    console.log("\n--- Verification Complete ---");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

verify();
