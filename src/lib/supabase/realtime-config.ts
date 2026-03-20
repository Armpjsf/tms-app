export const REALTIME_TABLES = [
  'Jobs',
  'Vehicles',
  'Accounting',
  'GPS_Logs',
  'Notifications'
];

export const SQL_ENABLE_REALTIME = `
-- Run this in your Supabase SQL Editor to enable Realtime for all core tables
alter publication supabase_realtime add table "Jobs";
alter publication supabase_realtime add table "Vehicles";
alter publication supabase_realtime add table "Accounting";
alter publication supabase_realtime add table "GPS_Logs";
alter publication supabase_realtime add table "Notifications";
`;
