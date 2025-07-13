import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, API_BASE_URL } from '../config';
import { 
  BarChart3, 
  MessageCircle, 
  Users, 
  Activity, 
  CheckCircle, 
  FileText, 
  AlertTriangle 
} from 'lucide-react';

const TestAPI = () => {
  const [results, setResults] = useState({});

  const testEndpoints = async () => {
    const endpoints = [
      { name: 'Admin Dashboard', url: API_ENDPOINTS.ADMIN_DASHBOARD, icon: BarChart3 },
      { name: 'Chat Rooms', url: API_ENDPOINTS.CHAT_ROOMS, icon: MessageCircle },
      { name: 'Analytics Overview', url: API_ENDPOINTS.ANALYTICS_OVERVIEW, icon: BarChart3 },
      { name: 'Chat Logs', url: API_ENDPOINTS.CHAT_LOGS, icon: FileText },
      { name: 'User Management', url: API_ENDPOINTS.ADMIN_USERS, icon: Users },
    ];

    const token = localStorage.getItem('access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}: ${API_BASE_URL}${endpoint.url}`);
        const response = await fetch(`${API_BASE_URL}${endpoint.url}`, { headers });
        setResults(prev => ({
          ...prev,
          [endpoint.name]: {
            status: response.status,
            ok: response.ok,
            url: `${API_BASE_URL}${endpoint.url}`
          }
        }));
      } catch (error) {
        setResults(prev => ({
          ...prev,
          [endpoint.name]: {
            status: 'ERROR',
            ok: false,
            error: error.message,
            url: `${API_BASE_URL}${endpoint.url}`
          }
        }));
      }
    }
  };

  useEffect(() => {
    testEndpoints();
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">API Test Results</h2>
      <div className="flex justify-center mb-6">
        <button 
          onClick={testEndpoints}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition-all"
        >
          Test Again
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Object.entries(results).map(([name, result]) => {
          const endpoint = [
            { name: 'Dashboard', icon: BarChart3 },
            { name: 'Chat Rooms', icon: MessageCircle },
            { name: 'Analytics Overview', icon: BarChart3 },
            { name: 'Chat Logs', icon: FileText },
            { name: 'User Management', icon: Users },
          ].find(e => e.name === name);
          const Icon = endpoint ? endpoint.icon : Activity;
          let statusColor = result.ok ? 'bg-green-100 border-green-400 text-green-700' : (result.status === 401 ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-red-100 border-red-400 text-red-700');
          let statusText = result.ok ? 'Success' : (result.status === 401 ? 'Unauthorized' : 'Error');
          return (
            <div key={name} className={`border-2 ${statusColor} rounded-xl p-5 flex flex-col items-start shadow-md`}>
              <div className="flex items-center mb-2">
                <Icon className="w-7 h-7 mr-2" />
                <span className="text-lg font-semibold">{name}</span>
              </div>
              <div className="mb-1 text-sm break-all"><span className="font-medium">URL:</span> {result.url}</div>
              <div className="mb-1 text-sm"><span className="font-medium">Status:</span> {result.status} <span className="ml-2 font-semibold">({statusText})</span></div>
              {result.error && <div className="text-xs text-red-600 mt-1 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> {result.error}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestAPI; 