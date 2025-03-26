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

# Configure Kafka consumer
logger.info("Initializing Kafka consumer...")
consumer = KafkaConsumer(
    'real-time-data',
    bootstrap_servers=['172.17.0.1:9092'],
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    group_id='real-time-data-group',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)
logger.info("Kafka consumer initialized and configured to connect to localhost:9092")

# Configure S3 client
logger.info("Initializing S3 client...")
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name='us-east-1'
)
logger.info("S3 client initialized for region us-east-1")

# S3 bucket details
BUCKET_NAME = 'peanut-butter-project'
PREFIX = 'real-time-data/'
logger.info(f"Will store data in bucket: {BUCKET_NAME} with prefix: {PREFIX}")

def upload_to_s3(data, timestamp):
    """Upload data to S3 bucket with improved folder structure"""
    try:
        # Parse the timestamp
        dt = datetime.fromisoformat(timestamp)
        date_part = dt.strftime('%Y-%m-%d')
        hour_part = dt.strftime('%H')
        
        # Get the data source
        source = data.get('source', 'unknown')
        
        # Generate a unique file key with better structure
        file_key = f"real-time-data/{source}/{date_part}/{hour_part}/data_{uuid.uuid4()}.json"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=file_key,
            Body=json.dumps(data),
            ContentType='application/json'
        )
        
        print(f"Data uploaded to S3: s3://{BUCKET_NAME}/{file_key}")
        return True
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return False

def process_message(message):
    """Process each message from Kafka with enhanced logging"""
    # Log message receipt
    logger.info("-----------------------------------------------------")
    logger.info("📨 MESSAGE RECEIVED from Kafka")
    logger.info(f"Topic: {message.topic}, Partition: {message.partition}, Offset: {message.offset}")
    
    # Extract data
    data = message.value
    logger.info(f"Message keys: {', '.join(data.keys())}")
    
    # Get timestamp
    timestamp = data.get('timestamp', datetime.now().isoformat())
    logger.info(f"Message timestamp: {timestamp}")
    
    # Upload the data to S3
    logger.info("Attempting to store message in S3...")
    success = upload_to_s3(data, timestamp)
    
    if success:
        logger.info("✅ Message successfully processed and stored in S3")
    else:
        logger.error("❌ Failed to process and store message")
    
    logger.info("-----------------------------------------------------")

if __name__ == "__main__":

    logger.info("🚀 Starting Kafka consumer to store data in S3...")
    logger.info(f"Listening for messages on topic: real-time-data")
    logger.info("Waiting for messages... (Press Ctrl+C to exit)")
    
    # Keep track of message count
    message_count = 0
    start_time = datetime.now()
    
    try:
        # Process messages
        for message in consumer:
            message_count += 1
            logger.info(f"Processing message #{message_count}")
            process_message(message)
    except KeyboardInterrupt:
        runtime = datetime.now() - start_time
        logger.info(f"👋 Consumer stopped by user after {runtime}")
        logger.info(f"Processed {message_count} messages")
    except Exception as e:
        logger.error(f"❌ FATAL ERROR: {e}")
        logger.exception("Full stack trace:")