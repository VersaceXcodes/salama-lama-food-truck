import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Types & Interfaces
// ===========================

interface Category {
  category_id: string;
  name: string;
  sort_order: number;
}

interface MenuItem {
  item_id: string;
  name: string;
  description: string | null;
  category_id: string;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  dietary_tags: string[] | null;
  is_limited_edition: boolean;
  limited_edition_end_date: string | null;
  is_active: boolean;
  available_for_collection: boolean;
  available_for_delivery: boolean;
  stock_tracked: boolean;
  current_stock: number | null;
  low_stock_threshold: number | null;
  is_featured: boolean;
  meta_description: string | null;
  image_alt_text: string | null;
}

interface CreateMenuItemPayload {
  name: string;
  description: string | null;
  category_id: string;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  dietary_tags: string[] | null;
  is_limited_edition: boolean;
  limited_edition_end_date: string | null;
  is_active: boolean;
  available_for_collection: boolean;
  available_for_delivery: boolean;
  stock_tracked: boolean;
  current_stock: number | null;
  low_stock_threshold: number | null;
  is_featured: boolean;
  meta_description: string | null;
  image_alt_text: string | null;
}

// ===========================
// API Functions
// ===========================

const fetchCategories = async (token: string): Promise<{ categories: Category[] }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/menu/categories`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const fetchMenuItem = async (itemId: string, token: string): Promise<MenuItem> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/menu/items/${itemId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  // Backend now returns { success: true, item, ... }, so we need to extract the item
  return response.data.item || response.data;
};

const createMenuItem = async (payload: CreateMenuItemPayload, token: string): Promise<MenuItem> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/menu/items`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  // Backend returns { success: true, item_id, ... }
  return response.data;
};

const updateMenuItem = async (
  itemId: string,
  payload: Partial<CreateMenuItemPayload>,
  token: string
): Promise<MenuItem> => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/menu/items/${itemId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  // Backend now returns { success: true, item, ... }, so we need to extract the item
  return response.data.item || response.data;
};

// ===========================
// Available Dietary Tags
// ===========================

const DIETARY_TAGS = [
  { value: 'vegan', label: 'Vegan', icon: 'V' },
  { value: 'vegetarian', label: 'Vegetarian', icon: 'VG' },
  { value: 'gluten_free', label: 'Gluten-Free', icon: 'GF' },
  { value: 'halal', label: 'Halal', icon: 'H' },
  { value: 'dairy_free', label: 'Dairy-Free', icon: 'DF' },
  { value: 'nut_free', label: 'Nut-Free', icon: 'NF' },
];

// ===========================
// Main Component
// ===========================

