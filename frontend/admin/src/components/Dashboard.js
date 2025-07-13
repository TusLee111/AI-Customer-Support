import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  CheckCircle,
  BarChart3,
  Activity,
  ArrowRight,
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import { API_ENDPOINTS, API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [stats, setStats] = useState({
    totalChats: 0,
    activeChats: 0,
    resolvedChats: 0,
    avgResponseTime: '0',
    satisfactionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) {
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ADMIN_DASHBOARD}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          if (response.status === 401) {
            logout();
            navigate('/login');
            throw new Error('Unauthorized - Please log in again.');
          }
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        setError(error.message);
        // Fallback to mock data
        setStats({
          totalChats: 156,
          activeChats: 12,
          resolvedChats: 144,
          avgResponseTime: '2.5',
          satisfactionRate: 94
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f7fb] to-[#eaefff] dark:from-[#18192a] dark:to-[#23243a] transition-colors duration-300">
      {/* Card Header hiện đại */}
      <div className="w-full flex justify-center mt-8 mb-10">
        <div className="w-full max-w-xl bg-white/80 dark:bg-[#23243a]/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-[#23243a]/30 flex items-center px-6 py-4 gap-4">
          {/* Logo/Icon */}
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 dark:from-blue-700 dark:to-purple-700 shadow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {/* Tiêu đề */}
          <h1 className="flex-1 text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight text-center select-none drop-shadow-sm">
            Admin Dashboard
          </h1>
          {/* Nút phải */}
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 dark:bg-[#23243a]/90 shadow hover:bg-blue-100 dark:hover:bg-blue-900 transition-all duration-200 group"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white/90 dark:bg-[#23243a]/90 shadow hover:bg-red-100 dark:hover:bg-red-900 transition-all duration-200 group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-red-500 group-hover:text-red-700 dark:text-red-400 dark:group-hover:text-red-300" />
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Đã xóa Stats Grid, chỉ giữ lại Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Quick Action: Open Chat Interface */}
          <button onClick={() => navigate('/chat')} className="flex flex-col items-start p-6 rounded-2xl bg-gradient-to-br from-[#d0bcff] to-[#b2f0e6] dark:from-[#2A2250] dark:to-[#1E1E2F] shadow-xl hover:scale-105 transition-all duration-300 group">
            <MessageCircle className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">Open Chat Interface</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">Access the real-time chat interface with customers.</div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
          </button>
          {/* Quick Action: View Analytics */}
          <button onClick={() => navigate('/analytics')} className="flex flex-col items-start p-6 rounded-2xl bg-gradient-to-br from-[#b2f0e6] to-[#e0c3fc] dark:from-[#1E1E2F] dark:to-[#2A2250] shadow-xl hover:scale-105 transition-all duration-300 group">
            <BarChart3 className="w-10 h-10 text-green-500 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">View Analytics</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">View system statistics and performance charts.</div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300" />
          </button>
          {/* Quick Action: System Settings */}
          <button onClick={() => navigate('/settings')} className="flex flex-col items-start p-6 rounded-2xl bg-gradient-to-br from-[#ffe29f] to-[#d0bcff] dark:from-[#2A2250] dark:to-[#1E1E2F] shadow-xl hover:scale-105 transition-all duration-300 group">
            <Settings className="w-10 h-10 text-yellow-500 dark:text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">System Settings</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">Configure system, account, and security settings.</div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors duration-300" />
          </button>
          {/* Quick Action: Chat Logs */}
          <button onClick={() => navigate('/chat-logs')} className="flex flex-col items-start p-6 rounded-2xl bg-gradient-to-br from-[#e0c3fc] to-[#ffe29f] dark:from-[#1E1E2F] dark:to-[#2A2250] shadow-xl hover:scale-105 transition-all duration-300 group">
            <Activity className="w-10 h-10 text-purple-500 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">Chat Logs</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">Review the history of all conversations.</div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
          </button>
          {/* Quick Action: Test API */}
          <button onClick={() => navigate('/test-api')} className="flex flex-col items-start p-6 rounded-2xl bg-gradient-to-br from-[#b2f0e6] to-[#ffe29f] dark:from-[#2A2250] dark:to-[#1E1E2F] shadow-xl hover:scale-105 transition-all duration-300 group">
            <CheckCircle className="w-10 h-10 text-teal-500 dark:text-teal-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">Test API</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">Test and validate system API integrations.</div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300" />
          </button>
          {/* Quick Action: User Management */}
          <button onClick={() => navigate('/users')} className="flex flex-col items-start p-6 rounded-2xl bg-gradient-to-br from-[#d0bcff] to-[#e0c3fc] dark:from-[#1E1E2F] dark:to-[#2A2250] shadow-xl hover:scale-105 transition-all duration-300 group">
            <Users className="w-10 h-10 text-pink-500 dark:text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 transition-colors duration-300">User Management</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">Manage user accounts and permissions.</div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 