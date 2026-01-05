"""
Unit tests for GPS Service
Tests GPS data fetching, parsing, and location tracking
"""

import pytest
from unittest.mock import patch, MagicMock, Mock
import json
import base64
import zlib
from services.gps_service import GPSService


class TestGPSServiceSingleton:
    """Test GPS Service singleton pattern"""
    
    def test_singleton_instance(self):
        """Test that GPSService is a singleton"""
        service1 = GPSService()
        service2 = GPSService()
        
        assert service1 is service2


class TestMockData:
    """Test mock data generation"""
    
    def test_mock_data_generation(self):
        """Test that mock data is generated correctly"""
        service = GPSService()
        result = service._mock_data("AB-1234")
        
        assert "lat" in result
        assert "lon" in result
        assert "speed" in result
        assert "status" in result
        assert result["status"] == "Simulated"
        assert isinstance(result["lat"], float)
        assert isinstance(result["lon"], float)
    
    def test_mock_data_varies_by_plate(self):
        """Test that mock data varies based on plate number"""
        service = GPSService()
        result1 = service._mock_data("AB")  # Short plate
        result2 = service._mock_data("ABCDEFGH")  # Long plate
        
        # Latitude should vary based on plate length
        # Formula: 13.7563 + (0.01 * len(plate))
        assert result1["lat"] != result2["lat"]
        assert abs(result1["lat"] - result2["lat"]) > 0.01


class TestFetchVehicleLocation:
    """Test vehicle location fetching"""
    
    @patch('services.gps_service.GPSService._fetch_via_scraper')
    def test_fetch_vehicle_location_calls_scraper(self, mock_scraper):
        """Test that fetch_vehicle_location calls scraper"""
        # Setup
        mock_scraper.return_value = {
            "lat": 13.7563,
            "lon": 100.5018,
            "speed": 60,
            "status": "Online",
            "timestamp": "2025-01-01 10:00:00"
        }
        
        # Execute
        service = GPSService()
        result = service.fetch_vehicle_location("AB-1234")
        
        # Assert
        assert result is not None
        assert "lat" in result
        assert "lon" in result
        mock_scraper.assert_called_once_with("AB-1234")


class TestScraperWithMockData:
    """Test scraper fallback to mock data"""
    
    @patch('services.gps_service.requests.Session')
    @patch('services.gps_service.settings')
    def test_scraper_fallback_on_login_failure(self, mock_settings, mock_session_class):
        """Test that scraper falls back to mock data on login failure"""
        # Setup
        mock_settings.DTC_TOKEN = None
        mock_settings.DTC_USER = "test_user"
        mock_settings.DTC_PASS = "test_pass"
        mock_settings.DTC_API_URL = "https://test.api.com/login"
        
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        # Simulate login failure
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_session.post.return_value = mock_response
        
        # Execute
        service = GPSService()
        result = service._fetch_via_scraper("AB-1234")
        
        # Assert - should return mock data
        assert result["status"] == "Simulated"
    
    @patch('services.gps_service.requests.Session')
    @patch('services.gps_service.settings')
    def test_scraper_with_manual_token(self, mock_settings, mock_session_class):
        """Test scraper using manual token"""
        # Setup
        mock_settings.DTC_TOKEN = "manual_test_token"
        mock_settings.DTC_REALTIME_URL = "https://test.api.com/realtime"
        
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        # Simulate successful response with vehicle data
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "registration": "AB-1234",
                    "lat": 13.7563,
                    "lon": 100.5018,
                    "speed": 60,
                    "status_name": "Online"
                }
            ]
        }
        mock_session.post.return_value = mock_response
        
        # Execute
        service = GPSService()
        result = service._fetch_via_scraper("AB-1234")
        
        # Assert
        assert result["lat"] == 13.7563
        assert result["lon"] == 100.5018
        assert result["speed"] == 60


class TestDataDecompression:
    """Test GPS data decompression logic"""
    
    @patch('services.gps_service.requests.Session')
    @patch('services.gps_service.settings')
    def test_decompress_zlib_data(self, mock_settings, mock_session_class):
        """Test decompression of zlib-compressed GPS data"""
        # Setup
        mock_settings.DTC_TOKEN = "test_token"
        mock_settings.DTC_REALTIME_URL = "https://test.api.com/realtime"
        
        # Create compressed data
        vehicle_data = [{
            "registration": "AB-1234",
            "lat": 13.7563,
            "lon": 100.5018,
            "speed": 60
        }]
        json_str = json.dumps(vehicle_data)
        # Use correct compression (raw deflate)
        compressed = zlib.compress(json_str.encode('utf-8'))
        compressed_raw = compressed[2:-4]  # Remove zlib header/footer for raw deflate
        encoded = base64.b64encode(compressed_raw).decode('utf-8')
        
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": encoded}
        mock_session.post.return_value = mock_response
        
        # Execute
        service = GPSService()
        result = service._fetch_via_scraper("AB-1234")
        
        # Assert - should successfully decompress and parse
        assert result["lat"] == 13.7563
        assert result["lon"] == 100.5018


class TestVehicleMatching:
    """Test vehicle plate matching logic"""
    
    @patch('services.gps_service.requests.Session')
    @patch('services.gps_service.settings')
    def test_vehicle_matching_with_dash(self, mock_settings, mock_session_class):
        """Test that vehicle matching works with/without dashes"""
        # Setup
        mock_settings.DTC_TOKEN = "test_token"
        mock_settings.DTC_REALTIME_URL = "https://test.api.com/realtime"
        
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        # Vehicle in API has dash, search without dash
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "registration": "AB-1234",  # With dash
                    "lat": 13.7563,
                    "lon": 100.5018,
                    "speed": 60
                }
            ]
        }
        mock_session.post.return_value = mock_response
        
        # Execute - search without dash
        service = GPSService()
        result = service._fetch_via_scraper("AB1234")
        
        # Assert - should still match
        assert result["lat"] == 13.7563
    
    @patch('services.gps_service.requests.Session')
    @patch('services.gps_service.settings')
    def test_vehicle_not_found(self, mock_settings, mock_session_class):
        """Test behavior when vehicle is not found in feed"""
        # Setup
        mock_settings.DTC_TOKEN = "test_token"
        mock_settings.DTC_REALTIME_URL = "https://test.api.com/realtime"
        
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        # Return different vehicles
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {
                    "registration": "XY-9999",
                    "lat": 14.0000,
                    "lon": 101.0000,
                    "speed": 50
                }
            ]
        }
        mock_session.post.return_value = mock_response
        
        # Execute - search for non-existent vehicle
        service = GPSService()
        result = service._fetch_via_scraper("AB-1234")
        
        # Assert - should return default location with appropriate status
        assert "Vehicle Not Found" in result["status"] or result["status"] == "Simulated"


class TestSyncAllVehicles:
    """Test batch vehicle sync"""
    
    def test_sync_all_vehicles_placeholder(self):
        """Test sync_all_vehicles method exists"""
        service = GPSService()
        
        # Execute - should not raise error
        result = service.sync_all_vehicles()
        
        # Assert - currently returns None (placeholder)
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
