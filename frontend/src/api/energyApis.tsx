import axios from 'axios';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { report } from 'process';

const s3Client = new S3Client({
  region: "us-east-1", 
  credentials: {
    accessKeyId: `${process.env.NEXT_PUBLIC_ACCESS_KEY}`,
    secretAccessKey: `${process.env.NEXT_PUBLIC_SECRET_ACCESS_KEY}`
    }
});

export const GetAverageDailyConsumption = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/avg-daily-consumption`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching average daily consumption data:', error);
        throw error;
    }
}

export const GetEnergyAnomaly = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/energy-anomaly`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching energy anomaly data:', error);
        throw error;
    }
}

export const GetEnergyConsumption = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/energy-consumption`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching energy consumption data:', error);
        throw error;
    }
}

export const GetEnergyDistribution = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/energy-distribution`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching energy distribution data:', error);
        throw error;
    }
}

export const GetEnergyFactors = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/energy-factors`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching energy factors data:', error);
        throw error;
    }
}

export const GetProjectedEnergyConsumption = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/projected-energy-consumption`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching projected energy consumption data:', error);
        throw error;
    }
}

export const GetReport = async () => {
    try {
        console.log('Access Key:', process.env.NEXT_PUBLIC_ACCESS_KEY);
        console.log('Secret Key:', process.env.NEXT_PUBLIC_SECRET_ACCESS_KEY);

        const url = `https://tindpxvddg.execute-api.us-east-1.amazonaws.com/prod/trigger-report-generation`;
        const response = await axios.post(url);
        console.log('Response:', response);
        const body = JSON.parse(response.data.body);
        const reportId = body['report_id']
        
        const s3ObjectKey = `reports/${reportId}.csv`;
    
        // Step 3: Generate a presigned URL for the file from S3
        const command = new GetObjectCommand({
          Bucket: "peanut-butter-project",
          Key: s3ObjectKey,
        });
    
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 });
    
        return signedUrl;
      } catch (error) {
        console.error('Error fetching report data or generating presigned URL:', error);
        throw error;
      }
}