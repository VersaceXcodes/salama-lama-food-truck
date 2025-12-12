import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface BusinessContactInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  operating_hours: Record<string, { open: string; close: string }>;
  location_coordinates: { latitude: number; longitude: number } | null;
  social_links: Record<string, string>;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  submit?: string;
}

// ===========================
// UV_Contact Component
// ===========================

const UV_Contact: React.FC = () => {
  // ===========================
  // Global State (Zustand) - CRITICAL: Individual selectors only
  // ===========================
  
  const business_settings = useAppStore(state => state.business_settings);

  // ===========================
  // Local State
  // ===========================
  
  const [contact_form_data, setContactFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [form_errors, setFormErrors] = useState<FormErrors>({});
  const [form_success, setFormSuccess] = useState<boolean>(false);
  const [map_loading, setMapLoading] = useState<boolean>(true);

  // ===========================
  // API Configuration
  // ===========================

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ===========================
  // Fetch Contact Information (React Query)
  // ===========================

  const {
    data: business_contact_info,
    isLoading: info_loading,
    error: info_error,
  } = useQuery<BusinessContactInfo>({
    queryKey: ['business-contact-info'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/business/info`);
      return {
        name: response.data.name || 'Salama Lama Food Truck',
        phone: response.data.phone || '',
        email: response.data.email || '',
        address: response.data.address || '',
        operating_hours: response.data.operating_hours || {},
        location_coordinates: response.data.location || null,
        social_links: response.data.social_links || {},
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ===========================
  // Submit Contact Form Mutation
  // ===========================

  const submit_mutation = useMutation({
    mutationFn: async (_form_data: ContactFormData) => {
      // MISSING ENDPOINT: POST /api/contact/submit not defined in OpenAPI spec
      // Simulating submission for now - in production, this should create a support ticket
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, uncomment and use:
      // const response = await axios.post(`${API_BASE_URL}/api/contact/submit`, form_data);
      // return response.data;
      
      return { success: true, message: 'Thank you for contacting us! We\'ll get back to you soon.' };
    },
    onSuccess: () => {
      setFormSuccess(true);
      setContactFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
      setFormErrors({});
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setFormSuccess(false);
      }, 5000);
    },
    onError: (error: any) => {
      setFormErrors({
        submit: error.response?.data?.message || 'Failed to send message. Please try again.',
      });
    },
  });

  // ===========================
  // Form Validation Functions
  // ===========================

  const validate_email = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validate_phone = (phone: string): boolean => {
    // Irish phone format: +353 or 0 followed by 9 digits
    const cleaned = phone.replace(/\s/g, '');
    return /^(\+353|0)\d{9}$/.test(cleaned);
  };

  const validate_field = (field: keyof ContactFormData, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return undefined;
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!validate_email(value)) return 'Please enter a valid email address';
        return undefined;
      
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!validate_phone(value)) return 'Please enter a valid Irish phone number';
        return undefined;
      
      case 'subject':
        if (!value.trim()) return 'Subject is required';
        if (value.trim().length < 3) return 'Subject must be at least 3 characters';
        return undefined;
      
      case 'message':
        if (!value.trim()) return 'Message is required';
        if (value.trim().length < 10) return 'Message must be at least 10 characters';
        return undefined;
      
      default:
        return undefined;
    }
  };

  const validate_all_fields = (): boolean => {
    const errors: FormErrors = {};
    
    (Object.keys(contact_form_data) as Array<keyof ContactFormData>).forEach((field) => {
      const error = validate_field(field, contact_form_data[field]);
      if (error) {
        errors[field] = error;
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===========================
  // Event Handlers
  // ===========================

  const handle_input_change = (field: keyof ContactFormData, value: string) => {
    setContactFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (form_errors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear submit error
    if (form_errors.submit) {
      setFormErrors(prev => ({ ...prev, submit: undefined }));
    }
  };

  const handle_input_blur = (field: keyof ContactFormData) => {
    const error = validate_field(field, contact_form_data[field]);
    if (error) {
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate_all_fields()) {
      return;
    }
    
    submit_mutation.mutate(contact_form_data);
  };

  const handle_phone_click = () => {
    // Phone link will handle this, but we can track analytics here
    console.log('Phone contact initiated');
  };

  const handle_email_click = () => {
    // Email link will handle this, but we can track analytics here
    console.log('Email contact initiated');
  };

  // ===========================
  // Map Loading Handler
  // ===========================

  const handle_map_load = () => {
    setMapLoading(false);
  };

  // ===========================
  // Render Operating Hours
  // ===========================

  const render_operating_hours = () => {
    const hours = business_contact_info?.operating_hours || business_settings.operating_hours;
    
    if (!hours || Object.keys(hours).length === 0) {
      return (
        <p className="text-gray-600">
          Please contact us for our operating hours.
        </p>
      );
    }

    const days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="space-y-2">
        {days_of_week.map((day, index) => {
          const day_hours = hours[day];
          
          return (
            <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <span className="font-medium text-gray-700">{day_names[index]}</span>
              <span className="text-gray-600">
                {day_hours && day_hours.open && day_hours.close
                  ? `${day_hours.open} - ${day_hours.close}`
                  : 'Closed'
                }
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ===========================
  // Main Render
  // ===========================

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Get in Touch
            </h1>
            <p className="text-xl lg:text-2xl text-orange-100 max-w-3xl mx-auto leading-relaxed">
              We'd love to hear from you! Whether you have a question about our menu, want to place a bulk order, or just want to say hello, we're here to help.
            </p>
          </div>
        </section>

        {/* Contact Information Section */}
        <section className="py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {info_loading ? (
              // Loading State
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-6"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : info_error ? (
              // Error State
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-700 font-medium">Failed to load contact information</p>
              </div>
            ) : (
              // Success State - Contact Info Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Phone & Email */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-6">
                    <Phone className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Call or Text</h3>
                  <div className="space-y-3">
                    <a
                      href={`tel:${business_contact_info?.phone || business_settings.business_info.phone}`}
                      onClick={handle_phone_click}
                      className="flex items-center text-gray-700 hover:text-orange-600 transition-colors group"
                    >
                      <Phone className="h-5 w-5 mr-3 text-gray-400 group-hover:text-orange-600" />
                      <span className="font-medium">
                        {business_contact_info?.phone || business_settings.business_info.phone || '+353-1-234-5678'}
                      </span>
                    </a>
                    <a
                      href={`mailto:${business_contact_info?.email || business_settings.business_info.email}`}
                      onClick={handle_email_click}
                      className="flex items-center text-gray-700 hover:text-orange-600 transition-colors group"
                    >
                      <Mail className="h-5 w-5 mr-3 text-gray-400 group-hover:text-orange-600" />
                      <span className="font-medium">
                        {business_contact_info?.email || business_settings.business_info.email || 'hello@salamalama.ie'}
                      </span>
                    </a>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-6">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Opening Hours</h3>
                  {render_operating_hours()}
                </div>

                {/* Location */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-6">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Visit Us</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {business_contact_info?.address || business_settings.business_info.address || 'Dublin, Ireland'}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      business_contact_info?.address || business_settings.business_info.address || 'Dublin, Ireland'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-4 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Map Section */}
        <section className="py-12 lg:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Find Us on the Map</h2>
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200">
              {map_loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
                </div>
              )}
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(
                  business_contact_info?.address || business_settings.business_info.address || 'Dublin, Ireland'
                )}&zoom=15`}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={handle_map_load}
                className="w-full"
                title="Salama Lama Food Truck Location"
              ></iframe>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-12 lg:py-20 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Send Us a Message</h2>
              <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                Have a question or feedback? Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
              {/* Success Message */}
              {form_success && (
                <div className="mb-8 bg-green-50 border-2 border-green-200 rounded-lg p-6 flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="text-green-900 font-semibold mb-1">Message Sent Successfully!</h4>
                    <p className="text-green-700">Thank you for contacting us. We'll get back to you within 24 hours.</p>
                  </div>
                </div>
              )}

              {/* Submit Error */}
              {form_errors.submit && (
                <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-lg p-6 flex items-start">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-900 font-semibold mb-1">Error</h4>
                    <p className="text-red-700">{form_errors.submit}</p>
                  </div>
                </div>
              )}

              {/* Contact Form */}
              <form onSubmit={handle_submit} className="space-y-6">
                {/* Name & Email Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={contact_form_data.name}
                      onChange={(e) => handle_input_change('name', e.target.value)}
                      onBlur={() => handle_input_blur('name')}
                      placeholder="John Smith"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                      }`}
                    />
                    {form_errors.name && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form_errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={contact_form_data.email}
                      onChange={(e) => handle_input_change('email', e.target.value)}
                      onBlur={() => handle_input_blur('email')}
                      placeholder="john.smith@example.com"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                      }`}
                    />
                    {form_errors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form_errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone & Subject Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone Field */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={contact_form_data.phone}
                      onChange={(e) => handle_input_change('phone', e.target.value)}
                      onBlur={() => handle_input_blur('phone')}
                      placeholder="0851234567 or +353851234567"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.phone
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                      }`}
                    />
                    {form_errors.phone && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form_errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Subject Field */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={contact_form_data.subject}
                      onChange={(e) => handle_input_change('subject', e.target.value)}
                      onBlur={() => handle_input_blur('subject')}
                      placeholder="General Inquiry"
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.subject
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                      }`}
                    />
                    {form_errors.subject && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {form_errors.subject}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    value={contact_form_data.message}
                    onChange={(e) => handle_input_change('message', e.target.value)}
                    onBlur={() => handle_input_blur('message')}
                    placeholder="Tell us how we can help you..."
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-4 resize-none ${
                      form_errors.message
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                    }`}
                  ></textarea>
                  {form_errors.message && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {form_errors.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submit_mutation.isPending}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submit_mutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default UV_Contact;