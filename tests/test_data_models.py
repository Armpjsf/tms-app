
import pytest
from data.models import JobModel, DriverModel, FuelLogModel

def test_job_model_safe_float():
    # Test safe float conversion (handling commas)
    job = JobModel(
        Job_ID="JOB-001",
        Price_Cust_Total="1,500.50",
        Cost_Driver_Total="1,000"
    )
    assert job.Price_Cust_Total == 1500.50
    assert job.Cost_Driver_Total == 1000.0

def test_job_model_defaults():
    job = JobModel(Job_ID="JOB-002")
    assert job.Job_Status == "New"
    assert job.Price_Cust_Total == 0.0

def test_fuel_log_conversion():
    log = FuelLogModel(
        Log_ID="FL-001",
        Liters="50.5",
        Price_Total="1,500"
    )
    assert log.Liters == 50.5
    assert log.Price_Total == 1500.0
