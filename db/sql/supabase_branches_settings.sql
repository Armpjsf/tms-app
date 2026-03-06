-- migration: add email settings to Master_Branches
ALTER TABLE IF EXISTS "Master_Branches"
ADD COLUMN IF NOT EXISTS "Email" text,
    ADD COLUMN IF NOT EXISTS "Sender_Name" text;
COMMENT ON COLUMN "Master_Branches"."Email" IS 'Email address used as sender for this branch';
COMMENT ON COLUMN "Master_Branches"."Sender_Name" IS 'Display name for the email sender of this branch';