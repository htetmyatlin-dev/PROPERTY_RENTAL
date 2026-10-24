import { useAppStore } from "@/app/store";
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = useAppStore.getState().accessToken;
  if (accessToken) config.headers["Authorization"] = `Bearer ${accessToken}`;
  return config;
});

// Automatically handle 401 responses by attempting to refresh the access token
let isRefreshing = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let failedQueue: any[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
    response => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers["Authorization"] = `Bearer ${token}`;
                    return axiosInstance.request(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/auth/refresh-access-token`, {
                    withCredentials: true
                });
                
                if (response.data) {
                    const { accessToken } = response.data.content;
                    useAppStore.getState().setAccessToken(accessToken);
                    originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                    processQueue(null, accessToken);
                    return axiosInstance.request(originalRequest);
                }
            } catch (err) {
                processQueue(err, null);
                useAppStore.getState().setUser(null);
                useAppStore.getState().setAccessToken(null);
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
