import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, API_BASE_URL } from '../../config';
import { Bot, Clipboard, Check, RefreshCw, X, Trash2, Loader, ThumbsUp, ThumbsDown, MinusCircle } from 'lucide-react';

const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

const AiPanel = ({ message, onUseSuggestion, onClose, onSuggestionGenerated }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [copiedStates, setCopiedStates] = useState({});
  const [feedbackStates, setFeedbackStates] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState({});
  const [modelVersion, setModelVersion] = useState('v1.00');
  const modelOptions = [
    { value: 'v1.00', label: 'v1.00' },
    { value: 'v1.01', label: 'v1.01 (Beta)' },
  ];
  const isDarkMode = useIsDarkMode();

  const resetLocalStates = useCallback(() => {
    setLoadingStates({});
    setSuggestions([]);
    setError(null);
    setCopiedStates({});
    setFeedbackStates({});
    setFeedbackLoading({});
  }, []);

  useEffect(() => {
    if (message) {
      // Initialize suggestions from the message prop when the panel becomes visible
      setSuggestions(message.suggestions || []);
    } else {
      // Clear state when panel is hidden or no message is selected
      resetLocalStates();
    }
  }, [message, resetLocalStates]);

  const handleGenerateSuggestion = useCallback(async (style) => {
    if (!message) return;

    setLoadingStates(prev => ({ ...prev, [style]: true }));
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.SUGGEST_REPLY}`,
        {
          message_id: message._id,
          generation_style: style,
          model_version: modelVersion,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newSuggestions = response.data.suggestions || [];
      setSuggestions(newSuggestions);
      // Notify parent component about the update
      if (onSuggestionGenerated) {
        onSuggestionGenerated(message._id, newSuggestions);
      }
    } catch (err) {
      console.error(`Error generating ${style} suggestion:`, err);
      setError(`Failed to generate ${style} suggestion. Please try again.`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [style]: false }));
    }
  }, [message, onSuggestionGenerated, modelVersion]);
  
  const handleDeleteSuggestion = useCallback(async (suggestionId) => {
    if (!message) return;

    // Use a unique loader key for deletion
    const deleteLoaderKey = `delete_${suggestionId}`;
    setLoadingStates(prev => ({ ...prev, [deleteLoaderKey]: true }));
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.delete(
        `${API_BASE_URL}${API_ENDPOINTS.SUGGEST_REPLY}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            message_id: message._id,
            suggestion_id: suggestionId
          }
        }
      );
      
      const newSuggestions = response.data.suggestions || [];
      setSuggestions(newSuggestions);
      // Notify parent component about the update
      if (onSuggestionGenerated) {
        onSuggestionGenerated(message._id, newSuggestions);
      }
    } catch (err) {
      console.error(`Error deleting suggestion:`, err);
      setError(`Failed to delete suggestion. Please try again.`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [deleteLoaderKey]: false }));
    }
  }, [message, onSuggestionGenerated]);

  const fetchFeedbacks = useCallback(async () => {
    if (!message) return;
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('access_token');
      const roomId = message.room_id || message._id || '';
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.FEEDBACK}?room_id=${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map trạng thái đánh giá cho từng suggestion theo output + style
      const states = {};
      (res.data || []).forEach(fb => {
        if (fb.output && fb.rating && fb.style) {
          states[fb.output + fb.style] = fb.rating;
        }
      });
      setFeedbackStates(states);
    } catch (err) {
      setFeedbackStates({});
    }
  }, [message]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks, suggestions]);

  const handleFeedback = async (suggestion, rating) => {
    if (!message) return;
    const token = localStorage.getItem('admin_token') || localStorage.getItem('access_token');
    const feedbackData = {
      input: message.content,
      output: suggestion.text,
      rating,
      style: suggestion.style,
      timestamp: new Date().toISOString(),
      room_id: message.room_id || message._id || '',
      model_version: suggestion.model_version || modelVersion
    };
    await axios.post(
      `${API_BASE_URL}${API_ENDPOINTS.FEEDBACK}`,
      feedbackData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchFeedbacks(); // fetch lại để cập nhật trạng thái
  };

  const handleCopyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedStates({ [id]: true });
    setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
  };

  if (!message) return null;

  const suggestionStyles = ['Formal', 'Friendly', 'Simple'];

  return (
    <div className="h-[calc(100vh-32px)] flex flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-l border-gray-200 dark:border-gray-600 rounded-3xl shadow-2xl mx-2 overflow-hidden transition-all duration-300 max-w-md w-full" style={{minWidth: 320, marginTop: 0, marginBottom: 0}}>
      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-2 p-6 border-b border-gray-200/60 dark:border-gray-600/60 bg-gradient-to-r from-[#D0BCFF] to-[#F6F7FB] dark:from-[#2A2250] dark:to-[#1E1E2F] rounded-t-3xl transition-all duration-300">
        <Bot size={36} className="text-indigo-500 dark:text-indigo-400 mb-1 transition-colors duration-300" />
        <h2 className="text-xl font-bold text-[#333] dark:text-gray-100 tracking-wide transition-colors duration-300">AI Suggestions</h2>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors duration-200">
          <X size={22} className="text-gray-600 dark:text-gray-400 transition-colors duration-300" />
        </button>
      </div>
      <div className="p-6 flex-1 flex flex-col min-h-0">
        {/* Original Message */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-300">Customer Message:</label>
          <p className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-base text-gray-800 dark:text-gray-100 break-words shadow-sm transition-all duration-300">
            {message?.content || 'No message selected.'}
          </p>
        </div>
        {/* Model version select */}
        <div className="mb-6 w-full flex items-center">
          <label className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-200">Model Version:</label>
          <select
            value={modelVersion}
            onChange={e => setModelVersion(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ minWidth: 120 }}
          >
            {modelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Suggestion Generation */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-300">Generate Suggestion Style:</label>
          <div className="mt-3 flex gap-3">
            {suggestionStyles.map(style => {
              const isLoading = loadingStates[style];
              const styleClasses = {
                Formal: 'text-indigo-700 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-500/80 shadow hover:bg-indigo-200 dark:hover:bg-gradient-to-r dark:hover:from-indigo-700 dark:hover:to-indigo-400 hover:shadow-lg',
                Friendly: 'text-emerald-700 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-500/80 shadow hover:bg-emerald-200 dark:hover:bg-gradient-to-r dark:hover:from-emerald-700 dark:hover:to-emerald-400 hover:shadow-lg',
                Simple: 'text-sky-700 dark:text-sky-100 bg-sky-100 dark:bg-sky-500/80 shadow hover:bg-sky-200 dark:hover:bg-gradient-to-r dark:hover:from-sky-700 dark:hover:to-sky-400 hover:shadow-lg',
              };
              return (
                <button
                  key={style}
                  onClick={() => handleGenerateSuggestion(style)}
                  disabled={isLoading}
                  className={`flex-1 flex items-center justify-center rounded-xl border border-transparent px-4 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 shadow transition-all duration-300 ${styleClasses[style]}`}
                >
                  {isLoading ? <Loader size={18} className="animate-spin mr-2" /> : null}
                  {style}
                </button>
              );
            })}
          </div>
        </div>
        {/* Suggestions List */}
        <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
          {suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-start min-h-full h-full flex-1">
               <img src={isDarkMode ? '/ai-bot-placeholder-dark.png' : '/ai-bot-placeholder.png'} alt="AI Bot" style={{ width: '100%', maxWidth: 700, maxHeight: 680, objectFit: 'contain', marginBottom: 8 }} />
               <div className="flex-1 w-full" />
            </div>
          )}
          {suggestions.map((suggestion, idx) => {
            const styleColorClass = {
              Formal: 'text-indigo-900 dark:text-indigo-100',
              Friendly: 'text-emerald-900 dark:text-emerald-100',
              Simple: 'text-sky-900 dark:text-sky-100',
            }[suggestion.style] || 'text-gray-900 dark:text-gray-100';
            const styleLabelClass = {
              Formal: 'text-indigo-700 dark:text-indigo-200 font-bold',
              Friendly: 'text-emerald-700 dark:text-emerald-200 font-bold',
              Simple: 'text-sky-700 dark:text-sky-200 font-bold',
            }[suggestion.style] || 'text-gray-700 dark:text-gray-200 font-bold';
            return (
              <div key={idx} className={`bg-${suggestion.style.toLowerCase().replace(' ', '-')}-100 dark:bg-${suggestion.style.toLowerCase().replace(' ', '-')}-900/60 rounded-2xl shadow-lg p-5 flex flex-col gap-4 border border-${suggestion.style.toLowerCase().replace(' ', '-')}-200 dark:border-${suggestion.style.toLowerCase().replace(' ', '-')}-800`}>
                <div className={`flex items-center gap-2 mb-2`}>
                  <Clipboard size={18} className="text-indigo-400" />
                  <span className={styleLabelClass}>{suggestion.style}</span>
                </div>
                <div className={`${styleColorClass} text-base leading-relaxed transition-colors duration-300`}>{suggestion.text}</div>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => onUseSuggestion(suggestion.text)} className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white font-semibold shadow hover:bg-indigo-600 hover:scale-105 hover:bg-gray-100 transition-transform duration-150">Use</button>
                  <button onClick={() => handleCopyToClipboard(suggestion.text, idx)} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 transition-transform duration-150 flex items-center gap-1">
                    <Clipboard size={16} />
                    {copiedStates[idx] ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => handleDeleteSuggestion(suggestion.created_at)} className="ml-auto p-2 rounded-full hover:bg-red-100 transition">
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-gray-500 text-sm">Feedback:</span>
                  <button onClick={() => handleFeedback(suggestion, 'like')} className={`p-2 rounded-full ${feedbackStates[suggestion.text+suggestion.style]==='like' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-gray-100 text-gray-400'}`}><ThumbsUp size={18} /></button>
                  <button onClick={() => handleFeedback(suggestion, 'dislike')} className={`p-2 rounded-full ${feedbackStates[suggestion.text+suggestion.style]==='dislike' ? 'bg-rose-100 text-rose-500' : 'hover:bg-gray-100 text-gray-400'}`}><ThumbsDown size={18} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Caution dưới cùng */}
      <div className="w-full px-6 pb-4 mt-auto">
        <span className="block text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/60 rounded-lg px-4 py-2 text-sm font-medium shadow">AI-generated results may be inaccurate. Use with caution.</span>
      </div>
    </div>
  );
};

export default AiPanel; 