import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// ===========================
// TypeScript Interfaces
// ===========================

interface Category {
  category_id: string;
  name: string;
}

interface DiscountCode {
  code_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed' | 'delivery_fee';
  discount_value: number;
  applicable_order_types: string[] | null;
  applicable_category_ids: string[] | null;
  minimum_order_value: number | null;
  total_usage_limit: number | null;
  per_customer_usage_limit: number | null;
  valid_from: string;
  valid_until: string | null;
  status: 'active' | 'inactive' | 'expired';
  internal_notes: string | null;
}

interface FormData {
  code: string;
  discount_type: 'percentage' | 'fixed' | 'delivery_fee';
  discount_value: string;
  applicable_order_types: string[];
  applicable_category_ids: string[];
  minimum_order_value: string;
  total_usage_limit: string;
  per_customer_usage_limit: string;
  valid_from: string;
  valid_until: string;
  status: 'active' | 'inactive' | 'expired';
  internal_notes: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface CreateDiscountPayload {
  code: string;
  discount_type: 'percentage' | 'fixed' | 'delivery_fee';
  discount_value: number;
  applicable_order_types?: string[] | null;
  applicable_category_ids?: string[] | null;
  minimum_order_value?: number | null;
  total_usage_limit?: number | null;
  per_customer_usage_limit?: number | null;
  valid_from: string;
  valid_until?: string | null;
  status: 'active' | 'inactive' | 'expired';
  internal_notes?: string | null;
}

interface UpdateDiscountPayload {
  discount_value: number;
  minimum_order_value?: number | null;
  total_usage_limit?: number | null;
  per_customer_usage_limit?: number | null;
  valid_until?: string | null;
  status: 'active' | 'inactive' | 'expired';
  internal_notes?: string | null;
}

// ===========================
// API Functions
// ===========================

const fetchDiscountCode = async (code_id: string, auth_token: string): Promise<DiscountCode> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/discounts/${code_id}`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  return response.data;
};

const fetchCategories = async (auth_token: string): Promise<Category[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/menu/categories`,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
    }
  );
  return response.data.categories || [];
};

