import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, LogIn, AlertCircle, ShoppingBag } from 'lucide-react';
import { CHECKOUT_PATH, RETURN_TO_PARAM } from '@/lib/constants';

const UV_Login: React.FC = () => {
  // ===========================
  // Local State
  // ===========================
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember_me, setRememberMe] = useState(false);
  const [show_password, setShowPassword] = useState(false);
  const [local_error, setLocalError] = useState<string | null>(null);
  const [guest_loading, setGuestLoading] = useState(false);
  const [guest_error, setGuestError] = useState<string | null>(null);

  // ===========================
  // Zustand Global State (CRITICAL: Individual selectors only!)
  // ===========================
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const storeError = useAppStore(state => state.authentication_state.error_message);
  const loginUser = useAppStore(state => state.login_user);
  const startGuestCheckout = useAppStore(state => state.start_guest_checkout);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ===========================
  // Routing & Navigation
  // ===========================
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract redirect destination from URL params (check both returnTo and redirect)
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get(RETURN_TO_PARAM) || searchParams.get('redirect');

  // ===========================
  // Effects
  // ===========================
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Determine redirect destination
      const destination = returnTo || '/dashboard';
      
      // Navigate to the appropriate page
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, returnTo, navigate]);

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

  const handleGuestCheckout = async () => {
    // Clear previous errors
    setGuestError(null);
    setGuestLoading(true);

    try {
      // Create guest session with optional email
      const emailToSend = email && validateEmail(email) ? email : undefined;
      const { redirectTo } = await startGuestCheckout(emailToSend);
      
      // Determine the final redirect URL in priority order:
      // 1. returnTo query param
      // 2. Backend redirectTo
      // 3. Fallback to CHECKOUT_PATH
      const destination = returnTo || redirectTo || CHECKOUT_PATH;
      
      // Navigate to checkout flow using replace to avoid login in history
      navigate(destination, { replace: true });
      
    } catch (error: any) {
      console.error('Guest checkout error:', error);
      setGuestError('Failed to start guest checkout. Please try again.');
    } finally {
      setGuestLoading(false);
    }
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
      <div className="min-h-screen flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-10" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight" style={{ color: 'var(--primary-text)' }}>
              Sign in to your account
            </h1>
            <p className="mt-2 text-base sm:text-lg" style={{ color: '#4A3B32' }}>
              Welcome back to Salama Lama
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white shadow-lg rounded-2xl overflow-hidden border-2" style={{ borderColor: 'var(--border-light)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="p-6 sm:p-8">
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

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                {/* Guest Checkout Button */}
                <button
                  type="button"
                  onClick={handleGuestCheckout}
                  disabled={isLoading || guest_loading}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Continue as guest without signing in"
                >
                  {guest_loading ? (
                    <>
                      <svg 
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" 
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
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-5 w-5 mr-2" />
                      <span>Continue as Guest</span>
                    </>
                  )}
                </button>

                {/* Guest Error Message */}
                {guest_error && (
                  <div 
                    className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start"
                    role="alert"
                    aria-live="polite"
                  >
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-xs text-red-700">
                      {guest_error}
                    </p>
                  </div>
                )}
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
                {' '} — or{' '}
                <button
                  onClick={handleGuestCheckout}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  continue as a guest
                </button>
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