from kafka import KafkaConsumer
import json
import boto3
import uuid
from datetime import datetime
import time
import logging
import os
from dotenv import load_dotenv
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Kafka topic names
HOUSEHOLD_TOPIC = 'smart-meter-readings'
AGGREGATE_TOPIC = 'aggregate-consumption'

# Configure Kafka consumer
logger.info("Initializing Kafka consumers...")
household_consumer = KafkaConsumer(
    HOUSEHOLD_TOPIC,
    bootstrap_servers=['54.159.249.207:9092'],
    auto_offset_reset='latest',
    enable_auto_commit=False,
    group_id='smart-meter-household-group2',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

aggregate_consumer = KafkaConsumer(
    AGGREGATE_TOPIC,
    bootstrap_servers=['54.159.249.207:9092'],
    auto_offset_reset='latest',
    enable_auto_commit=False,
    group_id='smart-meter-aggregate-group2',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

logger.info(f"Kafka consumers initialized for topics: {HOUSEHOLD_TOPIC} and {AGGREGATE_TOPIC}")

# Configure S3 client
logger.info("Initializing S3 client...")
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='us-east-1'
)
logger.info("S3 client initialized for region us-east-1")

# S3 bucket details - SAME BUCKET but NEW DIRECTORY PREFIX
BUCKET_NAME = 'peanut-butter-project'
# Updated directory prefixes to differentiate new data with primary keys
HOUSEHOLD_PREFIX = 'smart-meter-data/household/'
AGGREGATE_PREFIX = 'smart-meter-data/aggregate/'
ANOMALY_PREFIX = 'smart-meter-data/anomalies/'
logger.info(f"Will store data in bucket: {BUCKET_NAME} under new prefixes")

def upload_to_s3(data, prefix, timestamp, data_type):
    """Upload data to S3 bucket with appropriate prefix and timestamp-based filenames"""
    try:
        start_time = time.time()  # Start timing the upload
        
        # Parse the timestamp
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        date_part = dt.strftime('%Y-%m-%d')
        time_part = dt.strftime('%H%M%S')
        
        # Extract the primary key (id) if available, otherwise generate one
        record_id = data.get('id', str(uuid.uuid4()))
        
        # Generate a filename with primary key to ensure uniqueness
        if data_type == 'household':
            # For household data, include ACORN group and household ID in path
            acorn_group = data.get('acorn_group', 'unknown').replace(' ', '_').lower()
            household_id = data.get('household_id', 'unknown')
            
            # Use the primary key in the filename instead of just timestamp
            file_key = f"{prefix}{acorn_group}/{date_part}/household_{household_id}_{record_id}.json"
            
            # If it's an anomaly, also save to anomaly folder
            if data.get('is_anomaly', False):
                anomaly_key = f"{ANOMALY_PREFIX}{date_part}/anomaly_{household_id}_{record_id}.json"
                logger.info(f"Detected anomaly, also saving to: {anomaly_key}")
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=anomaly_key,
                    Body=json.dumps(data),
                    ContentType='application/json'
                )
                
        elif data_type == 'aggregate':
            # For aggregate data, use a flat structure with primary key in filename
            file_key = f"{prefix}{date_part}/aggregate_{record_id}.json"
        
        logger.info(f"Uploading {data_type} data to S3 path: {file_key}")
        
        # Upload to S3
        response = s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=file_key,
            Body=json.dumps(data),
            ContentType='application/json'
        )
        
        # Log upload result
        end_time = time.time()
        upload_time = end_time - start_time
        
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            logger.info(f"✅ SUCCESS: {data_type.capitalize()} data uploaded to S3: s3://{BUCKET_NAME}/{file_key}")
            logger.info(f"Upload completed in {upload_time:.2f} seconds")
            return True
        else:
            logger.error(f"❌ FAILED: S3 upload returned unexpected status: {response['ResponseMetadata']['HTTPStatusCode']}")
            logger.error(f"Full response: {response}")
            return False
            
    except boto3.exceptions.S3UploadFailedError as e:
        logger.error(f"❌ S3 UPLOAD ERROR: {e}")
        return False
    except Exception as e:
        logger.error(f"Error uploading to S3: {e}")
        return False

