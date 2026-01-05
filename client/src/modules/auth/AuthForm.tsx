// src/modules/auth/AuthForm.tsx
import React, { useState } from 'react';
import Button from '../../components/Button/Button';
import Alert from '../../components/Alert/Alert';

interface AuthFormProps {
  isLogin: boolean;
  onSubmit: (username: string, email: string, password: string) => void;
  errorMessage?: string;
  loading?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ 
  isLogin, 
  onSubmit, 
  errorMessage, 
  loading = false 
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username, email, password);
  };

  return (
    <div className="auth-form">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      
      {errorMessage && (
        <Alert message={errorMessage} skin="error" />
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Показываем username ТОЛЬКО для регистрации */}
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required={!isLogin}
              disabled={loading}
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (min. 6 characters)"
            required
            minLength={6}
            disabled={loading}
          />
        </div>
        
        <Button 
          type="submit"
          label={loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          disabled={loading}
          skin="primary"
          hasNextSpace
        />
      </form>
      
      <div className="auth-footer">
        {isLogin ? (
          <p>
            Don't have an account?{' '}
            <a href="/register">Register here</a>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <a href="/login">Login here</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;