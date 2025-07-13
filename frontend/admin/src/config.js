// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  VERIFY_TOKEN: '/api/auth/verify',
  REFRESH_TOKEN: '/api/auth/refresh',
  ME: '/api/auth/me',
  
  // Chat
  CHAT_ROOMS: '/api/chat/rooms',
  CHAT_ROOM_MESSAGES: '/api/chat/rooms/:roomId/messages',
  CHAT_ROOM_CLOSE: '/api/chat/rooms/:roomId/close',
  CHAT_ROOM_REOPEN: '/api/chat/rooms/:roomId/reopen',
  CHAT_ROOM_TRANSFER: '/api/chat/rooms/:roomId/transfer',
  CHAT_MESSAGE_ANALYZE: '/api/chat/analyze',
  MESSAGES: '/api/chat/rooms',
  SEND_MESSAGE: '/api/chat/rooms',
  SEARCH_MESSAGES: '/api/chat/search',
  ANALYZE_MESSAGE: '/api/chat/analyze',
  CHAT_LOGS: '/api/chat/logs',
  
  // AI
  SUGGEST_REPLY: '/api/ai/suggest',
  FEEDBACK: '/api/ai/feedback',
  
  // Admin
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_SETTINGS: '/api/admin/settings',
  CUSTOMERS: '/api/admin/customers',
  INTENT_STATS: '/api/admin/intent-statistics',
  RESPONSE_TIME_STATS: '/api/admin/response-time-statistics',
  SYSTEM_CONFIG: '/api/admin/system-config',
  AI_PERFORMANCE: '/api/admin/ai-performance',
  EXPORT_DATA: '/api/admin/export-data',
  
  // Analytics
  ANALYTICS_OVERVIEW: '/api/analytics/overview',
  ANALYTICS_MESSAGES: '/api/analytics/messages',
  ANALYTICS_USERS: '/api/analytics/users',
  ANALYTICS_INTENTS: '/api/analytics/intents',
  CUSTOMER_BEHAVIOR: '/api/analytics/customer-behavior',
  AI_PERFORMANCE_METRICS: '/api/analytics/ai-performance-metrics',
  EXPORT_REPORT: '/api/analytics/export-report',
};

// Socket.IO Configuration
export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket']
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'AI Customer Support System',
  VERSION: '1.0.0',
  DEFAULT_PAGE_SIZE: 20,
  MAX_MESSAGE_LENGTH: 1000,
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  TYPING_INDICATOR_TIMEOUT: 3000, // 3 seconds
  MESSAGE_REFRESH_INTERVAL: 5000,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  DEFAULT_AVATAR: '/assets/default-avatar.png'
};

// Intent Types
export const INTENT_TYPES = {
  GREETING: 'greeting',
  QUESTION: 'question',
  COMPLAINT: 'complaint',
  REQUEST: 'request',
  FAREWELL: 'farewell',
  OTHER: 'other'
};

// Response Styles
export const RESPONSE_STYLES = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  FRIENDLY: 'friendly',
  PROFESSIONAL: 'professional'
};

// User Types
export const USER_TYPES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer'
};

// Chat Room Status
export const CHAT_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  CLOSED: 'closed'
};

// Colors for different intents
export const INTENT_COLORS = {
  greeting: 'green',
  question: 'blue',
  complaint: 'red',
  request: 'orange',
  farewell: 'purple',
  other: 'gray'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_DATA: 'user_data',
  SETTINGS: 'settings'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  AUTH_ERROR: 'Authentication failed. Please login again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.'
}; 