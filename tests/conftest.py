"""
Pytest configuration and shared fixtures
"""

import pytest
from unittest.mock import MagicMock, Mock
import pandas as pd
from datetime import date, datetime


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock = MagicMock()
    
    # Mock table operations
    mock.table.return_value.select.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = [{"id": 1}]
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": 1}]
    mock.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    
    return mock


@pytest.fixture
def mock_repo():
    """Mock repository for testing"""
    mock = MagicMock()
    
    # Mock get_data to return empty DataFrame
    mock.get_data.return_value = pd.DataFrame()
    mock.update_data.return_value = True
    mock.insert_data.return_value = True
    
    return mock


@pytest.fixture
def sample_user():
    """Sample user data for testing"""
    return {
        "Username": "testuser",
        "Password": "$argon2id$v=19$m=65536,t=2,p=4$test",  # Hashed password
        "Name": "Test User",
        "Role": "ADMIN",
        "Branch_ID": "HEAD",
        "Active_Status": "Active"
    }


@pytest.fixture
def sample_job():
    """Sample job data for testing"""
    return {
        "Job_ID": "TEST-001",
        "Customer_Name": "Test Customer",
        "Plan_Date": "2025-01-15",
        "Job_Status": "New",
        "Driver_Name": "Test Driver",
        "Vehicle_Plate": "AB-1234",
        "Price_Cust_Total": 5000.0,
        "Cost_Driver_Total": 3000.0
    }


@pytest.fixture
def sample_driver():
    """Sample driver data for testing"""
    return {
        "Driver_ID": "DRV-001",
        "Driver_Name": "Test Driver",
        "Mobile_No": "0812345678",
        "Vehicle_Plate": "AB-1234",
        "Active_Status": "Active"
    }


@pytest.fixture
def sample_fuel_log():
    """Sample fuel log data for testing"""
    return {
        "Log_ID": "FUEL-001",
        "Date_Time": datetime.now().isoformat(),
        "Driver_ID": "DRV-001",
        "Vehicle_Plate": "AB-1234",
        "Liters": 50.0,
        "Price_Total": 2000.0,
        "Odometer": 50000
    }


@pytest.fixture
def sample_customer():
    """Sample customer data for testing"""
    return {
        "Customer_ID": "CUST-001",
        "Customer_Name": "Test Company Ltd",
        "Contact_Person": "John Doe",
        "Phone": "021234567",
        "Email": "test@example.com",
        "Branch_ID": "HEAD"
    }


# Configure pytest
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
