-- Create Master_Branches table
CREATE TABLE "Master_Branches" (
    "Branch_ID" TEXT PRIMARY KEY,
    "Branch_Name" TEXT NOT NULL,
    "Address" TEXT,
    "Created_At" TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default branches
INSERT INTO "Master_Branches" ("Branch_ID", "Branch_Name")
VALUES ('BKK', 'Bangkok HQ'),
    ('CNX', 'Chiang Mai'),
    ('HKT', 'Phuket'),
    ('KKC', 'Khon Kaen');