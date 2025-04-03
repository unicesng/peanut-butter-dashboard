from kafka import KafkaProducer
import json
import time
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Configure Kafka producer
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Kafka topics
HOUSEHOLD_TOPIC = 'smart-meter-readings'
AGGREGATE_TOPIC = 'aggregate-consumption'

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
        self.current_datetime = datetime.now()
        self.weather = self._get_current_weather()
        
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
            
        return {
            "value": round(max(0, consumption), 3),
            "is_anomaly": is_anomaly,
            "anomaly_type": anomaly_type if is_anomaly else None
        }
    
    def generate_batch(self):
        """Generate a batch of smart meter readings for all households"""
        # Update current timestamp (rounded to nearest 30 minutes to match London dataset)
        self.current_datetime = datetime.now()
        minutes = self.current_datetime.minute
        rounded_minutes = 0 if minutes < 30 else 30
        self.current_datetime = self.current_datetime.replace(minute=rounded_minutes, second=0, microsecond=0)
        
        # Update weather data
        self.weather = self._get_current_weather()
        
        # Generate readings for all households
        readings = []
        total_consumption = 0
        anomaly_count = 0
        
        for household in self.households:
            # Calculate consumption
            consumption_data = self._calculate_household_consumption(household)
            
            # Add to total
            total_consumption += consumption_data["value"]
            if consumption_data["is_anomaly"]:
                anomaly_count += 1
            
            # Create reading record
            reading = {
                "datetime": self.current_datetime.isoformat(),
                "household_id": household["household_id"],
                "acorn_group": household["acorn_group"],
                "acorn_category": household["acorn_category"],
                "consumption_kwh": consumption_data["value"],
                "is_anomaly": consumption_data["is_anomaly"],
                "anomaly_type": consumption_data["anomaly_type"],
                "tariff": household["tariff"],
                "has_ev": household["has_ev"],
                "has_solar": household["has_solar"]
            }
            
            readings.append(reading)
        
        # Create aggregate record
        aggregate_data = {
            "datetime": self.current_datetime.isoformat(),
            "num_households": len(readings),
            "total_consumption_kwh": round(total_consumption, 2),
            "average_consumption_kwh": round(total_consumption / len(readings), 3) if readings else 0,
            "anomaly_count": anomaly_count,
            "anomaly_percentage": round((anomaly_count / len(readings)) * 100, 1) if readings else 0,
            "weather": self.weather,
            # Add ACORN group statistics
            "acorn_stats": self._calculate_acorn_stats(readings)
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

def send_to_kafka(data_batch):
    """Send generated data to Kafka topics"""
    try:
        # Send individual household readings
        for reading in data_batch["household_readings"]:
            producer.send(HOUSEHOLD_TOPIC, value=reading)
            
        # Send aggregate data
        producer.send(AGGREGATE_TOPIC, value=data_batch["aggregate_data"])
        
        # Flush producer
        producer.flush()
        
        print(f"✅ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Sent {len(data_batch['household_readings'])} household readings")
        print(f"   Average consumption: {data_batch['aggregate_data']['average_consumption_kwh']} kWh/household")
        print(f"   Anomalies detected: {data_batch['aggregate_data']['anomaly_count']} ({data_batch['aggregate_data']['anomaly_percentage']}%)")
        return True
    except Exception as e:
        print(f"❌ Error sending data to Kafka: {e}")
        return False

def run_data_generator(interval_seconds=30):
    """Run the data generator continuously"""
    generator = SmartMeterDataGenerator()
    
    print(f"🚀 Starting smart meter data generator for {NUM_HOUSEHOLDS} households")
    print(f"📊 Data will be sent to Kafka topics '{HOUSEHOLD_TOPIC}' and '{AGGREGATE_TOPIC}' every {interval_seconds} seconds")
    print("------------------------------------------------------------------")
    
    try:
        while True:
            data_batch = generator.generate_batch()
            send_to_kafka(data_batch)
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        print("⏹️ Generator stopped by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        producer.close()
        print("🛑 Producer closed")

if __name__ == "__main__":
    run_data_generator()