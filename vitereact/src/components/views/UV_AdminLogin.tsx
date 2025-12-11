import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield } from 'lucide-react';

const UV_AdminLogin: React.FC = () => {
  // ===========================
  // State Management
  // ===========================
  
  // Local state for form data
  const [login_credentials, setLoginCredentials] = useState({
    email: '',
    password: '',
    remember_me: false,
  });
  
  const [two_factor_code, setTwoFactorCode] = useState('');
  const [show_password, setShowPassword] = useState(false);
  const [is_authenticating, setIsAuthenticating] = useState(false);
  const [authentication_error, setAuthenticationError] = useState<string | null>(null);
  const [show_two_factor_step, setShowTwoFactorStep] = useState(false);
  const [failed_attempts_count, setFailedAttemptsCount] = useState(0);
  const [lockout_until, setLockoutUntil] = useState<Date | null>(null);
  const [lockout_remaining_seconds, setLockoutRemainingSeconds] = useState(0);

  // ===========================
  // Global State Access
  // ===========================
  
  // CRITICAL: Individual selectors, no object destructuring
  const current_user = useAppStore(state => state.authentication_state.current_user);
  const is_authenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const global_auth_loading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const global_error_message = useAppStore(state => state.authentication_state.error_message);
  const login_user = useAppStore(state => state.login_user);
  const clear_auth_error = useAppStore(state => state.clear_auth_error);

  // ===========================
  // Navigation
  // ===========================
  
  const navigate = useNavigate();

  // ===========================
  // Effects
  // ===========================

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (is_authenticated && current_user) {
      if (current_user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (current_user.role === 'staff' || current_user.role === 'manager') {
        navigate('/staff/dashboard', { replace: true });
      } else if (current_user.role === 'customer') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [is_authenticated, current_user, navigate]);

  // Lockout timer countdown
  useEffect(() => {
    if (lockout_until) {
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((lockout_until.getTime() - now.getTime()) / 1000));
        setLockoutRemainingSeconds(remaining);
        
        if (remaining === 0) {
          setLockoutUntil(null);
          setFailedAttemptsCount(0);
          setAuthenticationError(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockout_until]);

  // Sync global error message to local state
  useEffect(() => {
    if (global_error_message) {
      setAuthenticationError(global_error_message);
    }
  }, [global_error_message]);

  // ===========================
  // Helper Functions
  // ===========================

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatLockoutTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (field: keyof typeof login_credentials, value: string | boolean) => {
    setLoginCredentials(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (authentication_error) {
      setAuthenticationError(null);
      clear_auth_error();
    }
  };

  const handleFailedAttempt = () => {
    const newCount = failed_attempts_count + 1;
    setFailedAttemptsCount(newCount);

    if (newCount >= 5) {
      // Lock out for 15 minutes after 5 failed attempts
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + 15);
      setLockoutUntil(lockoutTime);
      setAuthenticationError('Too many failed login attempts. Your account has been temporarily locked for security.');
    }
  };

  const validateForm = (): boolean => {
    if (!login_credentials.email.trim()) {
      setAuthenticationError('Email address is required');
      return false;
    }

    if (!isValidEmail(login_credentials.email)) {
      setAuthenticationError('Please enter a valid email address');
      return false;
    }

    if (!login_credentials.password.trim()) {
      setAuthenticationError('Password is required');
      return false;
    }

    if (login_credentials.password.length < 8) {
      setAuthenticationError('Password must be at least 8 characters');
      return false;
    }

    return true;
  };

  // ===========================
  // Authentication Handler
  // ===========================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if account is locked out
    if (lockout_until) {
      setAuthenticationError('Account temporarily locked. Please try again later.');
      return;
    }

    // Validate form inputs
    if (!validateForm()) {
      return;
    }

    setIsAuthenticating(true);
    setAuthenticationError(null);

    try {
      // Call global store login function
      await login_user(
        login_credentials.email.trim().toLowerCase(),
        login_credentials.password,
        login_credentials.remember_me
      );

      // Check if user is admin
      const authenticated_user = useAppStore.getState().authentication_state.current_user;
      
      if (authenticated_user && authenticated_user.role === 'admin') {
        // Success - reset failed attempts
        setFailedAttemptsCount(0);
        setLockoutUntil(null);
        
        // Navigation will be handled by useEffect
      } else if (authenticated_user) {
        // User authenticated but not admin
        setAuthenticationError('Access denied. Administrator privileges required.');
        // Logout the non-admin user
        useAppStore.getState().logout_user();
        handleFailedAttempt();
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      // Handle authentication failure
      handleFailedAttempt();
      
      const errorMessage = error.message || 'Invalid email or password. Please try again.';
      setAuthenticationError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ===========================
  // 2FA Handler (UI ready for backend implementation)
  // ===========================

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!two_factor_code.trim() || two_factor_code.length !== 6) {
      setAuthenticationError('Please enter a valid 6-digit verification code');
      return;
    }

    setIsAuthenticating(true);
    setAuthenticationError(null);

    try {
      // TODO: Implement backend 2FA verification when available
      // For now, this is a placeholder for the UI
      console.log('2FA code submitted:', two_factor_code);
      
      // Simulate 2FA verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // On success, complete authentication
      setShowTwoFactorStep(false);
      navigate('/admin/dashboard');
    } catch (error: any) {
      setAuthenticationError('Invalid verification code. Please try again.');
      handleFailedAttempt();
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-full shadow-lg">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Administrator Portal
            </h1>
            <p className="text-gray-600 text-sm">
              Secure access to business management
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-10">
              {/* Error Message */}
              {authentication_error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{authentication_error}</p>
                    {lockout_until && lockout_remaining_seconds > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Time remaining: {formatLockoutTime(lockout_remaining_seconds)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Failed Attempts Warning */}
              {failed_attempts_count > 0 && failed_attempts_count < 5 && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    {failed_attempts_count === 1 && 'Failed login attempt. 4 attempts remaining.'}
                    {failed_attempts_count === 2 && 'Failed login attempt. 3 attempts remaining.'}
                    {failed_attempts_count === 3 && 'Warning: 2 attempts remaining before lockout.'}
                    {failed_attempts_count === 4 && 'Final attempt remaining. Account will be locked after next failure.'}
                  </p>
                </div>
              )}

              {/* Login Form (Step 1) */}
              {!show_two_factor_step && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="admin-email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={login_credentials.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={is_authenticating || global_auth_loading || !!lockout_until}
                        placeholder="admin@salamalama.ie"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 
                                 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                                 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="admin-password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="admin-password"
                        name="password"
                        type={show_password ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={login_credentials.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        disabled={is_authenticating || global_auth_loading || !!lockout_until}
                        placeholder="Enter your secure password"
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 
                                 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                                 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!show_password)}
                        disabled={is_authenticating || global_auth_loading || !!lockout_until}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 
                                 disabled:cursor-not-allowed transition-colors"
                        aria-label={show_password ? 'Hide password' : 'Show password'}
                      >
                        {show_password ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={login_credentials.remember_me}
                      onChange={(e) => handleInputChange('remember_me', e.target.checked)}
                      disabled={is_authenticating || global_auth_loading || !!lockout_until}
                      className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 
                               disabled:cursor-not-allowed"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Keep me signed in
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={is_authenticating || global_auth_loading || !!lockout_until}
                      className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg
                               text-base font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600
                               hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                               focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed
                               transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                               shadow-lg hover:shadow-xl"
                    >
                      {is_authenticating || global_auth_loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Authenticating...
                        </>
                      ) : (
                        'Sign In to Admin Portal'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* 2FA Form (Step 2) - UI ready for backend implementation */}
              {show_two_factor_step && (
                <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  {/* 2FA Code Input */}
                  <div>
                    <label htmlFor="two-factor-code" className="block text-sm font-semibold text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      id="two-factor-code"
                      name="two-factor-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={two_factor_code}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setTwoFactorCode(value);
                        if (authentication_error) {
                          setAuthenticationError(null);
                        }
                      }}
                      disabled={is_authenticating}
                      placeholder="000000"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest
                               text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 
                               focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  {/* 2FA Submit Button */}
                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={is_authenticating || two_factor_code.length !== 6}
                      className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg
                               text-base font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600
                               hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                               focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed
                               transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                               shadow-lg hover:shadow-xl"
                    >
                      {is_authenticating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </>
                      ) : (
                        'Verify and Sign In'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowTwoFactorStep(false);
                        setTwoFactorCode('');
                        setAuthenticationError(null);
                      }}
                      disabled={is_authenticating}
                      className="w-full py-2 px-4 text-sm font-medium text-gray-700 hover:text-gray-900 
                               disabled:cursor-not-allowed transition-colors"
                    >
                      Back to password
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Lock className="h-3 w-3 mr-1" />
                <span>Secure administrator access</span>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Protected by advanced security measures
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminLogin;