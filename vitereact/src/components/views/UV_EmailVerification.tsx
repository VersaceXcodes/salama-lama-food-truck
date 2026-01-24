import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface VerifyEmailPayload {
  verification_token: string;
}

interface VerifyEmailResponse {
  message: string;
  user?: {
    user_id: string;
    email_verified: boolean;
  };
}

interface ResendVerificationResponse {
  message: string;
}

interface VerificationStatus {
  status: 'pending' | 'success' | 'failed';
  message: string;
}

// ===========================
// Main Component
// ===========================

const UV_EmailVerification: React.FC = () => {
  // ===========================
  // Hooks & State
  // ===========================

  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: 'pending',
    message: 'Verifying your email address...',
  });

  // ===========================
  // Global State - CRITICAL: Individual selectors
  // ===========================

  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const authToken = useAppStore((state) => state.authentication_state.auth_token);
  const updateAuthUser = useAppStore((state) => state.update_auth_user);
  const isAuthenticated = useAppStore((state) => state.authentication_state.authentication_status.is_authenticated);

  // ===========================
  // API Configuration
  // ===========================

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // API Mutations
  // ===========================

  const verifyEmailMutation = useMutation({
    mutationFn: async (payload: VerifyEmailPayload) => {
      const response = await axios.post<VerifyEmailResponse>(
        `${API_BASE_URL}/api/auth/verify-email`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setVerificationStatus({
        status: 'success',
        message: data.message || 'Your email has been verified successfully!',
      });

      // Update global user state if authenticated
      if (data.user && currentUser) {
        updateAuthUser({
          email_verified: true,
        });
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Verification failed. The link may be invalid or expired.';
      
      setVerificationStatus({
        status: 'failed',
        message: errorMessage,
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post<ResendVerificationResponse>(
        `${API_BASE_URL}/api/auth/resend-verification`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setVerificationStatus({
        status: 'pending',
        message: data.message || 'New verification email sent! Please check your inbox.',
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to resend verification email. Please try again.';
      
      setVerificationStatus({
        status: 'failed',
        message: errorMessage,
      });
    },
  });

  // ===========================
  // Effects
  // ===========================

  useEffect(() => {
    if (token) {
      verifyEmailMutation.mutate({ verification_token: token });
    } else {
      setVerificationStatus({
        status: 'failed',
        message: 'Invalid verification link. No token provided.',
      });
    }
  }, [token, verifyEmailMutation]);

  // ===========================
  // Event Handlers
  // ===========================

  const handleResendVerification = () => {
    resendVerificationMutation.mutate();
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  // ===========================
  // Render - One Big Component
  // ===========================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-8 text-center">
              <div className="mx-auto w-16 h-16 mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Email Verification</h1>
              <p className="text-orange-50 text-sm">Confirming your email address</p>
            </div>

            {/* Content Section */}
            <div className="px-6 py-8">
              {/* PENDING STATE */}
              {verificationStatus.status === 'pending' && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 mb-6">
                    <svg
                      className="animate-spin h-16 w-16 text-orange-500"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Verifying Your Email
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {verificationStatus.message}
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-700 text-sm">
                      Please wait while we confirm your email address...
                    </p>
                  </div>
                </div>
              )}

              {/* SUCCESS STATE */}
              {verificationStatus.status === 'success' && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 mb-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Email Verified Successfully!
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {verificationStatus.message}
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-700 text-sm">
                      ✓ Your email address has been confirmed
                      <br />
                      You can now enjoy all features of your Salama Lama account!
                    </p>
                  </div>
                  <div className="space-y-3">
                    {isAuthenticated ? (
                      <button
                        onClick={handleContinueToDashboard}
                        className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-100"
                      >
                        Continue to Dashboard
                      </button>
                    ) : (
                      <button
                        onClick={handleNavigateToLogin}
                        className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-100"
                      >
                        Sign In to Your Account
                      </button>
                    )}
                    <Link
                      to="/"
                      className="block w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-center"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              )}

              {/* FAILED STATE */}
              {verificationStatus.status === 'failed' && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Verification Failed
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {verificationStatus.message}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700 text-sm font-medium mb-2">
                      Common reasons for failure:
                    </p>
                    <ul className="text-red-600 text-sm text-left space-y-1 list-disc list-inside">
                      <li>The verification link has expired (24 hours)</li>
                      <li>The link has already been used</li>
                      <li>The link is invalid or corrupted</li>
                      <li>Your email has already been verified</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendVerificationMutation.isPending}
                      className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-orange-100"
                    >
                      {resendVerificationMutation.isPending ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending New Email...
                        </span>
                      ) : (
                        'Resend Verification Email'
                      )}
                    </button>
                    <Link
                      to="/login"
                      className="block w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-center"
                    >
                      Sign In Instead
                    </Link>
                    <Link
                      to="/"
                      className="block w-full text-gray-600 hover:text-gray-900 px-6 py-2 rounded-lg font-medium transition-colors text-center text-sm"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Section */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Need help?{' '}
                <a
                  href="mailto:support@salamalama.ie"
                  className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Verification links expire after 24 hours for security.
            </p>
            <p className="text-xs text-gray-500">
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_EmailVerification;