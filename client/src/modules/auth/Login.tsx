// src/modules/auth/Login.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from './AuthForm';

const Login: React.FC = () => {
  const { login, loading, errorMessage } = useAuth();

  const handleSubmit = (_username: string, email: string, password: string) => {
    // При логине передаём пустую строку как username
    login(email, password);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Support Chat - Login</h1>
        <AuthForm
          isLogin={true}
          onSubmit={handleSubmit}
          errorMessage={errorMessage}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Login;