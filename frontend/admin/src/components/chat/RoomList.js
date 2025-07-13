import React from 'react';
import { PanelLeftClose, PanelRightClose, MessageSquare, Search } from 'lucide-react';

const RoomList = ({ rooms, activeRoom, onSelectRoom, isCollapsed, onToggleCollapse, currentUser }) => {
  const [searchRoom, setSearchRoom] = React.useState('');
  const filteredRooms = rooms.filter(room => {
    const name = (room.customer_name || '').toLowerCase();
    const email = (room.customer_email || '').toLowerCase();
    return name.includes(searchRoom.toLowerCase()) || email.includes(searchRoom.toLowerCase());
  });
  return (
    <div className={`transition-all duration-300 bg-gradient-to-b from-[#EAEFFF] to-[#F6F7FB] shadow-xl border border-gray-200 dark:border-[#353569] flex flex-col h-full flex-shrink-0 rounded-3xl text-[#333] dark:bg-gradient-to-b dark:from-[#181926] dark:to-[#353569] dark:text-gray-100 ${isCollapsed ? 'w-16 items-center' : 'w-64 max-w-72'} overflow-hidden`} style={{margin: 0, height: '100%'}}>
      {/* Header with Conversations and toggle button */}
      <div className={`flex flex-col bg-transparent rounded-t-3xl border-b border-gray-200/60 dark:border-[#353569] shadow-sm transition-all duration-300 ${isCollapsed ? 'items-center justify-center min-h-[88px] h-[88px] p-0' : 'p-6'} relative dark:bg-transparent`}>
        {isCollapsed ? (
          <button onClick={onToggleCollapse} className="p-2 rounded-lg hover:bg-indigo-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <PanelRightClose size={22} className="text-indigo-400" />
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#333] dark:text-gray-100">Conversations</h2>
              <button onClick={onToggleCollapse} className="p-2 rounded-lg hover:bg-indigo-100">
                <PanelLeftClose size={22} className="text-indigo-400" />
              </button>
            </div>
            <div className="relative w-full mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search room..."
                value={searchRoom}
                onChange={e => setSearchRoom(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-gray-50 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-800"
                style={{ minWidth: 0 }}
              />
            </div>
          </>
        )}
      </div>
      {/* Danh sách room */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-0 py-2' : 'px-2 py-2'} dark:bg-transparent`}>
        {filteredRooms.map((room) => {
          const isActive = (activeRoom && (activeRoom._id === room._id || activeRoom.room_id === room._id || activeRoom._id === room.room_id || activeRoom.room_id === room.room_id));
          const lastMsg = room.last_message_preview || room.last_message?.content || room.last_message || room.customer_email || '';
          const lastMsgShort = lastMsg?.length > 40 ? lastMsg.slice(0, 40) + '…' : lastMsg;
          const unread = room.unread_count || room.unread || 0;
          const avatarText = (room.customer_name || 'U').charAt(0).toUpperCase();
          return (
            <div
              key={room._id || room.room_id}
              className={`cursor-pointer border-l-4 transition-colors duration-200 select-none group flex items-center ${isCollapsed ? 'justify-center px-0 py-4' : 'gap-3 px-3 py-3 mb-2'} rounded-xl hover:bg-indigo-100 ${isActive ? 'border-indigo-400 shadow-md bg-gradient-to-r from-[#EAE2F8] to-[#D0BCFF] dark:bg-indigo-900 dark:bg-none dark:text-white' : 'bg-transparent border-transparent'}`}
              onClick={() => onSelectRoom(room)}
              style={{alignItems: 'flex-start'}}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#A7BFFF] to-[#C7D2FE] flex items-center justify-center text-white font-bold text-lg shadow ${isCollapsed ? '' : 'mr-3'} dark:bg-[#7E5BEF]`}>
                {avatarText}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-lg text-[#333] dark:text-gray-100 truncate">{room.customer_name || 'Unknown User'}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-sm text-gray-500 dark:text-gray-300 truncate flex-1">{lastMsgShort}</div>
                    {unread > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow border-2 border-white min-w-[22px] text-center flex items-center justify-center dark:bg-red-400 dark:text-white dark:border-gray-800">{unread}</span>
                    )}
                  </div>
                </div>
              )}
              {isCollapsed && unread > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 shadow border-2 border-white min-w-[18px] text-center flex items-center justify-center absolute top-2 right-2 dark:bg-red-400 dark:text-white dark:border-gray-800">{unread}</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Footer */}
      <div className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 dark:bg-transparent transition-colors duration-300">Online</div>
    </div>
  );
};

export default RoomList;