/**
 * Analytics Module - Barrel Export
 * 
 * This file re-exports all analytics functions from their respective sub-modules.
 * Split into:
 *  - analytics-helpers.ts     : Shared types, constants & utilities
 *  - financial-analytics.ts   : Revenue, costs, customers, KPIs, branches, routes
 *  - fleet-analytics.ts       : Operations, drivers, vehicles, mileage, compliance
 * 
 * All existing imports from "@/lib/supabase/analytics" will continue to work.
 */

export {
    // Financial & Business Analytics
    getFinancialStats,
    getRevenueTrend,
    getTopCustomers,
    getJobStatusDistribution,
    getBranchPerformance,
    getSubcontractorPerformance,
    getExecutiveKPIs,
    getRouteEfficiency,
    getRegionalDeepDive,
    getRevenueForecast,
} from './financial-analytics'

export {
    // Fleet & Operational Analytics
    getOperationalStats,
    getDriverLeaderboard,
    getDetailedDriverAnalytics,
    getVehicleProfitability,
    getProvincialMileageStats,
    getFleetComplianceMetrics,
    getFleetHealthScore,
    getDelayRootCause,
    getVehicleJobDetails,
} from './fleet-analytics'
