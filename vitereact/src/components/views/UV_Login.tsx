import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const UV_Login: React.FC = () => {
  // ===========================
  // Local State
  // ===========================
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember_me, setRememberMe] = useState(false);
  const [show_password, setShowPassword] = useState(false);
  const [local_error, setLocalError] = useState<string | null>(null);

  // ===========================
  // Zustand Global State (CRITICAL: Individual selectors only!)
  // ===========================
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const storeError = useAppStore(state => state.authentication_state.error_message);
  const loginUser = useAppStore(state => state.login_user);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ===========================
  // Routing & Navigation
  // ===========================
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract redirect_url from URL params
  const searchParams = new URLSearchParams(location.search);
  const redirect_url = searchParams.get('redirect_url') || '/dashboard';

  // ===========================
  // Effects
  // ===========================
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect_url);
    }
  }, [isAuthenticated, redirect_url, navigate]);

  // Clear errors when user starts typing
  useEffect(() => {
    if (email || password) {
      setLocalError(null);
      clearAuthError();
    }
  }, [email, password, clearAuthError]);

  // ===========================
  // Form Validation
  // ===========================
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setLocalError('Email address is required');
      return false;
    }

    if (!validateEmail(email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setLocalError('Password is required');
      return false;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return false;
    }

    return true;
  };

  // ===========================
  // Form Handlers
  // ===========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setLocalError(null);
    clearAuthError();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Call global store login function
      // Store handles API call to POST /api/auth/login
      await loginUser(email, password, remember_me);
      
      // On success, App.tsx routing will redirect based on auth state
      // No need to manually navigate here
      
    } catch (error: any) {
      // Error is already handled by store and set in error_message
      // Just log for debugging if needed
      console.error('Login error:', error);
    }
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setLocalError('Please enter a valid email address');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!show_password);
  };

  // ===========================
  // Error Display Logic
  // ===========================
  const displayError = storeError || local_error;

  // ===========================
  // Render
  // ===========================
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Welcome Back
            </h1>
            <p className="mt-2 text-xl text-gray-600 font-semibold">
              Sign in to continue
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white shadow-xl rounded-xl overflow-hidden">
            <div className="p-6 lg:p-8">
              {/* Error Message Display */}
              {displayError && (
                <div 
                  className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium">
                    {displayError}
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    disabled={isLoading}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder-gray-400"
                    aria-describedby={displayError ? "error-message" : undefined}
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={show_password ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder-gray-400 pr-12"
                      aria-describedby={displayError ? "error-message" : undefined}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 disabled:opacity-50"
                      aria-label={show_password ? "Hide password" : "Show password"}
                    >
                      {show_password ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember_me"
                      name="remember_me"
                      type="checkbox"
                      checked={remember_me}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label 
                      htmlFor="remember_me" 
                      className="ml-2 block text-sm text-gray-700 cursor-pointer select-none"
                    >
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                >
                  {isLoading ? (
                    <>
                      <svg 
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sign Up Link Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <p className="text-center text-sm text-gray-500 leading-relaxed">
            By signing in, you agree to our{' '}
            <Link
              to="/terms"
              className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to="/privacy"
              className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default UV_Login;