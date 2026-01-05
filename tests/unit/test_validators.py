"""
Unit tests for Input Validators
Tests Pydantic validation models
"""

import pytest
from pydantic import ValidationError
from datetime import date, timedelta
from services.validators import (
    JobCreateRequest,
    DriverCreateRequest,
    CustomerCreateRequest,
    FuelLogRequest,
    PasswordChangeRequest,
    sanitize_input,
    sanitize_numeric
)


class TestJobCreateRequest:
    """Test job creation validation"""
    
    def test_valid_job_creation(self):
        """Test valid job creation"""
        job = JobCreateRequest(
            customer_name="Test Company",
            plan_date=date.today() + timedelta(days=1),
            route_name="BKK-CNX"
        )
        
        assert job.customer_name == "Test Company"
        assert job.route_name == "BKK-CNX"
    
    def test_customer_name_too_short(self):
        """Test validation fails for short customer name"""
        with pytest.raises(ValidationError):
            JobCreateRequest(
                customer_name="A",  # Too short
                plan_date=date.today() + timedelta(days=1)
            )
    
    def test_plan_date_in_past(self):
        """Test validation fails for past date"""
        with pytest.raises(ValidationError) as exc_info:
            JobCreateRequest(
                customer_name="Test Company",
                plan_date=date.today() - timedelta(days=1)  # Past date
            )
        
        assert "past" in str(exc_info.value).lower()
    
    def test_dangerous_characters_rejected(self):
        """Test that dangerous characters are rejected"""
        dangerous_inputs = [
            "Test<script>alert('xss')</script>",
            "Test'; DROP TABLE Jobs--",
            "Test/*comment*/",
            "Test&nbsp;Company"
        ]
        
        for dangerous in dangerous_inputs:
            with pytest.raises(ValidationError):
                JobCreateRequest(
                    customer_name=dangerous,
                    plan_date=date.today() + timedelta(days=1)
                )


class TestDriverCreateRequest:
    """Test driver creation validation"""
    
    def test_valid_driver_creation(self):
        """Test valid driver creation"""
        driver = DriverCreateRequest(
            driver_name="John Doe",
            mobile_no="0812345678",
            vehicle_plate="AB-1234"
        )
        
        assert driver.driver_name == "John Doe"
        assert driver.mobile_no == "0812345678"
        assert driver.vehicle_plate == "AB-1234"
    
    def test_invalid_phone_number(self):
        """Test validation fails for invalid phone"""
        with pytest.raises(ValidationError):
            DriverCreateRequest(
                driver_name="John Doe",
                mobile_no="123",  # Too short
                vehicle_plate="AB-1234"
            )
    
    def test_invalid_vehicle_plate(self):
        """Test validation fails for invalid plate"""
        with pytest.raises(ValidationError):
            DriverCreateRequest(
                driver_name="John Doe",
                mobile_no="0812345678",
                vehicle_plate="INVALID"  # Wrong format
            )
    
    def test_phone_number_formatting(self):
        """Test phone number accepts various formats"""
        valid_phones = ["0812345678", "081-234-5678", "081 234 5678"]
        
        for phone in valid_phones:
            driver = DriverCreateRequest(
                driver_name="John Doe",
                mobile_no=phone,
                vehicle_plate="AB-1234"
            )
            # Should normalize to digits only
            assert driver.mobile_no.replace('-', '').replace(' ', '').isdigit()


class TestCustomerCreateRequest:
    """Test customer creation validation"""
    
    def test_valid_customer_creation(self):
        """Test valid customer creation"""
        customer = CustomerCreateRequest(
            customer_name="Big Company Ltd",
            contact_person="Jane Doe",
            phone="021234567",
            email="contact@example.com"
        )
        
        assert customer.customer_name == "Big Company Ltd"
        assert customer.email == "contact@example.com"
    
    def test_invalid_email(self):
        """Test validation fails for invalid email"""
        with pytest.raises(ValidationError):
            CustomerCreateRequest(
                customer_name="Big Company Ltd",
                email="invalid-email"  # No @ or domain
            )
    
    def test_email_normalization(self):
        """Test email is normalized to lowercase"""
        customer = CustomerCreateRequest(
            customer_name="Big Company Ltd",
            email="Contact@EXAMPLE.COM"
        )
        
        assert customer.email == "contact@example.com"


