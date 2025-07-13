import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/chat/ChatInterface';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import ChatLog from './components/ChatLog';
import TestAPI from './components/TestAPI';
import UserManagement from './components/UserManagement';
import MainLayout from './components/MainLayout';
import FeedbackList from './components/FeedbackList';
import CustomerMessages from './components/CustomerMessages';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

// Layout for protected routes
const ProtectedLayout = () => {
  return (
    <ProtectedRoute>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ProtectedRoute>
  );
};

// Main App Component
const AppContent = () => {
  // Load settings from localStorage on app start
  useEffect(() => {
    const savedSettings = localStorage.getItem('admin_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // Apply dark mode
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chat" element={<ChatInterface />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="chat-logs" element={<ChatLog />} />
          <Route path="test-api" element={<TestAPI />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
        
        <Route path="/feedback" element={<FeedbackList />} />
        <Route path="/customer-messages" element={<CustomerMessages />} />
        
        {/* Fallback route if no other route matches */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

// Root App Component
const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App; 