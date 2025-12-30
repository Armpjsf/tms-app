import requests
import zlib
import base64
import json
from utils.logger import logger
from config.settings import settings

class GPSService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GPSService, cls).__new__(cls)
            # Initialize with credentials from Config
            # self.api_url = settings.DTC_API_URL
            # self.api_user = settings.DTC_API_USER
            # self.api_pass = settings.DTC_API_PASS
        return cls._instance

    def fetch_vehicle_location(self, vehicle_plate: str):
        """
        Fetches real-time location. Tries API first, then falls back to Scraper.
        """
        # Strategy 1: Official API (Preferred)
        # if self.api_enabled: return self._fetch_via_api(vehicle_plate)
        
        # Strategy 2: Web Scraper (Unofficial)
        return self._fetch_via_scraper(vehicle_plate)

    def _fetch_via_scraper(self, vehicle_plate: str):
        """
        Attempts to login to DTC and fetch real data.
        """
        try:
            session = requests.Session()
            token = settings.DTC_TOKEN
            
            # If Manual Token is provided, skip Login!
            if token:
                logger.info("Using Manual DTC Token")
            else:
                # 1. Login (Auto)
                login_payload = {
                    "username": settings.DTC_USER,
                    "password": settings.DTC_PASS,
                    "remember": True
                }
                
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Origin": "https://gps.dtc.co.th",
                    "Referer": "https://gps.dtc.co.th/v2/login",
                    "Content-Type": "application/json"
                }

                logger.info(f"Attempting login to: {settings.DTC_API_URL} with user {settings.DTC_USER}")
                resp = session.post(settings.DTC_API_URL, json=login_payload, headers=headers, timeout=10)
                
                logger.info(f"DTC Response Code: {resp.status_code}")
                
                if resp.status_code == 200:
                    data = resp.json()
                    token = data.get("token") or data.get("data", {}).get("token")
                else:
                    logger.error(f"DTC Login Failed Details: {resp.status_code} - {resp.text[:200]}")
                    return self._mock_data(vehicle_plate)

            # 2. Fetch Data using Token
            if token:
                # Use correct headers from cURL
                headers = {
                    "Content-Type": "application/json",
                    "x-access-token": token,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                    "Referer": "https://gps.dtc.co.th/v2/main",
                    "Origin": "https://gps.dtc.co.th"
                }

                # Standard Request Payload (Compressed)
                # "data" is zlib+base64 encoded JSON parameters
                # For now using the static one captured, or we can encode {"vehicles": []} dynamically
                payload_str = "eNo9Tk0LgzAM/S85i7jLDt6mG2wg7KB3ydroisWWfoCb+N+XTrYckpfkvZesYJwkV72ghEqjmB5myTsXxZSHlHutBM2eIPsR7zYoMzP9fGlrHg9KB3JQroCzTOVvI0lToN4HDNGzoIAtuTBnYzA6E+2NFXBqGvahxdYongTlschA7BAG1N/jFkduDzto1Ts1BUcGGueRid0VEvYhWomB1/w+bR/NzUjM" 
                
                try:
                    print(f"DEBUG: Sending Request to {settings.DTC_REALTIME_URL}...")
                    resp = session.post(
                        settings.DTC_REALTIME_URL, 
                        json={"data": payload_str}, 
                        headers=headers, 
                        timeout=10
                    )
                    
                    print(f"DEBUG: Response Status: {resp.status_code}")
                    
                    if resp.status_code == 200:
                        resp_json = resp.json()
                        
                        # DEBUG: Check keys
                        print(f"DEBUG: Response Keys: {list(resp_json.keys())}")
                        
                        target_data = None
                        if "data" in resp_json:
                            target_data = resp_json["data"]
                        elif "response" in resp_json:
                            target_data = resp_json["response"]
                        
                        real_data = {}
                        if target_data:
                            if isinstance(target_data, str):
                                # Decompress Response
                                print(f"DEBUG: Target data is string (len={len(target_data)}). Decompressing...")
                                try:
                                    decoded_bytes = zlib.decompress(base64.b64decode(target_data), -15)
                                    decoded_str = decoded_bytes.decode('utf-8')
                                    real_data = json.loads(decoded_str)
                                except Exception as zlib_err:
                                    print(f"DEBUG: ZLIB Error: {zlib_err}")
                                    try:
                                        decoded_bytes = zlib.decompress(base64.b64decode(target_data))
                                        decoded_str = decoded_bytes.decode('utf-8')
                                        real_data = json.loads(decoded_str)
                                    except:
                                        print("DEBUG: Failed to decompress. Maybe it's not compressed?")
                                        real_data = {}
                            else:
                                # It's already a list or dict
                                print(f"DEBUG: Target data is {type(target_data)}. Using usage.")
                                real_data = target_data
                        else:
                             # Maybe it's not compressed?
                            print("DEBUG: 'data'/'response' field NOT found. Using raw JSON.")
                            real_data = resp_json

                        # Map Real Data to our format
                        # Expected real_data structure: {"status": 200, "data": [...list of vehicles...]} 
                        # OR just a list [...]. We handle both.
                        
                        vehicle_list = []
                        if isinstance(real_data, list):
                            vehicle_list = real_data
                        elif isinstance(real_data, dict):
                            # Check keys
                            possible_keys = ["data", "vehicles", "response", "result"]
                            raw_list = None
                            for key in possible_keys:
                                if key in real_data:
                                    raw_list = real_data[key]
                                    break
                            
                            # If the found content is a string, it might be compressed!
                            if isinstance(raw_list, str):
                                print(f"DEBUG: Inner data is string (len={len(raw_list)}). Attempting decompression...")
                                try:
                                    # Attempt 1: Raw Deflate (often used by DTC)
                                    decoded_bytes = zlib.decompress(base64.b64decode(raw_list), -15)
                                    real_data = json.loads(decoded_bytes.decode('utf-8'))
                                    vehicle_list = real_data if isinstance(real_data, list) else real_data.get("data", [])
                                except Exception as e1:
                                    print(f"DEBUG: Inner Attempt 1 (Raw) Failed: {e1}")
                                    try:
                                        # Attempt 2: Standard Zlib
                                        decoded_bytes = zlib.decompress(base64.b64decode(raw_list))
                                        real_data = json.loads(decoded_bytes.decode('utf-8'))
                                        vehicle_list = real_data if isinstance(real_data, list) else real_data.get("data", [])
                                    except Exception as e2:
                                        print(f"DEBUG: Inner Attempt 2 (Zlib) Failed: {e2}")
                                        try:
                                            # Attempt 3: Gzip (16 + 15)
                                            decoded_bytes = zlib.decompress(base64.b64decode(raw_list), 16 + zlib.MAX_WBITS)
                                            real_data = json.loads(decoded_bytes.decode('utf-8'))
                                            vehicle_list = real_data if isinstance(real_data, list) else real_data.get("data", [])
                                        except Exception as e3:
                                            print(f"DEBUG: Inner Attempt 3 (Gzip) Failed: {e3}")
                                            # Final Fallback: Maybe it's just Base64 JSON?
                                            try:
                                                decoded_bytes = base64.b64decode(raw_list)
                                                real_data = json.loads(decoded_bytes.decode('utf-8'))
                                                vehicle_list = real_data if isinstance(real_data, list) else real_data.get("data", [])
                                                print("DEBUG: Inner Attempt 4 (Base64 only) Success!")
                                            except:
                                                pass

                            elif isinstance(raw_list, list):
                                vehicle_list = raw_list
                        
                        print(f"DEBUG: Found {len(vehicle_list)} vehicles in list.")
                        if vehicle_list:
                            v = vehicle_list[0]
                            # Log ID and Plate safely
                            v_id = v.get('vehicleId') or v.get('id') or v.get('truck_id')
                            v_reg = v.get('registration') or v.get('plate') or v.get('truck_license')
                            print(f"DEBUG: Sample ID: {v_id} | Plate: {v_reg}")

                        found_vehicle = None
                            
                        # 1. Try to find matching vehicle
                        for v in vehicle_list:
                            # Check multiple possible keys for Plate Number based on standard API patterns
                            v_plate = str(v.get("registration", "") or v.get("plate", "") or v.get("truck_license", "") or v.get("truck_name", ""))
                            v_id = str(v.get("id", "") or v.get("vehicleId", "") or v.get("truck_id", ""))
                            
                            # Normalize
                            search_plate = vehicle_plate.replace("-", "").strip()
                            v_plate_norm = v_plate.replace("-", "").strip()
                            
                            if search_plate in v_plate_norm or search_plate in v_id:
                                found_vehicle = v
                                break
                        
                        if found_vehicle:
                            print(f"DEBUG: MATCH FOUND for {vehicle_plate}!")
                            
                            # Extract data using the discovered keys
                            lat = float(found_vehicle.get("lat") or found_vehicle.get("latitude") or found_vehicle.get("r_lat") or 13.7800)
                            lon = float(found_vehicle.get("lon") or found_vehicle.get("longitude") or found_vehicle.get("r_lon") or 100.5500)
                            speed = int(found_vehicle.get("speed") or found_vehicle.get("r_speed") or 0)
                            
                            status_text = found_vehicle.get("status_name") or found_vehicle.get("status") or "Online"
                            timestamp = found_vehicle.get("r_time") or found_vehicle.get("timestamp") or "Live"
                            
                            return {
                                "lat": lat,
                                "lon": lon,
                                "speed": speed,
                                "status": f"{status_text} ({speed} km/h)",
                                "timestamp": timestamp
                            }
                        else:
                            print(f"DEBUG: No match for {vehicle_plate}. Available: {[v.get('truck_license') for v in vehicle_list[:3]]}...")
                            return {
                                "lat": 13.7800, 
                                "lon": 100.5500, 
                                "speed": 0,
                                "status": f"Connected (Vehicle Not Found in Feed)", 
                                "timestamp": "Live"
                            }
                    else:
                        print(f"DEBUG: Request Failed {resp.text}")
                            
                except Exception as e:
                    print(f"DEBUG: EXCEPTION {e}")
                    logger.error(f"DTC Protocol Error: {e}")

                # Fallback
                return {
                    "lat": 13.7800, 
                    "lon": 100.5500, 
                    "speed": 60,
                    "status": "Connected (API Error)", 
                    "timestamp": "Live"
                }
            
            return self._mock_data(vehicle_plate)
                
        except Exception as e:
            logger.error(f"DTC Scrape CRITICAL Error: {e}")
            return self._mock_data(vehicle_plate)

    def _mock_data(self, plate):
        return {
            "lat": 13.7563 + (0.01 * len(plate)), 
            "lon": 100.5018, 
            "speed": 60,
            "status": "Simulated",
            "timestamp": "Mock"
        }

    def sync_all_vehicles(self):
        """
        Batch sync all vehicles to update Master_Drivers table.
        """
        pass

gps_service = GPSService()
