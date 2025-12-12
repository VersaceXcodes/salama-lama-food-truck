import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface PasswordResetRequestPayload {
  email: string;
}

interface PasswordResetRequestResponse {
  message: string;
}

// ===========================
// API Function
// ===========================

const requestPasswordReset = async (email: string): Promise<PasswordResetRequestResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.post<PasswordResetRequestResponse>(
    `${API_BASE_URL}/api/auth/password-reset-request`,
    { email } as PasswordResetRequestPayload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_PasswordResetRequest: React.FC = () => {
  // ===========================
  // Local State
  // ===========================
  const [email, setEmail] = useState('');
  const [is_submitted, setIsSubmitted] = useState(false);

  // ===========================
  // React Query Mutation
  // ===========================
  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (_data) => {
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      console.error('Password reset request error:', error);
    },
  });

  // ===========================
  // Computed State
  // ===========================
  const is_loading = mutation.isPending;
  const error_message = mutation.error 
    ? (mutation.error as any).response?.data?.message || (mutation.error as any).message || 'Failed to send reset link. Please try again.'
    : null;

  // ===========================
  // Event Handlers
  // ===========================

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear any previous errors
    mutation.reset();
    
    // Validate email format (basic client-side validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return; // HTML5 validation should catch this, but extra safety
    }
    
    // Submit request
    mutation.mutate(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear error when user starts typing
    if (mutation.error) {
      mutation.reset();
    }
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Success State */}
          {is_submitted ? (
            <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 p-8 space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>

              {/* Success Message */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  Check Your Email
                </h2>
                <p className="text-base text-gray-600 leading-relaxed">
                  If an account exists for <span className="font-medium text-gray-900">{email}</span>, you'll receive a password reset link shortly.
                </p>
                <p className="text-sm text-gray-500">
                  The reset link will expire in 1 hour for security reasons.
                </p>
              </div>

              {/* Additional Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Next Steps:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Click the reset link in the email</li>
                      <li>Create a new password</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Back to Login */}
              <div className="text-center pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 p-8 space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <Mail className="h-10 w-10 text-blue-600" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  Forgot Password?
                </h1>
                <p className="text-base text-gray-600 leading-relaxed">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              {/* Error Message */}
              {error_message && (
                <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-medium">Error</p>
                    <p className="text-sm text-red-600 mt-1">{error_message}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                    onChange={handleEmailChange}
                    disabled={is_loading}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 placeholder-gray-400 text-gray-900 
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             disabled:bg-gray-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                    aria-required="true"
                    aria-invalid={error_message ? 'true' : 'false'}
                    aria-describedby={error_message ? 'email-error' : undefined}
                  />
                  {error_message && (
                    <p id="email-error" className="sr-only">
                      {error_message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={is_loading || !email.trim()}
                  className="w-full px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 
                           focus:outline-none focus:ring-4 focus:ring-blue-100
                           disabled:bg-gray-300 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-lg hover:shadow-xl
                           flex items-center justify-center space-x-2"
                >
                  {is_loading ? (
                    <>
                      <svg 
                        className="animate-spin h-5 w-5 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>

              {/* Back to Login Link */}
              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </Link>
              </div>

              {/* Additional Help */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                  Remember your password?{' '}
                  <Link 
                    to="/login" 
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need additional help?{' '}
              <Link 
                to="/contact" 
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_PasswordResetRequest;