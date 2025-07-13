import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Clock,
  User,
  UserCheck
} from 'lucide-react';
import { API_ENDPOINTS, API_BASE_URL, INTENT_TYPES, INTENT_COLORS } from '../config';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalChats: 0,
    totalMessages: 0,
    adminMessages: 0,
    customerMessages: 0,
    activeChats: 0,
    resolvedChats: 0,
    avgResponseTime: 0,
    satisfactionRate: 0,
    intentDistribution: {},
    chatTrends: [],
    aiUsage: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hiệu ứng PieChart vẽ lên khi vào trang
  const [pieData, setPieData] = useState([]);
  useEffect(() => {
    // Khi analytics.intentDistribution thay đổi, delay 300ms mới set pieData thật
    setPieData([]);
    const timeout = setTimeout(() => {
      const data = INTENT_COLOR_LIST
        .map(({ key, label }) => ({
          name: INTENT_LABELS[key] || label,
          value: analytics.intentDistribution?.[key] || 0,
          key,
        }))
        .filter(d => d.value > 0);
      setPieData(data);
    }, 100);
    return () => clearTimeout(timeout);
  }, [analytics.intentDistribution]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ANALYTICS_OVERVIEW}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Chuẩn hóa intent label và màu từ config
  const getIntentColor = (intent) => {
    const color = INTENT_COLORS[intent.replace('intent_', '')] || 'gray';
    return `bg-${color}-500`;
  };
  const getIntentLabel = (intent) => {
    const map = {
      greeting: 'Greeting',
      question: 'Question',
      complaint: 'Complaint',
      request: 'Request',
      farewell: 'Farewell',
      other: 'Other',
    };
    const key = intent.replace('intent_', '');
    return map[key] || intent;
  };

  // Thêm map cho intent label
  const INTENT_LABELS = {
    intent_clarification: 'Clarification',
    intent_commitment: 'Commitment',
    intent_delay: 'Delay',
    intent_follow_up: 'Follow Up',
    intent_greeting: 'Greeting',
    intent_negotiation: 'Negotiation',
    intent_propose_offer: 'Propose Offer',
    intent_rejection: 'Rejection',
  };

  // 8 màu cho 8 intent, đồng bộ bar và pie chart
  const INTENT_COLOR_LIST = [
    { key: 'intent_clarification', label: 'Clarification', bar: 'bg-orange-400', pie: '#fb923c' },
    { key: 'intent_propose_offer', label: 'Propose Offer', bar: 'bg-blue-400', pie: '#60a5fa' },
    { key: 'intent_negotiation', label: 'Negotiation', bar: 'bg-sky-400', pie: '#38bdf8' },
    { key: 'intent_greeting', label: 'Greeting', bar: 'bg-yellow-400', pie: '#facc15' },
    { key: 'intent_commitment', label: 'Commitment', bar: 'bg-gray-400', pie: '#a3a3a3' },
    { key: 'intent_rejection', label: 'Rejection', bar: 'bg-red-400', pie: '#f87171' },
    { key: 'intent_delay', label: 'Delay', bar: 'bg-purple-400', pie: '#a78bfa' },
    { key: 'intent_follow_up', label: 'Follow Up', bar: 'bg-green-400', pie: '#4ade80' },
  ];
  // Map intent key -> bar color
  const INTENT_COLORS = Object.fromEntries(INTENT_COLOR_LIST.map(i => [i.key, i.bar]));
  // Pie chart color theo đúng thứ tự intent trong pieData
  const PIE_COLORS = INTENT_COLOR_LIST.map(i => i.pie);

  const chatTrendsData = (analytics.chatTrends || []).map(trend => ({
    date: trend.date ? new Date(trend.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '',
    chats: trend.chats,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f7fb] to-[#eaefff] dark:from-[#18192a] dark:to-[#23243a] flex flex-col items-center transition-colors duration-300">
          {/* Header */}
      <div className="w-full flex flex-col items-center mb-6">
        <div className="flex items-center justify-center w-full max-w-7xl mt-8 mb-2">
              <button
                onClick={() => navigate('/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-800 font-semibold px-4 py-2 rounded-xl bg-white/80 dark:bg-[#23243a] shadow transition-all mr-4"
              >
            <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight drop-shadow-lg text-center flex-1">Analytics Dashboard</h1>
            </div>
          </div>

      {/* Hàng 1: Stats Grid */}
      <div className="w-full flex justify-center mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 w-full max-w-7xl">
          <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-6 flex flex-col items-center">
            <MessageCircle className="h-8 w-8 text-blue-500 mb-2 drop-shadow" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalChats}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">Total Messages</div>
                  </div>
          <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-6 flex flex-col items-center">
            <User className="h-8 w-8 text-green-500 mb-2 drop-shadow" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.adminMessages}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">Admin Messages</div>
                  </div>
          <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-6 flex flex-col items-center">
            <UserCheck className="h-8 w-8 text-purple-500 mb-2 drop-shadow" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.customerMessages}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">Customer Messages</div>
                </div>
          <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-6 flex flex-col items-center">
            <Users className="h-8 w-8 text-orange-500 mb-2 drop-shadow" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.activeChats}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">Active Chats</div>
              </div>
          <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-6 flex flex-col items-center">
            <Clock className="h-8 w-8 text-yellow-500 mb-2 drop-shadow" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.avgResponseTime}m</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 text-center">Avg Response Time</div>
                </div>
              </div>
            </div>

      {/* Hàng 2: Intent Distribution + Pie Chart */}
      <div className="w-full flex justify-center mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl items-stretch">
          {/* Intent Distribution Table */}
          <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-7 flex flex-col justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Intent Distribution</h3>
            <div className="space-y-5 flex-1">
              {analytics.intentDistribution && Object.keys(analytics.intentDistribution).length > 0 ? (
                Object.entries(analytics.intentDistribution).map(([intent, count]) => {
                  const total = Object.values(analytics.intentDistribution).reduce((sum, val) => sum + val, 0);
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  const label = INTENT_LABELS[intent] || intent.replace('intent_', '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const barColor = INTENT_COLORS[intent] || 'bg-gray-400';
                  return (
                    <div key={intent} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{label}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No intent distribution data available</div>
              )}
            </div>
          </div>
          {/* Pie Chart bên phải */}
          <div className="flex flex-col items-center justify-center bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-7 min-w-[520px] md:min-w-[680px]" style={{paddingRight: 48}}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Intent Ratio</h3>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                  labelLine={false}
                  isAnimationActive={true}
                  animationDuration={1500}
                >
                  {pieData.map((entry) => {
                    const colorIdx = INTENT_COLOR_LIST.findIndex(i => i.key === entry.key);
                    return <Cell key={entry.key} fill={PIE_COLORS[colorIdx]} />;
                  })}
                </Pie>
                <Tooltip />
                <Legend align="center" verticalAlign="bottom" layout="horizontal" height={48} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
              </div>
            </div>
          </div>

      {/* Hàng 3: Chat Trends - Line Chart */}
      <div className="w-full flex justify-center mb-10">
        <div className="bg-white/90 dark:bg-[#23243a] rounded-2xl shadow-2xl p-7 w-full max-w-6xl">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Chat Trends (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chatTrendsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 13, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 13, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, background: '#fff', color: '#222' }} />
              <Line type="monotone" dataKey="chats" stroke="#60a5fa" strokeWidth={3} dot={{ r: 6, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 10 }} fillOpacity={1} fill="url(#colorChats)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 