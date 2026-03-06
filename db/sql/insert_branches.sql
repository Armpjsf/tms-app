-- Safe insert of branches, skips if they already exist
INSERT INTO "Master_Branches" ("Branch_ID", "Branch_Name", "Address")
VALUES ('BKK', 'Bangkok HQ', 'Headquarters'),
    ('CNX', 'Chiang Mai', 'North'),
    ('HKT', 'Phuket', 'South'),
    ('KKC', 'Khon Kaen', 'Northeast') ON CONFLICT ("Branch_ID") DO NOTHING;