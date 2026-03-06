-- 1. Create Master_Branches Table
CREATE TABLE IF NOT EXISTS public."Master_Branches" (
    "Branch_ID" text PRIMARY KEY,
    "Branch_Name" text NOT NULL,
    "Address" text,
    "Phone" text,
    "Created_At" timestamp with time zone DEFAULT now(),
    "Updated_At" timestamp with time zone DEFAULT now()
) TABLESPACE pg_default;
-- 2. Insert Default Branches
INSERT INTO public."Master_Branches" ("Branch_ID", "Branch_Name", "Address")
VALUES ('HQ', 'สำนักงานใหญ่', 'กรุงเทพมหานคร'),
    ('BKK', 'สาขากรุงเทพฯ', 'กรุงเทพมหานคร'),
    ('CNX', 'สาขาเชียงใหม่', 'เชียงใหม่'),
    ('KKC', 'สาขาขอนแก่น', 'ขอนแก่น'),
    ('HKT', 'สาขาภูเก็ต', 'ภูเก็ต') ON CONFLICT ("Branch_ID") DO NOTHING;
-- 3. (Optional) Add foreign key constraint to Master_Users if useful
-- ALTER TABLE public."Master_Users" 
-- ADD CONSTRAINT fk_branch
-- FOREIGN KEY ("Branch_ID") 
-- REFERENCES public."Master_Branches" ("Branch_ID");