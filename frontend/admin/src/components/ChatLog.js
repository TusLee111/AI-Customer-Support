import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL, STORAGE_KEYS } from '../config';
import { 
  ArrowLeft, 
  Search, 
  User,
  MessageCircle,
  Download,
  Eye
} from 'lucide-react';

const ChatLog = () => {
  const navigate = useNavigate();
  const [chatLogs, setChatLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const fetchChatLogs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const response = await fetch(`${API_BASE_URL}/api/admin/rooms/active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch chat logs');
        const data = await response.json();
        setChatLogs(data);
      } catch (error) {
        console.error('Error fetching chat logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChatLogs();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getIntentLabel = (intent) => {
    if (!intent) {
      return 'N/A';
    }
    const labels = {
      'intent_greeting': 'Greeting',
      'intent_inquiry': 'Inquiry',
      'intent_complaint': 'Complaint',
      'intent_support': 'Support',
      'intent_farewell': 'Farewell',
      'intent_clarification': 'Clarification',
      'intent_commitment': 'Commitment',
      'intent_delay': 'Delay',
      'intent_follow_up': 'Follow-up',
      'intent_negotiation': 'Negotiation',
      'intent_propose_offer': 'Propose Offer',
      'intent_rejection': 'Rejection'
    };
    return labels[intent] || intent.replace('intent_', '').replace(/_/g, ' ');
  };

  const filteredLogs = chatLogs.filter(log => {
    if (!log || !log.customer_name) return false;
    const matchesSearch = searchTerm.trim() === '' ||
      log.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.customer_email && log.customer_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesDate = !selectedDate || (log.created_at && log.created_at.startsWith(selectedDate));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportLogs = () => {
    const csvContent = [
      ['ID', 'Customer Name', 'Email', 'Start Time', 'End Time', 'Duration', 'Messages', 'Status', 'Satisfaction', 'Intent', 'AI Usage'],
      ...filteredLogs.map(log => [
        log.room_id,
        log.customer_name,
        log.customer_email,
        log.created_at ? new Date(log.created_at).toLocaleString('en-US') : 'N/A',
        log.ended_at ? new Date(log.ended_at).toLocaleString('en-US') : 'In progress',
        log.duration,
        log.message_count,
        getStatusLabel(log.status),
        log.satisfaction || 'N/A',
        getIntentLabel(log.intent),
        `${log.ai_usage}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `chat_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chat Logs</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportLogs}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="resolved">Resolved</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setSelectedDate('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              >
                Clear Filters
              </button>
            </div>
            {/* Status explanation */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <b>Status:</b> <span className="inline-block ml-1">Active = Chatting, Pending = Waiting, Resolved = Finished/Resolved.</span>
            </div>
          </div>

          {/* Chat Logs Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Chat History ({chatLogs.length} records)
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading chat logs...</p>
              </div>
            ) : chatLogs.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No chat logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Messages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLogs.map((log) => (
                      <tr key={log.room_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {log.customer_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-US') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <MessageCircle className="w-4 h-4 mr-1 text-gray-400" />
                            {log.message_count}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                            {getStatusLabel(log.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigate(`/chat?room=${log.room_id}`)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center mr-2"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/feedback?room=${log.room_id}`)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 flex items-center mr-2"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            View Feedback
                          </button>
                          <button
                            onClick={() => navigate(`/customer-messages?room=${log.room_id}`)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 flex items-center"
                          >
                            <User className="w-4 h-4 mr-1" />
                            View Customer Messages
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLog; 