-- 1. Create Master_Roles Table
CREATE TABLE IF NOT EXISTS public."Master_Roles" (
    "Role_ID" SERIAL PRIMARY KEY,
    "Role_Name" text NOT NULL UNIQUE,
    "Description" text,
    "Permissions" jsonb DEFAULT '{}'::jsonb,
    -- Store permissions as { "module": ["view", "edit"] }
    "Created_At" timestamp with time zone DEFAULT now(),
    "Updated_At" timestamp with time zone DEFAULT now()
) TABLESPACE pg_default;
-- 2. Add Role_ID to Master_Users (if not exists)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Master_Users'
        AND column_name = 'Role_ID'
) THEN
ALTER TABLE public."Master_Users"
ADD COLUMN "Role_ID" integer REFERENCES public."Master_Roles"("Role_ID");
END IF;
END $$;
-- 3. Insert Default Roles (Admin & Branch Manager & User)
INSERT INTO public."Master_Roles" ("Role_Name", "Description", "Permissions")
VALUES (
        'Super Admin',
        'Full access to all modules and all data.',
        '{"dashboard": ["view"], "jobs": ["view", "create", "edit", "delete", "approve"], "planning": ["view", "manage"], "billing": ["view", "create", "print", "approve"], "settings": ["view", "manage"], "users": ["view", "create", "edit", "delete"]}'
    ),
    (
        'Branch Manager',
        'Can see and manage all data within their branch.',
        '{"dashboard": ["view"], "jobs": ["view", "create", "edit", "approve"], "planning": ["view", "manage"], "billing": ["view", "create", "print"], "users": ["view"], "settings": ["view"]}'
    ),
    (
        'Staff',
        'Can view and create basic entries.',
        '{"dashboard": ["view"], "jobs": ["view", "create"], "planning": ["view"], "billing": ["view"]}'
    ) ON CONFLICT ("Role_Name") DO NOTHING;
-- 4. Enable RLS on Master_Users
ALTER TABLE public."Master_Users" ENABLE ROW LEVEL SECURITY;
-- 5. Create RLS Policies
-- Note: These policies assume we are using Supabase Auth (auth.uid()) or a custom setting.
-- If using Custom Auth (Cookie), RLS is tricky on the DB side without set_config().
-- For now, we create a policy that allows access if the checking user has the same Branch_ID.
-- BUT since we can't easily get the "Checking User" in pure SQL without auth.uid(), 
-- we will use a "Service Role" bypass for the application (backend) OR rely on Application-Level filtering for now 
-- until the Auth system is fully migrated to Supabase Auth.
-- Example Policy (If using Supabase Auth linked via Email/Username):
-- CREATE POLICY "Users view same branch" ON "Master_Users"
-- FOR SELECT
-- USING (
--   "Branch_ID" IN (
--     SELECT "Branch_ID" FROM "Master_Users" WHERE "Username" = (select email from auth.users where id = auth.uid())
--   )
-- );
-- FOR NOW, since we are using Custom Auth, we will rely on Logic in the Code.
-- But the table structure is ready.