const UV_AdminMenuItemForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  // Get item_id from URL params for edit mode
  const itemIdParam = searchParams.get('item_id');
  const isEditMode = !!itemIdParam;

  // Get auth token from global store
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Form state variables
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [isLimitedEdition, setIsLimitedEdition] = useState(false);
  const [limitedEditionEndDate, setLimitedEditionEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [availableForCollection, setAvailableForCollection] = useState(true);
  const [availableForDelivery, setAvailableForDelivery] = useState(true);
  const [stockTracked, setStockTracked] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [metaDescription, setMetaDescription] = useState('');
  const [imageAltText, setImageAltText] = useState('');

  // UI state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // ===========================
  // React Query: Fetch Categories
  // ===========================

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => fetchCategories(authToken!),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
  });

  // ===========================
  // React Query: Fetch Item Details (Edit Mode)
  // ===========================

  const {
    data: itemData,
    isLoading: itemLoading,
    error: itemError,
  } = useQuery({
    queryKey: ['admin-menu-item', itemIdParam],
    queryFn: () => fetchMenuItem(itemIdParam!, authToken!),
    enabled: isEditMode && !!authToken && !!itemIdParam,
    staleTime: 60 * 1000,
  });

  // Populate form when item data loads
  useEffect(() => {
    if (itemData && isEditMode) {
      setName(itemData.name || '');
      setDescription(itemData.description || '');
      setCategoryId(itemData.category_id || '');
      setPrice(Number(itemData.price) || 0);
      setImageUrl(itemData.image_url || '');
      setImageUrls(itemData.image_urls || []);
      setDietaryTags(itemData.dietary_tags || []);
      setIsLimitedEdition(itemData.is_limited_edition || false);
      setLimitedEditionEndDate(itemData.limited_edition_end_date || '');
      setIsActive(itemData.is_active);
      setAvailableForCollection(itemData.available_for_collection);
      setAvailableForDelivery(itemData.available_for_delivery);
      setStockTracked(itemData.stock_tracked || false);
      setCurrentStock(itemData.current_stock);
      setLowStockThreshold(itemData.low_stock_threshold);
      setIsFeatured(itemData.is_featured || false);
      setMetaDescription(itemData.meta_description || '');
      setImageAltText(itemData.image_alt_text || '');
    }
  }, [itemData, isEditMode]);

  // ===========================
  // React Query: Create Mutation
  // ===========================

  const createMutation = useMutation({
    mutationFn: (payload: CreateMenuItemPayload) => createMenuItem(payload, authToken!),
    onSuccess: async () => {
      // CRITICAL FIX: Completely clear all menu item caches before navigation
      queryClient.removeQueries({ queryKey: ['admin-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      
      setSuccessMessage('Menu item created successfully!');
      
      // Small delay to ensure cache clear is complete before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to list - the list view will fetch fresh data on mount
      navigate('/admin/menu');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create menu item';
      setValidationErrors([errorMsg]);
    },
  });

  // ===========================
  // React Query: Update Mutation
  // ===========================

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CreateMenuItemPayload>) =>
      updateMenuItem(itemIdParam!, payload, authToken!),
    onSuccess: async () => {
      // CRITICAL FIX: Completely clear all menu item caches before navigation
      // This ensures the list view will fetch completely fresh data
      queryClient.removeQueries({ queryKey: ['admin-menu-items'] });
      queryClient.removeQueries({ queryKey: ['admin-menu-item', itemIdParam] });
      
      // Invalidate to mark queries as stale
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin-menu-item', itemIdParam] });
      
      setSuccessMessage('Menu item updated successfully!');
      
      // Small delay to ensure cache clear is complete before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to list - the list view will fetch fresh data on mount
      navigate('/admin/menu');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update menu item';
      setValidationErrors([errorMsg]);
    },
  });

  // ===========================
  // Form Validation
  // ===========================

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push('Item name is required');
    }

    if (!categoryId) {
      errors.push('Please select a category');
    }

    if (price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (isLimitedEdition && !limitedEditionEndDate) {
      errors.push('Limited edition end date is required');
    }

    if (stockTracked) {
      if (currentStock === null || currentStock < 0) {
        errors.push('Current stock must be a non-negative number');
      }
      if (lowStockThreshold !== null && lowStockThreshold < 0) {
        errors.push('Low stock threshold must be a non-negative number');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ===========================
  // Form Submission
  // ===========================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    const payload: CreateMenuItemPayload = {
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      price: Number(price),
      image_url: imageUrl.trim() || null,
      image_urls: imageUrls.filter(url => url.trim()).length > 0 ? imageUrls.filter(url => url.trim()) : null,
      dietary_tags: dietaryTags.length > 0 ? dietaryTags : null,
      is_limited_edition: isLimitedEdition,
      limited_edition_end_date: isLimitedEdition && limitedEditionEndDate ? limitedEditionEndDate : null,
      is_active: isActive,
      available_for_collection: availableForCollection,
      available_for_delivery: availableForDelivery,
      stock_tracked: stockTracked,
      current_stock: stockTracked ? currentStock : null,
      low_stock_threshold: stockTracked ? lowStockThreshold : null,
      is_featured: isFeatured,
      meta_description: metaDescription.trim() || null,
      image_alt_text: imageAltText.trim() || null,
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  // ===========================
  // Dietary Tag Toggle
  // ===========================

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ===========================
  // Image Gallery Management
  // ===========================

  const addImageUrl = () => {
    setImageUrls(prev => [...prev, '']);
  };

  const updateImageUrl = (index: number, value: string) => {
    setImageUrls(prev => prev.map((url, i) => (i === index ? value : url)));
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // ===========================
  // Loading & Error States
  // ===========================

  if (categoriesLoading || (isEditMode && itemLoading)) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (categoriesError || (isEditMode && itemError)) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 font-bold text-lg mb-2">Error Loading Data</h2>
            <p className="text-red-700 mb-4">
              {(categoriesError as any)?.response?.data?.message || 
               (itemError as any)?.response?.data?.message || 
               'Failed to load required data'}
            </p>
            <Link
              to="/admin/menu"
              className="inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      </>
    );
  }

  const categories = categoriesData?.categories || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ===========================
  // Render Component
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/admin/menu"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Menu
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Menu Item' : 'Create New Menu Item'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditMode
                ? 'Update menu item details and settings'
                : 'Add a new item to your menu'}
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-800 font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-red-800 font-semibold mb-2">Please fix the following errors:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-red-700 text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200">
            {/* Basic Information Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                {/* Item Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                    placeholder="e.g., Chicken Burrito"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                    placeholder="Describe your menu item..."
                  />
                </div>

                {/* Category and Price Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price (€) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="price"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>
              
              <div className="space-y-4">
                {/* Primary Image */}
                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Image URL
                  </label>
                  <input
                    type="url"
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                    placeholder="https://example.com/image.jpg"
                  />
                  {imageUrl && (
                    <div className="mt-2">
                      <img 
                        src={imageUrl} 
                        alt="Primary preview" 
                        className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Additional Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Images (Gallery)
                  </label>
                  <div className="space-y-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateImageUrl(index, e.target.value)}
                          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                          placeholder="https://example.com/image.jpg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageUrl(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      + Add Image URL
                    </button>
                  </div>
                </div>

                {/* Image Alt Text */}
                <div>
                  <label htmlFor="imageAltText" className="block text-sm font-medium text-gray-700 mb-1">
                    Image Alt Text (for accessibility)
                  </label>
                  <input
                    type="text"
                    id="imageAltText"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                    placeholder="e.g., Delicious chicken burrito with fresh ingredients"
                  />
                </div>
              </div>
            </div>

            {/* Dietary Information Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dietary Information</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DIETARY_TAGS.map((tag) => (
                  <label
                    key={tag.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      dietaryTags.includes(tag.value)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dietaryTags.includes(tag.value)}
                      onChange={() => toggleDietaryTag(tag.value)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {tag.icon} {tag.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability Settings Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Availability Settings</h2>
              
              <div className="space-y-4">
                {/* Active Status */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Item is Active (visible to customers)
                  </span>
                </label>

                {/* Available for Collection */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availableForCollection}
                    onChange={(e) => setAvailableForCollection(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Available for Collection
                  </span>
                </label>

                {/* Available for Delivery */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availableForDelivery}
                    onChange={(e) => setAvailableForDelivery(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Available for Delivery
                  </span>
                </label>

                {/* Featured Item */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Featured Item (show on homepage)
                  </span>
                </label>
              </div>
            </div>

            {/* Limited Edition Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Limited Edition</h2>
              
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isLimitedEdition}
                    onChange={(e) => setIsLimitedEdition(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    This is a Limited Edition item
                  </span>
                </label>

                {isLimitedEdition && (
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={limitedEditionEndDate}
                      onChange={(e) => setLimitedEditionEndDate(e.target.value)}
                      className="w-full md:w-1/2 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                      required={isLimitedEdition}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Stock Management Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Stock Management</h2>
              
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={stockTracked}
                    onChange={(e) => setStockTracked(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Track stock for this item
                  </span>
                </label>

                {stockTracked && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Current Stock */}
                    <div>
                      <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700 mb-1">
                        Current Stock <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="currentStock"
                        value={currentStock ?? ''}
                        onChange={(e) => setCurrentStock(e.target.value ? Number(e.target.value) : null)}
                        min="0"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                        placeholder="0"
                        required={stockTracked}
                      />
                    </div>

                    {/* Low Stock Threshold */}
                    <div>
                      <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
                        Low Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        id="threshold"
                        value={lowStockThreshold ?? ''}
                        onChange={(e) => setLowStockThreshold(e.target.value ? Number(e.target.value) : null)}
                        min="0"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                        placeholder="e.g., 10"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEO Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">SEO (Optional)</h2>
              
              <div>
                <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  maxLength={160}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                  placeholder="Brief description for search engines (max 160 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 bg-gray-50 flex items-center justify-between gap-4">
              <Link
                to="/admin/menu"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </Link>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Item' : 'Create Item'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_AdminMenuItemForm;