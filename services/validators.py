"""
Input Validation Service using Pydantic
Prevents SQL injection, XSS, and other injection attacks
"""

from pydantic import BaseModel, Field, validator, field_validator
from typing import Optional, List
from datetime import date, datetime
import re


class JobCreateRequest(BaseModel):
    """Validation for job creation"""
    customer_name: str = Field(..., min_length=2, max_length=200)
    plan_date: date
    route_name: Optional[str] = Field(None, max_length=100)
    vehicle_type: Optional[str] = Field(None, max_length=20)
    driver_name: Optional[str] = Field(None, max_length=100)
    
    @field_validator('customer_name', 'route_name', 'driver_name')
    @classmethod
    def sanitize_string(cls, v):
        """Remove dangerous characters to prevent injection attacks"""
        if v is None:
            return v
            
        # List of dangerous characters/patterns
        dangerous = ['<', '>', '"', "'", '&', ';', '--', '/*', '*/', 'script', 'SELECT', 'DROP', 'INSERT', 'UPDATE', 'DELETE']
        
        v_lower = v.lower()
        for pattern in dangerous:
            if pattern.lower() in v_lower:
                raise ValueError(f'Invalid input: contains forbidden pattern "{pattern}"')
        
        return v.strip()
    
    @field_validator('plan_date')
    @classmethod
    def validate_date(cls, v):
        """Ensure date is not in the past"""
        if v < date.today():
            raise ValueError('Plan date cannot be in the past')
        return v


class DriverCreateRequest(BaseModel):
    """Validation for driver creation"""
    driver_name: str = Field(..., min_length=2, max_length=100)
    mobile_no: Optional[str] = Field(None, max_length=20)
    vehicle_plate: Optional[str] = Field(None, max_length=20)
    
    @field_validator('mobile_no')
    @classmethod
    def validate_phone(cls, v):
        """Validate Thai phone number format"""
        if v is None:
            return v
        
        # Remove spaces and dashes
        v = v.replace(' ', '').replace('-', '')
        
        # Thai phone: 10 digits starting with 0, or 9 digits
        if not re.match(r'^0\d{9}$|^\d{9}$', v):
            raise ValueError('Invalid phone number format (expected 10 digits starting with 0)')
        
        return v
    
    @field_validator('vehicle_plate')
    @classmethod
    def validate_plate(cls, v):
        """Validate vehicle plate format"""
        if v is None:
            return v
        
        # Thai plate format: XX-XXXX or XXX-XXXX
        v = v.strip().upper()
        if not re.match(r'^[A-Z0-9ก-ฮ]{2,3}-\d{4}$', v):
            raise ValueError('Invalid plate format (expected XX-1234 or XXX-1234)')
        
        return v


class CustomerCreateRequest(BaseModel):
    """Validation for customer creation"""
    customer_name: str = Field(..., min_length=2, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        if v is None or v.strip() == '':
            return None
        
        # Simple email regex
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        
        return v.lower().strip()


class FuelLogRequest(BaseModel):
    """Validation for fuel log creation"""
    driver_id: str = Field(..., min_length=1, max_length=50)
    vehicle_plate: str = Field(..., min_length=1, max_length=20)
    liters: float = Field(..., gt=0, le=1000)  # Max 1000 liters
    price_total: float = Field(..., gt=0, le=100000)  # Max 100k baht
    odometer: Optional[float] = Field(None, ge=0, le=9999999)
    
    @field_validator('liters', 'price_total')
    @classmethod
    def validate_positive(cls, v):
        """Ensure positive values"""
        if v <= 0:
            raise ValueError('Value must be positive')
        return round(v, 2)


class MaintenanceTicketRequest(BaseModel):
    """Validation for maintenance ticket creation"""
    driver_id: str = Field(..., min_length=1, max_length=50)
    vehicle_plate: str = Field(..., min_length=1, max_length=20)
    issue_type: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=5, max_length=1000)
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Ensure description is meaningful"""
        if len(v.strip()) < 5:
            raise ValueError('Description must be at least 5 characters')
        return v.strip()


class PasswordChangeRequest(BaseModel):
    """Validation for password change"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v):
        """Ensure password meets security requirements"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        # Check for at least one number
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        
        # Check for at least one letter
        if not re.search(r'[a-zA-Z]', v):
            raise ValueError('Password must contain at least one letter')
        
        return v
    
    def validate_passwords_match(self):
        """Check if passwords match"""
        if self.new_password != self.confirm_password:
            raise ValueError('Passwords do not match')
        return True


# Utility function for safe string sanitization
def sanitize_input(value: str, max_length: int = 200) -> str:
    """
    Sanitize user input to prevent injection attacks
    
    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
        
    Raises:
        ValueError: If input contains dangerous patterns
    """
    if not value:
        return ""
    
    # Truncate to max length
    value = str(value)[:max_length]
    
    # Remove dangerous patterns
    dangerous = ['<', '>', '"', "'", '&', ';', '--', '/*', '*/']
    for char in dangerous:
        if char in value:
            raise ValueError(f'Invalid character: {char}')
    
    return value.strip()


# Utility function for safe numeric input
def sanitize_numeric(value, min_val=None, max_val=None, allow_negative=False):
    """
    Sanitize numeric input
    
    Args:
        value: Input value to sanitize
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        allow_negative: Whether to allow negative numbers
        
    Returns:
        Sanitized numeric value
        
    Raises:
        ValueError: If value is invalid
    """
    try:
        num = float(value)
        
        if not allow_negative and num < 0:
            raise ValueError('Negative values not allowed')
        
        if min_val is not None and num < min_val:
            raise ValueError(f'Value must be at least {min_val}')
        
        if max_val is not None and num > max_val:
            raise ValueError(f'Value must be at most {max_val}')
        
        return num
    except (TypeError, ValueError) as e:
        raise ValueError(f'Invalid numeric value: {e}')
