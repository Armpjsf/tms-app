-- =====================================================================
-- Phase 2: ทำให้ Master_Locations เป็นแหล่งข้อมูลหลัก (single source)
--   1) RLS policy ให้ authenticated เข้าถึงได้ (branch isolation ทำใน app layer
--      เหมือน Master_Routes)
--   2) Trigger: เมื่อ Master_Locations เปลี่ยน -> sync ไป Master_Routes อัตโนมัติ
--      เพื่อให้โค้ดส่วนอื่นที่ยังอ่าน Master_Routes (jobs/pricing/planning) ไม่พัง
--
-- ปลอดภัย: ไม่มี trigger ทางกลับ (Routes->Locations) จึงไม่มี recursion
-- idempotent: รันซ้ำได้
-- =====================================================================

-- 1) RLS policies -----------------------------------------------------
drop policy if exists "locations_auth_all" on public."Master_Locations";
create policy "locations_auth_all"
  on public."Master_Locations"
  for all
  to authenticated
  using (true)
  with check (true);

-- 2) Sync trigger: Master_Locations -> Master_Routes ------------------
create or replace function public.sync_location_to_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'DELETE') then
    delete from public."Master_Routes" where "Route_Name" = OLD."Name";
    return OLD;
  end if;

  -- รองรับการเปลี่ยนชื่อ (ปกติ UI ล็อกไม่ให้แก้ชื่อ แต่กันไว้)
  if (TG_OP = 'UPDATE' and NEW."Name" <> OLD."Name") then
    delete from public."Master_Routes" where "Route_Name" = OLD."Name";
  end if;

  insert into public."Master_Routes" (
    "Route_Name","Origin","Origin_Lat","Origin_Lon","Origin_Phone","Map_Link_Origin",
    "Destination","Dest_Lat","Dest_Lon","Dest_Phone","Map_Link_Destination",
    "Branch_ID","Origin_ID","Dest_ID"
  ) values (
    NEW."Name", NEW."Name", NEW."Lat", NEW."Lon", NEW."Phone", NEW."Map_Link",
    NEW."Name", NEW."Lat", NEW."Lon", NEW."Phone", NEW."Map_Link",
    NEW."Branch_ID", NEW."Location_ID", NEW."Location_ID"
  )
  on conflict ("Route_Name") do update set
    "Origin"               = excluded."Origin",
    "Origin_Lat"           = excluded."Origin_Lat",
    "Origin_Lon"           = excluded."Origin_Lon",
    "Origin_Phone"         = excluded."Origin_Phone",
    "Map_Link_Origin"      = excluded."Map_Link_Origin",
    "Destination"          = excluded."Destination",
    "Dest_Lat"             = excluded."Dest_Lat",
    "Dest_Lon"             = excluded."Dest_Lon",
    "Dest_Phone"           = excluded."Dest_Phone",
    "Map_Link_Destination" = excluded."Map_Link_Destination",
    "Branch_ID"            = excluded."Branch_ID",
    "Origin_ID"            = excluded."Origin_ID",
    "Dest_ID"              = excluded."Dest_ID";
    -- หมายเหตุ: ไม่แตะ Distance_KM เดิม (คงค่าที่มีอยู่)

  return NEW;
end
$$;

drop trigger if exists trg_sync_location_to_route on public."Master_Locations";
create trigger trg_sync_location_to_route
  after insert or update or delete on public."Master_Locations"
  for each row execute function public.sync_location_to_route();