def process_household_message(message):
    """Process household-level smart meter reading"""
    logger.info("-----------------------------------------------------")
    logger.info("📨 HOUSEHOLD MESSAGE RECEIVED from Kafka")
    logger.info(f"Topic: {message.topic}, Partition: {message.partition}, Offset: {message.offset}")
    
    # Extract data
    data = message.value
    
    # Get timestamp
    timestamp = data.get('datetime', datetime.now().isoformat())
    household_id = data.get('household_id', 'unknown')
    acorn_group = data.get('acorn_group', 'unknown')
    consumption = data.get('consumption_kwh', 0)
    is_anomaly = data.get('is_anomaly', False)
    
    # Log primary key if available
    if 'id' in data:
        logger.info(f"Primary Key: {data['id']}")
    
    logger.info(f"Household: {household_id}, ACORN: {acorn_group}")
    logger.info(f"Timestamp: {timestamp}, Consumption: {consumption} kWh, Anomaly: {is_anomaly}")
    
    # Upload the data to S3
    logger.info("Storing household reading in S3...")
    success = upload_to_s3(data, HOUSEHOLD_PREFIX, timestamp, 'household')
    
    if success:
        logger.info("✅ Household reading successfully stored in S3")
    else:
        logger.error("❌ Failed to store household reading")
    
    logger.info("-----------------------------------------------------")

def process_aggregate_message(message):
    """Process aggregate consumption data"""
    logger.info("=====================================================")
    logger.info("📊 AGGREGATE MESSAGE RECEIVED from Kafka")
    logger.info(f"Topic: {message.topic}, Partition: {message.partition}, Offset: {message.offset}")
    
    # Extract data
    data = message.value
    
    # Get timestamp
    timestamp = data.get('datetime', datetime.now().isoformat())
    num_households = data.get('num_households', 0)
    total_consumption = data.get('total_consumption_kwh', 0)
    avg_consumption = data.get('average_consumption_kwh', 0)
    anomaly_count = data.get('anomaly_count', 0)
    
    # Log primary key if available
    if 'id' in data:
        logger.info(f"Primary Key: {data['id']}")
    
    logger.info(f"Timestamp: {timestamp}")
    logger.info(f"Households: {num_households}, Total: {total_consumption} kWh, Avg: {avg_consumption} kWh")
    logger.info(f"Anomalies: {anomaly_count} ({data.get('anomaly_percentage', 0)}%)")
    
    # Upload the data to S3
    logger.info("Storing aggregate data in S3...")
    success = upload_to_s3(data, AGGREGATE_PREFIX, timestamp, 'aggregate')
    
    if success:
        logger.info("✅ Aggregate data successfully stored in S3")
    else:
        logger.error("❌ Failed to store aggregate data")
    
    logger.info("=====================================================")

def run_consumers():
    """Run both consumers in parallel using threads"""
    from threading import Thread
    
    # Create threads for both consumers
    household_thread = Thread(target=run_household_consumer)
    aggregate_thread = Thread(target=run_aggregate_consumer)
    
    # Start both threads
    household_thread.start()
    aggregate_thread.start()
    
    # Wait for both threads to complete
    household_thread.join()
    aggregate_thread.join()

def run_household_consumer():
    logger.info(f"🏠 Starting Kafka consumer for household data on topic: {HOUSEHOLD_TOPIC}")
    
    message_count = 0
    start_time = datetime.now()
    
    try:
        for message in household_consumer:
            message_count += 1
            logger.info(f"Processing household message #{message_count}")
            process_household_message(message)
    except KeyboardInterrupt:
        runtime = datetime.now() - start_time
        logger.info(f"👋 Household consumer stopped after {runtime}")
        logger.info(f"Processed {message_count} messages")
    except Exception as e:
        logger.error(f"❌ HOUSEHOLD CONSUMER ERROR: {e}")
        logger.exception("Full stack trace:")

def run_aggregate_consumer():
    logger.info(f"📊 Starting Kafka consumer for aggregate data on topic: {AGGREGATE_TOPIC}")
    
    message_count = 0
    start_time = datetime.now()
    
    try:
        for message in aggregate_consumer:
            message_count += 1
            logger.info(f"Processing aggregate message #{message_count}")
            process_aggregate_message(message)
    except KeyboardInterrupt:
        runtime = datetime.now() - start_time
        logger.info(f"👋 Aggregate consumer stopped after {runtime}")
        logger.info(f"Processed {message_count} messages")
    except Exception as e:
        logger.error(f"❌ AGGREGATE CONSUMER ERROR: {e}")
        logger.exception("Full stack trace:")

if __name__ == "__main__":
    logger.info("🚀 Starting Smart Meter Data Kafka consumers...")
    logger.info("Consumers will store data in S3 for monitoring and ML analysis")
    logger.info(f"Using new directory structure: {HOUSEHOLD_PREFIX} for data with primary keys")
    
    run_consumers()