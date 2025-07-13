import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings,
  FileText,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Chat Logs', icon: FileText, path: '/chat-logs' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics' },
    { name: 'Settings', icon: Settings, path: '/settings' }
  ];

  const isActive = (path) => {
    if (path === '/chat') {
      return location.pathname === '/chat';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`h-full flex flex-col ${isCollapsed ? 'w-16' : 'w-[220px]'} bg-gradient-to-b from-[#D8D4FF] to-[#F6F7FB] dark:from-[#1E1E2F] dark:to-[#2A2250] shadow-xl transition-all duration-300 relative text-[#333] dark:text-gray-100`}>
      {/* Collapse button */}
      <button
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white/60 hover:bg-white/80 dark:bg-gray-700/60 dark:hover:bg-gray-700/80 shadow-md md:hidden transition-all duration-200"
        onClick={() => setIsCollapsed((prev) => !prev)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
      </button>
      <div className={`relative flex flex-col h-full z-10 ${isCollapsed ? 'items-center' : ''}`}> 
        {/* Logo/avatar + tên admin ở trên cùng */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center py-8' : 'gap-3 px-6 py-8'}`}>
          {!isCollapsed && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A7BFFF] to-[#C7D2FE] dark:from-[#7E5BEF] dark:to-[#A7BFFF] flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white dark:border-gray-700">A</div>}
          {!isCollapsed && <span className="font-bold text-lg text-[#7E5BEF] dark:text-[#A7BFFF] transition-colors duration-300">Admin</span>}
        </div>
        {/* Menu items */}
        <nav className={`flex-1 flex flex-col ${isCollapsed ? 'gap-4 items-center' : 'gap-2 px-2'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `${isCollapsed ? 'flex flex-col items-center justify-center w-12 h-12 my-2 rounded-xl hover:bg-[#EAEFFF] dark:hover:bg-[#2A2250] transition-all duration-200' : 'flex items-center gap-4 px-5 py-3 rounded-xl text-base font-semibold transition-all duration-200'} ` +
                (isActive
                  ? 'bg-white/80 text-[#7E5BEF] shadow border-l-4 border-[#A7BFFF] dark:bg-[#2A2250] dark:text-[#A7BFFF] dark:border-[#7E5BEF]'
                  : 'text-[#333] hover:bg-[#EAEFFF] dark:text-gray-200 dark:hover:bg-[#2A2250]')
              }
              title={item.name}
            >
              <item.icon size={24} strokeWidth={2} className="transition-colors duration-200" />
              {!isCollapsed && <span className="transition-colors duration-200">{item.name}</span>}
            </NavLink>
          ))}
        </nav>
        {/* Footer: trạng thái admin hoặc logout */}
        {!isCollapsed && <div className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">Online</div>}
      </div>
    </div>
  );
};

export default Sidebar; 