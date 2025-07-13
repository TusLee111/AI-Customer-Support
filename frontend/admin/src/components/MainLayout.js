import React from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        {children}
      </main>
    </div>
  );
};

export default MainLayout; 