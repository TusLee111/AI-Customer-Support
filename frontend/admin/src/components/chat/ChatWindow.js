import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import { Send, X, Bot, MessageSquare, Search, Shield, User } from 'lucide-react';

const ChatWindow = ({ room, messages, onSendMessage, onReply, onSuggest, replyingTo, onCancelReply, currentUser, onChatAreaClick, isOtherTyping, lastSeen, handleInputChange }) => {
  const messageEndRef = useRef(null);
  const [input, setInput] = useState('');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Clear input when room changes
  useEffect(() => {
    setInput('');
    onCancelReply();
  }, [room]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  // Lọc message theo tên user hoặc user_type
  const filteredMessages = searchUser.trim()
    ? messages.filter(msg => (msg.user_name || '').toLowerCase().includes(searchUser.toLowerCase()) || (msg.user_type || '').toLowerCase().includes(searchUser.toLowerCase()))
    : messages;

  // Gọi onChatAreaClick khi click vào vùng chat hoặc message
  const handleChatAreaClick = () => {
    if (onChatAreaClick) onChatAreaClick();
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg m-4 transition-colors duration-300">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors duration-300">Select a conversation</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">Choose a conversation from the list to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-y-auto px-2 pb-2" onClick={handleChatAreaClick}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 shadow-sm z-10 rounded-t-xl transition-all duration-300">
        <div>
            <h3 className="text-lg font-semibold text-[#333] dark:text-gray-100 transition-colors duration-300">{room.customer_name || 'Customer'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">ID: {room._id}</p>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#FBFCFE] dark:bg-[#23243a] space-y-5 transition-colors duration-300">
        {messages && messages.length > 0 ? (
          <>
            {messages.map((msg, idx) => {
              const isSeen = lastSeen && lastSeen.last_message_id === msg._id && msg.user_type === 'admin' && lastSeen.user_type === 'customer';
              return (
                <React.Fragment key={msg._id}>
                  <div onClick={onChatAreaClick} className="relative">
                    <ChatMessage message={msg} onReply={onReply} onSuggest={onSuggest} currentUser={currentUser} />
                    {isSeen && (
                      <div className="flex items-center mt-3 justify-start ml-2">
                        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center border-2 border-gray-300 shadow">
                          <User size={24} className="text-white" />
                        </div>
                        <span className="ml-2 text-sm text-gray-400 font-semibold">Đã xem</span>
                      </div>
                    )}
                  </div>
                  {isSeen && <div className="h-2" />}
                </React.Fragment>
              );
            })}
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
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 transition-colors duration-300">
            No messages in this conversation yet.
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-600 z-10 rounded-b-xl transition-all duration-300">
        {/* Quick Reply */}
        <div className="flex gap-2 mb-2">
          {[
            {text: 'Hello 👋', icon: '📩'},
            {text: 'How can I help?', icon: '✏️'},
            {text: 'Please wait a moment...', icon: '🕐'}
          ].map((q, idx) => (
            <button
              key={q.text}
              type="button"
              className={`flex items-center gap-1 px-4 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-400 dark:hover:border-indigo-500 hover:scale-105 transition-all duration-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800`}
              onClick={() => setInput(q.text)}
            >
              <span className="text-base">{q.icon}</span>
              <span>{q.text}</span>
            </button>
          ))}
        </div>
        {replyingTo && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm transition-colors duration-300">
            <div className="flex justify-between items-center font-bold text-gray-600 dark:text-gray-300">
              <span>Replying to {replyingTo.user_type === 'admin' ? 'yourself' : 'Customer'}</span>
              <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
                <X size={16} />
              </button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 truncate transition-colors duration-300">{replyingTo.content}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <textarea
            name="message"
            value={input}
            onChange={(e) => handleInputChange(e.target.value, setInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  onSendMessage(input);
                  setInput('');
                }
              }
            }}
            className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-700 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-300 text-base shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none min-h-[44px] max-h-40"
            placeholder="Type your message..."
            autoComplete="off"
            rows={1}
          />
          <button type="submit" className="p-3 bg-gradient-to-br from-[#A7BFFF] to-[#C7D2FE] dark:from-[#7E5BEF] dark:to-[#A7BFFF] text-white rounded-xl hover:from-[#C7D2FE] hover:to-[#A7BFFF] dark:hover:from-[#A7BFFF] dark:hover:to-[#7E5BEF] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transform active:scale-95 shadow-lg" disabled={!input.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow; 