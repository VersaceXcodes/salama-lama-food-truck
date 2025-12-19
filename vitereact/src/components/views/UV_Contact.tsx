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
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    postal_code: string;
  };
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
    mutationFn: async (form_data: ContactFormData) => {
      const response = await axios.post(`${API_BASE_URL}/api/contact`, form_data);
      return response.data;
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
  // Main Render
  // ===========================

  return (
    <>
      {/* Sticky Floating Action Button - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#F2EFE9] via-[#F2EFE9] to-transparent pointer-events-none">
        <a
          href={`tel:${business_contact_info?.phone || business_settings.business_info.phone}`}
          onClick={handle_phone_click}
          className="flex items-center justify-center w-full bg-[#2C1A16] text-[#F2EFE9] font-bold rounded-full shadow-2xl hover:shadow-3xl hover:bg-[#3E2F26] transition-all duration-300 active:scale-95 pointer-events-auto"
          style={{ minHeight: '56px', fontSize: '17px' }}
        >
          <Phone className="h-5 w-5 mr-2" />
          Call Us Now
        </a>
      </div>
      
      <main className="min-h-screen bg-[#F2EFE9] pb-24 lg:pb-0">
        {/* Modern Split Layout Hero Section */}
        <section className="relative bg-[#F2EFE9] overflow-hidden min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 lg:py-20 w-full">
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-stretch">
              
              {/* Left Side - Get in Touch & Contact Details (Floating Elements) */}
              <div className="order-1 lg:order-1 flex flex-col justify-center space-y-8 sm:space-y-12 relative z-10">
                
                {/* Main Heading */}
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-[#2C1A16] mb-4 sm:mb-6 leading-tight tracking-tight">
                    Get in Touch
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-[#4A3B32] leading-relaxed font-medium max-w-lg">
                    We'd love to hear from you! Whether you have a question about our menu or want to say hello.
                  </p>
                </div>

                {info_loading ? (
                  // Loading State
                  <div className="space-y-8">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start space-x-4 animate-pulse">
                        <div className="h-12 w-12 bg-[#4A3B32]/20 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-[#4A3B32]/20 rounded w-1/2"></div>
                          <div className="h-3 bg-[#4A3B32]/20 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : info_error ? (
                  // Error State
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                    <AlertCircle className="h-8 w-8 text-red-600 mb-2" />
                    <p className="text-red-700 font-medium">Failed to load contact information</p>
                  </div>
                ) : (
                  // Success State - Floating Contact Details
                  <div className="space-y-6 sm:space-y-8">
                    
                    {/* Phone & Email - Thumb-Friendly Buttons */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#2C1A16] flex items-center justify-center shadow-lg">
                            <Phone className="h-6 w-6 sm:h-7 sm:w-7 text-[#F2EFE9]" />
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A16]">Call or Text</h3>
                      </div>
                      
                      {/* Call/Text Button - Thumb-Friendly */}
                      <a
                        href={`tel:${business_contact_info?.phone || business_settings.business_info.phone}`}
                        onClick={handle_phone_click}
                        className="flex items-center justify-center w-full bg-[#2C1A16] text-[#F2EFE9] font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#3E2F26] transition-all duration-300 active:scale-95"
                        style={{ minHeight: '56px', fontSize: '17px' }}
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        {business_contact_info?.phone || business_settings.business_info.phone || '+353-1-234-5678'}
                      </a>
                      
                      {/* Email Button - Thumb-Friendly */}
                      <a
                        href={`mailto:${business_contact_info?.email || business_settings.business_info.email}`}
                        onClick={handle_email_click}
                        className="flex items-center justify-center w-full bg-white border-2 border-[#2C1A16] text-[#2C1A16] font-bold rounded-2xl shadow-md hover:shadow-lg hover:bg-[#F2EFE9] transition-all duration-300 active:scale-95"
                        style={{ minHeight: '56px', fontSize: '17px' }}
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        {business_contact_info?.email || business_settings.business_info.email || 'hello@salamalama.ie'}
                      </a>
                    </div>

                    {/* Opening Hours - Floating with Icon */}
                    <div className="flex items-start space-x-4 group transform hover:translate-x-2 transition-transform duration-300">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#2C1A16] flex items-center justify-center shadow-lg">
                          <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-[#F2EFE9]" />
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A16] mb-3">Opening Hours</h3>
                        <div className="space-y-2">
                          {(() => {
                            const hours = business_contact_info?.operating_hours || business_settings.operating_hours;
                            
                            if (!hours || Object.keys(hours).length === 0) {
                              return (
                                <p className="text-[#4A3B32] font-medium" style={{ fontSize: '16px' }}>
                                  Please contact us for our operating hours.
                                </p>
                              );
                            }

                            const days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                            const day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                            return days_of_week.slice(0, 3).map((day, index) => {
                              const day_hours = hours[day];
                              
                              return (
                                <div key={day} className="flex justify-between items-center" style={{ fontSize: '16px' }}>
                                  <span className="font-semibold text-[#2C1A16]">{day_names[index]}</span>
                                  <span className="font-medium text-[#4A3B32]">
                                    {day_hours && day_hours.open && day_hours.close
                                      ? `${day_hours.open} - ${day_hours.close}`
                                      : 'Closed'
                                    }
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Address - Thumb-Friendly Get Directions Button */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#2C1A16] flex items-center justify-center shadow-lg">
                            <MapPin className="h-6 w-6 sm:h-7 sm:w-7 text-[#F2EFE9]" />
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#2C1A16]">Visit Us</h3>
                      </div>
                      
                      {/* Address Text - Increased readability */}
                      <p className="text-[#4A3B32] leading-relaxed font-medium mb-4" style={{ fontSize: '17px' }}>
                        {business_contact_info?.address && typeof business_contact_info.address === 'object'
                          ? `${business_contact_info.address.line1}${business_contact_info.address.line2 ? ', ' + business_contact_info.address.line2 : ''}, ${business_contact_info.address.city}, ${business_contact_info.address.postal_code}`
                          : (business_settings.business_info.address && typeof business_settings.business_info.address === 'object')
                            ? `${business_settings.business_info.address.line1}${business_settings.business_info.address.line2 ? ', ' + business_settings.business_info.address.line2 : ''}, ${business_settings.business_info.address.city}, ${business_settings.business_info.address.postal_code}`
                            : 'Dublin, Ireland'
                        }
                      </p>
                      
                      {/* Get Directions Button - Thumb-Friendly */}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          business_contact_info?.address && typeof business_contact_info.address === 'object'
                            ? `${business_contact_info.address.line1}, ${business_contact_info.address.city}, ${business_contact_info.address.postal_code}`
                            : (business_settings.business_info.address && typeof business_settings.business_info.address === 'object')
                              ? `${business_settings.business_info.address.line1}, ${business_settings.business_info.address.city}, ${business_settings.business_info.address.postal_code}`
                              : 'Dublin, Ireland'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full bg-white border-2 border-[#2C1A16] text-[#2C1A16] font-bold rounded-2xl shadow-md hover:shadow-lg hover:bg-[#F2EFE9] transition-all duration-300 active:scale-95"
                        style={{ minHeight: '56px', fontSize: '17px' }}
                      >
                        <MapPin className="h-5 w-5 mr-2" />
                        Get Directions
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - High-Quality Food Image (Top-down wooden board style) */}
              <div className="order-2 lg:order-2 relative w-full">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl transform lg:translate-x-8 hover:scale-105 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&h=1200&fit=crop&q=90"
                    alt="Delicious pizza on wooden board"
                    className="w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/5] object-cover"
                  />
                  {/* Subtle Overlay for Premium Look */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C1A16]/30 via-transparent to-transparent"></div>
                </div>
                
                {/* Floating Badge Element from Landing Page */}
                <div className="hidden sm:block absolute -bottom-6 sm:-bottom-8 -left-6 sm:-left-8 bg-[#2C1A16] text-[#F2EFE9] px-8 py-5 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 z-20">
                  <p className="text-sm font-medium mb-1">Made Fresh Daily</p>
                  <p className="text-2xl font-extrabold">100% Quality</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Styled Map Section with Custom Muted Colors */}
        <section className="py-16 lg:py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2C1A16] mb-10 text-center">Find Us on the Map</h2>
            <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-[#F2EFE9]">
              {map_loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#F2EFE9] z-10">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#2C1A16]"></div>
                </div>
              )}
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(
                  business_contact_info?.address && typeof business_contact_info.address === 'object'
                    ? `${business_contact_info.address.line1}, ${business_contact_info.address.city}, ${business_contact_info.address.postal_code}`
                    : (business_settings.business_info.address && typeof business_settings.business_info.address === 'object')
                      ? `${business_settings.business_info.address.line1}, ${business_settings.business_info.address.city}, ${business_settings.business_info.address.postal_code}`
                      : 'Dublin, Ireland'
                )}&zoom=15&maptype=roadmap`}
                width="100%"
                height="500"
                style={{ 
                  border: 0,
                  filter: 'grayscale(20%) sepia(10%) brightness(105%) contrast(95%)'
                }}
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
        <section className="py-16 lg:py-24 bg-[#F2EFE9] relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#2C1A16]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#4A3B32]/5 rounded-full blur-3xl"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2C1A16] mb-4">Send Us a Message</h2>
              <p className="text-base sm:text-lg text-[#4A3B32] leading-relaxed max-w-2xl mx-auto">
                Have a question or feedback? Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-[#2C1A16]/10 p-8 lg:p-12">
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
                    <label htmlFor="name" className="block text-sm font-semibold text-[#2C1A16] mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    {/* COMMANDMENT #1: 16px font-size to prevent iOS auto-zoom */}
                     <input
                      type="text"
                      id="name"
                      value={contact_form_data.name}
                      onChange={(e) => handle_input_change('name', e.target.value)}
                      onBlur={() => handle_input_blur('name')}
                      placeholder="John Smith"
                      className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-[#2C1A16]/20 focus:border-[#2C1A16] focus:ring-[#2C1A16]/10'
                      }`}
                      style={{ fontSize: '16px', minHeight: '56px' }}
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
                    <label htmlFor="email" className="block text-sm font-semibold text-[#2C1A16] mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={contact_form_data.email}
                      onChange={(e) => handle_input_change('email', e.target.value)}
                      onBlur={() => handle_input_blur('email')}
                      placeholder="john.smith@example.com"
                      className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-[#2C1A16]/20 focus:border-[#2C1A16] focus:ring-[#2C1A16]/10'
                      }`}
                      style={{ fontSize: '16px', minHeight: '56px' }}
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
                    <label htmlFor="phone" className="block text-sm font-semibold text-[#2C1A16] mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={contact_form_data.phone}
                      onChange={(e) => handle_input_change('phone', e.target.value)}
                      onBlur={() => handle_input_blur('phone')}
                      placeholder="0851234567 or +353851234567"
                      className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.phone
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-[#2C1A16]/20 focus:border-[#2C1A16] focus:ring-[#2C1A16]/10'
                      }`}
                      style={{ fontSize: '16px', minHeight: '56px' }}
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
                    <label htmlFor="subject" className="block text-sm font-semibold text-[#2C1A16] mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={contact_form_data.subject}
                      onChange={(e) => handle_input_change('subject', e.target.value)}
                      onBlur={() => handle_input_blur('subject')}
                      placeholder="General Inquiry"
                      className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                        form_errors.subject
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-[#2C1A16]/20 focus:border-[#2C1A16] focus:ring-[#2C1A16]/10'
                      }`}
                      style={{ fontSize: '16px', minHeight: '56px' }}
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
                  <label htmlFor="message" className="block text-sm font-semibold text-[#2C1A16] mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    value={contact_form_data.message}
                    onChange={(e) => handle_input_change('message', e.target.value)}
                    onBlur={() => handle_input_blur('message')}
                    placeholder="Tell us how we can help you..."
                    className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 resize-none ${
                      form_errors.message
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-[#2C1A16]/20 focus:border-[#2C1A16] focus:ring-[#2C1A16]/10'
                    }`}
                    style={{ fontSize: '16px', lineHeight: '1.5' }}
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
                  {/* COMMANDMENT #1: 48px min-height, full width on mobile */}
                  <button
                    type="submit"
                    disabled={submit_mutation.isPending}
                    className="w-full md:w-auto px-10 py-4 bg-[#2C1A16] text-[#F2EFE9] font-bold text-lg rounded-full shadow-xl hover:shadow-2xl hover:bg-[#3E2F26] hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#2C1A16]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{ minHeight: '56px' }}
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