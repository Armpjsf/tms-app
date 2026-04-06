
-- Insert fuel prices
INSERT INTO public.Daily_Fuel_Prices ("Date", "Fuel_Type", "Price", "Updated_At") 
VALUES ('2026-04-05', 'Diesel B7', 50.54, NOW()), 
       ('2026-04-04', 'Diesel B7', 50.44, NOW()) 
ON CONFLICT ("Date") DO UPDATE SET "Price" = EXCLUDED."Price", "Updated_At" = NOW();

-- Check existing matrices
SELECT * FROM public.Customer_Route_Rates;
