// app/api/smart-meter-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { transformData } from '../../../lib/simpleTransformer';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = 'peanut-butter-project';
const AGGREGATE_PREFIX = 'smart-meter-data/aggregate/';
const HOUSEHOLD_PREFIX = 'smart-meter-data/household/';
const ANOMALY_PREFIX = 'smart-meter-data/anomalies/';

interface S3Object {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string;
}

interface ApiResponse {
  data: any;
  message?: string;
  error?: string;
  debug?: any;
}

// In App Router, we need to export functions for HTTP methods
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const { searchParams } = new URL(request.url);
  const dataType = searchParams.get('dataType');
  const date = searchParams.get('date');
  const acornGroup = searchParams.get('acornGroup');
  const limit = searchParams.get('limit') || '10';
  const debug = searchParams.get('debug') === 'true';
  
  const debugInfo: any = {
    requestInfo: {
      url: request.url,
      method: request.method,
      searchParams: Object.fromEntries(searchParams.entries()),
    },
    s3Config: {
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION || 'us-east-1',
      credentialsAvailable: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    },
    pathInfo: {},
    s3Operations: []
  };

  console.log(`API Request: ${request.method} ${request.url}`);
  
  try {
    // Format today's date if not provided
    const formattedDate = date ? String(date) : new Date().toISOString().split('T')[0];
    
    let prefix = '';
    let data: any[] = [];
    
    // Determine the prefix based on the data type
    if (dataType === 'aggregate') {
      prefix = `${AGGREGATE_PREFIX}${formattedDate}/`;
      debugInfo.pathInfo.type = 'aggregate';
    } else if (dataType === 'anomalies') {
      prefix = `${ANOMALY_PREFIX}${formattedDate}/`;
      debugInfo.pathInfo.type = 'anomalies';
    } else if (dataType === 'household' && acornGroup) {
      prefix = `${HOUSEHOLD_PREFIX}${acornGroup}/${formattedDate}/`;
      debugInfo.pathInfo.type = 'household_with_acorn';
    } else if (dataType === 'household') {
      // Default to all households if no ACORN group specified
      prefix = `${HOUSEHOLD_PREFIX}`;
      debugInfo.pathInfo.type = 'household_all';
    } else {
      console.log(`Invalid data type: ${dataType}`);
      return NextResponse.json({ 
        data: [], 
        message: 'Invalid data type', 
        error: `Expected 'aggregate', 'anomalies', or 'household', but received '${dataType}'`,
        debug: debug ? debugInfo : undefined
      }, { status: 400 });
    }
    
    debugInfo.pathInfo.prefix = prefix;
    debugInfo.pathInfo.formattedDate = formattedDate;
    console.log(`Looking for data with prefix: ${prefix}`);
    
    // IMPORTANT: Try a list operation first with just a few keys to verify we can access S3
    try {
      console.log(`Verifying S3 access to bucket: ${BUCKET_NAME}`);
      const testListParams = {
        Bucket: BUCKET_NAME,
        MaxKeys: 5
      };
      
      const testResults = await s3.listObjectsV2(testListParams).promise();
      debugInfo.s3Operations.push({
        operation: 'testListBucket',
        params: testListParams,
        success: true,
        count: testResults.Contents?.length || 0
      });
      
      console.log(`S3 bucket access verified. Found ${testResults.Contents?.length || 0} objects.`);
    } catch (error: any) {
      console.error(`⚠️ Error accessing S3 bucket: ${error.message}`);
      debugInfo.s3Operations.push({
        operation: 'testListBucket',
        params: { Bucket: BUCKET_NAME, MaxKeys: 5 },
        success: false,
        error: error.message,
        code: error.code
      });
    }
    
    // List objects from S3 with the specified prefix
    console.log(`Listing objects with prefix: ${prefix}`);
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: Number(limit),
    };
    
    debugInfo.s3Operations.push({
      operation: 'listObjectsWithPrefix',
      params: listParams
    });
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    debugInfo.s3Operations[debugInfo.s3Operations.length - 1] = {
      ...debugInfo.s3Operations[debugInfo.s3Operations.length - 1],
      success: true,
      count: listedObjects.Contents?.length || 0
    };
    
    // Capture additional debug info
    debugInfo.objectCount = listedObjects.Contents?.length || 0;
    
    // If no objects found, return empty array with helpful error
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      // Check if bucket exists to provide more context
      try {
        await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
        debugInfo.bucketExists = true;
      } catch (error: any) {
        debugInfo.bucketExists = false;
        debugInfo.bucketError = error.message;
      }
      
      return NextResponse.json({ 
        data: [], 
        message: 'No data found for the specified parameters',
        debug: debug ? debugInfo : undefined,
        error: `No objects found with prefix: ${prefix}`
      }, { status: 200 });
    }
    
    // Sort by last modified (newest first)
    const sortedObjects = (listedObjects.Contents as S3Object[]).sort(
      (a, b) => b.LastModified.getTime() - a.LastModified.getTime()
    );
    
    // Get the most recent files
    const recentObjects = sortedObjects.slice(0, Number(limit));
    
    // Add object keys to debug info
    if (debug) {
      debugInfo.objectKeys = recentObjects.map(obj => obj.Key);
    }
    
    // Fetch the contents of each file
    const objectPromises = recentObjects.map(async (obj) => {
      const getParams = {
        Bucket: BUCKET_NAME,
        Key: obj.Key,
      };
      
      debugInfo.s3Operations.push({
        operation: 'getObject',
        params: getParams
      });
      
      try {
        const response = await s3.getObject(getParams).promise();
        
        debugInfo.s3Operations[debugInfo.s3Operations.length - 1] = {
          ...debugInfo.s3Operations[debugInfo.s3Operations.length - 1],
          success: true
        };
        
        return JSON.parse(response.Body!.toString('utf-8'));
      } catch (error: any) {
        // Handle individual file errors but continue with others
        console.error(`Error fetching object ${obj.Key}: ${error.message}`);
        
        debugInfo.s3Operations[debugInfo.s3Operations.length - 1] = {
          ...debugInfo.s3Operations[debugInfo.s3Operations.length - 1],
          success: false,
          error: error.message
        };
        
        return { 
          error: `Failed to fetch ${obj.Key}`, 
          message: error.message,
          key: obj.Key
        };
      }
    });
    
    const rawData = await Promise.all(objectPromises);
    
    // For aggregate data, we want the most recent entry and transform it
    if (dataType === 'aggregate') {
      // Apply transformation
      const transformedData = transformData(dataType, rawData[0] || {});
      
      // Add transformation info to debug if enabled
      if (debug) {
        debugInfo.transformation = {
          original: rawData[0],
          transformed: transformedData
        };
      }
      
      return NextResponse.json({ 
        data: transformedData,
        debug: debug ? debugInfo : undefined
      });
    }
    
    // For lists of data (household or anomalies), transform the array
    const transformedData = transformData(dataType, rawData);
    
    return NextResponse.json({ 
      data: transformedData, 
      debug: debug ? debugInfo : undefined
    });
  } catch (error: any) {
    console.error('Error in API handler:', error);
    
    // Create a detailed error message
    const errorDetails = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      time: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    debugInfo.error = errorDetails;
    
    return NextResponse.json({ 
      data: [], 
      message: 'Error processing request', 
      error: `${error.code || 'Error'}: ${error.message}`,
      debug: debug ? debugInfo : undefined
    }, { status: 500 });
  }
}