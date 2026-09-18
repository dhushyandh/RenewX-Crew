import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = (): string => {
    // Expo Web development runs in the browser on the same machine as the API.
    // Prefer localhost in development so stale LAN/production environment variables
    // cannot silently send local requests to an unreachable API.
    if (__DEV__ && Platform.OS === 'web') {
        return 'http://localhost:3000/api';
    }

    // 1. Explicit production or custom environment variable URL
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. Production web builds must use the deployed API, never the browser's
    // own hostname on port 3000.
    if (Platform.OS === 'web' && !__DEV__) {
        return 'https://api-dhushyandh.onrender.com/api';
    }

    // 3. Mobile device (Android / iOS): extract host IP dynamically from Expo Metro development server
    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest?.debuggerHost ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            return `http://${ip}:3000/api`;
        }
    }

    // 4. Default to the developer LAN IP for physical-device testing.
    return 'http://192.168.1.6:3000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 15000,
});

if (__DEV__) {
    console.log(`[API Config] Base URL set to: ${api.defaults.baseURL}`);
}

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
