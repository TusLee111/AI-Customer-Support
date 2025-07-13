import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import * as XLSX from 'xlsx';

const INTENT_MAP = {
  intent_clarification: 'Clarification - Request for clarification or explanation.',
  intent_commitment: 'Commitment - Agreement, confirmation, or commitment.',
  intent_delay: 'Delay - Request to postpone or delay an action.',
  intent_follow_up: 'Follow-up - Checking progress or referring to previous exchange.',
  intent_greeting: 'Greeting - Friendly opening of the conversation.',
  intent_negotiation: 'Negotiation - Proposing adjustments to terms, price, time, etc.',
  intent_propose_offer: 'Propose Offer - Proposing an idea, project, or cooperation.',
  intent_rejection: 'Rejection - Refusing or disagreeing with a proposal or term.'
};

const SORT_OPTIONS = [
  { label: 'Content', value: 'content' },
  { label: 'Intent', value: 'intent' },
  { label: 'Timestamp', value: 'timestamp' }
];

const CustomerMessages = () => {
  const [messages, setMessages] = useState([]);
  const [intentHistory, setIntentHistory] = useState([]); // intent_history cho room
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchContent, setSearchContent] = useState('');
  const [filterIntent, setFilterIntent] = useState([]); // multi-select
  const [filterDate, setFilterDate] = useState('');
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roomId = params.get('room');

  // Fetch messages và intent_history
  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
      const [msgRes, intentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/rooms/${roomId}/customer-messages`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/admin/rooms/${roomId}/intent-history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const [msgData, intentData] = await Promise.all([msgRes.json(), intentRes.json()]);
      setMessages(msgData);
      setIntentHistory(intentData);
    } catch (err) {
      setMessages([]);
      setIntentHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) fetchAll();
    // eslint-disable-next-line
  }, [roomId]);

  // Lấy intent mới nhất cho mỗi message
  const getLatestIntent = (messageId) => {
    const intents = intentHistory.filter(i => i.message_id === messageId);
    if (!intents.length) return null;
    // Lấy intent mới nhất theo created_at
    return intents.reduce((latest, curr) => new Date(curr.created_at) > new Date(latest.created_at) ? curr : latest, intents[0]);
  };

  // Lấy danh sách intent thực tế từ intentHistory
  const allIntents = Array.from(new Set(intentHistory.map(i => i.intent).filter(Boolean)));

  // Lọc dữ liệu
  const filtered = messages.filter(msg => {
    const matchContent = !searchContent || (msg.content || '').toLowerCase().includes(searchContent.toLowerCase());
    const latestIntent = getLatestIntent(msg.id);
    const matchIntent = filterIntent.length === 0 || (latestIntent && filterIntent.includes(latestIntent.intent));
    const matchDate = !filterDate || (msg.timestamp && msg.timestamp.startsWith(filterDate));
    return matchContent && matchIntent && matchDate;
  });

  // Sắp xếp
  const sortedMessages = [...filtered].sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';
    if (sortBy === 'intent') {
      valA = getLatestIntent(a.id)?.intent || '';
      valB = getLatestIntent(b.id)?.intent || '';
    }
    if (sortBy === 'timestamp') {
      valA = valA ? new Date(valA) : new Date(0);
      valB = valB ? new Date(valB) : new Date(0);
    } else {
      valA = valA?.toString().toLowerCase();
      valB = valB?.toString().toLowerCase();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Xóa intent_history
  const handleDeleteIntent = async (intentId) => {
    if (!window.confirm('Are you sure you want to delete this intent?')) return;
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/intent-history/${intentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIntentHistory(prev => prev.filter(i => i.id !== intentId && i._id !== intentId));
      } else {
        alert('Failed to delete intent.');
      }
    } catch (err) {
      alert('Error deleting intent.');
    }
  };

  // Thêm intent mới cho message (AI tự động phân loại)
  const handleAddIntent = async (message) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
      // 1. Gọi API phân loại intent bằng AI
      const classifyRes = await fetch(`${API_BASE_URL}/api/admin/messages/${message.id}/classify-intent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!classifyRes.ok) {
        alert('Failed to classify intent by AI.');
        return;
      }
      const { intent, confidence } = await classifyRes.json();
      // 2. Gọi API tạo intent_history
      const classified_by = 'ai';
      const res = await fetch(`${API_BASE_URL}/api/admin/rooms/${roomId}/messages/${message.id}/intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ intent, confidence, classified_by })
      });
      if (res.ok) {
        fetchAll();
      } else {
        alert('Failed to add intent.');
      }
    } catch (err) {
      alert('Error adding intent.');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = sortedMessages.map(msg => {
      const latestIntent = getLatestIntent(msg.id);
      return {
        Content: msg.content,
        Intent: latestIntent?.intent || '',
        'Intent Description': INTENT_MAP[latestIntent?.intent] || '',
        Confidence: latestIntent?.confidence,
        Timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CustomerMessages');
    XLSX.writeFile(wb, `customer_messages_export_${roomId || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Intent multi-select UI
  const handleIntentChange = (intent) => {
    setFilterIntent(prev =>
      prev.includes(intent)
        ? prev.filter(i => i !== intent)
        : [...prev, intent]
    );
  };

  const clearFilter = () => {
    setSearchContent('');
    setFilterIntent([]);
    setFilterDate('');
    setSortBy('timestamp');
    setSortOrder('desc');
  };

  // Hàm sort cho UI
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">Customer Messages {roomId && `(Room: ${roomId})`}</h2>
      <button
        className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        onClick={() => window.history.back()}
      >
        Back to Chat Log
      </button>
      {/* Filter UI */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search content..."
          value={searchContent}
          onChange={e => setSearchContent(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        {/* Intent multi-select */}
        <div className="flex items-center gap-1">
          <span className="font-semibold">Intent:</span>
          <button
            className={`px-2 py-1 border rounded ${filterIntent.length === 0 ? 'bg-indigo-100 border-indigo-400' : 'bg-white border-gray-300'}`}
            onClick={() => setFilterIntent([])}
          >
            All
          </button>
          {allIntents.map(intent => (
            <button
              key={intent}
              className={`px-2 py-1 border rounded ${filterIntent.includes(intent) ? 'bg-indigo-200 border-indigo-500' : 'bg-white border-gray-300'}`}
              onClick={() => handleIntentChange(intent)}
            >
              {intent.replace('intent_', '').replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <button
          onClick={clearFilter}
          className="px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200"
        >
          Clear Filter
        </button>
        <button
          onClick={handleExportExcel}
          className="px-2 py-1 border rounded bg-green-500 text-white hover:bg-green-600"
        >
          Export to Excel
        </button>
      </div>
      {/* Sort UI */}
      <div className="flex items-center mb-4 gap-2">
        <span className="font-semibold">Sort by:</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`px-2 py-1 border rounded ${sortBy === opt.value ? 'bg-indigo-200 border-indigo-500' : 'bg-white border-gray-300'}`}
            onClick={() => handleSort(opt.value)}
          >
            {opt.label} {sortBy === opt.value ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>
      {/* Table */}
      <table className="min-w-full bg-white border rounded-lg">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Content</th>
            <th className="px-4 py-2 border">Intent</th>
            <th className="px-4 py-2 border">Confidence</th>
            <th className="px-4 py-2 border">Timestamp</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedMessages.map(msg => {
            const latestIntent = getLatestIntent(msg.id);
            return (
              <tr key={msg.id}>
                <td className="px-4 py-2 border">{msg.content}</td>
                <td className="px-4 py-2 border">{latestIntent ? `${latestIntent.intent} (${INTENT_MAP[latestIntent.intent] || ''})` : <span className="text-gray-400">No intent</span>}</td>
                <td className="px-4 py-2 border">{latestIntent ? latestIntent.confidence : ''}</td>
                <td className="px-4 py-2 border">{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</td>
                <td className="px-4 py-2 border">
                  {latestIntent ? (
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 mr-2"
                      onClick={() => handleDeleteIntent(latestIntent.id || latestIntent._id)}
                    >
                      Delete Intent
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => handleAddIntent(msg)}
                    >
                      Add Intent
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {loading && <div>Loading...</div>}
      {!loading && sortedMessages.length === 0 && <div>No messages found.</div>}
    </div>
  );
};

export default CustomerMessages; 