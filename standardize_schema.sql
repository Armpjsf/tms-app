-- Standardize Vehicle_Checks table
ALTER TABLE "Vehicle_Checks"
    RENAME COLUMN "driver_id" TO "Driver_ID";
ALTER TABLE "Vehicle_Checks"
    RENAME COLUMN "driver_name" TO "Driver_Name";
ALTER TABLE "Vehicle_Checks"
    RENAME COLUMN "vehicle_plate" TO "Vehicle_Plate";
ALTER TABLE "Vehicle_Checks"
    RENAME COLUMN "checked_at" TO "Check_Date";
ALTER TABLE "Vehicle_Checks"
    RENAME COLUMN "check_items" TO "Passed_Items";
-- Standardize Notifications table
ALTER TABLE "Notifications"
    RENAME COLUMN "driver_id" TO "Driver_ID";
ALTER TABLE "Notifications"
    RENAME COLUMN "title" TO "Title";
ALTER TABLE "Notifications"
    RENAME COLUMN "message" TO "Message";
ALTER TABLE "Notifications"
    RENAME COLUMN "type" TO "Type";
ALTER TABLE "Notifications"
    RENAME COLUMN "is_read" TO "Is_Read";
ALTER TABLE "Notifications"
    RENAME COLUMN "created_at" TO "Created_At";
-- Standardize Chat_Messages table
ALTER TABLE "Chat_Messages"
    RENAME COLUMN "sender_id" TO "Sender_ID";
ALTER TABLE "Chat_Messages"
    RENAME COLUMN "receiver_id" TO "Receiver_ID";
ALTER TABLE "Chat_Messages"
    RENAME COLUMN "message" TO "Message";
ALTER TABLE "Chat_Messages"
    RENAME COLUMN "is_read" TO "Is_Read";
ALTER TABLE "Chat_Messages"
    RENAME COLUMN "created_at" TO "Created_At";
-- Refresh Schema Cache (optional but helpful)
NOTIFY pgrst,
'reload schema';