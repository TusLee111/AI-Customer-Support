import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, STORAGE_KEYS } from '../../config';
import { useLocation, useNavigate } from 'react-router-dom';
import { markRoomAsRead } from '../../services/api';
import notificationSound from '../../assets/notification.mp3';

import RoomList from './RoomList';
import ChatWindow from './ChatWindow';
import AiPanel from './AiPanel';
import { Bot } from 'lucide-react';

const ChatInterface = () => {
  const { isConnected, joinRoom, leaveRoom, sendMessage, subscribeToEvent, emitTyping, emitStopTyping, emitSeen } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [replyingTo, setReplyingTo] = useState(null);
  const [isRoomListCollapsed, setRoomListCollapsed] = useState(false);
  
  const [isAiPanelVisible, setAiPanelVisible] = useState(false);
  const [selectedMessageForAI, setSelectedMessageForAI] = useState(null);

  const notificationAudioRef = useRef(null);
  const lastPlayTimeRef = useRef(0);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null); // {user_id, last_message_id}
  const typingTimeoutRef = useRef(null);

  const fetchRooms = useCallback(async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return;
      const response = await axios.get(`${API_BASE_URL}/api/admin/rooms/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[ChatInterface] fetchRooms response:', response.data);
      setRooms(response.data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    if(user) {
      fetchRooms();
    }
  }, [fetchRooms, user]);

  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      setLastSeen(null); // reset seen khi đổi phòng
      return;
    };

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const response = await axios.get(`${API_BASE_URL}/api/admin/rooms/${activeRoom._id}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data || []);
        // Fetch trạng thái seen
        const seenRes = await axios.get(`${API_BASE_URL}/api/admin/rooms/${activeRoom._id}/last-seen`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setLastSeen(seenRes.data);
      } catch (error) {
        setMessages([]);
        setLastSeen(null);
      }
    };

    fetchMessages();
  }, [activeRoom]);

  useEffect(() => {
    if (!isConnected || !user) return;

    const handleNewMessage = (message) => {
        if (message.room_id === activeRoom?._id) {
            setMessages(prev => [...prev, message]);
            // Đã chuyển phát âm thanh notification lên SocketContext.js, không phát ở đây nữa
            if (message.user_type === 'customer') {
              // Tự động mark as read khi admin đang ở phòng chat
              markRoomAsRead(message.room_id).catch(()=>{});
            }
        }
    };

    const handleNewRoom = (room) => {
      fetchRooms();
    };

    const handleUpdateRoomList = () => {
      console.log('[ChatInterface] Received update_room_list event');
      fetchRooms();
    };
    
    const unsubscribeNewMessage = subscribeToEvent('new_message', handleNewMessage);
    const unsubscribeNewRoom = subscribeToEvent('new_room', handleNewRoom);
    const unsubscribeUpdateRoomList = subscribeToEvent('update_room_list', handleUpdateRoomList);

    return () => {
        unsubscribeNewMessage();
        unsubscribeNewRoom();
        unsubscribeUpdateRoomList();
    };
  }, [isConnected, user, activeRoom?._id, subscribeToEvent, fetchRooms]);

  const handleSelectRoom = useCallback(async (room) => {
    const roomId = room._id || room.room_id;
    const activeId = activeRoom?._id || activeRoom?.room_id;
    if (activeId !== roomId) {
      if (activeRoom) {
        leaveRoom(activeId);
      }
      setActiveRoom({ ...room, _id: roomId, room_id: roomId });
      joinRoom(roomId);
      setReplyingTo(null);
      try {
        await markRoomAsRead(roomId);
        fetchRooms();
      } catch (e) { console.error('Mark room as read failed', e); }
    }
  }, [activeRoom, joinRoom, leaveRoom, fetchRooms]);
  
  const handleInputChange = useCallback((val, setInput) => {
    setInput(val);
    if (activeRoom) {
      if (val.trim()) {
        emitTyping(activeRoom._id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          emitStopTyping(activeRoom._id);
        }, 1500);
      } else {
        emitStopTyping(activeRoom._id);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [activeRoom, emitTyping, emitStopTyping]);

  const handleSendMessage = useCallback((content) => {
     if (!content.trim() || !activeRoom || !user) return;
     const replyToId = replyingTo ? replyingTo._id : null;
     sendMessage(activeRoom._id, content, replyToId);
     setReplyingTo(null);
     emitStopTyping(activeRoom._id);
     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
   }, [activeRoom, user, sendMessage, replyingTo, emitStopTyping]);
  
  const handleReply = useCallback((message) => {
    setReplyingTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleSuggest = useCallback((message) => {
    if (isAiPanelVisible && selectedMessageForAI?._id === message._id) {
        setAiPanelVisible(false);
    } else {
        setSelectedMessageForAI(message);
        setAiPanelVisible(true);
    }
  }, [isAiPanelVisible, selectedMessageForAI]);

  const handleUseSuggestion = useCallback((suggestionText) => {
    if (!suggestionText.trim() || !activeRoom || !user) return;
    sendMessage(activeRoom._id, suggestionText);
  }, [activeRoom, user, sendMessage]);

  const handleSuggestionGenerated = (messageId, newSuggestions) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg._id === messageId ? { ...msg, suggestions: newSuggestions } : msg
      )
    );
    setSelectedMessageForAI(prev =>
      prev && prev._id === messageId ? { ...prev, suggestions: newSuggestions } : prev
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomIdFromQuery = params.get('room');
    if (roomIdFromQuery && rooms.length > 0) {
      const found = rooms.find(r => (r._id || r.room_id) === roomIdFromQuery);
      if (found) {
        handleSelectRoom(found);
        params.delete('room');
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      }
    }
    // eslint-disable-next-line
  }, [rooms, location.search]);

  // Hàm đánh dấu đã đọc khi click vào khung chat hoặc message
  const handleMarkRoomAsRead = useCallback(async () => {
    if (activeRoom && activeRoom._id) {
      try {
        await markRoomAsRead(activeRoom._id);
        fetchRooms();
      } catch (e) { console.error('Mark room as read failed', e); }
    }
  }, [activeRoom, fetchRooms]);

  // Lắng nghe typing/stop_typing/seen
  useEffect(() => {
    if (!isConnected || !user || !activeRoom) return;
    const handleTyping = (data) => {
      if (data.room_id === activeRoom._id && data.user_type === 'customer') setIsOtherTyping(true);
    };
    const handleStopTyping = (data) => {
      if (data.room_id === activeRoom._id && data.user_type === 'customer') setIsOtherTyping(false);
    };
    const handleSeen = (data) => {
      console.log('[DEBUG] Received seen:', data);
      if (data.room_id === activeRoom._id && data.user_type === 'customer') setLastSeen({ user_id: data.user_id, user_type: data.user_type, last_message_id: data.last_message_id });
    };
    const unsubTyping = subscribeToEvent('typing', handleTyping);
    const unsubStopTyping = subscribeToEvent('stop_typing', handleStopTyping);
    const unsubSeen = subscribeToEvent('seen', handleSeen);
    return () => { unsubTyping(); unsubStopTyping(); unsubSeen(); };
  }, [isConnected, user, activeRoom, subscribeToEvent]);

  // Gửi seen khi focus vào chat, khi có tin nhắn mới, khi chuyển phòng
  useEffect(() => {
    if (!activeRoom || !messages.length) return;
    const handleFocus = () => {
      emitSeen(activeRoom._id, messages[messages.length-1]._id);
    };
    window.addEventListener('focus', handleFocus);
    emitSeen(activeRoom._id, messages[messages.length-1]._id);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeRoom, messages, emitSeen]);

  return (
    <div className="flex h-full min-h-0 bg-gray-100 dark:bg-gray-900 transition-colors duration-300" style={{height: 'calc(100vh - 4rem)'}}>
      <audio ref={notificationAudioRef} src={notificationSound} preload="auto" />
      <div className="flex flex-1 min-w-0 h-full min-h-0">
        <RoomList 
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={handleSelectRoom}
          currentUser={user}
          isCollapsed={isRoomListCollapsed}
          onToggleCollapse={() => setRoomListCollapsed(prev => !prev)}
        />
        <div className={`${isRoomListCollapsed ? 'flex-[1_1_0%] ml-0' : 'flex-1 ml-0'} flex flex-col min-w-0 h-full min-h-0 transition-all duration-300`}>
          <ChatWindow
            room={activeRoom}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReply={handleReply}
            onSuggest={handleSuggest}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            currentUser={user}
            onChatAreaClick={handleMarkRoomAsRead}
            isOtherTyping={isOtherTyping}
            lastSeen={lastSeen}
            handleInputChange={handleInputChange}
          />
        </div>
        {isAiPanelVisible && (
          <AiPanel
            message={selectedMessageForAI}
            onUseSuggestion={handleUseSuggestion}
            onSuggestionGenerated={handleSuggestionGenerated}
            onClose={() => setAiPanelVisible(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ChatInterface;