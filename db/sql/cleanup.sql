-- TMS_ePOD: Robust Database Reset Script
-- This version checks for table existence to avoid "Relation does not exist" errors.

DO $$
DECLARE
    t text;
    tables_to_clear text[] := ARRAY[
        'GPS_Logs', 'gps_logs',
        'System_Logs', 'system_logs',
        'Chat_Messages', 'chat_messages',
        'Notifications', 'notifications',
        'Vehicle_Checks', 'vehicle_checks',
        'Damage_Reports', 'damage_reports',
        'Driver_Leaves', 'driver_leaves',
        'push_subscriptions',
        'Fuel_Logs', 'fuel_logs',
        'Repair_Tickets', 'repair_tickets',
        'Billing_Notes', 'billing_notes',
        'invoices', 'Invoices',
        'Jobs_Main', 'jobs_main',
        'Master_Drivers', 'master_drivers', 'Drivers', 'drivers',
        'master_vehicles', 'Master_Vehicles', 'Vehicles', 'vehicles',
        'Master_Customers', 'master_customers',
        'Master_Branches', 'master_branches'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_clear
    LOOP
        -- Check if table exists in public schema (case-sensitive if quoted)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Special handling for Master_Branches (keep HQ)
            IF t IN ('Master_Branches', 'master_branches') THEN
                DELETE FROM public."Master_Branches" WHERE "Branch_ID" != 'HQ';
                CONTINUE;
            END IF;
            
            -- Special handling for Master_Users (not in TRUNCATE list, handled separately)
            IF t IN ('Master_Users', 'master_users') THEN
                CONTINUE;
            END IF;

            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
        END IF;
    END LOOP;

    -- Cleanup Users (Keep ONLY Super Admins)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Master_Users', 'master_users')) THEN
        -- We use a dynamic table name just in case
        t := (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Master_Users', 'master_users') LIMIT 1);
        EXECUTE format('DELETE FROM public.%I WHERE "Role_ID" != 1 OR "Role_ID" IS NULL', t);
    END IF;

    -- Ensure 'HQ' exists in Master_Branches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Master_Branches', 'master_branches')) THEN
        t := (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Master_Branches', 'master_branches') LIMIT 1);
        EXECUTE format('INSERT INTO public.%I ("Branch_ID", "Branch_Name", "Address") 
                        VALUES (''HQ'', ''สำนักงานใหญ่'', ''กรุงเทพมหานคร'') 
                        ON CONFLICT ("Branch_ID") DO NOTHING', t);
    END IF;

END $$;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
