import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

const UV_StaffLogin: React.FC = () => {
  // ===========================
  // Local State Management
  // ===========================
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ===========================
  // Global State Access (Individual Selectors)
  // ===========================
  const storeIsLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const storeError = useAppStore(state => state.authentication_state.error_message);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const login_user = useAppStore(state => state.login_user);
  const logout_user = useAppStore(state => state.logout_user);
  const clear_auth_error = useAppStore(state => state.clear_auth_error);

  const navigate = useNavigate();

  // ===========================
  // Constants
  // ===========================
  const MAX_LOGIN_ATTEMPTS = 5;
  const WARNING_THRESHOLD = 3;

  // ===========================
  // Effects
  // ===========================

  // Redirect if already authenticated with valid role
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (['staff', 'manager', 'admin'].includes(currentUser.role)) {
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, currentUser, navigate]);

  // Sync store error to local error
  useEffect(() => {
    if (storeError) {
      setLocalError(storeError);
      setLocalLoading(false);
    }
  }, [storeError]);

  // ===========================
  // Validation Functions
  // ===========================

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError(null);
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    
    setPasswordError(null);
    return true;
  };

  const validateForm = (): boolean => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    return isEmailValid && isPasswordValid;
  };

  // ===========================
  // Event Handlers
  // ===========================

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setLocalError(null);
    clear_auth_error();
    if (emailError) {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setLocalError(null);
    clear_auth_error();
    if (passwordError) {
      setPasswordError(null);
    }
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handlePasswordBlur = () => {
    if (password) {
      validatePassword(password);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      setLocalError('Too many failed login attempts. Please try again later or reset your password.');
      return;
    }

    // Clear previous errors
    setLocalError(null);
    clear_auth_error();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLocalLoading(true);

    try {
      // Call store's login_user method
      await login_user(email, password, rememberMe);

      // After successful login, the store will update authentication_state
      // The useEffect will handle role validation and navigation
      const user = useAppStore.getState().authentication_state.current_user;
      
      if (user) {
        // Validate user role
        if (!['staff', 'manager', 'admin'].includes(user.role)) {
          setLocalError('Access denied. Staff credentials required.');
          setLoginAttempts(prev => prev + 1);
          await logout_user();
          setLocalLoading(false);
          return;
        }

        // Success - navigation handled by useEffect
        setLoginAttempts(0);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Increment login attempts on failure
      setLoginAttempts(prev => prev + 1);
      
      // Show specific error message
      const errorMsg = error?.message || 'Invalid email or password. Please try again.';
      setLocalError(errorMsg);
      setLocalLoading(false);
    }
  };

  // ===========================
  // Computed Values
  // ===========================

  const isLoading = localLoading || storeIsLoading;
  const displayError = localError || storeError;
  const isSubmitDisabled = isLoading || loginAttempts >= MAX_LOGIN_ATTEMPTS || !email || !password;
  const showRateLimitWarning = loginAttempts >= WARNING_THRESHOLD && loginAttempts < MAX_LOGIN_ATTEMPTS;

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 flex flex-col">
        {/* Header */}
        <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto flex justify-center items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Salama Lama</h1>
                <p className="text-xs text-gray-600">Staff Portal</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md w-full space-y-8">
            {/* Login Card */}
            <div className="bg-white shadow-2xl shadow-blue-200/50 rounded-2xl p-8 border border-gray-100">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Staff Sign In
                </h2>
                <p className="text-gray-600">
                  Access your operational dashboard
                </p>
              </div>

              {/* Error Message Banner */}
              {displayError && (
                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start space-x-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      {displayError}
                    </p>
                  </div>
                </div>
              )}

              {/* Rate Limit Warning */}
              {showRateLimitWarning && !displayError && (
                <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex items-start space-x-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      You have {MAX_LOGIN_ATTEMPTS - loginAttempts} login attempt{MAX_LOGIN_ATTEMPTS - loginAttempts !== 1 ? 's' : ''} remaining.
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Consider resetting your password if you've forgotten it.
                    </p>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className={`w-5 h-5 ${emailError ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailBlur}
                      placeholder="staff@salamalama.ie"
                      className={`
                        block w-full pl-12 pr-4 py-3 rounded-lg
                        border-2 transition-all duration-200
                        text-gray-900 placeholder-gray-400
                        focus:outline-none focus:ring-4
                        ${emailError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }
                      `}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center space-x-1 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className={`w-5 h-5 ${passwordError ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      placeholder="Enter your password"
                      className={`
                        block w-full pl-12 pr-12 py-3 rounded-lg
                        border-2 transition-all duration-200
                        text-gray-900 placeholder-gray-400
                        focus:outline-none focus:ring-4
                        ${passwordError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }
                      `}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-r-lg"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center space-x-1 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                      Remember me for 30 days
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className={`
                      w-full flex justify-center items-center
                      py-3 px-4 rounded-lg font-semibold text-base
                      transition-all duration-200
                      focus:outline-none focus:ring-4 focus:ring-blue-100
                      ${isSubmitDisabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95'
                      }
                    `}
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
                        Signing in...
                      </>
                    ) : (
                      'Sign In to Staff Portal'
                    )}
                  </button>
                </div>
              </form>

              {/* Forgot Password Link */}
              <div className="mt-6 text-center">
                <Link 
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Secure Staff Access
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This portal is for authorized staff members only. All login attempts are monitored and logged.
                  </p>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-600">
              Need help? Contact your manager or email{' '}
              <a 
                href="mailto:support@salamalama.ie" 
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                support@salamalama.ie
              </a>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Salama Lama Food Truck. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
};

export default UV_StaffLogin;