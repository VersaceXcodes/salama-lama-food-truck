import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Eye, EyeOff, Check, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface PasswordResetPayload {
  reset_token: string;
  new_password: string;
}

interface PasswordResetResponse {
  message: string;
}

interface PasswordRequirement {
  met: boolean;
  text: string;
}

interface PasswordValidation {
  is_valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  requirements: PasswordRequirement[];
}

// ===========================
// API Function
// ===========================

const resetPassword = async (payload: PasswordResetPayload): Promise<PasswordResetResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const response = await axios.post<PasswordResetResponse>(
    `${API_BASE_URL}/api/auth/password-reset`,
    payload,
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

const UV_PasswordReset: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State variables
  const [reset_token, setResetToken] = useState<string>('');
  const [new_password, setNewPassword] = useState<string>('');
  const [confirm_password, setConfirmPassword] = useState<string>('');
  const [show_password, setShowPassword] = useState<boolean>(false);
  const [show_confirm_password, setShowConfirmPassword] = useState<boolean>(false);
  const [is_success, setIsSuccess] = useState<boolean>(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [passwords_match_error, setPasswordsMatchError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);

  // Initialize reset token from URL
  useEffect(() => {
    if (token) {
      setResetToken(token);
      setErrorMessage(null);
    } else {
      setErrorMessage('Invalid reset link. No token provided.');
    }
  }, [token]);

  // Password validation logic
  const password_validation: PasswordValidation = useMemo(() => {
    const hasMinLength = new_password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(new_password);
    const hasNumber = /[0-9]/.test(new_password);

    const requirements: PasswordRequirement[] = [
      { met: hasMinLength, text: 'At least 8 characters' },
      { met: hasLetter, text: 'Contains at least one letter' },
      { met: hasNumber, text: 'Contains at least one number' },
    ];

    const met_count = requirements.filter(r => r.met).length;
    const is_valid = met_count === requirements.length;

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (met_count === 3 && new_password.length >= 12) {
      strength = 'strong';
    } else if (met_count >= 2) {
      strength = 'medium';
    }

    return {
      is_valid,
      strength,
      requirements,
    };
  }, [new_password]);

  // Validate passwords match
  const validate_passwords_match = () => {
    if (confirm_password && new_password !== confirm_password) {
      setPasswordsMatchError('Passwords do not match');
    } else {
      setPasswordsMatchError(null);
    }
  };

  // React Query mutation for password reset
  const reset_mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      setIsSuccess(true);
      setErrorMessage(null);
      
      // Start countdown for auto-redirect
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            navigate('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      setErrorMessage(errorMessage);
      setIsSuccess(false);
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrorMessage(null);
    setPasswordsMatchError(null);

    // Validate token exists
    if (!reset_token) {
      setErrorMessage('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Validate password requirements
    if (!password_validation.is_valid) {
      setErrorMessage('Please meet all password requirements');
      return;
    }

    // Validate passwords match
    if (new_password !== confirm_password) {
      setPasswordsMatchError('Passwords do not match');
      return;
    }

    // Submit password reset
    reset_mutation.mutate({
      reset_token,
      new_password,
    });
  };

  // Handle manual navigation to login
  const handleContinueToLogin = () => {
    navigate('/login');
  };

  // Get strength color
  const getStrengthColor = () => {
    if (password_validation.strength === 'strong') return 'bg-green-500';
    if (password_validation.strength === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStrengthWidth = () => {
    if (password_validation.strength === 'strong') return 'w-full';
    if (password_validation.strength === 'medium') return 'w-2/3';
    return 'w-1/3';
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Success State */}
          {is_success ? (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Password Reset Successful!
                </h2>
                <p className="text-gray-600">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Redirecting to login in <strong>{countdown}</strong> seconds...
                </p>
              </div>

              <button
                onClick={handleContinueToLogin}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                Continue to Login
              </button>

              <Link
                to="/"
                className="block text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">
                  Reset Your Password
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Enter your new password below
                </p>
              </div>

              {/* Error Message */}
              {error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{error_message}</p>
                    {error_message.toLowerCase().includes('expired') && (
                      <Link
                        to="/forgot-password"
                        className="text-sm text-red-700 underline hover:text-red-800 mt-2 inline-block"
                      >
                        Request a new reset link
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password Field */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new_password"
                      name="new_password"
                      type={show_password ? 'text' : 'password'}
                      required
                      value={new_password}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!show_password)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {show_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {new_password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Password strength:</span>
                        <span className={`text-xs font-semibold ${
                          password_validation.strength === 'strong' ? 'text-green-600' :
                          password_validation.strength === 'medium' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {password_validation.strength.toUpperCase()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getStrengthColor()} ${getStrengthWidth()} transition-all duration-300`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Password Requirements */}
                {new_password && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                    {password_validation.requirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={show_confirm_password ? 'text' : 'password'}
                      required
                      value={confirm_password}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordsMatchError(null);
                      }}
                      onBlur={validate_passwords_match}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!show_confirm_password)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {show_confirm_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwords_match_error && (
                    <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                      <X className="w-4 h-4" />
                      <span>{passwords_match_error}</span>
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    reset_mutation.isPending ||
                    !reset_token ||
                    !password_validation.is_valid ||
                    new_password !== confirm_password ||
                    !new_password ||
                    !confirm_password
                  }
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {reset_mutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="text-center space-y-2">
                <Link
                  to="/login"
                  className="block text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to Login
                </Link>
                <Link
                  to="/"
                  className="block text-sm text-gray-600 hover:text-gray-900"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_PasswordReset;