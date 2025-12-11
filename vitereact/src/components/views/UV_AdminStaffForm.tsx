import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// TypeScript Interfaces
// ===========================

interface StaffPermissions {
  view_orders: boolean;
  update_order_status: boolean;
  view_stock: boolean;
  update_stock: boolean;
  view_reports: boolean;
  manage_customers: boolean;
}

interface StaffFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'staff' | 'manager';
  status: 'active' | 'inactive';
  staff_permissions: StaffPermissions;
}

interface ValidationErrors {
  [key: string]: string;
}

interface StaffMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'staff' | 'manager';
  status: 'active' | 'inactive';
  staff_permissions: StaffPermissions | null;
}

// ===========================
// Permission Templates
// ===========================

const PERMISSION_TEMPLATES = {
  staff_basic: {
    name: 'Staff - Basic',
    permissions: {
      view_orders: true,
      update_order_status: true,
      view_stock: false,
      update_stock: false,
      view_reports: false,
      manage_customers: false,
    },
  },
  staff_advanced: {
    name: 'Staff - Advanced',
    permissions: {
      view_orders: true,
      update_order_status: true,
      view_stock: true,
      update_stock: true,
      view_reports: false,
      manage_customers: false,
    },
  },
  manager: {
    name: 'Manager - Full Access',
    permissions: {
      view_orders: true,
      update_order_status: true,
      view_stock: true,
      update_stock: true,
      view_reports: true,
      manage_customers: true,
    },
  },
};

// ===========================
// API Functions
// ===========================

