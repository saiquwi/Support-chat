// src/hooks/useAuth.ts
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { LOGIN, REGISTER, GET_CURRENT_USER } from '../graphql/operations';
import { toast } from 'react-toastify';

export const useAuth = () => {
  const [errorMessage, setErrorMessage] = useState('');
  
  // Login mutation
  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      localStorage.setItem('token', data.login.accessToken);
      localStorage.setItem('user', JSON.stringify(data.login.user));
      toast.success('Login successful!');
      window.location.href = '/';
    },
    onError: (error) => {
      setErrorMessage(error.message);
      toast.error('Login failed');
    },
  });

  // Register mutation
  const [registerMutation, { loading: registerLoading }] = useMutation(REGISTER, {
    onCompleted: (data) => {
      localStorage.setItem('token', data.register.accessToken);
      localStorage.setItem('user', JSON.stringify(data.register.user));
      toast.success('Registration successful!');
      window.location.href = '/';
    },
    onError: (error) => {
      setErrorMessage(error.message);
      toast.error('Registration failed');
    },
  });

  // Current user query
  const { data: userData, loading: userLoading, refetch } = useQuery(GET_CURRENT_USER, {
    skip: !localStorage.getItem('token'),
  });

  // src/hooks/useAuth.ts - обновите login функцию
  const login = (email: string, password: string) => {
    console.log('Login attempt for:', email);
    
    loginMutation({ 
        variables: { 
        loginInput: { 
            email, 
            password 
        } 
        },
        context: {
        headers: {
            'Content-Type': 'application/json'
        }
        }
    }).catch(error => {
        console.error('Login mutation error:', error);
        // Если сервер недоступен
        if (error.networkError) {
        setErrorMessage('Server is not available. Make sure the server is running on port 4000.');
        }
    });
  };

  const register = (username: string, email: string, password: string) => {
    if (!username || !email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    registerMutation({ 
      variables: { 
        registerInput: { username, email, password } 
      } 
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  return {
    login,
    register,
    logout,
    getCurrentUser,
    isAuthenticated,
    user: userData?.me,
    loading: loginLoading || registerLoading || userLoading,
    errorMessage,
    setErrorMessage,
    refetchUser: refetch,
  };
};