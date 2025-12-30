"""
Translation System for LOGIS-PRO 360
Supports Thai (th) and English (en)
"""

# Menu translations
MENU = {
    "th": {
        "dashboard": "📊 แดชบอร์ด",
        "planning": "📝 วางแผนงาน",
        "monitor": "📋 ติดตามงาน",
        "gps": "📍 GPS สดๆ",
        "maintenance": "🔧 ซ่อมบำรุง",
        "vendor": "🤝 ผู้รับเหมา",
        "wms": "📦 คลังสินค้า",
        "accounting": "💰 บัญชี/การเงิน",
        "master": "🗄️ ข้อมูลหลัก",
        "manual": "📚 คู่มือ",
        "settings": "⚙️ ตั้งค่า",
        "logout": "🚪 ออกจากระบบ",
        "sync": "🔄 รีเฟรช",
    },
    "en": {
        "dashboard": "📊 Dashboard",
        "planning": "📝 Planning",
        "monitor": "📋 Monitor",
        "gps": "📍 Live GPS",
        "maintenance": "🔧 Maintenance",
        "vendor": "🤝 Sub-Contractor",
        "wms": "📦 Warehouse",
        "accounting": "💰 Accounting",
        "master": "🗄️ Master Data",
        "manual": "📚 Manual",
        "settings": "⚙️ Settings",
        "logout": "🚪 Logout",
        "sync": "🔄 Sync",
    }
}

# Menu group translations
MENU_GROUPS = {
    "th": {
        "operations": "🚛 ปฏิบัติการ",
        "fleet": "🔧 กองยาน",
        "finance": "💰 การเงิน",
        "system": "⚙️ ระบบ",
    },
    "en": {
        "operations": "🚛 Operations",
        "fleet": "🔧 Fleet",
        "finance": "💰 Finance",
        "system": "⚙️ System",
    }
}

# Common UI elements
UI = {
    "th": {
        "welcome": "ยินดีต้อนรับ",
        "login": "เข้าสู่ระบบ",
        "username": "ชื่อผู้ใช้",
        "password": "รหัสผ่าน",
        "submit": "ยืนยัน",
        "cancel": "ยกเลิก",
        "save": "บันทึก",
        "edit": "แก้ไข",
        "delete": "ลบ",
        "search": "ค้นหา",
        "filter": "กรอง",
        "export": "ส่งออก",
        "import": "นำเข้า",
        "refresh": "รีเฟรช",
        "loading": "กำลังโหลด...",
        "no_data": "ไม่มีข้อมูล",
        "success": "สำเร็จ",
        "error": "เกิดข้อผิดพลาด",
        "confirm": "ยืนยัน",
        "total": "รวม",
        "date": "วันที่",
        "from": "จาก",
        "to": "ถึง",
        "status": "สถานะ",
        "action": "ดำเนินการ",
        "details": "รายละเอียด",
        "view": "ดู",
        "create": "สร้าง",
        "update": "อัพเดท",
        "all": "ทั้งหมด",
        "active": "ใช้งาน",
        "inactive": "ไม่ใช้งาน",
        "completed": "เสร็จสิ้น",
        "pending": "รอดำเนินการ",
        "in_progress": "กำลังดำเนินการ",
        "cancelled": "ยกเลิก",
    },
    "en": {
        "welcome": "Welcome",
        "login": "Login",
        "username": "Username",
        "password": "Password",
        "submit": "Submit",
        "cancel": "Cancel",
        "save": "Save",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search",
        "filter": "Filter",
        "export": "Export",
        "import": "Import",
        "refresh": "Refresh",
        "loading": "Loading...",
        "no_data": "No data",
        "success": "Success",
        "error": "Error",
        "confirm": "Confirm",
        "total": "Total",
        "date": "Date",
        "from": "From",
        "to": "To",
        "status": "Status",
        "action": "Action",
        "details": "Details",
        "view": "View",
        "create": "Create",
        "update": "Update",
        "all": "All",
        "active": "Active",
        "inactive": "Inactive",
        "completed": "Completed",
        "pending": "Pending",
        "in_progress": "In Progress",
        "cancelled": "Cancelled",
    }
}

# Dashboard translations
DASHBOARD = {
    "th": {
        "title": "ศูนย์บัญชาการ",
        "total_jobs": "งานทั้งหมด",
        "revenue": "รายได้",
        "expense": "รายจ่าย",
        "profit": "กำไรสุทธิ",
        "driver_cost": "ต้นทุนคนขับ",
        "fuel_cost": "ค่าน้ำมัน",
        "total_expense": "รวมรายจ่าย",
        "expense_ratio": "% ต่อรายได้",
        "otd_rate": "ส่งตรงเวลา",
        "active_jobs": "งานกำลังดำเนินการ",
        "fleet_status": "สถานะกองยาน",
        "maintenance_alerts": "แจ้งเตือนซ่อมบำรุง",
        "top_customers": "ลูกค้ายอดนิยม",
        "top_drivers": "คนขับดีเด่น",
        "daily_trend": "แนวโน้มรายวัน",
    },
    "en": {
        "title": "Command Center",
        "total_jobs": "Total Jobs",
        "revenue": "Revenue",
        "expense": "Expense",
        "profit": "Net Profit",
        "driver_cost": "Driver Cost",
        "fuel_cost": "Fuel Cost",
        "total_expense": "Total Expense",
        "expense_ratio": "% of Revenue",
        "otd_rate": "OTD Rate",
        "active_jobs": "Active Jobs",
        "fleet_status": "Fleet Status",
        "maintenance_alerts": "Maintenance Alerts",
        "top_customers": "Top Customers",
        "top_drivers": "Top Drivers",
        "daily_trend": "Daily Trend",
    }
}

# Helper function
def get_text(category: str, key: str, lang: str = "th") -> str:
    """Get translated text."""
    categories = {
        "menu": MENU,
        "menu_groups": MENU_GROUPS,
        "ui": UI,
        "dashboard": DASHBOARD,
    }
    
    cat = categories.get(category, {})
    return cat.get(lang, cat.get("th", {})).get(key, key)

def t(key: str, lang: str = "th") -> str:
    """Shorthand for UI translations."""
    return UI.get(lang, UI["th"]).get(key, key)

def menu(key: str, lang: str = "th") -> str:
    """Shorthand for menu translations."""
    return MENU.get(lang, MENU["th"]).get(key, key)