class TestFuelLogRequest:
    """Test fuel log validation"""
    
    def test_valid_fuel_log(self):
        """Test valid fuel log creation"""
        fuel = FuelLogRequest(
            driver_id="DRV-001",
            vehicle_plate="AB-1234",
            liters=50.5,
            price_total=2020.0,
            odometer=50000
        )
        
        assert fuel.liters == 50.5
        assert fuel.price_total == 2020.0
    
    def test_negative_liters_rejected(self):
        """Test validation fails for negative liters"""
        with pytest.raises(ValidationError):
            FuelLogRequest(
                driver_id="DRV-001",
                vehicle_plate="AB-1234",
                liters=-10,  # Negative
                price_total=400.0
            )
    
    def test_excessive_liters_rejected(self):
        """Test validation fails for unrealistic liters"""
        with pytest.raises(ValidationError):
            FuelLogRequest(
                driver_id="DRV-001",
                vehicle_plate="AB-1234",
                liters=2000,  # More than 1000 liters
                price_total=80000.0
            )


class TestPasswordChangeRequest:
    """Test password change validation"""
    
    def test_valid_password_change(self):
        """Test valid password change"""
        pwd = PasswordChangeRequest(
            current_password="oldpass123",
            new_password="newpass123",
            confirm_password="newpass123"
        )
        
        assert pwd.validate_passwords_match() == True
    
    def test_password_too_short(self):
        """Test validation fails for short password"""
        with pytest.raises(ValidationError):
            PasswordChangeRequest(
                current_password="old",
                new_password="short",  # Less than 8 chars
                confirm_password="short"
            )
    
    def test_password_no_number(self):
        """Test validation fails for password without number"""
        with pytest.raises(ValidationError):
            PasswordChangeRequest(
                current_password="oldpass123",
                new_password="newpassword",  # No number
                confirm_password="newpassword"
            )
    
    def test_password_no_letter(self):
        """Test validation fails for password without letter"""
        with pytest.raises(ValidationError):
            PasswordChangeRequest(
                current_password="oldpass123",
                new_password="12345678",  # No letter
                confirm_password="12345678"
            )
    
    def test_passwords_dont_match(self):
        """Test validation fails when passwords don't match"""
        pwd = PasswordChangeRequest(
            current_password="oldpass123",
            new_password="newpass123",
            confirm_password="different123"
        )
        
        with pytest.raises(ValueError):
            pwd.validate_passwords_match()


class TestSanitizeInput:
    """Test input sanitization utilities"""
    
    def test_sanitize_input_normal(self):
        """Test sanitization of normal input"""
        result = sanitize_input("Hello World")
        assert result == "Hello World"
    
    def test_sanitize_input_dangerous_chars(self):
        """Test sanitization rejects dangerous characters"""
        dangerous = ["<script>", "'; DROP TABLE", "/**/", "&nbsp;"]
        
        for dangerous_input in dangerous:
            with pytest.raises(ValueError):
                sanitize_input(dangerous_input)
    
    def test_sanitize_input_max_length(self):
        """Test sanitization truncates to max length"""
        long_input = "A" * 500
        result = sanitize_input(long_input, max_length=100)
        assert len(result) == 100
    
    def test_sanitize_numeric_valid(self):
        """Test numeric sanitization with valid input"""
        result = sanitize_numeric(42.5, min_val=0, max_val=100)
        assert result == 42.5
    
    def test_sanitize_numeric_out_of_range(self):
        """Test numeric sanitization rejects out of range"""
        with pytest.raises(ValueError):
            sanitize_numeric(150, min_val=0, max_val=100)
    
    def test_sanitize_numeric_negative_not_allowed(self):
        """Test numeric sanitization rejects negative when not allowed"""
        with pytest.raises(ValueError):
            sanitize_numeric(-10, allow_negative=False)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