const fetchStaffMember = async (staff_id: string, token: string): Promise<StaffMember> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/staff/${staff_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const createStaffMember = async (data: StaffFormData, token: string): Promise<StaffMember> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/staff`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const updateStaffMember = async (
  staff_id: string,
  data: Partial<StaffFormData>,
  token: string
): Promise<StaffMember> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/staff/${staff_id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_AdminStaffForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get staff_id from URL params
  const staff_id = searchParams.get('staff_id');
  const is_edit_mode = !!staff_id;

  // Access auth state (individual selectors to prevent infinite loops)
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Form state
  const [formData, setFormData] = useState<StaffFormData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'staff',
    status: 'active',
    staff_permissions: {
      view_orders: true,
      update_order_status: true,
      view_stock: false,
      update_stock: false,
      view_reports: false,
      manage_customers: false,
    },
  });

  const [send_welcome_email, setSendWelcomeEmail] = useState<boolean>(true);
  const [validation_errors, setValidationErrors] = useState<ValidationErrors>({});
  const [show_password, setShowPassword] = useState<boolean>(false);

  // Fetch staff data for editing
  const {
    data: staffData,
    isLoading: isLoadingStaff,
    error: loadError,
  } = useQuery({
    queryKey: ['staff', staff_id],
    queryFn: () => fetchStaffMember(staff_id!, auth_token!),
    enabled: is_edit_mode && !!staff_id && !!auth_token,
    staleTime: 0,
  });

  // Populate form when staff data is loaded
  useEffect(() => {
    if (staffData && is_edit_mode) {
      setFormData({
        email: staffData.email,
        password: '', // Never populate password
        first_name: staffData.first_name,
        last_name: staffData.last_name,
        phone: staffData.phone,
        role: staffData.role,
        status: staffData.status,
        staff_permissions: staffData.staff_permissions || {
          view_orders: true,
          update_order_status: true,
          view_stock: false,
          update_stock: false,
          view_reports: false,
          manage_customers: false,
        },
      });
    }
  }, [staffData, is_edit_mode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => createStaffMember(data, auth_token!),
    onSuccess: (data) => {
      navigate(`/admin/staff?created=${data.user_id}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create staff account';
      setValidationErrors({ submit: errorMessage });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<StaffFormData>) => updateStaffMember(staff_id!, data, auth_token!),
    onSuccess: (data) => {
      navigate(`/admin/staff?updated=${data.user_id}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update staff account';
      setValidationErrors({ submit: errorMessage });
    },
  });

  // Validation function
  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation (only for creation)
    if (!is_edit_mode) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
    }

    // First name validation
    if (!formData.first_name) {
      errors.first_name = 'First name is required';
    } else if (formData.first_name.length > 100) {
      errors.first_name = 'First name must be less than 100 characters';
    }

    // Last name validation
    if (!formData.last_name) {
      errors.last_name = 'Last name is required';
    } else if (formData.last_name.length > 100) {
      errors.last_name = 'Last name must be less than 100 characters';
    }

    // Phone validation
    if (!formData.phone) {
      errors.phone = 'Phone number is required';
    } else if (formData.phone.length < 10 || formData.phone.length > 20) {
      errors.phone = 'Phone number must be between 10 and 20 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, is_edit_mode]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (is_edit_mode) {
      // Update existing staff (exclude email and password)
      const { email, password, ...updateData } = formData;
      updateMutation.mutate(updateData);
    } else {
      // Create new staff
      createMutation.mutate(formData);
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof StaffFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validation_errors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission: keyof StaffPermissions) => {
    setFormData(prev => ({
      ...prev,
      staff_permissions: {
        ...prev.staff_permissions,
        [permission]: !prev.staff_permissions[permission],
      },
    }));
  };

  // Apply permission template
  const applyPermissionTemplate = (templateKey: keyof typeof PERMISSION_TEMPLATES) => {
    setFormData(prev => ({
      ...prev,
      staff_permissions: PERMISSION_TEMPLATES[templateKey].permissions,
    }));
  };

  // Generate secure password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    handleInputChange('password', password);
    setShowPassword(true);
  };

  // Loading state
  const isLoading = createMutation.isPending || updateMutation.isPending || isLoadingStaff;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center text-sm text-gray-500 mb-4">
              <Link to="/admin/dashboard" className="hover:text-gray-700 transition-colors">
                Dashboard
              </Link>
              <span className="mx-2">/</span>
              <Link to="/admin/staff" className="hover:text-gray-700 transition-colors">
                Staff
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">
                {is_edit_mode ? 'Edit Staff Member' : 'Create Staff Member'}
              </span>
            </nav>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {is_edit_mode ? 'Edit Staff Member' : 'Create New Staff Member'}
                </h1>
                <p className="mt-2 text-gray-600">
                  {is_edit_mode
                    ? 'Update staff member information and permissions'
                    : 'Add a new staff member with role and permissions'}
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingStaff && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading staff data...</p>
            </div>
          )}

          {/* Error State */}
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-red-800 font-semibold">Failed to load staff data</h3>
                  <p className="text-red-700 mt-1 text-sm">
                    {(loadError as any)?.response?.data?.message || 'An error occurred while loading staff data'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {!isLoadingStaff && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Global Error */}
              {validation_errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-red-800 font-semibold">Error</p>
                      <p className="text-red-700 mt-1 text-sm">{validation_errors.submit}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={validateForm}
                      disabled={is_edit_mode}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validation_errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 transition-all ${is_edit_mode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                      placeholder="staff@salamalama.ie"
                    />
                    {validation_errors.email && (
                      <p className="mt-2 text-sm text-red-600">{validation_errors.email}</p>
                    )}
                    {is_edit_mode && (
                      <p className="mt-2 text-sm text-gray-500">Email cannot be changed after account creation</p>
                    )}
                  </div>

                  {/* Password (Create only) */}
                  {!is_edit_mode && (
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                        Password *
                      </label>
                      <div className="flex space-x-2">
                        <div className="flex-1 relative">
                          <input
                            type={show_password ? 'text' : 'password'}
                            id="password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            onBlur={validateForm}
                            className={`w-full px-4 py-3 rounded-lg border-2 ${
                              validation_errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                            } focus:ring-4 transition-all`}
                            placeholder="Minimum 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!show_password)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {show_password ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                      {validation_errors.password && (
                        <p className="mt-2 text-sm text-red-600">{validation_errors.password}</p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">Password must be at least 8 characters</p>
                    </div>
                  )}

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-900 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        onBlur={validateForm}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.first_name ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="John"
                      />
                      {validation_errors.first_name && (
                        <p className="mt-2 text-sm text-red-600">{validation_errors.first_name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-900 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        onBlur={validateForm}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.last_name ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="Smith"
                      />
                      {validation_errors.last_name && (
                        <p className="mt-2 text-sm text-red-600">{validation_errors.last_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      onBlur={validateForm}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validation_errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 transition-all`}
                      placeholder="+353 1 234 5678"
                    />
                    {validation_errors.phone && (
                      <p className="mt-2 text-sm text-red-600">{validation_errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Role & Status Section */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Role & Status</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Role Selection */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-900 mb-2">
                      Role *
                    </label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value as 'staff' | 'manager')}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      {formData.role === 'staff' ? 'Basic operational access' : 'Advanced access with management capabilities'}
                    </p>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-900">
                        Account Status
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        {formData.status === 'active' ? 'Staff member can log in and access the system' : 'Staff member cannot access the system'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('status', formData.status === 'active' ? 'inactive' : 'active')}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        formData.status === 'active' ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          formData.status === 'active' ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Permissions</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Permission Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Quick Permission Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(PERMISSION_TEMPLATES) as Array<keyof typeof PERMISSION_TEMPLATES>).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyPermissionTemplate(key)}
                          className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors border border-orange-200"
                        >
                          {PERMISSION_TEMPLATES[key].name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Individual Permissions */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-900">Individual Permissions</p>
                    
                    <div className="space-y-3">
                      {/* View Orders */}
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.staff_permissions.view_orders}
                            onChange={() => handlePermissionToggle('view_orders')}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-gray-900 font-medium block">View Orders</span>
                            <span className="text-sm text-gray-500">Access to view order queue and details</span>
                          </div>
                        </div>
                      </label>

                      {/* Update Order Status */}
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.staff_permissions.update_order_status}
                            onChange={() => handlePermissionToggle('update_order_status')}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-gray-900 font-medium block">Update Order Status</span>
                            <span className="text-sm text-gray-500">Change order status (preparing, ready, etc.)</span>
                          </div>
                        </div>
                      </label>

                      {/* View Stock */}
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.staff_permissions.view_stock}
                            onChange={() => handlePermissionToggle('view_stock')}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-gray-900 font-medium block">View Stock</span>
                            <span className="text-sm text-gray-500">Access to view inventory levels</span>
                          </div>
                        </div>
                      </label>

                      {/* Update Stock */}
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.staff_permissions.update_stock}
                            onChange={() => handlePermissionToggle('update_stock')}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-gray-900 font-medium block">Update Stock</span>
                            <span className="text-sm text-gray-500">Adjust inventory quantities</span>
                          </div>
                        </div>
                      </label>

                      {/* View Reports */}
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.staff_permissions.view_reports}
                            onChange={() => handlePermissionToggle('view_reports')}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-gray-900 font-medium block">View Reports</span>
                            <span className="text-sm text-gray-500">Access to daily/weekly sales reports</span>
                          </div>
                        </div>
                      </label>

                      {/* Manage Customers */}
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.staff_permissions.manage_customers}
                            onChange={() => handlePermissionToggle('manage_customers')}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-gray-900 font-medium block">Manage Customers</span>
                            <span className="text-sm text-gray-500">View and modify customer information</span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Options Section (Create only) */}
              {!is_edit_mode && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white">Options</h2>
                  </div>
                  
                  <div className="p-6">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={send_welcome_email}
                          onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <div>
                          <span className="text-gray-900 font-medium block">Send Welcome Email</span>
                          <span className="text-sm text-gray-500">Staff member will receive login credentials via email</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/admin/staff')}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {is_edit_mode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    is_edit_mode ? 'Update Staff Member' : 'Create Staff Member'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AdminStaffForm;