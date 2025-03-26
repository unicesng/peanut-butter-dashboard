from kafka import KafkaProducer
import json
import time
import requests
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Kafka producer
producer = KafkaProducer(
    bootstrap_servers=['172.17.0.1:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Kafka topic
TOPIC_NAME = 'real-time-data'

# Define the three API endpoints
API_ENDPOINTS = [
    {
        'url': 'https://api.energydashboard.co.uk/generation/latest',
        'name': 'generation'
    },
    {
        'url': 'https://api.energydashboard.co.uk/demand/latest',
        'name': 'demand'
    },
    {
        'url': 'https://api.energydashboard.co.uk/carbon-intensity/latest',
        'name': 'carbon'
    }
]

def fetch_api_data():
    """Fetch data from multiple API endpoints"""
    try:
        # API Key headers
        headers = {
            'x-api-key': os.getenv('ENERGY_API_KEY'),
            'Content-Type': 'application/json'
        }
        
        success_count = 0
        for endpoint in API_ENDPOINTS:
            try:
                print(f"Fetching data from {endpoint['name']} API...")
                response = requests.get(endpoint['url'], headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Add metadata
                    data['timestamp'] = datetime.now().isoformat()
                    data['source'] = endpoint['name']
                    
                    # Send data to Kafka topic
                    producer.send(TOPIC_NAME, value=data)
                    print(f"✅ Data from {endpoint['name']} sent to Kafka topic {TOPIC_NAME} at {datetime.now()}")
                    success_count += 1
                else:
                    print(f"❌ API request to {endpoint['name']} failed with status code: {response.status_code}")
            except Exception as e:
                print(f"❌ Error fetching {endpoint['name']} API data: {e}")
        
        # Flush all messages
        producer.flush()
        print(f"Successfully sent {success_count}/{len(API_ENDPOINTS)} API responses to Kafka")
        return success_count > 0
        
    except Exception as e:
        print(f"❌ Unexpected error in fetch_api_data: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Kafka producer for energy data APIs...")
    fetch_api_data()