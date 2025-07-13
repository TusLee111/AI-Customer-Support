import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Send, X, User, Shield, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Single Message Component
const Message = ({ msg, onReply, isOtherTyping, lastSeen, handleInputChange }) => {
  const isFromAdmin = msg.user_type === 'admin';
  const repliedMessage = msg.reply_to_message;
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-start gap-3 my-4 ${isFromAdmin ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${isFromAdmin ? 'bg-indigo-500' : 'bg-gray-400'}`}>
        {isFromAdmin ? <Shield size={18} /> : <User size={18} />}
      </div>
      <div className={`p-3 rounded-lg max-w-lg ${isFromAdmin ? 'bg-white' : 'bg-indigo-100 text-indigo-900'}`}>
        {repliedMessage && (
          <div className="mb-2 p-2 border-l-2 border-indigo-300 bg-indigo-50/50 rounded-r-md">
            <p className="text-xs font-semibold text-indigo-700">
              Replying to {repliedMessage.user_type === 'admin' ? 'Admin' : 'Yourself'}
            </p>
            <p className="text-xs text-indigo-800 truncate">
              {repliedMessage.content}
            </p>
          </div>
        )}
        <p className="text-sm">{msg.content}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
          {isFromAdmin && (
            <button onClick={() => onReply(msg)} className="text-xs text-indigo-600 hover:underline">
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Chat Interface Component
const ChatInterface = () => {
  const { socket, isConnected, emitTyping, emitStopTyping, emitSeen } = useSocket();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const roomId = user?.id; // The room is identified by the customer's ID
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null); // {user_id, last_message_id}
  const typingTimeoutRef = useRef(null);

  // Navigate to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Effect to scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup room and fetch message history
  useEffect(() => {
    if (!roomId) return;
    let isActive = true;

    const setupAndFetch = async () => {
      try {
        setIsLoadingHistory(true);
        const customerName = user?.name || user?.username || `Customer`;
        
        // Create/ensure room exists
        await axios.post(`${API_BASE_URL}/api/public/rooms`, {
          customer_id: roomId,
          customer_name: customerName,
        });

        if (!isActive) return;

        // Fetch history
        const res = await axios.get(`${API_BASE_URL}/api/public/rooms/${roomId}/messages`);
        if (isActive) {
          setMessages(res.data || []);
        }

      } catch (err) {
        console.error("Error setting up chat or fetching messages:", err);
      } finally {
        if (isActive) {
          setIsLoadingHistory(false);
        }
      }
    };

    setupAndFetch();
    return () => { isActive = false; };
  }, [roomId, user]);

  // Effect to handle incoming messages and join room
  useEffect(() => {
    if (isConnected && socket && roomId) {
      console.log(`Joining room: ${roomId}`);
      socket.emit('join_room', { room_id: roomId, user_id: roomId, user_type: 'customer' });

      const handleNewMessage = (message) => {
        if (message.room_id === roomId) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        console.log(`Leaving room: ${roomId}`);
        socket.off('new_message', handleNewMessage);
        socket.emit('leave_room', { room_id: roomId });
      };
    }
  }, [isConnected, socket, roomId]);

  // Lắng nghe typing/stop_typing/seen
  useEffect(() => {
    if (!isConnected || !socket || !roomId) return;
    const handleTyping = (data) => {
      if (data.room_id === roomId && data.user_type === 'admin') setIsOtherTyping(true);
    };
    const handleStopTyping = (data) => {
      if (data.room_id === roomId && data.user_type === 'admin') setIsOtherTyping(false);
    };
    const handleSeen = (data) => {
      console.log('[DEBUG] Received seen:', data);
      if (data.room_id === roomId && data.user_type === 'admin') setLastSeen({ user_id: data.user_id, user_type: data.user_type, last_message_id: data.last_message_id });
    };
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('seen', handleSeen);
    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('seen', handleSeen);
    };
  }, [isConnected, socket, roomId]);

  // Gửi seen khi focus vào chat, khi có tin nhắn mới, khi chuyển phòng
  useEffect(() => {
    if (!roomId || !messages.length) return;
    const handleFocus = () => {
      emitSeen(roomId, messages[messages.length-1]._id);
    };
    window.addEventListener('focus', handleFocus);
    emitSeen(roomId, messages[messages.length-1]._id);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [roomId, messages, emitSeen]);

  // Gửi typing khi gõ input
  const handleInputChange = (val) => {
    setInput(val);
    if (roomId) {
      if (val.trim()) {
        emitTyping(roomId);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          emitStopTyping(roomId);
        }, 1500);
      } else {
        emitStopTyping(roomId);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Gửi stop_typing khi gửi tin nhắn
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && isConnected && socket && roomId) {
      const payload = {
        room_id: roomId,
        content: input,
        user_id: user.id,
        user_type: 'customer',
        reply_to: replyingTo ? replyingTo._id : null,
      };
      socket.emit('send_message', payload);
      setInput('');
      setReplyingTo(null);
      emitStopTyping(roomId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm hover:bg-gray-700 p-2 rounded-md transition-colors"
          aria-label="Back to Home"
        >
          <ArrowLeft size={18} />
          <span>Home</span>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">Live Support</h1>
          {user && <span className="text-xs text-gray-300">{user.name || user.username}</span>}
        </div>
        <div className="w-20"></div> {/* Spacer */}
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading chat history...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">No messages yet. Start the conversation!</div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={msg._id} className="relative">
                <Message msg={msg} onReply={handleReply} isOtherTyping={isOtherTyping} lastSeen={lastSeen} handleInputChange={handleInputChange} />
                {/* Hiển thị avatar seen ở đúng vị trí tin nhắn mà admin đã đọc */}
                {lastSeen && lastSeen.last_message_id === msg._id && msg.user_type === 'customer' && lastSeen.user_type === 'admin' && (
                  <div className="absolute -bottom-5 right-0 flex items-center">
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-indigo-300 shadow">
                      <Shield size={12} className="text-white" />
                    </div>
                    <span className="ml-2 text-xs text-gray-400">Đã xem</span>
                  </div>
                )}
              </div>
            ))}
            {/* Hiển thị 3 chấm động nếu đối phương đang gõ */}
            {isOtherTyping && (
              <div className="flex items-center gap-2 mt-2 ml-12">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                <span className="ml-2 text-xs text-gray-400">Đang nhập...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t">
        {replyingTo && (
           <div className="mb-2 p-2 bg-gray-100 rounded-lg text-sm">
             <div className="flex justify-between items-center font-bold text-gray-600">
               <span>Replying to Admin</span>
               <button onClick={handleCancelReply} className="p-1 rounded-full hover:bg-gray-200">
                 <X size={16} />
               </button>
             </div>
             <p className="text-gray-500 truncate">{replyingTo.content}</p>
           </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && isConnected && socket && roomId) {
                  const payload = {
                    room_id: roomId,
                    content: input,
                    user_id: user.id,
                    user_type: 'customer',
                    reply_to: replyingTo ? replyingTo._id : null,
                  };
                  socket.emit('send_message', payload);
                  setInput('');
                  setReplyingTo(null);
                }
              }
            }}
            className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            disabled={!isConnected}
          />
          <button 
            type="submit" 
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform active:scale-95" 
            disabled={!input.trim() || !isConnected}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface; 