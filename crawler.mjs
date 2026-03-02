import http from "http";
import fs from "fs";

const routes = [
  "/",
  "/admin/analytics/intelligence",
  "/admin/analytics/regional",
  "/admin/analytics",
  "/admin/jobs/1/complete",
  "/admin/jobs/create",
  "/admin/vehicle-checks",
  "/billing/customer/client-page",
  "/billing/customer/history",
  "/billing/driver/client-page",
  "/billing/driver/history",
  "/billing/invoices/create",
  "/chat",
  "/dashboard",
  "/fuel",
  "/jobs/history",
  "/maintenance",
  "/mobile/chat",
  "/mobile/dashboard",
  "/mobile/jobs/1/complete",
  "/mobile/jobs/1/pickup",
  "/mobile/jobs",
  "/mobile/maintenance",
  "/mobile/notifications",
  "/mobile/vehicle-check",
  "/track/1",
  "/vehicles",
];

async function crawl() {
  console.log("Starting crawler on port 3001...");
  for (const route of routes) {
    try {
      console.log(`Fetching ${route}...`);
      await new Promise((resolve) => {
        const req = http.get(`http://localhost:3001${route}`, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            console.log(`Finished ${route} with status ${res.statusCode}`);
            if (res.statusCode >= 500) {
              fs.writeFileSync("error_page.html", data);
              console.log(
                `Saved 500 error page from ${route} to error_page.html`,
              );
            }
            resolve();
          });
        });
        req.on("error", (e) => {
          console.log(`Error on ${route}: ${e.message}`);
          resolve();
        });
      });
      // Short delay
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.error(e);
    }
  }
}
crawl();
