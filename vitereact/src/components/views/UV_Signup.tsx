import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Check, X, Copy, Gift, Sparkles } from 'lucide-react';

const UV_Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Extract URL parameters
  const referral_code_from_url = searchParams.get('ref') || null;
  const redirect_url = searchParams.get('redirect_url') || '/menu';

  // CRITICAL: Individual Zustand selectors
  const register_user = useAppStore(state => state.register_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // Form state
  const [registration_form_data, setRegistrationFormData] = useState({
    email: '',
    phone: '',
    password: '',
    first_name: '',
    last_name: '',
    marketing_opt_in: false,
    terms_accepted: false,
  });

  const [password_confirmation, setPasswordConfirmation] = useState('');
  const [show_password, setShowPassword] = useState(false);
  const [show_password_confirmation, setShowPasswordConfirmation] = useState(false);
  const [submission_loading, setSubmissionLoading] = useState(false);
  const [registration_error, setRegistrationError] = useState<string | null>(null);
  const [show_success_modal, setShowSuccessModal] = useState(false);
  const [first_order_discount_received, setFirstOrderDiscountReceived] = useState<string | null>(null);
  const [copied_code, setCopiedCode] = useState(false);
  const [form_submitted_at_least_once, setFormSubmittedAtLeastOnce] = useState(false);

  // Refs for error banner and email field to scroll into view
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const emailFieldRef = useRef<HTMLInputElement>(null);

  // Form validation errors
  const [form_validation_errors, setFormValidationErrors] = useState<{
    email: string | null;
    phone: string | null;
    password: string | null;
    password_confirmation: string | null;
    first_name: string | null;
    last_name: string | null;
    terms_accepted: string | null;
  }>({
    email: null,
    phone: null,
    password: null,
    password_confirmation: null,
    first_name: null,
    last_name: null,
    terms_accepted: null,
  });

  // Password strength state
  const [password_strength, setPasswordStrength] = useState({
    score: 0,
    feedback: [] as string[],
    isValid: false,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Log when error state changes for debugging
  useEffect(() => {
    console.log('Registration error state changed:', {
      hasError: !!registration_error,
      errorMessage: registration_error,
      fieldErrors: form_validation_errors,
      bannerRefExists: !!errorBannerRef.current
    });
  }, [registration_error, form_validation_errors]);

  // Scroll error banner into view when error appears
  useEffect(() => {
    if (registration_error && errorBannerRef.current) {
      console.log('Error detected - scrolling banner into view');
      
      // Use setTimeout to ensure React has finished rendering and the DOM has updated
      setTimeout(() => {
        if (errorBannerRef.current) {
          console.log('Scrolling error banner into view now');
          
          // Scroll the banner into view
          errorBannerRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          
          // Also focus the email field if there's an email error
          if (form_validation_errors.email && emailFieldRef.current) {
            setTimeout(() => {
              emailFieldRef.current?.focus();
            }, 300);
          }
        } else {
          console.warn('Error banner ref not available after timeout');
        }
      }, 100);
    }
  }, [registration_error, form_validation_errors.email]);

  // Password strength validation
  const validatePasswordStrength = useCallback((password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters required');
    }

    if (/[a-zA-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include at least one number');
    }

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
      score += 1;
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    }

    const isValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);

    setPasswordStrength({
      score,
      feedback,
      isValid,
    });

    return isValid;
  }, []);

  // Handle input changes
  const handleInputChange = (field: keyof typeof registration_form_data, value: string | boolean) => {
    setRegistrationFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (field in form_validation_errors) {
      setFormValidationErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Only clear the general registration error if:
    // 1. There is an error
    // 2. The form has been submitted at least once (prevent clearing during initial load/autofill)
    // 3. User modifies the field that caused the error
    if (registration_error && form_submitted_at_least_once) {
      // Check if the current error is related to this field
      const errorLower = registration_error.toLowerCase();
      const isEmailError = field === 'email' && (errorLower.includes('email') || errorLower.includes('already registered'));
      const isPhoneError = field === 'phone' && errorLower.includes('phone');
      
      // Only clear if this field is related to the error
      if (isEmailError || isPhoneError) {
        setRegistrationError(null);
      }
    }

    // Validate password strength on password change
    if (field === 'password' && typeof value === 'string') {
      validatePasswordStrength(value);
      // Also clear password_confirmation error if they now match
      if (value === password_confirmation && form_validation_errors.password_confirmation) {
        setFormValidationErrors(prev => ({ ...prev, password_confirmation: null }));
      }
    }
  };

  // Validate individual field
  const validateField = useCallback((field: keyof typeof form_validation_errors, value: string | boolean) => {
    let error: string | null = null;

    switch (field) {
      case 'email':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;

      case 'phone':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          error = 'Phone number is required';
        } else if (value.length < 10) {
          error = 'Phone number must be at least 10 digits';
        } else if (value.length > 20) {
          error = 'Phone number is too long';
        }
        break;

      case 'password':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        } else if (!/[a-zA-Z]/.test(value)) {
          error = 'Password must contain at least one letter';
        } else if (!/\d/.test(value)) {
          error = 'Password must contain at least one number';
        }
        break;

      case 'password_confirmation':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          error = 'Password confirmation is required';
        } else if (value !== registration_form_data.password) {
          error = 'Passwords do not match';
        }
        break;

      case 'first_name':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          error = 'First name is required';
        } else if (value.length > 100) {
          error = 'First name is too long';
        }
        break;

      case 'last_name':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          error = 'Last name is required';
        } else if (value.length > 100) {
          error = 'Last name is too long';
        }
        break;

      case 'terms_accepted':
        if (!value) {
          error = 'You must accept the Terms & Conditions';
        }
        break;
    }

    setFormValidationErrors(prev => ({ ...prev, [field]: error }));
    return error === null;
  }, [registration_form_data.password]);

  // Handle field blur
  const handleBlur = (field: keyof typeof form_validation_errors) => {
    if (field === 'password_confirmation') {
      validateField('password_confirmation', password_confirmation);
    } else if (field in registration_form_data) {
      validateField(field, registration_form_data[field as keyof typeof registration_form_data]);
    }
  };

  // Validate entire form
  const validateForm = useCallback(() => {
    const errors: { [key: string]: boolean } = {};

    errors.email = validateField('email', registration_form_data.email);
    errors.phone = validateField('phone', registration_form_data.phone);
    errors.password = validateField('password', registration_form_data.password);
    errors.password_confirmation = validateField('password_confirmation', password_confirmation);
    errors.first_name = validateField('first_name', registration_form_data.first_name);
    errors.last_name = validateField('last_name', registration_form_data.last_name);
    errors.terms_accepted = validateField('terms_accepted', registration_form_data.terms_accepted);

    return Object.values(errors).every(Boolean);
  }, [registration_form_data, password_confirmation, validateField]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark that form has been submitted
    setFormSubmittedAtLeastOnce(true);
    
    // Clear previous errors
    setRegistrationError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setSubmissionLoading(true);

    try {
      const result = await register_user({
        email: registration_form_data.email,
        phone: registration_form_data.phone,
        password: registration_form_data.password,
        first_name: registration_form_data.first_name,
        last_name: registration_form_data.last_name,
        marketing_opt_in: registration_form_data.marketing_opt_in,
        referred_by_user_id: referral_code_from_url || undefined,
      });

      // Success - show success modal with discount code
      setFirstOrderDiscountReceived(result.first_order_discount_code);
      setShowSuccessModal(true);
      setSubmissionLoading(false);

    } catch (error: any) {
      // Log error for debugging
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle error - use backend message if available, fallback to generic
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      
      // Create new errors object for batch update
      const newFieldErrors = { ...form_validation_errors };
      
      // Parse specific field errors if available
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        Object.assign(newFieldErrors, backendErrors);
      }
      
      // Handle specific error codes from backend
      const errorCode = error.response?.data?.error_code;
      
      if (errorCode === 'EMAIL_ALREADY_EXISTS') {
        newFieldErrors.email = 'This email address is already registered. Please use a different email or try logging in.';
      }
      
      if (errorCode === 'PHONE_ALREADY_EXISTS') {
        newFieldErrors.phone = 'This phone number is already registered. Please use a different phone number or try logging in.';
      }

      // Set error states - use flushSync to ensure synchronous updates
      console.log('Setting error state - Error message:', errorMessage);
      console.log('Setting error state - Field errors:', newFieldErrors);
      
      // First, stop the loading state
      setSubmissionLoading(false);
      
      // Then use flushSync for error states to ensure they're applied immediately
      flushSync(() => {
        setRegistrationError(errorMessage);
        setFormValidationErrors(newFieldErrors);
      });
      
      console.log('Error state set - should now be visible');
      console.log('Error banner will be scrolled into view by useEffect');
      
      // Force a small delay to ensure DOM has updated before test checks
      setTimeout(() => {
        console.log('Post-error timeout - banner should definitely be visible now');
        console.log('Current error:', errorMessage);
      }, 150);
    }
  };

  // Handle success modal close and redirect
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate(redirect_url);
  };

  // Copy discount code to clipboard
  const handleCopyCode = async () => {
    if (first_order_discount_received) {
      try {
        await navigator.clipboard.writeText(first_order_discount_received);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  // Password strength indicator color
  const getPasswordStrengthColor = useMemo(() => {
    if (password_strength.score === 0) return 'bg-gray-200';
    if (password_strength.score <= 2) return 'bg-red-500';
    if (password_strength.score === 3) return 'bg-yellow-500';
    if (password_strength.score === 4) return 'bg-blue-500';
    return 'bg-green-500';
  }, [password_strength.score]);

  const getPasswordStrengthWidth = useMemo(() => {
    return `${(password_strength.score / 5) * 100}%`;
  }, [password_strength.score]);

  const getPasswordStrengthLabel = useMemo(() => {
    if (password_strength.score === 0) return '';
    if (password_strength.score <= 2) return 'Weak';
    if (password_strength.score === 3) return 'Fair';
    if (password_strength.score === 4) return 'Good';
    return 'Strong';
  }, [password_strength.score]);

  return (
    <>
      {/* Success Modal */}
      {show_success_modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="success-modal" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            {/* Modal content */}
            <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-8">
              <div className="text-center">
                {/* Success icon with animation */}
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-6 animate-bounce">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>

                {/* Welcome message */}
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to Salama Lama!
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Hi {registration_form_data.first_name}! Your account has been created successfully.
                </p>

                {/* First-order discount code */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center mb-3">
                    <Gift className="h-6 w-6 text-orange-600 mr-2" />
                    <p className="text-sm font-semibold text-orange-900 uppercase tracking-wide">
                      Your First Order Discount
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg px-6 py-4 mb-4">
                    <p className="text-4xl font-bold text-orange-600 tracking-wider font-mono">
                      {first_order_discount_received}
                    </p>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    {copied_code ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>

                {/* Loyalty program intro */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Bonus:</strong> You've been automatically enrolled in our loyalty program! Start earning points with every order.
                  </p>
                </div>

                {/* Action button */}
                <button
                  onClick={handleSuccessModalClose}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 transform hover:scale-105"
                >
                  Start Ordering
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main registration form */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Create Your Account
            </h2>
            <p className="text-lg text-gray-600">
              Join Salama Lama and start earning rewards!
            </p>
          </div>

          {/* Registration form card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-8 sm:px-8">
              {/* Referral code notification */}
              {referral_code_from_url && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Gift className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800 font-medium">
                      You've been referred by a friend! You'll both earn bonus rewards.
                    </p>
                  </div>
                </div>
              )}

              {/* Error message - Prominent red error banner */}
              {registration_error && (
                <div 
                  key={`error-${registration_error}`}
                  ref={errorBannerRef}
                  className="mb-6 bg-red-50 border-4 border-red-400 rounded-lg p-5 shadow-lg"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  data-testid="registration-error-banner"
                  id="registration-error-banner"
                  style={{ 
                    opacity: '1 !important', 
                    visibility: 'visible !important',
                    display: 'block !important',
                    position: 'relative',
                    zIndex: 9999,
                    minHeight: '60px',
                    backgroundColor: '#FEF2F2',
                    borderColor: '#F87171',
                    borderWidth: '4px',
                    padding: '1.25rem'
                  } as React.CSSProperties}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <X className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-base font-bold text-red-900 mb-1">
                        Registration Failed
                      </h3>
                      <p className="text-sm font-medium text-red-800 mb-2">{registration_error}</p>
                      {registration_error.toLowerCase().includes('already registered') && (
                        <p className="text-sm text-red-700 mt-2">
                          Already have an account?{' '}
                          <Link to="/login" className="font-bold underline hover:text-red-900 transition-colors">
                            Sign in here
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={registration_form_data.first_name}
                      onChange={(e) => {
                        handleInputChange('first_name', e.target.value);
                      }}
                      onBlur={() => handleBlur('first_name')}
                      className={`block w-full px-4 py-3 border ${
                        form_validation_errors.first_name ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all`}
                      placeholder="John"
                    />
                    {form_validation_errors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{form_validation_errors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      value={registration_form_data.last_name}
                      onChange={(e) => {
                        handleInputChange('last_name', e.target.value);
                      }}
                      onBlur={() => handleBlur('last_name')}
                      className={`block w-full px-4 py-3 border ${
                        form_validation_errors.last_name ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all`}
                      placeholder="Smith"
                    />
                    {form_validation_errors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{form_validation_errors.last_name}</p>
                    )}
                  </div>
                </div>

                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={emailFieldRef}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={registration_form_data.email}
                    onChange={(e) => {
                      handleInputChange('email', e.target.value);
                    }}
                    onBlur={() => handleBlur('email')}
                    className={`block w-full px-4 py-3 border-2 ${
                      form_validation_errors.email 
                        ? 'border-red-600 bg-red-50 ring-4 ring-red-200 text-red-900' 
                        : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-4 ${
                      form_validation_errors.email
                        ? 'focus:ring-red-200 focus:border-red-600'
                        : 'focus:ring-orange-100 focus:border-orange-500'
                    } transition-all`}
                    placeholder="you@example.com"
                    aria-invalid={form_validation_errors.email ? 'true' : 'false'}
                    aria-describedby={form_validation_errors.email ? 'email-error' : undefined}
                  />
                  {form_validation_errors.email && (
                    <p 
                      id="email-error"
                      className="mt-2 text-sm font-bold text-red-800 flex items-start bg-red-100 p-2 rounded border-l-4 border-red-600"
                      role="alert"
                    >
                      <X className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-red-600" />
                      <span>{form_validation_errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Phone field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={registration_form_data.phone}
                    onChange={(e) => {
                      handleInputChange('phone', e.target.value);
                    }}
                    onBlur={() => handleBlur('phone')}
                    className={`block w-full px-4 py-3 border-2 ${
                      form_validation_errors.phone 
                        ? 'border-red-600 bg-red-50 ring-4 ring-red-200 text-red-900' 
                        : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-4 ${
                      form_validation_errors.phone
                        ? 'focus:ring-red-200 focus:border-red-600'
                        : 'focus:ring-orange-100 focus:border-orange-500'
                    } transition-all`}
                    placeholder="+353 1 234 5678"
                  />
                  {form_validation_errors.phone && (
                    <p 
                      className="mt-2 text-sm font-bold text-red-800 flex items-start bg-red-100 p-2 rounded border-l-4 border-red-600"
                      role="alert"
                    >
                      <X className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-red-600" />
                      <span>{form_validation_errors.phone}</span>
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={show_password ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={registration_form_data.password}
                      onChange={(e) => {
                        handleInputChange('password', e.target.value);
                      }}
                      onBlur={() => handleBlur('password')}
                      className={`block w-full px-4 py-3 pr-12 border ${
                        form_validation_errors.password ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!show_password)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {show_password ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {form_validation_errors.password && (
                    <p className="mt-1 text-sm text-red-600">{form_validation_errors.password}</p>
                  )}

                  {/* Password strength indicator */}
                  {registration_form_data.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Password strength:</span>
                        <span className={`text-xs font-medium ${
                          password_strength.score <= 2 ? 'text-red-600' :
                          password_strength.score === 3 ? 'text-yellow-600' :
                          password_strength.score === 4 ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {getPasswordStrengthLabel}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor}`}
                          style={{ width: getPasswordStrengthWidth }}
                        ></div>
                      </div>
                      {password_strength.feedback.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {password_strength.feedback.map((item, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-center">
                              <X className="h-3 w-3 text-red-500 mr-1" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm password field */}
                <div>
                  <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password_confirmation"
                      name="password_confirmation"
                      type={show_password_confirmation ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password_confirmation}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPasswordConfirmation(newValue);
                        // Clear the error immediately when user starts typing
                        setFormValidationErrors(prev => ({ ...prev, password_confirmation: null }));
                        // If the new value matches the password, also clear any stale error
                        if (newValue === registration_form_data.password) {
                          setFormValidationErrors(prev => ({ ...prev, password_confirmation: null }));
                        }
                      }}
                      onBlur={() => handleBlur('password_confirmation')}
                      className={`block w-full px-4 py-3 pr-12 border ${
                        form_validation_errors.password_confirmation ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirmation(!show_password_confirmation)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {show_password_confirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {form_validation_errors.password_confirmation && (
                    <p className="mt-1 text-sm text-red-600">{form_validation_errors.password_confirmation}</p>
                  )}
                </div>

                {/* Marketing opt-in */}
                <div className="flex items-start">
                  <input
                    id="marketing_opt_in"
                    name="marketing_opt_in"
                    type="checkbox"
                    checked={registration_form_data.marketing_opt_in}
                    onChange={(e) => {
                      handleInputChange('marketing_opt_in', e.target.checked);
                    }}
                    className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="marketing_opt_in" className="ml-2 block text-sm text-gray-700">
                    I'd like to receive marketing emails and offers
                  </label>
                </div>

                {/* Terms acceptance */}
                <div className="flex items-start">
                  <input
                    id="terms_accepted"
                    name="terms_accepted"
                    type="checkbox"
                    required
                    checked={registration_form_data.terms_accepted}
                    onChange={(e) => {
                      handleInputChange('terms_accepted', e.target.checked);
                    }}
                    onBlur={() => handleBlur('terms_accepted')}
                    className={`mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded ${
                      form_validation_errors.terms_accepted ? 'border-red-300' : ''
                    }`}
                  />
                  <label htmlFor="terms_accepted" className="ml-2 block text-sm text-gray-700">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-orange-600 hover:text-orange-700 font-medium">
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" className="text-orange-600 hover:text-orange-700 font-medium">
                      Privacy Policy
                    </Link>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                </div>
                {form_validation_errors.terms_accepted && (
                  <p className="mt-1 text-sm text-red-600">{form_validation_errors.terms_accepted}</p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submission_loading}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submission_loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating your account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </div>

            {/* Footer with login link */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Signup;