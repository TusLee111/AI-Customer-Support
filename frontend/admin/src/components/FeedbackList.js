import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import * as XLSX from 'xlsx';

const FeedbackList = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterModelVersion, setFilterModelVersion] = useState('all');

  // Lấy room_id từ query param nếu có
  const params = new URLSearchParams(location.search);
  const roomId = params.get('room');

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE_URL}/api/ai/feedback`;
        if (roomId) url += `?room_id=${roomId}`;
        const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
        console.log('[FeedbackList] Fetching:', url, 'Token:', token);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        console.log('[FeedbackList] Data:', data);
        setFeedbacks(data);
      } catch (err) {
        setFeedbacks([]);
        console.error('[FeedbackList] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, [roomId]);

  // Lọc và sort feedbacks
  const filtered = feedbacks.filter(fb => {
    const matchSearch =
      fb.input?.toLowerCase().includes(search.toLowerCase()) ||
      fb.output?.toLowerCase().includes(search.toLowerCase());
    const matchRating = filterRating === 'all' || fb.rating === filterRating;
    const matchStyle = filterStyle === 'all' || fb.style === filterStyle;
    const matchDate = !filterDate || (fb.timestamp && fb.timestamp.startsWith(filterDate));
    const getVersion = fb => {
      if (fb.model_version) return fb.model_version;
      if (fb.timestamp && new Date(fb.timestamp) >= new Date('2025-07-01')) return 'v1.01';
      return 'v1.00';
    };
    const matchModelVersion = filterModelVersion === 'all' || getVersion(fb) === filterModelVersion;
    return matchSearch && matchRating && matchStyle && matchDate && matchModelVersion;
  }).sort((a, b) => {
    if (sortField === 'timestamp') {
      return sortOrder === 'asc'
        ? new Date(a.timestamp) - new Date(b.timestamp)
        : new Date(b.timestamp) - new Date(a.timestamp);
    }
    if (sortField === 'input') {
      return sortOrder === 'asc'
        ? (a.input || '').localeCompare(b.input || '')
        : (b.input || '').localeCompare(a.input || '');
    }
    if (sortField === 'output') {
      return sortOrder === 'asc'
        ? (a.output || '').localeCompare(b.output || '')
        : (b.output || '').localeCompare(a.output || '');
    }
    if (sortField === 'style') {
      return sortOrder === 'asc'
        ? (a.style || '').localeCompare(b.style || '')
        : (b.style || '').localeCompare(a.style || '');
    }
    if (sortField === 'rating') {
      return sortOrder === 'asc'
        ? (a.rating || '').localeCompare(b.rating || '')
        : (b.rating || '').localeCompare(a.rating || '');
    }
    if (sortField === 'model_version') {
      const getVersion = fb => {
        if (fb.model_version) return fb.model_version;
        if (fb.timestamp && new Date(fb.timestamp) >= new Date('2025-07-01')) return 'v1.01';
        return 'v1.00';
      };
      return sortOrder === 'asc'
        ? getVersion(a).localeCompare(getVersion(b))
        : getVersion(b).localeCompare(getVersion(a));
    }
    return 0;
  });

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filtered.map(fb => ({
      Input: fb.input,
      Output: fb.output,
      Style: fb.style,
      Rating: fb.rating,
      Timestamp: fb.timestamp ? new Date(fb.timestamp).toLocaleString() : ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Feedback');
    XLSX.writeFile(wb, `feedback_export_${roomId || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Delete feedback
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
      await fetch(`${API_BASE_URL}/api/ai/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbacks(prev => prev.filter(fb => fb._id !== id));
    } catch (err) {
      alert('Failed to delete feedback!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">AI Feedback List {roomId && `(Room: ${roomId})`}</h2>
      <button
        className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        onClick={() => window.history.back()}
      >
        Back to Chat Log
      </button>
      {/* Filter and search */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search input/output..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <select value={filterRating} onChange={e => setFilterRating(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">All Ratings</option>
          <option value="like">Like</option>
          <option value="dislike">Dislike</option>
        </select>
        <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">All Styles</option>
          {/* Auto get style from feedbacks */}
          {[...new Set(feedbacks.map(fb => fb.style).filter(Boolean))].map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-2 py-1 border rounded"
        />
        <select value={filterModelVersion} onChange={e => setFilterModelVersion(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">All Versions</option>
          {[...new Set(feedbacks.map(fb => {
            if (fb.model_version) return fb.model_version;
            if (fb.timestamp && new Date(fb.timestamp) >= new Date('2025-07-01')) return 'v1.01';
            return 'v1.00';
          }))].sort().map(version => (
            <option key={version} value={version}>{version}</option>
          ))}
        </select>
        <select value={sortField} onChange={e => setSortField(e.target.value)} className="px-2 py-1 border rounded">
          <option value="timestamp">Sort by Time</option>
          <option value="input">Sort by Input</option>
          <option value="output">Sort by Output</option>
          <option value="style">Sort by Style</option>
          <option value="rating">Sort by Rating</option>
          <option value="model_version">Sort by Model Version</option>
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="px-2 py-1 border rounded">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <button
          onClick={() => {
            setSearch('');
            setFilterRating('all');
            setFilterStyle('all');
            setFilterDate('');
            setFilterModelVersion('all');
            setSortField('timestamp');
            setSortOrder('desc');
          }}
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
      {loading ? (
        <div>Loading...</div>
      ) : filtered.length === 0 ? (
        <div>No feedback found.</div>
      ) : (
        <table className="min-w-full bg-white border rounded-lg">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Input</th>
              <th className="px-4 py-2 border">Output</th>
              <th className="px-4 py-2 border">Style</th>
              <th className="px-4 py-2 border">Rating</th>
              <th className="px-4 py-2 border">Timestamp</th>
              <th className="px-4 py-2 border">Model Version</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((fb, idx) => {
              // Xác định version model
              let version = fb.model_version;
              if (!version) {
                if (fb.timestamp && new Date(fb.timestamp) >= new Date('2025-07-01')) {
                  version = 'v1.01';
                } else {
                  version = 'v1.00';
                }
              }
              return (
                <tr key={fb._id || idx}>
                  <td className="px-4 py-2 border">{fb.input}</td>
                  <td className="px-4 py-2 border">{fb.output}</td>
                  <td className="px-4 py-2 border">{fb.style || ''}</td>
                  <td className="px-4 py-2 border">{fb.rating}</td>
                  <td className="px-4 py-2 border">{fb.timestamp ? new Date(fb.timestamp).toLocaleString() : ''}</td>
                  <td className="px-4 py-2 border">{version}</td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => handleDelete(fb._id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FeedbackList; 