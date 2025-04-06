import axios from 'axios';

export const GetAnnualGrowth = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_EV_API}/annual-growth`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching adoption rate data:', error);
        throw error;
    }
}

export const GetAdoptionRate = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_EV_API}/adoption-rate`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching adoption rate data:', error);
        throw error;
    }
}

export const GetProjectedGrowth = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_EV_API}/projected-growth`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching projected growth data:', error);
        throw error;
    }
}

export const GetFinalChargingPoints = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_EV_API}/final_chargepoints`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching final charge points data:', error);
        throw error;
    }
}