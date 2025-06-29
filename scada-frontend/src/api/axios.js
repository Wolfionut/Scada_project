// src/api/axios.js - Production version with better 401 handling
import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: 'http://localhost:4000/api',
    timeout: 10000,
});

// Request interceptor to add authentication token
api.interceptors.request.use(
    (config) => {
        console.log('Making request to:', config.baseURL + config.url);

        // Don't add Authorization header to login/register requests
        const isAuthRequest = config.url.includes('/auth/login') ||
            config.url.includes('/auth/register');

        if (!isAuthRequest) {
            // Get token from localStorage or sessionStorage
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (token) {
                // Check if token is expired before making request
                try {
                    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                    const currentTime = Date.now() / 1000;

                    if (tokenPayload.exp < currentTime) {
                        console.log('Token expired, clearing storage');
                        // Clear expired token
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        sessionStorage.removeItem('token');
                        sessionStorage.removeItem('user');

                        // Only redirect if not already on login page
                        if (!window.location.pathname.includes('/login')) {
                            window.location.href = '/login';
                        }
                        return Promise.reject(new Error('Token expired'));
                    }
                } catch (e) {
                    console.log('Error parsing token, clearing storage');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                }

                config.headers.Authorization = `Bearer ${token}`;
                console.log('Added Authorization header');
            } else {
                console.log('No token found for authenticated request');
            }
        } else {
            console.log('Skipping auth header for auth request');
        }
        return config;
    },
    (error) => {
        console.log('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
    (response) => {
        console.log('Response received:', response.status);
        return response;
    },
    (error) => {
        console.log('Response error:', error.response?.status, 'from', error.config?.url);

        // Handle 401 Unauthorized - but be more selective
        if (error.response?.status === 401) {
            console.log('401 Unauthorized detected');

            // Only auto-logout for auth-related endpoints or critical failures
            const isAuthEndpoint = error.config?.url?.includes('/auth/') ||
                error.config?.url?.includes('/users/profile');

            // Check error message for token-related issues
            const errorMessage = error.response?.data?.error || '';
            const isTokenError = errorMessage.includes('token') ||
                errorMessage.includes('unauthorized') ||
                errorMessage.includes('expired');

            if (isAuthEndpoint || isTokenError) {
                console.log('Critical auth error - clearing session');
                // Clear authentication
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');

                // Redirect to login page (only if not already there)
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            } else {
                console.log('Non-critical 401 - letting component handle it');
                // Let the component handle this 401 (might be missing data, etc.)
            }
        }

        return Promise.reject(error);
    }
);

export default api;