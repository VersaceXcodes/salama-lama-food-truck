import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface ContactForm {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

interface FormValidation {
  is_valid: boolean;
  errors: {
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
  };
}

// ===========================
// Validation Utilities
// ===========================

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Accept 10-15 digits, optionally starting with +
  const phoneRegex = /^\+?\d{10,15}$/;
  return phoneRegex.test(cleaned);
};

const validateCustomerName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Full name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.trim().length > 100) {
    return 'Name must not exceed 100 characters';
  }
  return null;
};

const validateCustomerEmail = (email: string): string | null => {
  if (!email || email.trim().length === 0) {
    return 'Email address is required';
  }
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  if (email.length > 255) {
    return 'Email must not exceed 255 characters';
  }
  return null;
};

const validateCustomerPhone = (phone: string): string | null => {
  if (!phone || phone.trim().length === 0) {
    return 'Phone number is required';
  }
  const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (cleanedPhone.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  if (cleanedPhone.length > 20) {
    return 'Phone number must not exceed 20 characters';
  }
  if (!validatePhone(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
};

// ===========================
// Main Component
// ===========================

const UV_CheckoutContact: React.FC = () => {
  const navigate = useNavigate();

  // ===========================
  // Zustand Store Access (CRITICAL: Individual selectors only)
  // ===========================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ===========================
  // Local State
  // ===========================
  const [contactForm, setContactForm] = useState<ContactForm>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });

  const [formValidation, setFormValidation] = useState<FormValidation>({
    is_valid: false,
    errors: {
      customer_name: null,
      customer_email: null,
      customer_phone: null,
    },
  });

  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===========================
  // Pre-fill Contact Info
  // ===========================
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const prefilled_form: ContactForm = {
        customer_name: `${currentUser.first_name} ${currentUser.last_name}`.trim(),
        customer_email: currentUser.email,
        customer_phone: currentUser.phone,
      };

      setContactForm(prefilled_form);

      // Validate pre-filled form
      const name_error = validateCustomerName(prefilled_form.customer_name);
      const email_error = validateCustomerEmail(prefilled_form.customer_email);
      const phone_error = validateCustomerPhone(prefilled_form.customer_phone);

      setFormValidation({
        is_valid: !name_error && !email_error && !phone_error,
        errors: {
          customer_name: name_error,
          customer_email: email_error,
          customer_phone: phone_error,
        },
      });
    }
  }, [isAuthenticated, currentUser]);

  // ===========================
  // Field Update Handler
  // ===========================
  const handleFieldChange = (field: keyof ContactForm, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error on change
    setFormValidation(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: null,
      },
    }));

    // Mark form as dirty
    if (!isFormDirty) {
      setIsFormDirty(true);
    }
  };

  // ===========================
  // Field Blur Validation
  // ===========================
  const handleFieldBlur = (field: keyof ContactForm) => {
    let error: string | null = null;

    switch (field) {
      case 'customer_name':
        error = validateCustomerName(contactForm.customer_name);
        break;
      case 'customer_email':
        error = validateCustomerEmail(contactForm.customer_email);
        break;
      case 'customer_phone':
        error = validateCustomerPhone(contactForm.customer_phone);
        break;
    }

    setFormValidation(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: error,
      },
    }));
  };

  // ===========================
  // Form Validation
  // ===========================
  const validateForm = (): boolean => {
    const name_error = validateCustomerName(contactForm.customer_name);
    const email_error = validateCustomerEmail(contactForm.customer_email);
    const phone_error = validateCustomerPhone(contactForm.customer_phone);

    const is_valid = !name_error && !email_error && !phone_error;

    setFormValidation({
      is_valid,
      errors: {
        customer_name: name_error,
        customer_email: email_error,
        customer_phone: phone_error,
      },
    });

    return is_valid;
  };

  // ===========================
  // Continue to Payment
  // ===========================
  const handleContinue = async () => {
    setIsSubmitting(true);

    // Validate form
    const is_valid = validateForm();

    if (!is_valid) {
      setIsSubmitting(false);
      // Scroll to first error
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Store contact info in sessionStorage for checkout flow
    // (In production, this might be stored in checkout state or backend)
    try {
      sessionStorage.setItem('checkout_contact_info', JSON.stringify(contactForm));
      
      // Navigate to payment step
      navigate('/checkout/payment');
    } catch (error) {
      console.error('Error storing contact info:', error);
      setIsSubmitting(false);
    }
  };

  // ===========================
  // Render Component
  // ===========================
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Contact Information
            </h1>
            <p className="mt-3 text-base text-gray-600 leading-relaxed">
              We'll use this information to contact you about your order
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">Order Type</span>
              </div>
              
              <div className="w-16 h-0.5 bg-blue-600"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">Contact</span>
              </div>
              
              <div className="w-16 h-0.5 bg-gray-300"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-bold">3</span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Payment</span>
              </div>
              
              <div className="w-16 h-0.5 bg-gray-300"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-bold">4</span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Review</span>
              </div>
            </div>
          </div>

          {/* Contact Form Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 lg:p-8">
              <form className="space-y-6">
                {/* Full Name Field */}
                <div>
                  <label 
                    htmlFor="customer_name" 
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    name="customer_name"
                    value={contactForm.customer_name}
                    onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                    onBlur={() => handleFieldBlur('customer_name')}
                    aria-invalid={!!formValidation.errors.customer_name}
                    aria-describedby={formValidation.errors.customer_name ? 'customer_name_error' : undefined}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 
                      ${formValidation.errors.customer_name 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } 
                      text-base text-gray-900 placeholder-gray-400 
                      focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting}
                  />
                  {formValidation.errors.customer_name && (
                    <p 
                      id="customer_name_error" 
                      className="mt-2 text-sm text-red-600 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formValidation.errors.customer_name}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label 
                    htmlFor="customer_email" 
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    id="customer_email"
                    name="customer_email"
                    value={contactForm.customer_email}
                    onChange={(e) => handleFieldChange('customer_email', e.target.value)}
                    onBlur={() => handleFieldBlur('customer_email')}
                    aria-invalid={!!formValidation.errors.customer_email}
                    aria-describedby={formValidation.errors.customer_email ? 'customer_email_error' : undefined}
                    placeholder="your.email@example.com"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 
                      ${formValidation.errors.customer_email 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } 
                      text-base text-gray-900 placeholder-gray-400 
                      focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting}
                  />
                  {formValidation.errors.customer_email && (
                    <p 
                      id="customer_email_error" 
                      className="mt-2 text-sm text-red-600 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formValidation.errors.customer_email}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    We'll send order updates to this email address
                  </p>
                </div>

                {/* Phone Field */}
                <div>
                  <label 
                    htmlFor="customer_phone" 
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    id="customer_phone"
                    name="customer_phone"
                    value={contactForm.customer_phone}
                    onChange={(e) => handleFieldChange('customer_phone', e.target.value)}
                    onBlur={() => handleFieldBlur('customer_phone')}
                    aria-invalid={!!formValidation.errors.customer_phone}
                    aria-describedby={formValidation.errors.customer_phone ? 'customer_phone_error' : undefined}
                    placeholder="+353 1 234 5678"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 
                      ${formValidation.errors.customer_phone 
                        ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } 
                      text-base text-gray-900 placeholder-gray-400 
                      focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting}
                  />
                  {formValidation.errors.customer_phone && (
                    <p 
                      id="customer_phone_error" 
                      className="mt-2 text-sm text-red-600 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formValidation.errors.customer_phone}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    For delivery coordination and order updates
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Your contact information is secure
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        We'll only use this to communicate about your order. We never share your details with third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Form Actions */}
            <div className="bg-gray-50 px-6 py-4 lg:px-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <Link 
                  to="/checkout/order-type"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg 
                    bg-gray-100 hover:bg-gray-200 text-gray-900 
                    font-medium text-base transition-all duration-200 
                    border border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Order Type
                </Link>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg 
                    bg-blue-600 hover:bg-blue-700 text-white 
                    font-medium text-base transition-all duration-200 
                    shadow-lg hover:shadow-xl 
                    focus:outline-none focus:ring-4 focus:ring-blue-100 
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-medium underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CheckoutContact;