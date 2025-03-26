from kafka import KafkaProducer
import json
import time
import requests
from datetime import datetime
import schedule
import os
from dotenv import load_dotenv
load_dotenv()
# Configure Kafka producer
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    # Optional security settings if needed
    # security_protocol='SASL_SSL',
    # sasl_mechanism='PLAIN',
    # sasl_plain_username='username',
    # sasl_plain_password='password'
)

# Kafka topic
TOPIC_NAME = 'real-time-data'

def fetch_api_data():
    """Fetch data from your API with x-api-key authentication"""
    try:
        # Your API endpoint
        api_url = 'https://api.energydashboard.co.uk/generation/latest'
        
        # API Key headers
        headers = {
            'x-api-key': os.getenv('ENERGY_API_KEY'),
            'Content-Type': 'application/json'
        }
        
        # Make the API request with headers
        response = requests.get(api_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Add timestamp for tracking
            data['timestamp'] = datetime.now().isoformat()
            
            # Send data to Kafka topic
            producer.send(TOPIC_NAME, value=data)
            producer.flush()
            
            print(f"Data sent to Kafka topic {TOPIC_NAME} at {datetime.now()}")
            return True
        else:
            print(f"API request failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error fetching API data: {e}")
        return False

# Schedule the job to run every hour
# schedule.every().hour.do(fetch_api_data)

# Run the scheduler
if __name__ == "__main__":
    
    print("Starting Kafka producer for hourly API data...")
    
    # Run the fetch immediately once
    fetch_api_data()
    
    # # Then continue with the schedule
    # while True:
    #     schedule.run_pending()
    #     time.sleep(60)  # Check every minute if there's a scheduled job to run