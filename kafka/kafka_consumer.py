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
    bootstrap_servers=['localhost:9092'],
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
    """Upload data to S3 bucket with enhanced logging"""
    try:
        # Create a unique filename for the data
        date_part = timestamp.split('T')[0]
        hour_part = timestamp.split('T')[1].split(':')[0]
        
        # Generate a unique file key
        file_key = f"{PREFIX}{date_part}/{hour_part}/data_{uuid.uuid4()}.json"
        logger.info(f"Preparing to upload data to S3 path: {file_key}")
        
        # Log data size
        json_data = json.dumps(data)
        data_size = len(json_data)
        logger.info(f"Data size: {data_size} bytes")
        
        # Start upload
        logger.info(f"Starting S3 upload to bucket: {BUCKET_NAME}")
        start_time = time.time()
        
        # Upload to S3
        response = s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=file_key,
            Body=json_data,
            ContentType='application/json'
        )
        
        # Log upload result
        end_time = time.time()
        upload_time = end_time - start_time
        
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            logger.info(f"✅ SUCCESS: Data uploaded to S3: s3://{BUCKET_NAME}/{file_key}")
            logger.info(f"Upload completed in {upload_time:.2f} seconds")
            logger.info(f"S3 response: {response['ResponseMetadata']['HTTPStatusCode']}")
            return True
        else:
            logger.error(f"❌ FAILED: S3 upload returned unexpected status: {response['ResponseMetadata']['HTTPStatusCode']}")
            logger.error(f"Full response: {response}")
            return False
            
    except boto3.exceptions.S3UploadFailedError as e:
        logger.error(f"❌ S3 UPLOAD ERROR: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ UNEXPECTED ERROR uploading to S3: {e}")
        logger.exception("Full stack trace:")
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