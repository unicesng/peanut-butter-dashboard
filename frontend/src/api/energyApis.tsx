import axios from 'axios';

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
