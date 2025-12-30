# config/constants.py
"""
Unified constants for TMS ePOD system.
All modules should import status codes from here.
"""

# Job Status Flow (Unified)
class JobStatus:
    NEW = "New"
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    ARRIVED = "ARRIVED"
    DELIVERED = "DELIVERED"
    COMPLETED = "Completed"
    CANCELLED = "CANCELLED"
    FAILED = "Failed"
    
    # All valid statuses
    ALL = [NEW, ASSIGNED, PICKED_UP, IN_TRANSIT, ARRIVED, DELIVERED, COMPLETED, CANCELLED, FAILED]
    
    # Active statuses (not finished)
    ACTIVE = [NEW, ASSIGNED, PICKED_UP, IN_TRANSIT, ARRIVED, DELIVERED]
    
    # Finished statuses
    FINISHED = [COMPLETED, CANCELLED, FAILED]
    
    # Kanban display order
    KANBAN_ORDER = [NEW, ASSIGNED, IN_TRANSIT, ARRIVED, DELIVERED, COMPLETED]
    
    # Thai labels
    LABELS_TH = {
        NEW: "งานใหม่",
        ASSIGNED: "มอบหมายแล้ว",
        PICKED_UP: "รับของแล้ว",
        IN_TRANSIT: "กำลังส่ง",
        ARRIVED: "ถึงจุดส่ง",
        DELIVERED: "ส่งสำเร็จ",
        COMPLETED: "เสร็จสิ้น",
        CANCELLED: "ยกเลิก",
        FAILED: "ส่งไม่สำเร็จ"
    }
    
    # Colors for display
    COLORS = {
        NEW: "gray",
        ASSIGNED: "blue",
        PICKED_UP: "cyan",
        IN_TRANSIT: "orange",
        DELIVERED: "teal",
        COMPLETED: "green",
        CANCELLED: "red",
        FAILED: "red"
    }

# Payment Status
class PaymentStatus:
    PENDING = "รอจ่าย"
    PAID = "Paid"
    OVERDUE = "เกินกำหนด"
    
    ALL = [PENDING, PAID, OVERDUE]

# Billing Status
class BillingStatus:
    PENDING = "รอวางบิล"
    BILLED = "Billed"
    PAID = "ชำระแล้ว"
    
    ALL = [PENDING, BILLED, PAID]

# Driver Status
class DriverStatus:
    AVAILABLE = "Available"
    ON_JOB = "On Job"
    OFF_DUTY = "Off Duty"
    MAINTENANCE = "Maintenance"
    INACTIVE = "Inactive"
    
    ALL = [AVAILABLE, ON_JOB, OFF_DUTY, MAINTENANCE, INACTIVE]
    
    COLORS = {
        AVAILABLE: "green",
        ON_JOB: "blue",
        OFF_DUTY: "gray",
        MAINTENANCE: "orange",
        INACTIVE: "red"
    }

# Vehicle Status
class VehicleStatus:
    AVAILABLE = "Available"
    IN_USE = "In Use"
    MAINTENANCE = "Maintenance"
    INACTIVE = "Inactive"
    
    ALL = [AVAILABLE, IN_USE, MAINTENANCE, INACTIVE]

# Maintenance Priority
class MaintenancePriority:
    LOW = "ปกติ"
    MEDIUM = "ด่วน"
    HIGH = "ฉุกเฉิน"
    
    ALL = [LOW, MEDIUM, HIGH]

# Repair Ticket Status
class RepairStatus:
    OPEN = "รอดำเนินการ"
    IN_PROGRESS = "กำลังซ่อม"
    WAITING_PARTS = "รออะไหล่"
    COMPLETED = "เสร็จสิ้น"
    CANCELLED = "ยกเลิก"
    
    ALL = [OPEN, IN_PROGRESS, WAITING_PARTS, COMPLETED, CANCELLED]

# WMS Transaction Types
class WMSTransactionType:
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"
    
    ALL = [INBOUND, OUTBOUND, ADJUSTMENT, TRANSFER]

# User Roles
class UserRole:
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    DISPATCHER = "DISPATCHER"
    DRIVER = "DRIVER"
    VIEWER = "VIEWER"
    
    ALL = [SUPER_ADMIN, ADMIN, MANAGER, DISPATCHER, DRIVER, VIEWER]
