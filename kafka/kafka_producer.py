from kafka import KafkaProducer
import json
import time
import random
from datetime import datetime, timedelta
from collections import deque
import argparse
import hashlib
# Add this to your imports
from collections import deque

# Kafka configuration will be set in the main function

# Kafka topics
HOUSEHOLD_TOPIC = 'smart-meter-readings-v2'
AGGREGATE_TOPIC = 'aggregate-consumption-v2'

# Mock data configuration - based on London dataset structure
NUM_HOUSEHOLDS = 100  # Number of households to simulate
ACORN_GROUPS = {
    "Affluent Achievers": ["Lavish Lifestyles", "Executive Wealth", "Mature Money"],
    "Rising Prosperity": ["City Sophisticates", "Career Climbers"],
    "Comfortable Communities": ["Countryside Communities", "Successful Suburbs", "Steady Neighborhoods"],
    "Financially Stretched": ["Modest Means", "Striving Families", "Poorer Pensioners"],
    "Urban Adversity": ["Young Hardship", "Struggling Estates", "Difficult Circumstances"]
}

# Map Standard/ToU pricing to ACORN groups with realistic distribution
TARIFF_DISTRIBUTION = {
    "Affluent Achievers": {"Standard": 0.6, "ToU": 0.4},
    "Rising Prosperity": {"Standard": 0.5, "ToU": 0.5},
    "Comfortable Communities": {"Standard": 0.7, "ToU": 0.3},
    "Financially Stretched": {"Standard": 0.85, "ToU": 0.15},
    "Urban Adversity": {"Standard": 0.9, "ToU": 0.1}
}

# Realistic hourly consumption patterns (kWh) based on time of day
HOURLY_PATTERNS = {
    # Morning peak (7-9 AM)
    "morning_peak": [0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.7, 1.2, 0.9, 0.5, 0.4, 0.4, 
                     0.5, 0.4, 0.3, 0.4, 0.6, 0.8, 1.1, 0.9, 0.7, 0.5, 0.3, 0.2],
    # Evening peak (5-8 PM)
    "evening_peak": [0.2, 0.15, 0.1, 0.1, 0.15, 0.3, 0.6, 0.8, 0.5, 0.4, 0.4, 0.5, 
                     0.6, 0.5, 0.5, 0.6, 1.0, 1.3, 1.5, 1.2, 0.8, 0.6, 0.4, 0.3],
    # Work from home (flatter curve)
    "work_from_home": [0.2, 0.15, 0.1, 0.1, 0.2, 0.4, 0.6, 0.7, 0.7, 0.6, 0.6, 0.7, 
                       0.7, 0.6, 0.6, 0.7, 0.8, 0.9, 1.0, 0.8, 0.6, 0.5, 0.4, 0.2]
}

# Simulated appliance usage patterns (percentage of total consumption)
APPLIANCE_PATTERNS = {
    "Lighting": {
        "morning": [0.15, 0.15, 0.10, 0.05, 0.05, 0.10, 0.15, 0.10, 0.05, 0.05, 0.05, 0.05,
                    0.05, 0.05, 0.05, 0.05, 0.05, 0.10, 0.15, 0.20, 0.20, 0.20, 0.18, 0.15],
        "evening": [0.15, 0.15, 0.10, 0.05, 0.05, 0.10, 0.15, 0.10, 0.05, 0.05, 0.05, 0.05,
                    0.05, 0.05, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.25, 0.20, 0.18, 0.15]
    },
    "Heating/Cooling": {
        "morning": [0.30, 0.30, 0.30, 0.30, 0.40, 0.40, 0.40, 0.30, 0.20, 0.20, 0.20, 0.20,
                    0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30],
        "evening": [0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.20, 0.20, 0.20, 0.20,
                    0.20, 0.20, 0.20, 0.30, 0.40, 0.40, 0.40, 0.40, 0.40, 0.30, 0.30, 0.30]
    },
    "Kitchen": {
        "morning": [0.05, 0.05, 0.05, 0.05, 0.05, 0.15, 0.25, 0.30, 0.20, 0.10, 0.10, 0.15,
                    0.25, 0.15, 0.05, 0.05, 0.15, 0.25, 0.30, 0.20, 0.10, 0.10, 0.05, 0.05],
        "evening": [0.05, 0.05, 0.05, 0.05, 0.05, 0.10, 0.15, 0.25, 0.15, 0.10, 0.10, 0.15,
                    0.20, 0.10, 0.10, 0.15, 0.25, 0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0.05]
    },
    "Entertainment": {
        "morning": [0.05, 0.02, 0.02, 0.02, 0.02, 0.05, 0.05, 0.10, 0.15, 0.10, 0.10, 0.10,
                    0.10, 0.10, 0.15, 0.20, 0.20, 0.15, 0.10, 0.10, 0.15, 0.20, 0.22, 0.15],
        "evening": [0.05, 0.02, 0.02, 0.02, 0.02, 0.05, 0.05, 0.10, 0.15, 0.10, 0.10, 0.10,
                    0.10, 0.15, 0.15, 0.15, 0.10, 0.05, 0.05, 0.05, 0.10, 0.20, 0.25, 0.20]
    },
    "Other": {
        "morning": [0.45, 0.48, 0.53, 0.58, 0.48, 0.30, 0.15, 0.10, 0.35, 0.55, 0.55, 0.50,
                    0.40, 0.50, 0.55, 0.50, 0.40, 0.30, 0.15, 0.20, 0.25, 0.20, 0.25, 0.35],
        "evening": [0.45, 0.48, 0.53, 0.58, 0.58, 0.45, 0.35, 0.25, 0.45, 0.55, 0.55, 0.50,
                    0.45, 0.50, 0.50, 0.35, 0.15, 0.10, 0.10, 0.10, 0.10, 0.20, 0.22, 0.30]
    }
}

