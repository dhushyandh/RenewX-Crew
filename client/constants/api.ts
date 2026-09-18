import axios from 'axios';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    if (Platform.OS === 'android') {
        // Android emulator uses 10.0.2.2 to access host machine localhost
        // If testing on physical device, replace with your local WiFi IP or set EXPO_PUBLIC_API_URL
        return 'http://10.0.2.2:3000/api';
    }

    // iOS simulator and Web browser
    return 'http://localhost:3000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 15000,
});

export const getAuthHeaders = async (getToken: () => Promise<string | null>) => {
    try {
        const token = await getToken();
        if (token) {
            return {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };
        }
    } catch (e) {
        console.warn("Could not retrieve auth token:", e);
    }
    return {};
};

export default api;