const createDiscountCode = async (
  payload: CreateDiscountPayload,
  auth_token: string
): Promise<DiscountCode> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/discounts`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const updateDiscountCode = async (
  code_id: string,
  payload: UpdateDiscountPayload,
  auth_token: string
): Promise<DiscountCode> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/discounts/${code_id}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_AdminDiscountForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code_id = searchParams.get('code_id');

  // Global state
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [formData, setFormData] = useState<FormData>({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    applicable_order_types: [],
    applicable_category_ids: [],
    minimum_order_value: '',
    total_usage_limit: '',
    per_customer_usage_limit: '',
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: '',
    status: 'active',
    internal_notes: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if editing mode
  const isEditMode = !!code_id;

  // Fetch discount code for editing
  const {
    data: existingCode,
    isLoading: isLoadingCode,
    error: fetchError,
  } = useQuery({
    queryKey: ['admin-discount-code', code_id],
    queryFn: () => fetchDiscountCode(code_id!, auth_token!),
    enabled: !!code_id && !!auth_token,
    staleTime: 0,
  });

  // Fetch categories
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => fetchCategories(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateDiscountPayload) => createDiscountCode(payload, auth_token!),
    onSuccess: () => {
      navigate('/admin/discounts', {
        state: { successMessage: 'Discount code created successfully!' },
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create discount code';
      setSubmitError(errorMessage);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateDiscountPayload) => updateDiscountCode(code_id!, payload, auth_token!),
    onSuccess: () => {
      navigate('/admin/discounts', {
        state: { successMessage: 'Discount code updated successfully!' },
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update discount code';
      setSubmitError(errorMessage);
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingCode && isEditMode) {
      setFormData({
        code: existingCode.code,
        discount_type: existingCode.discount_type,
        discount_value: existingCode.discount_value.toString(),
        applicable_order_types: existingCode.applicable_order_types || [],
        applicable_category_ids: existingCode.applicable_category_ids || [],
        minimum_order_value: existingCode.minimum_order_value?.toString() || '',
        total_usage_limit: existingCode.total_usage_limit?.toString() || '',
        per_customer_usage_limit: existingCode.per_customer_usage_limit?.toString() || '',
        valid_from: existingCode.valid_from.slice(0, 16),
        valid_until: existingCode.valid_until?.slice(0, 16) || '',
        status: existingCode.status,
        internal_notes: existingCode.internal_notes || '',
      });
    }
  }, [existingCode, isEditMode]);

  // Auto-generate discount code
  const generateCode = () => {
    setIsGeneratingCode(true);
    
    // Generate random 8-character alphanumeric string
    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let generatedCode = 'PROMO';
    
    for (let i = 0; i < codeLength; i++) {
      generatedCode += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    setFormData(prev => ({ ...prev, code: generatedCode }));
    setValidationErrors(prev => ({ ...prev, code: '' }));
    
    setTimeout(() => setIsGeneratingCode(false), 300);
  };

  // Handle form field changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
    }
  };

  // Handle multi-select changes
  const handleMultiSelectChange = (name: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentValues = prev[name as keyof FormData] as string[];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);
      return { ...prev, [name]: newValues };
    });
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Code validation
    if (!formData.code.trim()) {
      errors.code = 'Discount code is required';
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      errors.code = 'Code must be uppercase alphanumeric characters only';
    } else if (formData.code.length < 4 || formData.code.length > 50) {
      errors.code = 'Code must be between 4 and 50 characters';
    }

    // Discount value validation
    if (!formData.discount_value) {
      errors.discount_value = 'Discount value is required';
    } else {
      const value = parseFloat(formData.discount_value);
      if (isNaN(value) || value <= 0) {
        errors.discount_value = 'Discount value must be a positive number';
      } else if (formData.discount_type === 'percentage' && (value < 1 || value > 100)) {
        errors.discount_value = 'Percentage must be between 1 and 100';
      }
    }

    // Valid from validation
    if (!formData.valid_from) {
      errors.valid_from = 'Start date is required';
    }

    // Valid until validation (if provided)
    if (formData.valid_until && formData.valid_from) {
      const fromDate = new Date(formData.valid_from);
      const untilDate = new Date(formData.valid_until);
      if (untilDate <= fromDate) {
        errors.valid_until = 'End date must be after start date';
      }
    }

    // Minimum order value validation
    if (formData.minimum_order_value && parseFloat(formData.minimum_order_value) < 0) {
      errors.minimum_order_value = 'Minimum order value cannot be negative';
    }

    // Usage limits validation
    if (formData.total_usage_limit && parseInt(formData.total_usage_limit) < 1) {
      errors.total_usage_limit = 'Total usage limit must be at least 1';
    }
    if (formData.per_customer_usage_limit && parseInt(formData.per_customer_usage_limit) < 1) {
      errors.per_customer_usage_limit = 'Per-customer limit must be at least 1';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    const discount_value = parseFloat(formData.discount_value);

    if (isEditMode) {
      // Update existing discount code
      const payload: UpdateDiscountPayload = {
        discount_value,
        minimum_order_value: formData.minimum_order_value ? parseFloat(formData.minimum_order_value) : null,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_customer_usage_limit: formData.per_customer_usage_limit ? parseInt(formData.per_customer_usage_limit) : null,
        valid_until: formData.valid_until || null,
        status: formData.status,
        internal_notes: formData.internal_notes || null,
      };

      updateMutation.mutate(payload);
    } else {
      // Create new discount code
      const payload: CreateDiscountPayload = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value,
        applicable_order_types: formData.applicable_order_types.length > 0 ? formData.applicable_order_types : null,
        applicable_category_ids: formData.applicable_category_ids.length > 0 ? formData.applicable_category_ids : null,
        minimum_order_value: formData.minimum_order_value ? parseFloat(formData.minimum_order_value) : null,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_customer_usage_limit: formData.per_customer_usage_limit ? parseInt(formData.per_customer_usage_limit) : null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        status: formData.status,
        internal_notes: formData.internal_notes || null,
      };

      createMutation.mutate(payload);
    }
  };

  // Loading state
  const isLoading = isLoadingCode || createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
              <Link to="/admin/dashboard" className="hover:text-orange-600 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <Link to="/admin/discounts" className="hover:text-orange-600 transition-colors">
                Discount Codes
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">
                {isEditMode ? 'Edit Code' : 'Create Code'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'Edit Discount Code' : 'Create Discount Code'}
              </h1>
              <Link
                to="/admin/discounts"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                ← Back to Discounts
              </Link>
            </div>
          </div>

          {/* Error Messages */}
          {fetchError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">
                Failed to load discount code. Please try again.
              </p>
            </div>
          )}

          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          {/* Form */}
          {isLoadingCode ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-10 bg-gray-200 rounded w-1/3"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Basic Information Section */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Discount Code */}
                  <div className="md:col-span-2">
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Code <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        disabled={isEditMode}
                        placeholder="Enter code or generate"
                        className={`flex-1 px-4 py-3 border rounded-lg font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                          validationErrors.code
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={generateCode}
                          disabled={isGeneratingCode}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isGeneratingCode ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Generating...</span>
                            </>
                          ) : (
                            <span>Generate Code</span>
                          )}
                        </button>
                      )}
                    </div>
                    {validationErrors.code && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
                    )}
                    {isEditMode && (
                      <p className="mt-1 text-xs text-gray-500">Code cannot be changed when editing</p>
                    )}
                  </div>

                  {/* Discount Type */}
                  <div>
                    <label htmlFor="discount_type" className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="discount_type"
                      name="discount_type"
                      value={formData.discount_type}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                        isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="fixed">Fixed Amount Off</option>
                      <option value="delivery_fee">Free Delivery</option>
                    </select>
                    {isEditMode && (
                      <p className="mt-1 text-xs text-gray-500">Type cannot be changed when editing</p>
                    )}
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label htmlFor="discount_value" className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Value <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      {formData.discount_type === 'percentage' && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      )}
                      {formData.discount_type === 'fixed' && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                      )}
                      <input
                        type="number"
                        id="discount_value"
                        name="discount_value"
                        value={formData.discount_value}
                        onChange={handleInputChange}
                        disabled={formData.discount_type === 'delivery_fee'}
                        placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                        step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                        min="0"
                        max={formData.discount_type === 'percentage' ? '100' : undefined}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                          formData.discount_type === 'fixed' ? 'pl-10' : ''
                        } ${
                          validationErrors.discount_value
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        } ${formData.discount_type === 'delivery_fee' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {validationErrors.discount_value && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.discount_value}</p>
                    )}
                    {formData.discount_type === 'delivery_fee' && (
                      <p className="mt-1 text-xs text-gray-500">Delivery fee will be waived</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Applicability Rules Section */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Applicability Rules</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Leave empty to apply discount to all orders and items
                </p>

                <div className="space-y-6">
                  {/* Order Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Applicable Order Types
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.applicable_order_types.includes('collection')}
                          onChange={(e) => handleMultiSelectChange('applicable_order_types', 'collection', e.target.checked)}
                          disabled={isEditMode}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700">Collection Orders</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.applicable_order_types.includes('delivery')}
                          onChange={(e) => handleMultiSelectChange('applicable_order_types', 'delivery', e.target.checked)}
                          disabled={isEditMode}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700">Delivery Orders</span>
                      </label>
                    </div>
                    {isEditMode && (
                      <p className="mt-2 text-xs text-gray-500">Order type restrictions cannot be changed when editing</p>
                    )}
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Applicable Categories
                    </label>
                    {isLoadingCategories ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {categories.map((category) => (
                          <label key={category.category_id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.applicable_category_ids.includes(category.category_id)}
                              onChange={(e) => handleMultiSelectChange('applicable_category_ids', category.category_id, e.target.checked)}
                              disabled={isEditMode}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {isEditMode && (
                      <p className="mt-2 text-xs text-gray-500">Category restrictions cannot be changed when editing</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage Constraints Section */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Constraints</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Minimum Order Value */}
                  <div>
                    <label htmlFor="minimum_order_value" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Order Value
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                      <input
                        type="number"
                        id="minimum_order_value"
                        name="minimum_order_value"
                        value={formData.minimum_order_value}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                          validationErrors.minimum_order_value
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {validationErrors.minimum_order_value && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.minimum_order_value}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Leave empty for no minimum</p>
                  </div>

                  {/* Total Usage Limit */}
                  <div>
                    <label htmlFor="total_usage_limit" className="block text-sm font-medium text-gray-700 mb-2">
                      Total Usage Limit
                    </label>
                    <input
                      type="number"
                      id="total_usage_limit"
                      name="total_usage_limit"
                      value={formData.total_usage_limit}
                      onChange={handleInputChange}
                      placeholder="Unlimited"
                      min="1"
                      step="1"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                        validationErrors.total_usage_limit
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.total_usage_limit && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.total_usage_limit}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Maximum total redemptions</p>
                  </div>

                  {/* Per Customer Limit */}
                  <div>
                    <label htmlFor="per_customer_usage_limit" className="block text-sm font-medium text-gray-700 mb-2">
                      Per-Customer Limit
                    </label>
                    <input
                      type="number"
                      id="per_customer_usage_limit"
                      name="per_customer_usage_limit"
                      value={formData.per_customer_usage_limit}
                      onChange={handleInputChange}
                      placeholder="Unlimited"
                      min="1"
                      step="1"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                        validationErrors.per_customer_usage_limit
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.per_customer_usage_limit && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.per_customer_usage_limit}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Uses per customer</p>
                  </div>
                </div>
              </div>

              {/* Validity Period Section */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Validity Period</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Valid From */}
                  <div>
                    <label htmlFor="valid_from" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      id="valid_from"
                      name="valid_from"
                      value={formData.valid_from}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                        validationErrors.valid_from
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {validationErrors.valid_from && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.valid_from}</p>
                    )}
                    {isEditMode && (
                      <p className="mt-1 text-xs text-gray-500">Start date cannot be changed when editing</p>
                    )}
                  </div>

                  {/* Valid Until */}
                  <div>
                    <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="valid_until"
                      name="valid_until"
                      value={formData.valid_until}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                        validationErrors.valid_until
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.valid_until && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.valid_until}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Leave empty for no expiration</p>
                  </div>
                </div>
              </div>

              {/* Status & Notes Section */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status & Notes</h2>

                <div className="space-y-6">
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Active codes can be used, inactive codes are disabled
                    </p>
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Internal Notes
                    </label>
                    <textarea
                      id="internal_notes"
                      name="internal_notes"
                      value={formData.internal_notes}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Add notes for internal reference (not visible to customers)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                    ></textarea>
                    <p className="mt-1 text-xs text-gray-500">
                      These notes are only visible to administrators
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <Link
                  to="/admin/discounts"
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Update Discount Code' : 'Create Discount Code'}</span>
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

export default UV_AdminDiscountForm;