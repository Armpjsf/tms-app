export type SystemPermissionId = 
    | 'job_view' | 'job_create' | 'job_delete' | 'job_export' | 'job_price_view' | 'job_price_edit'
    | 'fleet_view' | 'fleet_edit' | 'fleet_service' | 'fleet_fuel'
    | 'billing_view' | 'billing_create' | 'billing_approve'
    | 'settings_user' | 'settings_company' | 'settings_audit';

export interface PermissionDefinition {
    id: SystemPermissionId;
    label: string;
    desc: string;
    category: 'Operation' | 'Fleet' | 'Financial' | 'System';
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
    // 🚚 Operation
    { id: 'job_view', label: 'ดูงานขนส่ง (View Jobs)', desc: 'ดูรายการและรายละเอียดงานขนส่ง', category: 'Operation' },
    { id: 'job_create', label: 'สร้าง/แก้ไขงาน (Create/Edit)', desc: 'สร้างงานใหม่หรือแก้ไขข้อมูลงานเดิม', category: 'Operation' },
    { id: 'job_delete', label: '🔴 ลบงาน (Delete Jobs)', desc: 'ลบข้อมูลงานออกจากระบบ', category: 'Operation' },
    { id: 'job_export', label: 'ส่งออก Excel (Export Jobs)', desc: 'ดาวน์โหลดข้อมูลงานเป็นไฟล์ Excel', category: 'Operation' },
    { id: 'job_price_view', label: '💰 ดูราคา/ต้นทุน (View Financials)', desc: 'มองเห็นคอลัมน์ราคาและต้นทุนค่าขนส่ง', category: 'Operation' },
    { id: 'job_price_edit', label: '💰 แก้ไขราคา (Edit Price)', desc: 'แก้ไขตัวเลขราคาและต้นทุนได้', category: 'Operation' },

    // 🛠️ Fleet
    { id: 'fleet_view', label: 'ดูข้อมูลรถ/คนขับ (View Fleet)', desc: 'ดูรายชื่อรถและคนขับ', category: 'Fleet' },
    { id: 'fleet_edit', label: 'จัดการข้อมูล (Manage Fleet)', desc: 'เพิ่ม/แก้ไข ข้อมูลรถและคนขับ', category: 'Fleet' },
    { id: 'fleet_service', label: 'แจ้งซ่อม/บำรุงรักษา (Maintenance)', desc: 'เข้าถึงเมนูแจ้งซ่อมและประวัติการซ่อม', category: 'Fleet' },
    { id: 'fleet_fuel', label: 'บันทึกน้ำมัน (Fuel)', desc: 'บันทึกและดูประวัติการเติมน้ำมัน', category: 'Fleet' },

    // 💵 Financial
    { id: 'billing_view', label: 'ดูเอกสารวางบิล (View Billing)', desc: 'เข้าถึงหน้าสรุปวางบิลและใบแจ้งหนี้', category: 'Financial' },
    { id: 'billing_create', label: 'สร้างใบวางบิล (Create Billing)', desc: 'สร้างเอกสารวางบิลและใบเสร็จ', category: 'Financial' },
    { id: 'billing_approve', label: '✅ อนุมัติการจ่าย (Approve Payment)', desc: 'กดอนุมัติการจ่ายเงิน/ปิดยอด', category: 'Financial' },

    // ⚙️ System
    { id: 'settings_user', label: 'จัดการผู้ใช้งาน (User Management)', desc: 'เพิ่ม/ลบ/แก้ไข ผู้ใช้งานระบบ', category: 'System' },
    { id: 'settings_company', label: 'ตั้งค่าบริษัท (Company Info)', desc: 'แก้ไขข้อมูลบริษัทและโลโก้', category: 'System' },
    { id: 'settings_audit', label: 'ดู Log การทำงาน (Audit Logs)', desc: 'ตรวจสอบประวัติการใช้งานระบบ', category: 'System' },
];

export const STANDARD_ROLES = [
    'Super Admin',
    'Admin',
    'Dispatcher',
    'Accountant',
    'Staff',
    'Driver',
    'Customer'
] as const;

export type StandardRole = typeof STANDARD_ROLES[number];

export interface Role {
    Role_ID: number;
    Role_Name: string;
    Description?: string | null;
}

export type RolePermissions = Record<string, boolean>;
