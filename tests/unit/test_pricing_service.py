"""
Unit tests for Pricing Service
Tests driver cost calculations
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from services.pricing_service import PricingService


class TestPricingService:
    """Test pricing service functionality"""
    
    @patch('data.repository.repo')
    def test_calculate_driver_cost_basic(self, mock_repo):
        """Test basic driver cost calculation"""
        # Setup
        rate_card_df = pd.DataFrame([
            {"ระยะทาง (กม.)": 100, "4W_27": 2000, "6W_27": 3000, "10W_27": 4000}
        ])
        config_df = pd.DataFrame([
            {"Key": "fuel_diesel_price", "Value": "30.00"},
            {"Key": "fuel_4w", "Value": "11.5"}
        ])
        
        mock_repo.get_data.side_effect = [rate_card_df, config_df]
        
        # Execute
        cost = PricingService.calculate_driver_cost(
            plan_date="2025-01-01",
            distance=100,
            vehicle_type="4W",
            current_diesel_price=30.00
        )
        
        # Assert
        assert cost > 0
        assert isinstance(cost, float)
    
    @patch('data.repository.repo')
    def test_calculate_driver_cost_with_drops(self, mock_repo):
        """Test cost calculation with multiple drops"""
        # Setup
        rate_card_df = pd.DataFrame([
            {"ระยะทาง (กม.)": 50, "4W_27": 1500}
        ])
        config_df = pd.DataFrame([
            {"Key": "cost_labor_per_drop", "Value": "50.00"}
        ])
        
        mock_repo.get_data.side_effect = [rate_card_df, config_df]
        
        # Execute
        cost = PricingService.calculate_driver_cost(
            plan_date="2025-01-01",
            distance=50,
            vehicle_type="4W",
            total_drops=3  # 3 delivery points
        )
        
        # Assert
        assert cost > 0
    
    @patch('data.repository.repo')
    def test_get_config_value(self, mock_repo):
        """Test getting configuration value"""
        # Setup
        config_df = pd.DataFrame([
            {"Key": "fuel_diesel_price", "Value": "32.50"}
        ])
        mock_repo.get_data.return_value = config_df
        
        # Execute
        value = PricingService.get_config_value("fuel_diesel_price", 30.00)
        
        # Assert
        assert value == 32.50
    
    @patch('data.repository.repo')
    def test_get_config_value_default(self, mock_repo):
        """Test getting default value when key not found"""
        # Setup
        mock_repo.get_data.return_value = pd.DataFrame()
        
        # Execute
        value = PricingService.get_config_value("nonexistent_key", 100.00)
        
        # Assert
        assert value == 100.00


class TestPricingValidation:
    """Test pricing input validation"""
    
    def test_validate_positive_distance(self):
        """Test that distance must be positive"""
        from services.validators import sanitize_numeric
        
        # Valid distance
        distance = sanitize_numeric(100, min_val=0, max_val=10000)
        assert distance == 100
        
        # Negative distance
        with pytest.raises(ValueError):
            sanitize_numeric(-10, min_val=0, allow_negative=False)
    
    def test_validate_price_range(self):
        """Test price validation"""
        from services.validators import sanitize_numeric
        
        # Valid price
        price = sanitize_numeric(5000, min_val=0, max_val=1000000)
        assert price == 5000
        
        # Excessive price
        with pytest.raises(ValueError):
            sanitize_numeric(2000000, min_val=0, max_val=1000000)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
