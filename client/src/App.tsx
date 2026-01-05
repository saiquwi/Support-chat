// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './graphql/apolloClient';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './modules/auth/Login';
import Register from './modules/auth/Register';
import ChatList from './modules/chat/ChatList';
import ChatWindow from './modules/chat/ChatWindow';

import './main.scss';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        setIsAuthenticated(false);
        setIsValidating(false);
        return;
      }
      
      setIsAuthenticated(true);
      setIsValidating(false);
    };
    
    validateToken();
  }, []);

  if (isValidating) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Layout компонент
const ChatLayout: React.FC = () => {

  console.log('ChatLayout mounted');
  
  useEffect(() => {
    console.log('ChatLayout useEffect ran');
    return () => {
      console.log('ChatLayout unmounted');
    };
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="chat-app">
      <header className="app-header">
        <h1>Support Chat System</h1>
        <div className="user-info">
          <span>Welcome, {user.username}</span>
          <button 
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </header>
      
      <div className="chat-container">
        <div className="chat-sidebar">
          <ChatList />
        </div>
        
        <div className="chat-main">
          {/* Outlet будет рендерить вложенные роуты */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <Router>
        <div className="app-wrapper">
          <ToastContainer />
          
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Основной роут с Layout */}
            <Route path="/" element={
              <PrivateRoute>
                <ChatLayout />
              </PrivateRoute>
            }>
              {/* Вложенные роуты */}
              <Route index element={
                <div className="no-chat-selected">
                  <h3>Select a chat to start messaging</h3>
                  <p>Choose a conversation from the list or start a new one</p>
                </div>
              } />
              <Route path="chat/:id" element={<ChatWindow />} />
            </Route>
            
            {/* Редирект для старых путей */}
            <Route path="/chats" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ApolloProvider>
  );
};

export default App;