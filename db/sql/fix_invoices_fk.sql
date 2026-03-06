-- SQL Editor ใน Supabase บางทีมีปัญหากับคำสั่ง DO $$
-- ให้รันคำสั่ง SQL ด้านล่างนี้แทนได้เลยครับ
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_customer;
ALTER TABLE public.invoices
ADD CONSTRAINT fk_invoices_customer FOREIGN KEY ("Customer_ID") REFERENCES public."Master_Customers"("Customer_ID") ON DELETE
SET NULL;
NOTIFY pgrst,
'reload schema';