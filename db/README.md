# Database Migrations Guide

This directory contains the SQL scripts necessary to set up and maintain the TMS ePOD database on Supabase.

## Initial Setup Order

If setting up a new environment, run these scripts in order:

1. `sql/supabase_schema_fix.sql` - Core table structures and fixes.
2. `sql/supabase_multibranch_data.sql` - Multi-branch support.
3. `sql/supabase_rbac_schema.sql` - Role-based access control.
4. `sql/supabase_storage.sql` - Storage bucket policies.
5. `sql/standardize_schema.sql` - Column name standardization.
6. `sql/create_push_subscriptions.sql` - Push notification support.

## Schema Standardization

We have standardized column naming conventions (e.g., `Driver_ID` instead of `driver_id`) across all tables. Always use the `standardize_schema.sql` script to ensure compatibility with the application's type system.

## Version Control

New schema changes should be added as new `.sql` files in `db/sql/` and documented here.
