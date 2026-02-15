export interface Permission {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve?: boolean;
    print?: boolean;
    manage?: boolean;
}

export interface RolePermissions {
    [module: string]: string[]; // e.g. "jobs": ["view", "create"]
}

export interface Role {
    Role_ID: number;
    Role_Name: string;
    Description: string | null;
    Permissions: RolePermissions;
    Created_At?: string;
    Updated_At?: string;
}

export const MODULES = [
    { id: 'dashboard', label: 'หน้าหลัก (Dashboard)' },
    { id: 'jobs', label: 'จัดการงาน (Jobs)' },
    { id: 'planning', label: 'วางแผนงาน (Planning)' },
    { id: 'billing', label: 'วางบิล/บัญชี (Billing)' },
    { id: 'users', label: 'จัดการผู้ใช้ (Users)' },
    { id: 'settings', label: 'ตั้งค่าระบบ (Settings)' },
];

export const ACTIONS = [
    { id: 'view', label: 'ดูข้อมูล (View)' },
    { id: 'create', label: 'สร้าง (Create)' },
    { id: 'edit', label: 'แก้ไข (Edit)' },
    { id: 'delete', label: 'ลบ (Delete)' },
    { id: 'approve', label: 'อนุมัติ (Approve)' },
    { id: 'print', label: 'พิมพ์ (Print)' },
];
