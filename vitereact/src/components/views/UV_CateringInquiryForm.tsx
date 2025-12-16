import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface CateringInquiryFormData {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name: string | null;
  event_type: 'corporate' | 'wedding' | 'birthday' | 'meeting' | 'other' | '';
  event_type_other: string | null;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_location_address: string;
  event_location_city: string;
  event_location_postal_code: string;
  event_location_type: 'office' | 'home' | 'venue' | 'outdoor' | 'other' | '';
  guest_count: number;
  guest_count_min: number | null;
  guest_count_max: number | null;
  dietary_requirements: string[];
  dietary_notes: string | null;
  menu_preferences: string | null;
  preferred_package: 'standard' | 'premium' | 'luxury' | null;
  budget_range: string | null;
  additional_details: string | null;
  marketing_opt_in: boolean;
}

interface FormValidationErrors {
  [key: string]: string;
}

interface CateringInquiryResponse {
  inquiry_id: string;
  inquiry_number: string;
  status: string;
  submitted_at: string;
}

// ===========================
// API Base URL
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ===========================
// Main Component
// ===========================

const UV_CateringInquiryForm: React.FC = () => {
  const navigate = useNavigate();

  // ===========================
  // Global State Access (Individual Selectors)
  // ===========================

  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // ===========================
  // Local Form State
  // ===========================

  const [formData, setFormData] = useState<CateringInquiryFormData>({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    company_name: null,
    event_type: '',
    event_type_other: null,
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    event_location_address: '',
    event_location_city: 'Dublin',
    event_location_postal_code: '',
    event_location_type: '',
    guest_count: 0,
    guest_count_min: null,
    guest_count_max: null,
    dietary_requirements: [],
    dietary_notes: null,
    menu_preferences: null,
    preferred_package: null,
    budget_range: null,
    additional_details: null,
    marketing_opt_in: false,
  });

  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<CateringInquiryResponse | null>(null);

  // ===========================
  // Pre-fill User Data on Mount
  // ===========================

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        contact_name: `${currentUser.first_name} ${currentUser.last_name}`,
        contact_email: currentUser.email,
        contact_phone: currentUser.phone,
      }));
    }
  }, [currentUser]);

  // ===========================
  // API Mutation
  // ===========================

  const submitMutation = useMutation({
    mutationFn: async (data: Omit<CateringInquiryFormData, 'marketing_opt_in'> & { marketing_opt_in: boolean; user_id?: string }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/catering/inquiry`,
        data,
        { headers }
      );
      
      return response.data as CateringInquiryResponse;
    },
    onSuccess: (data) => {
      setSubmittedInquiry(data);
      setShowSuccessModal(true);
      // Clear form on success
      setFormData({
        contact_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '',
        contact_email: currentUser?.email || '',
        contact_phone: currentUser?.phone || '',
        company_name: null,
        event_type: '',
        event_type_other: null,
        event_date: '',
        event_start_time: '',
        event_end_time: '',
        event_location_address: '',
        event_location_city: 'Dublin',
        event_location_postal_code: '',
        event_location_type: '',
        guest_count: 0,
        guest_count_min: null,
        guest_count_max: null,
        dietary_requirements: [],
        dietary_notes: null,
        menu_preferences: null,
        preferred_package: null,
        budget_range: null,
        additional_details: null,
        marketing_opt_in: false,
      });
      setValidationErrors({});
    },
    onError: (error: any) => {
      console.error('Catering inquiry submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit inquiry';
      setValidationErrors({ submit: errorMessage });
    },
  });

  // ===========================
  // Validation Functions
  // ===========================

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-()]{10,20}$/;
    return phoneRegex.test(phone);
  };

  const validateTimeFormat = (time: string): boolean => {
    if (!time) return false;
    
    // Handle time with seconds (e.g., "14:30:00") - strip seconds
    let normalizedTime = time;
    if (time.includes(':') && time.split(':').length === 3) {
      const parts = time.split(':');
      normalizedTime = `${parts[0]}:${parts[1]}`;
    }
    
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(normalizedTime);
  };

  const validateMinimumLeadTime = (eventDate: string): boolean => {
    if (!eventDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(eventDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    const minimumDate = new Date(today);
    minimumDate.setDate(minimumDate.getDate() + 7); // 7 days minimum lead time
    
    return selectedDate >= minimumDate;
  };

  const validateField = useCallback((fieldName: keyof CateringInquiryFormData, value: any): string | null => {
    // Required field validation
    const requiredFields = [
      'contact_name',
      'contact_email',
      'contact_phone',
      'event_type',
      'event_date',
      'event_start_time',
      'event_end_time',
      'event_location_address',
      'event_location_city',
      'event_location_postal_code',
      'event_location_type',
      'guest_count',
    ];

    if (requiredFields.includes(fieldName) && (!value || (typeof value === 'string' && value.trim() === '') || (typeof value === 'number' && value <= 0))) {
      return 'This field is required';
    }

    // Specific field validations
    switch (fieldName) {
      case 'contact_email':
        if (value && !validateEmail(value as string)) {
          return 'Please enter a valid email address';
        }
        break;
      
      case 'contact_phone':
        if (value && !validatePhone(value as string)) {
          return 'Please enter a valid phone number (10-20 digits)';
        }
        break;
      
      case 'event_date':
        if (value && !validateMinimumLeadTime(value as string)) {
          return 'Event date must be at least 7 days from today';
        }
        break;
      
      case 'event_start_time':
      case 'event_end_time':
        if (value && !validateTimeFormat(value as string)) {
          return 'Please enter time in HH:MM format (e.g., 14:30)';
        }
        break;
      
      case 'guest_count':
        if (value && (typeof value !== 'number' || value <= 0)) {
          return 'Guest count must be a positive number';
        }
        break;
      
      case 'event_type_other':
        if (formData.event_type === 'other' && (!value || (value as string).trim() === '')) {
          return 'Please specify the event type';
        }
        break;
    }

    return null;
  }, [formData.event_type]);

  const validateForm = useCallback((): { isValid: boolean; errors: FormValidationErrors } => {
    const errors: FormValidationErrors = {};

    console.log('Validating form with formData:', formData);

    // Validate all required fields
    (Object.keys(formData) as Array<keyof CateringInquiryFormData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        console.log(`Validation error for ${key}:`, error, 'Value:', formData[key]);
        errors[key] = error;
      }
    });

    console.log('Total validation errors:', Object.keys(errors).length, errors);
    setValidationErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors,
    };
  }, [formData, validateField]);

  // ===========================
  // Event Handlers
  // ===========================

  const handleInputChange = (field: keyof CateringInquiryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleInputBlur = (field: keyof CateringInquiryFormData) => {
    // Trim email field on blur
    if (field === 'contact_email' && typeof formData[field] === 'string') {
      const trimmedValue = (formData[field] as string).trim();
      if (trimmedValue !== formData[field]) {
        setFormData(prev => ({
          ...prev,
          [field]: trimmedValue,
        }));
      }
    }
    
    const error = validateField(field, formData[field]);
    if (error) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  const handleDietaryRequirementToggle = (requirement: string) => {
    setFormData(prev => {
      const currentRequirements = prev.dietary_requirements || [];
      const newRequirements = currentRequirements.includes(requirement)
        ? currentRequirements.filter(r => r !== requirement)
        : [...currentRequirements, requirement];
      
      return {
        ...prev,
        dietary_requirements: newRequirements,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form using existing validation logic
    const validationResult = validateForm();
    
    if (!validationResult.isValid) {
      // Scroll to top to show error banner
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Focus first error field after a brief delay to allow scroll
      setTimeout(() => {
        const firstErrorField = Object.keys(validationResult.errors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          element?.focus();
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return;
    }

    // Prepare submission data
    const submissionData: any = {
      ...formData,
      user_id: currentUser?.user_id || undefined,
      contact_email: formData.contact_email.trim(),
      guest_count: Number(formData.guest_count),
      guest_count_min: formData.guest_count_min ? Number(formData.guest_count_min) : null,
      guest_count_max: formData.guest_count_max ? Number(formData.guest_count_max) : null,
      dietary_requirements: formData.dietary_requirements.length > 0 ? formData.dietary_requirements : null,
    };

    // Submit mutation
    submitMutation.mutate(submissionData);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    
    // Redirect based on authentication
    if (currentUser) {
      navigate('/catering/inquiries');
    } else {
      navigate('/menu');
    }
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Request a Catering Quote
            </h1>
            <p className="text-lg text-gray-600">
              Tell us about your event and we'll get back to you within 24 hours
            </p>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {/* Submit Error Message */}
              {validationErrors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700">{validationErrors.submit}</p>
                  </div>
                </div>
              )}

              {/* General Validation Error Banner */}
              {Object.keys(validationErrors).length > 0 && !validationErrors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-700 mb-1">Please correct the following errors:</p>
                      <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                        {Object.entries(validationErrors).map(([field, error]) => (
                          <li key={field}>
                            <span className="font-medium">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Contact Information */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Contact Information
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => handleInputChange('contact_name', e.target.value)}
                      onBlur={() => handleInputBlur('contact_name')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.contact_name
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="John Smith"
                    />
                    {validationErrors.contact_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.contact_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="contact_email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      onBlur={() => handleInputBlur('contact_email')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.contact_email
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="john.smith@example.com"
                    />
                    {validationErrors.contact_email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.contact_email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      onBlur={() => handleInputBlur('contact_phone')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.contact_phone
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="+353 1 234 5678"
                    />
                    {validationErrors.contact_phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.contact_phone}</p>
                    )}
                  </div>

                  {/* Company Name (Optional) */}
                  <div className="sm:col-span-2">
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Company / Organization Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="company_name"
                      value={formData.company_name || ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value || null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                      placeholder="ABC Corporation"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Event Details */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Event Details
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Event Type */}
                  <div>
                    <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="event_type"
                      value={formData.event_type}
                      onChange={(e) => handleInputChange('event_type', e.target.value)}
                      onBlur={() => handleInputBlur('event_type')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_type
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                    >
                      <option value="">Select event type</option>
                      <option value="corporate">Corporate Event</option>
                      <option value="wedding">Wedding</option>
                      <option value="birthday">Birthday Party</option>
                      <option value="meeting">Meeting / Conference</option>
                      <option value="other">Other</option>
                    </select>
                    {validationErrors.event_type && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_type}</p>
                    )}
                  </div>

                  {/* Event Type Other (Conditional) */}
                  {formData.event_type === 'other' && (
                    <div>
                      <label htmlFor="event_type_other" className="block text-sm font-medium text-gray-700 mb-1">
                        Please Specify <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="event_type_other"
                        value={formData.event_type_other || ''}
                        onChange={(e) => handleInputChange('event_type_other', e.target.value || null)}
                        onBlur={() => handleInputBlur('event_type_other')}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                          validationErrors.event_type_other
                            ? 'border-red-500 focus:border-red-600'
                            : 'border-gray-200 focus:border-orange-500'
                        } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                        placeholder="Describe your event type"
                      />
                      {validationErrors.event_type_other && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.event_type_other}</p>
                      )}
                    </div>
                  )}

                   {/* Event Date */}
                  <div>
                    <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Event Date <span className="text-red-600">*</span>
                    </label>
                     <input
                      type="date"
                      id="event_date"
                      name="event_date"
                      autoComplete="off"
                      value={formData.event_date}
                      onChange={(e) => {
                        // Don't validate format on change - just set the value
                        // Browser native date input handles the format
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, event_date: value }));
                        if (validationErrors.event_date) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.event_date;
                            return newErrors;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        // Validate using the current input value directly to avoid state timing issues
                        const currentValue = e.target.value;
                        const error = validateField('event_date', currentValue);
                        if (error) {
                          setValidationErrors(prev => ({
                            ...prev,
                            event_date: error,
                          }));
                        }
                      }}
                      min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_date
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                    />
                    {validationErrors.event_date && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_date}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">Minimum 7 days lead time required</p>
                  </div>

                   {/* Event Start Time */}
                  <div>
                    <label htmlFor="event_start_time" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-600">*</span>
                    </label>
                     <input
                      type="time"
                      id="event_start_time"
                      name="event_start_time"
                      autoComplete="off"
                      value={formData.event_start_time}
                      onChange={(e) => {
                        // Don't validate format on change - just set the value
                        // Browser native time input handles the format
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, event_start_time: value }));
                        if (validationErrors.event_start_time) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.event_start_time;
                            return newErrors;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        // Validate using the current input value directly to avoid state timing issues
                        const currentValue = e.target.value;
                        const error = validateField('event_start_time', currentValue);
                        if (error) {
                          setValidationErrors(prev => ({
                            ...prev,
                            event_start_time: error,
                          }));
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_start_time
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                    />
                    {validationErrors.event_start_time && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_start_time}</p>
                    )}
                  </div>

                   {/* Event End Time */}
                  <div>
                    <label htmlFor="event_end_time" className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-red-600">*</span>
                    </label>
                     <input
                      type="time"
                      id="event_end_time"
                      name="event_end_time"
                      autoComplete="off"
                      value={formData.event_end_time}
                      onChange={(e) => {
                        // Don't validate format on change - just set the value
                        // Browser native time input handles the format
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, event_end_time: value }));
                        if (validationErrors.event_end_time) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.event_end_time;
                            return newErrors;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        // Validate using the current input value directly to avoid state timing issues
                        const currentValue = e.target.value;
                        const error = validateField('event_end_time', currentValue);
                        if (error) {
                          setValidationErrors(prev => ({
                            ...prev,
                            event_end_time: error,
                          }));
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_end_time
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                    />
                    {validationErrors.event_end_time && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_end_time}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Venue Information */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Venue Information
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Event Location Address */}
                  <div className="sm:col-span-2">
                    <label htmlFor="event_location_address" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="event_location_address"
                      value={formData.event_location_address}
                      onChange={(e) => handleInputChange('event_location_address', e.target.value)}
                      onBlur={() => handleInputBlur('event_location_address')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_location_address
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="123 Main Street, Venue Name"
                    />
                    {validationErrors.event_location_address && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_location_address}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label htmlFor="event_location_city" className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="event_location_city"
                      value={formData.event_location_city}
                      onChange={(e) => handleInputChange('event_location_city', e.target.value)}
                      onBlur={() => handleInputBlur('event_location_city')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_location_city
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="Dublin"
                    />
                    {validationErrors.event_location_city && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_location_city}</p>
                    )}
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label htmlFor="event_location_postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="event_location_postal_code"
                      value={formData.event_location_postal_code}
                      onChange={(e) => handleInputChange('event_location_postal_code', e.target.value)}
                      onBlur={() => handleInputBlur('event_location_postal_code')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_location_postal_code
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="D01 A1B2"
                    />
                    {validationErrors.event_location_postal_code && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_location_postal_code}</p>
                    )}
                  </div>

                  {/* Event Location Type */}
                  <div className="sm:col-span-2">
                    <label htmlFor="event_location_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Venue Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="event_location_type"
                      value={formData.event_location_type}
                      onChange={(e) => handleInputChange('event_location_type', e.target.value)}
                      onBlur={() => handleInputBlur('event_location_type')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.event_location_type
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                    >
                      <option value="">Select venue type</option>
                      <option value="office">Office / Corporate Space</option>
                      <option value="home">Private Home</option>
                      <option value="venue">Event Venue / Hall</option>
                      <option value="outdoor">Outdoor Location</option>
                      <option value="other">Other</option>
                    </select>
                    {validationErrors.event_location_type && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.event_location_type}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Guest Information */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Guest Information
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Guest Count */}
                  <div>
                    <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Guests <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      id="guest_count"
                      min="1"
                      value={formData.guest_count || ''}
                      onChange={(e) => handleInputChange('guest_count', parseInt(e.target.value) || 0)}
                      onBlur={() => handleInputBlur('guest_count')}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                        validationErrors.guest_count
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-orange-500'
                      } focus:outline-none focus:ring-4 focus:ring-orange-100`}
                      placeholder="50"
                    />
                    {validationErrors.guest_count && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.guest_count}</p>
                    )}
                  </div>

                  {/* Guest Count Min (Optional) */}
                  <div>
                    <label htmlFor="guest_count_min" className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum (Optional)
                    </label>
                    <input
                      type="number"
                      id="guest_count_min"
                      min="1"
                      value={formData.guest_count_min || ''}
                      onChange={(e) => handleInputChange('guest_count_min', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                      placeholder="40"
                    />
                  </div>

                  {/* Guest Count Max (Optional) */}
                  <div>
                    <label htmlFor="guest_count_max" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum (Optional)
                    </label>
                    <input
                      type="number"
                      id="guest_count_max"
                      min="1"
                      value={formData.guest_count_max || ''}
                      onChange={(e) => handleInputChange('guest_count_max', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                      placeholder="60"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Dietary Requirements */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Dietary Requirements
                </h2>
                
                <div className="space-y-4">
                  {/* Dietary Requirement Checkboxes */}
                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-3">
                      Select all that apply:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {['vegetarian', 'vegan', 'gluten-free', 'halal', 'nut-free', 'dairy-free'].map((requirement) => (
                        <label key={requirement} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.dietary_requirements.includes(requirement)}
                            onChange={() => handleDietaryRequirementToggle(requirement)}
                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {requirement.replace('-', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dietary Notes */}
                  <div>
                    <label htmlFor="dietary_notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Dietary Notes (Optional)
                    </label>
                    <textarea
                      id="dietary_notes"
                      rows={3}
                      value={formData.dietary_notes || ''}
                      onChange={(e) => handleInputChange('dietary_notes', e.target.value || null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 resize-none"
                      placeholder="Please specify any additional dietary requirements or allergies..."
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Menu Preferences */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Menu Preferences
                </h2>
                
                <div className="space-y-6">
                  {/* Preferred Package */}
                  <div>
                    <label htmlFor="preferred_package" className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Package (Optional)
                    </label>
                    <select
                      id="preferred_package"
                      value={formData.preferred_package || ''}
                      onChange={(e) => handleInputChange('preferred_package', e.target.value || null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Select a package</option>
                      <option value="standard">Standard Package</option>
                      <option value="premium">Premium Package</option>
                      <option value="luxury">Luxury Package</option>
                    </select>
                  </div>

                  {/* Menu Preferences */}
                  <div>
                    <label htmlFor="menu_preferences" className="block text-sm font-medium text-gray-700 mb-1">
                      Menu Preferences & Special Requests (Optional)
                    </label>
                    <textarea
                      id="menu_preferences"
                      rows={4}
                      value={formData.menu_preferences || ''}
                      onChange={(e) => handleInputChange('menu_preferences', e.target.value || null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 resize-none"
                      placeholder="Describe your ideal menu or specific items you'd like to include..."
                    />
                  </div>

                  {/* Budget Range */}
                  <div>
                    <label htmlFor="budget_range" className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Range (Optional)
                    </label>
                    <select
                      id="budget_range"
                      value={formData.budget_range || ''}
                      onChange={(e) => handleInputChange('budget_range', e.target.value || null)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Select budget range</option>
                      <option value="under-500">Under €500</option>
                      <option value="500-1000">€500 - €1,000</option>
                      <option value="1000-2500">€1,000 - €2,500</option>
                      <option value="2500-5000">€2,500 - €5,000</option>
                      <option value="over-5000">Over €5,000</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 7: Additional Details */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Additional Details
                </h2>
                
                <div>
                  <label htmlFor="additional_details" className="block text-sm font-medium text-gray-700 mb-1">
                    Any other details we should know? (Optional)
                  </label>
                  <textarea
                    id="additional_details"
                    rows={5}
                    value={formData.additional_details || ''}
                    onChange={(e) => handleInputChange('additional_details', e.target.value || null)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 resize-none"
                    placeholder="Setup requirements, equipment needs, timeline, special considerations..."
                  />
                </div>
              </div>

              {/* Section 8: Marketing Opt-in and Submit */}
              <div className="space-y-6">
                {/* Marketing Opt-in */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="marketing_opt_in"
                    checked={formData.marketing_opt_in}
                    onChange={(e) => handleInputChange('marketing_opt_in', e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-0.5"
                  />
                  <label htmlFor="marketing_opt_in" className="ml-3 text-sm text-gray-700">
                    Yes, I'd like to receive updates about catering services and special offers from Salama Lama
                  </label>
                </div>

                {/* Privacy Policy Link */}
                <p className="text-sm text-gray-600">
                  By submitting this form, you agree to our{' '}
                  <Link to="/terms" className="text-orange-600 hover:text-orange-700 font-medium">
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-orange-600 hover:text-orange-700 font-medium">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Inquiry'
                    )}
                  </button>

                  <Link
                    to="/catering"
                    className="flex-none sm:w-auto px-8 py-4 rounded-lg font-semibold text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200 text-center"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Need help or have questions?{' '}
              <Link to="/contact" className="text-orange-600 hover:text-orange-700 font-medium">
                Contact us
              </Link>
              {' '}or call{' '}
              <a href="tel:+35312345678" className="text-orange-600 hover:text-orange-700 font-medium">
                +353 1 234 5678
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && submittedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 p-4">
                <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You!
              </h3>
              <p className="text-gray-600 mb-4">
                We've received your catering inquiry
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800 font-semibold">
                  Inquiry ID: {submittedInquiry.inquiry_number}
                </p>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                We'll review your request and get back to you within 24 hours with a custom quote.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {currentUser && (
                <button
                  onClick={handleCloseSuccessModal}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200"
                >
                  View My Inquiries
                </button>
              )}
              <button
                onClick={handleCloseSuccessModal}
                className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200"
              >
                {currentUser ? 'Back to Home' : 'Browse Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_CateringInquiryForm;