import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { ApiError } from '../types/api';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = `******;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/api/auth/refresh`, {
                refreshToken,
              });

              const { token } = response.data;
              await SecureStore.setItemAsync(TOKEN_KEY, token);

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `******;
              }

              return this.client(originalRequest);
            }
          } catch (refreshError) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        message: data?.message || 'An error occurred',
        code: data?.code,
        status: error.response.status,
        errors: data?.errors,
      };
    }

    if (error.request) {
      return {
        message: 'No response from server. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  public async setToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  public async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  public async removeToken() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export const apiClient = new ApiClient();
export default apiClient.getClient();
