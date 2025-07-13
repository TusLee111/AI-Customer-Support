// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
    // Auth endpoints
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VERIFY_TOKEN: '/api/auth/verify',
    REFRESH_TOKEN: '/api/auth/refresh',
    ME: '/api/auth/me',

    // Chat endpoints
    CHAT_ROOMS: '/api/chat/rooms',
    CHAT_ROOM_MESSAGES: '/api/chat/rooms/:roomId/messages',
    CHAT_MESSAGE_ANALYZE: '/api/chat/analyze'
};

export const SOCKET_CONFIG = {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket']
};

export const USER_TYPES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer'
};

export const CHAT_STATUS = {
    ACTIVE: 'active',
    CLOSED: 'closed',
    PENDING: 'pending'
};

export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error occurred. Please check your connection.',
    AUTH_ERROR: 'Authentication failed. Please login again.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.'
};

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    SETTINGS: 'settings'
};

export const APP_CONFIG = {
    MAX_MESSAGE_LENGTH: 1000,
    MESSAGE_REFRESH_INTERVAL: 5000,
    TYPING_INDICATOR_TIMEOUT: 2000,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf']
}; 