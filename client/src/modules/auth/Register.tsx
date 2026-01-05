// src/modules/auth/Register.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthForm from './AuthForm';

const Register: React.FC = () => {
  const { register, loading, errorMessage } = useAuth();

  const handleSubmit = (username: string, email: string, password: string) => {
    register(username, email, password);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Support Chat - Register</h1>
        <AuthForm
          isLogin={false}
          onSubmit={handleSubmit}
          errorMessage={errorMessage}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Register;