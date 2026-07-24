-- Database Migration: Add POD_Drops_Json to Jobs_Main
-- Per-drop delivery evidence for multi-drop jobs: one entry per drop with its
-- SO, destination, that drop's POD photos, signature and floor-climb slip — so
-- the completion notification and tracking can show evidence grouped per SO
-- instead of one flat, unattributable pile.

ALTER TABLE "Jobs_Main"
    ADD COLUMN IF NOT EXISTS "POD_Drops_Json" TEXT;

COMMENT ON COLUMN "Jobs_Main"."POD_Drops_Json" IS
    'JSON array หลักฐานการส่งรายดรอป: [{drop, so_no, destination, photos[], signature, floorClimb, deliveredAt}]';
