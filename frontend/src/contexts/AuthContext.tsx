'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '../lib/api';

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('[AuthContext] 🚀 AuthProvider component initialized');
  
  // ULTRA RADICAL FIX: Initialize state with proper values immediately
  console.log('[AuthContext] 🔥 ULTRA RADICAL FIX: Checking token immediately in useState');
  
  // Check for token immediately during state initialization
  const getInitialToken = (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('auth_token') || Cookies.get('auth_token');
        console.log('[AuthContext] 📝 Initial token check:', token ? 'FOUND' : 'NOT_FOUND');
        return token || null;
      }
    } catch (error) {
      console.log('[AuthContext] ❌ Initial token check error:', error);
    }
    return null;
  };
  
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [loading, setLoading] = useState(false); // Start with false since we're not loading
  const [isInitialized, setIsInitialized] = useState(true); // Start with true
  
  console.log('[AuthContext] 📊 Initial state:', { user, token, loading, isInitialized });

  // Debug log helper
  const debugLog = (message: string, data?: any) => {
    console.log(`[AuthContext] ${message}`, data || '');
  };

  // Fetch user data when token exists but user is null
  useEffect(() => {
    const fetchUserFromToken = async () => {
      if (token && !user && !loading) {
        debugLog('🔍 Token exists but no user data, fetching user info');
        setLoading(true);
        try {
          const response = await authApi.getCurrentUser();
          const userData = response.data.user;
          debugLog('✅ User data fetched from token:', userData);
          setUser(userData);
        } catch (error: any) {
          debugLog('❌ Failed to fetch user from token:', error.message);
          // Token is invalid, clear it
          setToken(null);
          sessionStorage.removeItem('auth_token');
          Cookies.remove('auth_token');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserFromToken();
  }, [token, user, loading]);

  // Debug state changes
  useEffect(() => {
    debugLog('🔄 State changed:', {
      user: user ? `${user.email} (ID: ${user.id})` : 'null',
      token: token ? 'EXISTS' : 'null',
      loading,
      isInitialized,
      isAuthenticated: !!user && !!token
    });
  }, [user, token, loading, isInitialized]);

  const login = async (email: string, password: string) => {
    try {
      debugLog('🔐 Login attempt for:', email);
      const response = await authApi.login({ email, password });
      const { user: userData, token: userToken } = response.data;
      debugLog('✅ Login API response received:', { user: userData, tokenExists: !!userToken });
      
      // Set token first, then user to ensure proper state update order
      setToken(userToken);
      sessionStorage.setItem('auth_token', userToken);
      Cookies.set('auth_token', userToken, { expires: 1 }); // 1 day
      debugLog('✅ Token saved to sessionStorage, cookies and state');
      
      setUser(userData);
      debugLog('✅ User data set in state');
      
      // Wait for state to be fully updated
      await new Promise(resolve => setTimeout(resolve, 100));
      debugLog('✅ Login process completed');
    } catch (error: any) {
      debugLog('❌ Login failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Giriş başarısız');
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      debugLog('📝 Register attempt for:', email);
      const response = await authApi.register({ email, password, firstName, lastName });
      const { user: userData, token: userToken } = response.data;
      debugLog('✅ Register API response received:', { user: userData, tokenExists: !!userToken });
      
      // Set token first, then user to ensure proper state update order
      setToken(userToken);
      sessionStorage.setItem('auth_token', userToken);
      Cookies.set('auth_token', userToken, { expires: 1 }); // 1 day
      debugLog('✅ Token saved to sessionStorage, cookies and state');
      
      setUser(userData);
      debugLog('✅ User data set in state');
      
      // Wait for state to be fully updated
      await new Promise(resolve => setTimeout(resolve, 100));
      debugLog('✅ Register process completed');
    } catch (error: any) {
      debugLog('❌ Register failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Kayıt başarısız');
    }
  };

  const logout = async () => {
    try {
      debugLog('🚪 Logout initiated');
      // Call logout API if token exists
      if (token) {
        await authApi.logout();
        debugLog('✅ Logout API called');
      }
    } catch (error: any) {
      debugLog('⚠️ Logout API failed:', error.message);
      // Continue with local logout even if API fails
    } finally {
      setUser(null);
      setToken(null);
      sessionStorage.removeItem('auth_token');
      Cookies.remove('auth_token');
      debugLog('✅ Logout completed');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      debugLog('🔑 Change password attempt');
      await authApi.changePassword({ currentPassword, newPassword });
      debugLog('✅ Password changed successfully');
    } catch (error: any) {
      debugLog('❌ Change password failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Şifre değiştirme başarısız');
    }
  };

  const refreshToken = async () => {
    try {
      debugLog('🔄 Refresh token attempt');
      if (!token) {
        throw new Error('No token to refresh');
      }
      const response = await authApi.refreshToken({ refreshToken: token });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      setToken(accessToken);
      sessionStorage.setItem('auth_token', accessToken);
      Cookies.set('auth_token', accessToken, { expires: 1 });
      debugLog('✅ Token refreshed successfully');
    } catch (error: any) {
      debugLog('❌ Token refresh failed:', error.response?.data?.message || error.message);
      // If refresh fails, logout user
      logout();
      throw new Error(error.response?.data?.message || 'Token yenileme başarısız');
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    try {
      debugLog('📧 Email verification attempt');
      await authApi.verifyEmail(verificationToken);
      debugLog('✅ Email verified successfully');
      // Refresh user data to get updated emailVerified status
      if (token) {
        const response = await authApi.getCurrentUser();
        setUser(response.data);
      }
    } catch (error: any) {
      debugLog('❌ Email verification failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'E-posta doğrulama başarısız');
    }
  };

  const resendVerification = async () => {
    try {
      debugLog('📧 Resend verification attempt');
      await authApi.resendVerification();
      debugLog('✅ Verification email sent successfully');
    } catch (error: any) {
      debugLog('❌ Resend verification failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Doğrulama e-postası gönderme başarısız');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    changePassword,
    refreshToken,
    verifyEmail,
    resendVerification,
    loading,
    isAuthenticated: !!user && !!token,
    isInitialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};