# Weather data for London
WEATHER_CONDITIONS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain"]
SEASONAL_TEMPS = {
    # Month: (min_temp, max_temp)
    1: (0, 8),    # January
    2: (1, 9),    # February
    3: (3, 12),   # March
    4: (5, 15),   # April
    5: (8, 18),   # May
    6: (11, 21),  # June
    7: (13, 23),  # July
    8: (13, 23),  # August
    9: (11, 20),  # September
    10: (8, 16),  # October
    11: (4, 12),  # November
    12: (2, 9)    # December
}



class SmartMeterDataGenerator:
    def __init__(self):
        # Generate household metadata
        self.households = self._generate_households()
        self.current_datetime = datetime.now().replace(second=0, microsecond=0)
        # Initialize with current time rounded to nearest 30 minutes
        minutes = self.current_datetime.minute
        self.current_datetime = self.current_datetime.replace(
            minute=0 if minutes < 30 else 30)
        
        self.weather = self._get_current_weather()
        
        # For storing historical data
        self.hourly_data = deque(maxlen=48)  # Store 48 half-hourly points (24 hours)
        self.daily_aggregates = {}  # Store daily aggregates by date
        
        # Initialize with some historical data
        self._initialize_historical_data()
    # Modify the _generate_data_for_time method to add primary keys
        # Add this to the SmartMeterDataGenerator class
    def _generate_primary_key(self, household_id, timestamp):
        """Generate a unique primary key for a reading"""
        # Create a string combining household_id and timestamp
        key_string = f"{household_id}_{timestamp}"
        # Create a hash of this string for a more compact key
        # Using MD5 for speed, but you could use SHA-256 for more security
        return hashlib.md5(key_string.encode()).hexdigest()


    
    def _generate_households(self):
        """Generate mock household data similar to the London dataset"""
        households = []
        
        for i in range(NUM_HOUSEHOLDS):
            # Assign each household to an ACORN group (with weighted distribution)
            acorn_weights = [0.25, 0.15, 0.3, 0.2, 0.1]  # Realistic distribution
            acorn_group = random.choices(list(ACORN_GROUPS.keys()), weights=acorn_weights)[0]
            
            # Assign specific ACORN category within the group
            acorn_category = random.choice(ACORN_GROUPS[acorn_group])
            
            # Assign a consumption pattern (with realistic distribution)
            pattern_weights = [0.4, 0.4, 0.2]  # evening, morning, WFH
            consumption_pattern = random.choices(
                ["evening_peak", "morning_peak", "work_from_home"], 
                weights=pattern_weights
            )[0]
            
            # Base consumption multiplier (varies by ACORN group)
            if acorn_group == "Affluent Achievers":
                base_multiplier = random.uniform(1.2, 1.8)
            elif acorn_group == "Urban Adversity":
                base_multiplier = random.uniform(0.7, 1.0)
            else:
                base_multiplier = random.uniform(0.8, 1.3)
                
            # Assign tariff based on ACORN group probability
            tariff_probs = TARIFF_DISTRIBUTION[acorn_group]
            tariff = random.choices(
                list(tariff_probs.keys()),
                weights=list(tariff_probs.values())
            )[0]
            
            # Create household object
            households.append({
                "household_id": f"LCL-{i:04d}",
                "acorn_group": acorn_group,
                "acorn_category": acorn_category,
                "consumption_pattern": consumption_pattern,
                "base_multiplier": base_multiplier,
                "has_ev": random.random() < 0.15,  # 15% have EVs
                "has_solar": random.random() < 0.08,  # 8% have solar
                "tariff": tariff
            })
            
        return households
    
    def _initialize_historical_data(self):
        """Initialize historical data for the past 24 hours"""
        # Start from 24 hours ago
        start_time = self.current_datetime - timedelta(hours=24)
        
        # Generate data for each 30-minute interval
        for i in range(48):  # 48 half-hour intervals in 24 hours
            sim_time = start_time + timedelta(minutes=30 * i)
            
            # Save current datetime temporarily
            current_temp = self.current_datetime
            self.current_datetime = sim_time
            
            # Generate data for this time point
            data_batch = self._generate_data_for_time()
            
            # Add to historical data
            self.hourly_data.append(data_batch["aggregate_data"])
            
            # Track daily aggregates
            date_key = sim_time.strftime("%Y-%m-%d")
            if date_key not in self.daily_aggregates:
                self.daily_aggregates[date_key] = {
                    "total_consumption_kwh": 0,
                    "readings_count": 0,
                    "peak_demand_kwh": 0,
                    "peak_time": None
                }
            
            # Update daily aggregate
            self.daily_aggregates[date_key]["total_consumption_kwh"] += data_batch["aggregate_data"]["total_consumption_kwh"]
            self.daily_aggregates[date_key]["readings_count"] += 1
            
            # Check if this is a new peak
            if data_batch["aggregate_data"]["total_consumption_kwh"] > self.daily_aggregates[date_key]["peak_demand_kwh"]:
                self.daily_aggregates[date_key]["peak_demand_kwh"] = data_batch["aggregate_data"]["total_consumption_kwh"]
                self.daily_aggregates[date_key]["peak_time"] = sim_time.strftime("%H:%M")
            
            # Restore current datetime
            self.current_datetime = current_temp
    
    def _get_current_weather(self):
        """Generate realistic weather data based on current date/time"""
        current_month = self.current_datetime.month
        min_temp, max_temp = SEASONAL_TEMPS[current_month]
        
        # Time of day temperature adjustment
        hour = self.current_datetime.hour
        if 6 <= hour <= 14:  # Morning to afternoon - warming
            temp_factor = 0.7
        elif 15 <= hour <= 19:  # Afternoon to evening - cooling
            temp_factor = 0.5
        else:  # Night - coolest
            temp_factor = 0.2
            
        # Calculate temperature with some randomness
        temperature = min_temp + (max_temp - min_temp) * temp_factor
        temperature += random.uniform(-2, 2)  # Add some random variation
        
        # Weighted weather condition based on temperature
        if temperature < 5:
            condition_weights = [0.2, 0.3, 0.3, 0.15, 0.05]
        elif temperature > 18:
            condition_weights = [0.5, 0.3, 0.1, 0.1, 0.0]
        else:
            condition_weights = [0.3, 0.3, 0.2, 0.15, 0.05]
            
        condition = random.choices(WEATHER_CONDITIONS, weights=condition_weights)[0]
        
        return {
            "temperature": round(temperature, 1),
            "condition": condition,
            "humidity": random.randint(60, 90),
            "wind_speed": random.uniform(0, 15)
        }
    
    def _calculate_household_consumption(self, household):
        """Calculate realistic consumption for a household at current time"""
        hour = self.current_datetime.hour
        base_pattern = HOURLY_PATTERNS[household["consumption_pattern"]]
        base_value = base_pattern[hour] * household["base_multiplier"]
        
        # Adjust for day of week (weekends different from weekdays)
        weekday = self.current_datetime.weekday()
        is_weekend = weekday >= 5
        if is_weekend:
            if hour < 9:  # People sleep in on weekends
                base_value *= 0.7
            elif 9 <= hour <= 18:  # More home activity during day
                base_value *= 1.2
        
        # Weather effects
        temperature = self.weather["temperature"]
        # Heating effect (more energy when cold)
        if temperature < 10:
            temp_factor = 1 + (10 - temperature) * 0.03
        # Cooling effect (more energy when hot)
        elif temperature > 20:
            temp_factor = 1 + (temperature - 20) * 0.05
        else:
            temp_factor = 1.0
            
        # Add random variation (±10%)
        random_factor = random.uniform(0.9, 1.1)
        
        # EV charging effect (significant increase in evening for EV owners)
        ev_factor = 1.0
        if household["has_ev"] and (19 <= hour <= 23) and random.random() < 0.7:
            ev_factor = random.uniform(1.5, 2.5)
            
        # Solar generation offset (reduces consumption during daylight)
        solar_factor = 1.0
        if household["has_solar"] and (9 <= hour <= 16) and self.weather["condition"] in ["Clear", "Partly Cloudy"]:
            solar_reduction = random.uniform(0.3, 0.7)  # Solar reduces consumption by 30-70%
            solar_factor = 1.0 - solar_reduction
            
        # Calculate final consumption
        consumption = base_value * temp_factor * random_factor * ev_factor * solar_factor
        
        # Add occasional anomalies (5% chance)
        is_anomaly = random.random() < 0.05
        anomaly_type = None
        
        if is_anomaly:
            anomaly_choice = random.random()
            if anomaly_choice < 0.25:  # Power outage or meter error
                anomaly_factor = 0.0
                anomaly_type = "Zero Consumption"
            elif anomaly_choice < 0.5:  # Partial outage or reduced usage
                anomaly_factor = 0.3
                anomaly_type = "Abnormally Low"
            elif anomaly_choice < 0.75:  # Unusual high usage
                anomaly_factor = 2.0
                anomaly_type = "Unusually High"
            else:  # Extreme high usage or meter error
                anomaly_factor = 3.0
                anomaly_type = "Extremely High"
                
            consumption *= anomaly_factor
            
        # Calculate appliance breakdown
        appliance_breakdown = self._calculate_appliance_breakdown(
            household, hour, consumption, ev_factor, solar_factor
        )
            
        return {
            "value": round(max(0, consumption), 3),
            "is_anomaly": is_anomaly,
            "anomaly_type": anomaly_type if is_anomaly else None,
            "appliance_breakdown": appliance_breakdown
        }
    
    def _calculate_appliance_breakdown(self, household, hour, total_consumption, ev_factor, solar_factor):
        """Calculate simulated appliance breakdown based on household characteristics"""
        # Select appropriate pattern based on household type
        pattern_key = "morning" if household["consumption_pattern"] == "morning_peak" else "evening"
        
        # Get base percentages for this hour
        lighting_pct = APPLIANCE_PATTERNS["Lighting"][pattern_key][hour]
        heating_pct = APPLIANCE_PATTERNS["Heating/Cooling"][pattern_key][hour]
        kitchen_pct = APPLIANCE_PATTERNS["Kitchen"][pattern_key][hour]
        entertainment_pct = APPLIANCE_PATTERNS["Entertainment"][pattern_key][hour]
        other_pct = APPLIANCE_PATTERNS["Other"][pattern_key][hour]
        
        # Adjust based on ACORN group
        if household["acorn_group"] == "Affluent Achievers":
            entertainment_pct *= 1.3  # More gadgets
            kitchen_pct *= 1.2        # More advanced kitchen appliances
        elif household["acorn_group"] == "Urban Adversity":
            heating_pct *= 1.2        # Less efficient heating
            entertainment_pct *= 0.8  # Fewer entertainment devices
        
        # EV component (if applicable)
        ev_consumption = 0
        if household["has_ev"] and ev_factor > 1.0:
            ev_consumption = total_consumption * (1 - 1/ev_factor)
            # Add this check to prevent division by zero
            if total_consumption > 0:  # Ensure we don't divide by zero
                reduction_factor = 1 - (ev_consumption / total_consumption)
                lighting_pct *= reduction_factor
                heating_pct *= reduction_factor
                kitchen_pct *= reduction_factor
                entertainment_pct *= reduction_factor
                other_pct *= reduction_factor
            else:
                # Handle the zero consumption case
                ev_consumption = 0
        
        # Calculate actual values
        result = {
            "Lighting": round(total_consumption * lighting_pct, 3),
            "Heating/Cooling": round(total_consumption * heating_pct, 3),
            "Kitchen": round(total_consumption * kitchen_pct, 3),
            "Entertainment": round(total_consumption * entertainment_pct, 3),
            "Other": round(total_consumption * other_pct, 3)
        }
        
        # Add EV if applicable
        if household["has_ev"] and ev_factor > 1.0:
            result["EV Charging"] = round(ev_consumption, 3)
        
        # Add solar production as negative consumption if applicable
        if household["has_solar"] and solar_factor < 1.0:
            solar_production = total_consumption * (1 - solar_factor) / solar_factor
            result["Solar Production"] = -round(solar_production, 3)
        
        return result
    
    def _generate_data_for_time(self):
        """Generate readings for all households at the current datetime"""
        # Update weather data
        self.weather = self._get_current_weather()
        
        # Generate readings for all households
        readings = []
        total_consumption = 0
        anomaly_count = 0
        appliance_totals = {
            "Lighting": 0,
            "Heating/Cooling": 0,
            "Kitchen": 0,
            "Entertainment": 0,
            "Other": 0,
            "EV Charging": 0,
            "Solar Production": 0
        }
        
        # Format timestamp once for all readings in this batch
        timestamp_iso = self.current_datetime.isoformat()
        
        for household in self.households:
            # Calculate consumption
            consumption_data = self._calculate_household_consumption(household)
            
            # Add to total
            total_consumption += consumption_data["value"]
            if consumption_data["is_anomaly"]:
                anomaly_count += 1
            
            # Add to appliance totals
            for appliance, value in consumption_data["appliance_breakdown"].items():
                appliance_totals[appliance] = appliance_totals.get(appliance, 0) + value
            
            # Generate primary key
            primary_key = self._generate_primary_key(household["household_id"], timestamp_iso)
            
            # Create reading record with primary key
            reading = {
                "id": primary_key,  # Add primary key as id
                "datetime": timestamp_iso,
                "household_id": household["household_id"],
                "acorn_group": household["acorn_group"],
                "acorn_category": household["acorn_category"],
                "consumption_kwh": consumption_data["value"],
                "is_anomaly": consumption_data["is_anomaly"],
                "anomaly_type": consumption_data["anomaly_type"],
                "tariff": household["tariff"],
                "has_ev": household["has_ev"],
                "has_solar": household["has_solar"],
                "appliance_breakdown": consumption_data["appliance_breakdown"]
            }
            
            readings.append(reading)
        
        # Also add a unique ID to the aggregate record
        aggregate_primary_key = self._generate_primary_key("aggregate", timestamp_iso)
        
        # Clean up appliance totals to remove zero values
        appliance_totals = {k: round(v, 3) for k, v in appliance_totals.items() if v != 0}
        
        # Get ACORN group statistics
        acorn_stats = self._calculate_acorn_stats(readings)
        
        # Create aggregate record with primary key
        aggregate_data = {
            "id": aggregate_primary_key,  # Add primary key as id
            "datetime": timestamp_iso,
            "num_households": len(readings),
            "total_consumption_kwh": round(total_consumption, 2),
            "average_consumption_kwh": round(total_consumption / len(readings), 3) if readings else 0,
            "anomaly_count": anomaly_count,
            "anomaly_percentage": round((anomaly_count / len(readings)) * 100, 1) if readings else 0,
            "weather": self.weather,
            "acorn_stats": acorn_stats,
            "appliance_breakdown": appliance_totals
        }
        
        return {
            "household_readings": readings,
            "aggregate_data": aggregate_data
        }
    
    def _calculate_acorn_stats(self, readings):
        """Calculate consumption statistics by ACORN group"""
        acorn_stats = {}
        
        # Group readings by ACORN group
        for acorn_group in ACORN_GROUPS.keys():
            group_readings = [r for r in readings if r["acorn_group"] == acorn_group]
            
            if group_readings:
                total_consumption = sum(r["consumption_kwh"] for r in group_readings)
                acorn_stats[acorn_group] = {
                    "household_count": len(group_readings),
                    "total_consumption_kwh": round(total_consumption, 2),
                    "average_consumption_kwh": round(total_consumption / len(group_readings), 3),
                    "anomaly_count": sum(1 for r in group_readings if r["is_anomaly"])
                }
        
        return acorn_stats
    
    def _calculate_historical_comparisons(self, current_data):
        """Calculate comparisons with historical data"""
        current_date = self.current_datetime.strftime("%Y-%m-%d")
        yesterday_date = (self.current_datetime - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # If we don't have yesterday's data, return empty comparisons
        if yesterday_date not in self.daily_aggregates:
            return {}
        
        yesterday_data = self.daily_aggregates[yesterday_date]
        
        # Calculate average consumption for yesterday (total divided by number of readings)
        yesterday_avg = yesterday_data["total_consumption_kwh"] / max(1, yesterday_data["readings_count"])
        
        # Get same time yesterday if available (24 hours ago)
        same_time_yesterday = None
        if len(self.hourly_data) >= 48:  # If we have at least 24 hours of data
            same_time_yesterday = self.hourly_data[0]  # Oldest entry is 24 hours ago
        
        # Calculate comparisons
        comparisons = {
            "vs_yesterday_avg": {
                "value": round(current_data["average_consumption_kwh"] - yesterday_avg, 3),
                "percentage": round((current_data["average_consumption_kwh"] / max(0.001, yesterday_avg) - 1) * 100, 1)
            }
        }
        
        if same_time_yesterday:
            comparisons["vs_same_time_yesterday"] = {
                "value": round(current_data["average_consumption_kwh"] - same_time_yesterday["average_consumption_kwh"], 3),
                "percentage": round((current_data["average_consumption_kwh"] / max(0.001, same_time_yesterday["average_consumption_kwh"]) - 1) * 100, 1)
            }
        
        return comparisons
    
    def _calculate_peak_demand(self):
        """Calculate peak demand information for current and previous day"""
        current_date = self.current_datetime.strftime("%Y-%m-%d")
        yesterday_date = (self.current_datetime - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Current day data so far
        current_data = self.daily_aggregates.get(current_date, {
            "peak_demand_kwh": 0,
            "peak_time": None
        })
        
        # Yesterday's data
        yesterday_data = self.daily_aggregates.get(yesterday_date, {
            "peak_demand_kwh": 0,
            "peak_time": None
        })
        
        # Get current consumption
        current_hour_data = list(self.hourly_data)[-1] if self.hourly_data else None
        current_consumption = current_hour_data["total_consumption_kwh"] if current_hour_data else 0
        
        # Check if current consumption is a new peak for today
        is_new_peak = current_consumption > current_data.get("peak_demand_kwh", 0)
        
        # Update peak if needed
        if is_new_peak:
            if current_date not in self.daily_aggregates:
                self.daily_aggregates[current_date] = {
                    "total_consumption_kwh": 0,
                    "readings_count": 0,
                    "peak_demand_kwh": 0,
                    "peak_time": None
                }
            
            self.daily_aggregates[current_date]["peak_demand_kwh"] = current_consumption
            self.daily_aggregates[current_date]["peak_time"] = self.current_datetime.strftime("%H:%M")
        
        # Compile peak information
        peak_info = {
            "current_day": {
                "peak_demand_kwh": round(current_data.get("peak_demand_kwh", 0), 2),
                "peak_time": current_data.get("peak_time")
            },
            "previous_day": {
                "peak_demand_kwh": round(yesterday_data.get("peak_demand_kwh", 0), 2),
                "peak_time": yesterday_data.get("peak_time")
            },
            "current_is_peak": is_new_peak
        }
        
        # Calculate percentage change if we have both days' data
        if yesterday_data.get("peak_demand_kwh"):
            peak_info["vs_previous_day"] = {
                "value": round(current_data.get("peak_demand_kwh", 0) - yesterday_data.get("peak_demand_kwh", 0), 2),
                "percentage": round((current_data.get("peak_demand_kwh", 0) / max(0.001, yesterday_data.get("peak_demand_kwh", 0)) - 1) * 100, 1)
            }
        
        return peak_info
        
    def _extract_time_series(self):
        """Extract time series data for the past 24 hours"""
        if not self.hourly_data:
            return []
        
        # Get all hourly data points sorted by time
        time_series = list(self.hourly_data)
        
        # Extract just the key metrics for the time series
        return [
            {
                "datetime": point["datetime"],
                "total_consumption_kwh": point["total_consumption_kwh"],
                "average_consumption_kwh": point["average_consumption_kwh"],
                "temperature": point["weather"]["temperature"],
                "weather_condition": point["weather"]["condition"]
            }
            for point in time_series
        ]
    
    def generate_batch(self):
        """Generate a batch of smart meter readings and move time forward"""
        # Move timestamp 30 minutes forward (or adjust to appropriate interval)
        self.current_datetime += timedelta(minutes=30)
        
        # Generate data for the current time
        data_batch = self._generate_data_for_time()
        
        # Add the aggregate data to our historical records
        self.hourly_data.append(data_batch["aggregate_data"])
        
        # Update daily aggregates
        date_key = self.current_datetime.strftime("%Y-%m-%d")
        if date_key not in self.daily_aggregates:
            self.daily_aggregates[date_key] = {
                "total_consumption_kwh": 0,
                "readings_count": 0,
                "peak_demand_kwh": 0,
                "peak_time": None
            }
        
        self.daily_aggregates[date_key]["total_consumption_kwh"] += data_batch["aggregate_data"]["total_consumption_kwh"]
        self.daily_aggregates[date_key]["readings_count"] += 1
        
        # Check if current consumption is a new peak
        if data_batch["aggregate_data"]["total_consumption_kwh"] > self.daily_aggregates[date_key]["peak_demand_kwh"]:
            self.daily_aggregates[date_key]["peak_demand_kwh"] = data_batch["aggregate_data"]["total_consumption_kwh"]
            self.daily_aggregates[date_key]["peak_time"] = self.current_datetime.strftime("%H:%M")
        
        # Calculate historical comparisons
        historical_comparisons = self._calculate_historical_comparisons(data_batch["aggregate_data"])
        
        # Calculate peak demand info
        peak_demand_info = self._calculate_peak_demand()
        
        # Extract time series data
        time_series_data = self._extract_time_series()
        
        # Add additional analysis to the aggregate data
        data_batch["aggregate_data"]["historical_comparison"] = historical_comparisons
        data_batch["aggregate_data"]["peak_demand"] = peak_demand_info
        data_batch["aggregate_data"]["time_series"] = time_series_data
        
        return data_batch


# Modify the send_to_kafka function to use the duplicate tracker
def send_to_kafka(producer, data_batch, topics, duplicate_tracker=None):
    """Send generated data to Kafka topics with duplicate prevention"""
    try:
        # Track how many duplicates we found
        duplicate_count = 0
        sent_count = 0
        
        # Send individual household readings (with duplicate checking)
        for reading in data_batch["household_readings"]:
            # Skip if this is a duplicate and we're tracking duplicates
            if duplicate_tracker and duplicate_tracker.is_duplicate(reading["id"]):
                duplicate_count += 1
                continue
                
            # Send to Kafka
            producer.send(topics["household"], value=reading)
            sent_count += 1
            
            # Track this key if we're using duplicate tracking
            if duplicate_tracker:
                duplicate_tracker.add_key(reading["id"])
            
        # Check if aggregate data is a duplicate
        agg_data = data_batch["aggregate_data"]
        agg_is_duplicate = duplicate_tracker and duplicate_tracker.is_duplicate(agg_data["id"])
        
        # Send aggregate data if not a duplicate
        if not agg_is_duplicate:
            producer.send(topics["aggregate"], value=agg_data)
            
            # Track this key if we're using duplicate tracking
            if duplicate_tracker:
                duplicate_tracker.add_key(agg_data["id"])
        else:
            duplicate_count += 1
        
        # Flush producer
        producer.flush()
        
        # Log results
        print(f"✅ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Sent {sent_count} household readings")
        
        if duplicate_count > 0:
            print(f"   Found and skipped {duplicate_count} duplicate readings")
            
        print(f"   Average consumption: {data_batch['aggregate_data']['average_consumption_kwh']} kWh/household")
        print(f"   Anomalies detected: {data_batch['aggregate_data']['anomaly_count']} ({data_batch['aggregate_data']['anomaly_percentage']}%)")
        
        # Print peak demand information
        peak_info = data_batch['aggregate_data']['peak_demand']
        current_day = peak_info['current_day']
        print(f"   Current day peak: {current_day['peak_demand_kwh']} kWh at {current_day['peak_time'] or 'N/A'}")
        
        if 'vs_previous_day' in peak_info:
            change = peak_info['vs_previous_day']
            print(f"   Peak vs yesterday: {change['value']} kWh ({change['percentage']}%)")
        
        # Print if this is a new peak
        if peak_info['current_is_peak']:
            print(f"   🔔 NEW PEAK DETECTED for today!")
            
        return True
    except Exception as e:
        print(f"❌ Error sending data to Kafka: {e}")
        return False
# This class can be added to your script
class DuplicateTracker:
    """Class to track and prevent duplicate data submission to Kafka"""
    
    def __init__(self, max_size=10000):
        """Initialize with a maximum cache size to prevent memory issues"""
        self.seen_keys = set()
        self.key_queue = deque(maxlen=max_size)
        self.max_size = max_size
    
    def is_duplicate(self, key):
        """Check if a key has been seen before"""
        return key in self.seen_keys
    
    def add_key(self, key):
        """Add a key to the tracker"""
        if len(self.seen_keys) >= self.max_size:
            # Remove oldest key if at capacity
            oldest_key = self.key_queue.popleft()
            self.seen_keys.remove(oldest_key)
        
        # Add new key
        self.seen_keys.add(key)
        self.key_queue.append(key)
# Update run_data_generator function to use the duplicate tracker
def run_data_generator(kafka_servers, interval_seconds=30, num_households=None):
    """Run the data generator continuously"""
    global NUM_HOUSEHOLDS
    
    # If num_households is provided, update the global constant
    if num_households:
        NUM_HOUSEHOLDS = num_households
    
    # Configure Kafka producer
    try:
        producer = KafkaProducer(
            bootstrap_servers=kafka_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
    except Exception as e:
        print(f"❌ Failed to create Kafka producer: {e}")
        return
    
    # Kafka topics
    topics = {
        "household": HOUSEHOLD_TOPIC,
        "aggregate": AGGREGATE_TOPIC
    }
    
    # Initialize generator
    generator = SmartMeterDataGenerator()
    
    # Initialize duplicate tracker
    duplicate_tracker = DuplicateTracker(max_size=100000)  # Adjust size based on your needs
    
    print(f"🚀 Starting enhanced smart meter data generator for {NUM_HOUSEHOLDS} households")
    print(f"📊 Data will be sent to Kafka topics '{HOUSEHOLD_TOPIC}' and '{AGGREGATE_TOPIC}' every {interval_seconds} seconds")
    print(f"💡 New features enabled: time series data, historical comparison, appliance breakdown, peak detection")
    print(f"🔒 Duplicate prevention enabled with primary keys")
    print("------------------------------------------------------------------")
    
    try:
        while True:
            data_batch = generator.generate_batch()
            send_to_kafka(producer, data_batch, topics, duplicate_tracker)
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        print("⏹️ Generator stopped by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        producer.close()
        print("🛑 Producer closed")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Smart Meter Data Generator for Kafka')
    
    parser.add_argument('--bootstrap-servers', 
                        default='172.31.87.248:9092',
                        help='Kafka bootstrap servers (comma-separated)')
    
    parser.add_argument('--interval', 
                        type=int, 
                        default=30,
                        help='Interval between data generation in seconds (default: 30)')
    
    parser.add_argument('--households', 
                        type=int, 
                        default=None,
                        help=f'Number of households to simulate (default: {NUM_HOUSEHOLDS})')
    
    parser.add_argument('--household-topic', 
                        default=HOUSEHOLD_TOPIC,
                        help=f'Kafka topic for household readings (default: {HOUSEHOLD_TOPIC})')
    
    parser.add_argument('--aggregate-topic', 
                        default=AGGREGATE_TOPIC,
                        help=f'Kafka topic for aggregate data (default: {AGGREGATE_TOPIC})')
    
    return parser.parse_args()


if __name__ == "__main__":
    # Parse command line arguments
    args = parse_arguments()
    
    # Update global constants if provided
    if args.household_topic:
        HOUSEHOLD_TOPIC = args.household_topic
    
    if args.aggregate_topic:
        AGGREGATE_TOPIC = args.aggregate_topic
    
    # Convert bootstrap servers to list
    kafka_servers = args.bootstrap_servers.split(',')
    
    # Run the generator
    run_data_generator(
        kafka_servers=kafka_servers,
        interval_seconds=args.interval,
        num_households=args.households
    )