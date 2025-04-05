import axios from 'axios';

export const GetAverageDailyConsumption = async () => {
    try {
        const url = `${process.env.NEXT_PUBLIC_ENERGY_API}/avg-daily-consumption`;
        console.log(url)
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching average daily consumption data:', error);
        throw error;
    }
}
