import React from 'react';
import { CornerDownRight, User, Shield, Bot } from 'lucide-react';

const ChatMessage = ({ message, onReply, onSuggest, currentUser, prevSender }) => {
  // Use user_type from the message object, which is sent by the backend.
  const isFromAdmin = message.user_type === 'admin';
  const repliedMessage = message.reply_to_message;

  console.log("ChatMessage render:", { 
    messageId: message._id, 
    content: message.content, 
    replyToMessage: repliedMessage,
    hasReply: !!repliedMessage 
  });

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const handleReplyClick = () => {
    console.log("Reply button clicked for message:", message);
    onReply(message);
  };

  const handleSuggestClick = () => {
    console.log("Suggest button clicked for message:", message);
    onSuggest(message);
  };

  // Determine margin bottom based on sender change
  const marginBottom = prevSender && prevSender !== message.user_type ? 'mb-4 md:mb-5' : 'mb-1 md:mb-2';

  return (
    <div className={`group flex items-end gap-3 my-2 ${isFromAdmin ? 'flex-row-reverse' : ''} hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-all duration-200 rounded-xl ${marginBottom}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center self-start ${isFromAdmin ? '' : ''}`}>
        {isFromAdmin ? <Shield size={22} strokeWidth={2} className="text-[#A7BFFF] dark:text-[#7E5BEF] transition-colors duration-300" /> : <User size={22} strokeWidth={2} className="text-[#7E5BEF] dark:text-[#A7BFFF] transition-colors duration-300" />}
      </div>

      {/* Bubble */}
      <div className={`relative px-5 py-3 rounded-xl max-w-lg ${isFromAdmin ? 'bg-gradient-to-br from-[#A7BFFF] to-[#C7D2FE] dark:bg-indigo-900 dark:bg-none dark:text-white' : 'bg-white dark:bg-gray-700 text-[#333] dark:text-gray-100'} shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-300`}>
        {message.is_ai && (
          <span className="absolute -top-3 left-4 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border border-indigo-200 dark:border-indigo-700 transition-all duration-300">AI Reply</span>
        )}
        {repliedMessage && (
          <div className="mb-2 p-2 border-l-2 border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 rounded-r-md transition-all duration-300">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors duration-300">
              {repliedMessage.user_type === 'admin' ? 'Replying to Admin' : 'Replying to Customer'}
            </p>
            <p className="text-xs text-indigo-800 dark:text-indigo-200 truncate transition-colors duration-300">
              {repliedMessage.content}
            </p>
          </div>
        )}
        <p className="text-base leading-relaxed transition-colors duration-300">{message.content}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-300 transition-colors duration-300">{formatTime(message.created_at)}</span>
        </div>
      </div>

      {/* Hover Icons */}
      {!isFromAdmin && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center self-end mb-1">
          <button 
            onClick={handleReplyClick} 
            className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 transition-colors duration-200"
            title="Reply"
          >
            <CornerDownRight size={16} strokeWidth={2} />
          </button>
          <button 
            onClick={handleSuggestClick} 
            className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 p-1 transition-colors duration-200"
            title="Get AI Suggestions"
          >
            <Bot size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 