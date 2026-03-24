-- ==========================================
-- PHASE 1: PERFORMANCE ENGINEERING (RPCs)
-- ==========================================
-- Run this in your Supabase SQL Editor.
-- This function aggregates financial data directly on the database server,
-- reducing the payload size sent to the client from Megabytes to a few Bytes.

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    start_date TEXT,
    end_date TEXT,
    filter_branch_id TEXT DEFAULT NULL,
    filter_customer_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_revenue NUMERIC := 0;
    total_driver_cost NUMERIC := 0;
    total_extra_cost NUMERIC := 0;
    total_fuel_cost NUMERIC := 0;
    total_maintenance_cost NUMERIC := 0;
    job_count INT := 0;
BEGIN
    -- 1. Aggregate Jobs Data (Revenue, Driver Cost, Extra Costs)
    SELECT 
        COALESCE(SUM("Price_Cust_Total"::NUMERIC), 0),
        COALESCE(SUM("Cost_Driver_Total"::NUMERIC), 0),
        COALESCE(SUM("Price_Cust_Extra"::NUMERIC), 0) + COALESCE(SUM("Cost_Driver_Extra"::NUMERIC), 0),
        COUNT(*)
    INTO 
        total_revenue, 
        total_driver_cost, 
        total_extra_cost,
        job_count
    FROM public."Jobs_Main"
    WHERE "Plan_Date" >= start_date AND "Plan_Date" <= end_date
    AND "Job_Status" IN ('Completed', 'Delivered', 'Finished', 'Closed')
    AND (filter_branch_id IS NULL OR "Branch_ID" = filter_branch_id)
    AND (filter_customer_id IS NULL OR "Customer_ID" = filter_customer_id);

    -- 2. Aggregate Fuel Costs (Only if we aren't filtering by customer, as customers don't pay fuel)
    IF filter_customer_id IS NULL THEN
        SELECT COALESCE(SUM("Price_Total"::NUMERIC), 0)
        INTO total_fuel_cost
        FROM public."Fuel_Logs"
        WHERE "Date_Time"::TEXT >= start_date AND "Date_Time"::TEXT <= end_date
        AND (filter_branch_id IS NULL OR "Branch_ID" = filter_branch_id);
        
    -- 3. Aggregate Maintenance Costs
        SELECT COALESCE(SUM("Cost_Total"::NUMERIC), 0)
        INTO total_maintenance_cost
        FROM public."Repair_Tickets"
        WHERE "Date_Report"::TEXT >= start_date AND "Date_Report"::TEXT <= end_date
        AND "Status" != 'Cancelled'
        AND (filter_branch_id IS NULL OR "Branch_ID" = filter_branch_id);
    END IF;

    -- Build the final JSON response
    result := jsonb_build_object(
        'revenue', total_revenue,
        'cost', jsonb_build_object(
            'driver', total_driver_cost,
            'extra', total_extra_cost,
            'fuel', total_fuel_cost,
            'maintenance', total_maintenance_cost,
            'total', total_driver_cost + total_extra_cost + total_fuel_cost + total_maintenance_cost
        ),
        'net_profit', total_revenue - (total_driver_cost + total_extra_cost + total_fuel_cost + total_maintenance_cost),
        'job_count', job_count
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
