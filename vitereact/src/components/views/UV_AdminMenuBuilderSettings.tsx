import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Settings,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Save,
  Power,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Tag,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BuilderConfig {
  config_id: string;
  enabled: boolean;
  builder_category_ids: string[];
  include_base_item_price: boolean;
  created_at?: string;
  updated_at?: string;
  steps_count?: number;
}

interface BuilderStepItem {
  step_item_id: string;
  item_id: string;
  name: string;
  description?: string;
  original_price?: number;
  override_price: number | null;
  effective_price: number;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  item_is_active?: boolean;
}

interface BuilderStep {
  step_id: string;
  config_id?: string;
  step_name: string;
  step_key: string;
  step_type: 'single' | 'multiple';
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  sort_order: number;
  created_at?: string;
  items: BuilderStepItem[];
}

interface Category {
  category_id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface MenuItem {
  item_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id: string;
  is_active: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchBuilderConfig = async (token: string): Promise<BuilderConfig | null> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/menu/builder-config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.config || null;
};

const fetchBuilderSteps = async (token: string): Promise<BuilderStep[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/menu/builder-steps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.steps || [];
};

const fetchCategories = async (token: string): Promise<Category[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/menu/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.categories || [];
};

const fetchMenuItems = async (token: string): Promise<MenuItem[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/admin/menu/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.items || [];
};

const updateBuilderConfig = async (token: string, config: Partial<BuilderConfig>): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/admin/menu/builder-config`, config, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const createOrUpdateStep = async (token: string, step: Partial<BuilderStep>): Promise<{ step_id: string }> => {
  const response = await axios.post(`${API_BASE_URL}/api/admin/menu/builder-steps`, step, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const deleteStep = async (token: string, stepId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/admin/menu/builder-steps/${stepId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const createOrUpdateStepItem = async (
  token: string,
  item: {
    step_item_id?: string;
    step_id: string;
    item_id: string;
    override_price?: number | null;
    sort_order: number;
    is_active: boolean;
  }
): Promise<{ step_item_id: string }> => {
  const response = await axios.post(`${API_BASE_URL}/api/admin/menu/builder-step-items`, item, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const deleteStepItem = async (token: string, stepItemId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/admin/menu/builder-step-items/${stepItemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminMenuBuilderSettings: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const auth_token = useAppStore((state) => state.authentication_state.auth_token);

  // Config state
  const [builder_enabled, set_builder_enabled] = useState<boolean>(false);
  const [selected_category_ids, set_selected_category_ids] = useState<string[]>([]);
  const [include_base_price, set_include_base_price] = useState<boolean>(false);

  // Step form state
  const [step_form_open, set_step_form_open] = useState<boolean>(false);
  const [editing_step, set_editing_step] = useState<BuilderStep | null>(null);
  const [step_form_data, set_step_form_data] = useState({
    step_name: '',
    step_key: '',
    step_type: 'single' as 'single' | 'multiple',
    is_required: true,
    min_selections: 1,
    max_selections: 1 as number | null,
    sort_order: 0,
  });

  // Step item form state
  const [step_item_form_open, set_step_item_form_open] = useState<boolean>(false);
  const [selected_step_for_item, set_selected_step_for_item] = useState<BuilderStep | null>(null);
  const [step_item_form_data, set_step_item_form_data] = useState({
    item_id: '',
    override_price: '' as string,
    sort_order: 0,
    is_active: true,
  });

  // UI state
  const [expanded_steps, set_expanded_steps] = useState<Set<string>>(new Set());
  const [delete_confirm_step_id, set_delete_confirm_step_id] = useState<string | null>(null);
  const [delete_confirm_step_item, set_delete_confirm_step_item] = useState<{
    step_item_id: string;
    step_id: string;
  } | null>(null);
  const [notification, set_notification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const queryClient = useQueryClient();

  // ============================================================================
  // REACT QUERY HOOKS
  // ============================================================================

  const {
    data: config_data,
    isLoading: config_loading,
    error: config_error,
  } = useQuery({
    queryKey: ['builder_config'],
    queryFn: () => fetchBuilderConfig(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: steps_data,
    isLoading: steps_loading,
    error: steps_error,
  } = useQuery({
    queryKey: ['builder_steps'],
    queryFn: () => fetchBuilderSteps(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories_data } = useQuery({
    queryKey: ['admin_categories'],
    queryFn: () => fetchCategories(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
  });

  const { data: menu_items_data } = useQuery({
    queryKey: ['admin_menu_items'],
    queryFn: () => fetchMenuItems(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const update_config_mutation = useMutation({
    mutationFn: (config: Partial<BuilderConfig>) => updateBuilderConfig(auth_token!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder_config'] });
      show_notification('success', 'Builder configuration updated successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to update configuration');
    },
  });

  const create_step_mutation = useMutation({
    mutationFn: (step: Partial<BuilderStep>) => createOrUpdateStep(auth_token!, step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder_steps'] });
      set_step_form_open(false);
      set_editing_step(null);
      reset_step_form();
      show_notification('success', 'Builder step saved successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to save step');
    },
  });

  const delete_step_mutation = useMutation({
    mutationFn: (stepId: string) => deleteStep(auth_token!, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder_steps'] });
      set_delete_confirm_step_id(null);
      show_notification('success', 'Builder step deleted successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to delete step');
    },
  });

  const create_step_item_mutation = useMutation({
    mutationFn: (item: Parameters<typeof createOrUpdateStepItem>[1]) => createOrUpdateStepItem(auth_token!, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder_steps'] });
      set_step_item_form_open(false);
      set_selected_step_for_item(null);
      reset_step_item_form();
      show_notification('success', 'Item added to step successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to add item');
    },
  });

  const delete_step_item_mutation = useMutation({
    mutationFn: (stepItemId: string) => deleteStepItem(auth_token!, stepItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder_steps'] });
      set_delete_confirm_step_item(null);
      show_notification('success', 'Item removed from step successfully');
    },
    onError: (error: any) => {
      show_notification('error', error.response?.data?.message || 'Failed to remove item');
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (config_data) {
      set_builder_enabled(config_data.enabled);
      set_selected_category_ids(config_data.builder_category_ids || []);
      set_include_base_price(config_data.include_base_item_price);
    }
  }, [config_data]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => set_notification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const show_notification = (type: 'success' | 'error', message: string) => {
    set_notification({ type, message });
  };

  const reset_step_form = () => {
    set_step_form_data({
      step_name: '',
      step_key: '',
      step_type: 'single',
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      sort_order: (steps_data?.length || 0) + 1,
    });
  };

  const reset_step_item_form = () => {
    set_step_item_form_data({
      item_id: '',
      override_price: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const toggle_step_expanded = (stepId: string) => {
    set_expanded_steps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const open_create_step_form = () => {
    reset_step_form();
    set_editing_step(null);
    set_step_form_open(true);
  };

  const open_edit_step_form = (step: BuilderStep) => {
    set_editing_step(step);
    set_step_form_data({
      step_name: step.step_name,
      step_key: step.step_key,
      step_type: step.step_type,
      is_required: step.is_required,
      min_selections: step.min_selections,
      max_selections: step.max_selections,
      sort_order: step.sort_order,
    });
    set_step_form_open(true);
  };

  const open_add_item_form = (step: BuilderStep) => {
    set_selected_step_for_item(step);
    set_step_item_form_data({
      item_id: '',
      override_price: '',
      sort_order: (step.items?.length || 0) + 1,
      is_active: true,
    });
    set_step_item_form_open(true);
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handle_save_config = () => {
    update_config_mutation.mutate({
      enabled: builder_enabled,
      builder_category_ids: selected_category_ids,
      include_base_item_price: include_base_price,
    });
  };

  const handle_category_toggle = (categoryId: string) => {
    set_selected_category_ids((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handle_step_form_submit = (e: React.FormEvent) => {
    e.preventDefault();
    const step_payload: Partial<BuilderStep> = {
      ...(editing_step?.step_id ? { step_id: editing_step.step_id } : {}),
      step_name: step_form_data.step_name,
      step_key: step_form_data.step_key,
      step_type: step_form_data.step_type,
      is_required: step_form_data.is_required,
      min_selections: step_form_data.min_selections,
      max_selections: step_form_data.step_type === 'single' ? 1 : step_form_data.max_selections,
      sort_order: step_form_data.sort_order,
    };
    create_step_mutation.mutate(step_payload);
  };

  const handle_step_item_form_submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected_step_for_item) return;

    const item_payload = {
      step_id: selected_step_for_item.step_id,
      item_id: step_item_form_data.item_id,
      override_price: step_item_form_data.override_price
        ? Number(step_item_form_data.override_price)
        : null,
      sort_order: step_item_form_data.sort_order,
      is_active: step_item_form_data.is_active,
    };
    create_step_item_mutation.mutate(item_payload);
  };

  const handle_delete_step = (stepId: string) => {
    delete_step_mutation.mutate(stepId);
  };

  const handle_delete_step_item = (stepItemId: string) => {
    delete_step_item_mutation.mutate(stepItemId);
  };

  // Get available menu items (not already in the step)
  const get_available_items = (step: BuilderStep) => {
    const existingItemIds = new Set(step.items?.map((i) => i.item_id) || []);
    return (menu_items_data || []).filter((item) => !existingItemIds.has(item.item_id) && item.is_active);
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (config_loading || steps_loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading menu builder settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (config_error || steps_error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-red-800 font-semibold">Failed to Load Builder Settings</h3>
                <p className="text-red-600 text-sm mt-1">
                  {(config_error as any)?.message || (steps_error as any)?.message || 'Please try again later'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Layers className="h-8 w-8 text-orange-600 mr-3" />
            Menu Builder Configuration
          </h1>
          <p className="text-gray-600 mt-2">
            Configure the step-by-step builder for Subs and Wraps
          </p>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-md rounded-lg shadow-lg p-4 ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start">
              {notification.type === 'success' ? (
                <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {notification.message}
              </p>
            </div>
          </div>
        )}

        {/* Global Builder Settings Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <Settings className="h-6 w-6 text-gray-700 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Builder Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Builder Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <Power
                  className={`h-6 w-6 mr-3 ${builder_enabled ? 'text-green-600' : 'text-gray-400'}`}
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Builder {builder_enabled ? 'Enabled' : 'Disabled'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {builder_enabled
                      ? 'Subs & Wraps will open the step-by-step builder'
                      : 'All items use standard add-to-cart behavior'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => set_builder_enabled(!builder_enabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  builder_enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    builder_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Tag className="inline h-4 w-4 mr-1" />
                Categories that trigger the builder
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(categories_data || []).map((category) => (
                  <label
                    key={category.category_id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selected_category_ids.includes(category.category_id)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected_category_ids.includes(category.category_id)}
                      onChange={() => handle_category_toggle(category.category_id)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Items in selected categories will show "Customize & Add" instead of direct add-to-cart
              </p>
            </div>

            {/* Include Base Price Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="include_base_price"
                checked={include_base_price}
                onChange={(e) => set_include_base_price(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="include_base_price" className="ml-2 text-sm font-medium text-gray-700">
                Include original item price in total (add to builder selections)
              </label>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handle_save_config}
                disabled={update_config_mutation.isPending}
                className="flex items-center px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {update_config_mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Builder Steps Management */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Layers className="h-6 w-6 text-gray-700 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Builder Steps</h2>
            </div>
            <button
              onClick={open_create_step_form}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Step
            </button>
          </div>

          {/* Steps List */}
          {(steps_data || []).length > 0 ? (
            <div className="space-y-4">
              {(steps_data || [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((step) => (
                  <div
                    key={step.step_id}
                    className="border rounded-lg bg-white overflow-hidden"
                  >
                    {/* Step Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer"
                      onClick={() => toggle_step_expanded(step.step_id)}
                    >
                      <div className="flex items-center">
                        <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
                        {expanded_steps.has(step.step_id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-500 mr-2" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500 mr-2" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {step.sort_order}. {step.step_name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 uppercase">Key: {step.step_key}</span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                step.step_type === 'single'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {step.step_type === 'single' ? 'Single Select' : 'Multi Select'}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                step.is_required
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {step.is_required ? 'Required' : 'Optional'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {step.items?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => open_edit_step_form(step)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Step"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => set_delete_confirm_step_id(step.step_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Step"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Step Items (Expandable) */}
                    {expanded_steps.has(step.step_id) && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-700">Items in this step</h4>
                          <button
                            onClick={() => open_add_item_form(step)}
                            className="flex items-center px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </button>
                        </div>

                        {(step.items || []).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(step.items || [])
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((item) => (
                                <div
                                  key={item.step_item_id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    item.is_active && item.item_is_active !== false
                                      ? 'border-gray-200 bg-white'
                                      : 'border-gray-300 bg-gray-100 opacity-60'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {item.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {item.override_price !== null
                                        ? `€${Number(item.override_price).toFixed(2)} (override)`
                                        : `€${Number(item.effective_price).toFixed(2)}`}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      set_delete_confirm_step_item({
                                        step_item_id: item.step_item_id,
                                        step_id: step.step_id,
                                      })
                                    }
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                                    title="Remove from step"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <p className="text-gray-500 text-sm">No items in this step</p>
                            <p className="text-gray-400 text-xs mt-1">
                              Add items that customers can choose from
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Layers className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No builder steps configured</p>
              <p className="text-gray-500 text-sm mt-1">
                Create steps like Base, Protein, Toppings, Sauce
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Step Form Modal */}
      {step_form_open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing_step ? 'Edit Builder Step' : 'Create Builder Step'}
              </h2>
              <button
                onClick={() => {
                  set_step_form_open(false);
                  set_editing_step(null);
                  reset_step_form();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handle_step_form_submit} className="p-6 space-y-4">
              {/* Step Name */}
              <div>
                <label htmlFor="step_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Step Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="step_name"
                  required
                  value={step_form_data.step_name}
                  onChange={(e) =>
                    set_step_form_data((prev) => ({ ...prev, step_name: e.target.value }))
                  }
                  placeholder="e.g., Choose Your Base"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Step Key */}
              <div>
                <label htmlFor="step_key" className="block text-sm font-medium text-gray-700 mb-2">
                  Step Key <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="step_key"
                  required
                  value={step_form_data.step_key}
                  onChange={(e) =>
                    set_step_form_data((prev) => ({
                      ...prev,
                      step_key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    }))
                  }
                  placeholder="e.g., base, protein, toppings"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Used for data storage (lowercase, no spaces)</p>
              </div>

              {/* Step Type */}
              <div>
                <label htmlFor="step_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Selection Type <span className="text-red-600">*</span>
                </label>
                <select
                  id="step_type"
                  required
                  value={step_form_data.step_type}
                  onChange={(e) =>
                    set_step_form_data((prev) => ({
                      ...prev,
                      step_type: e.target.value as 'single' | 'multiple',
                      max_selections: e.target.value === 'single' ? 1 : prev.max_selections,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="single">Single Selection (choose one)</option>
                  <option value="multiple">Multiple Selection (choose many)</option>
                </select>
              </div>

              {/* Min/Max Selections for Multiple */}
              {step_form_data.step_type === 'multiple' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="min_selections"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Min Selections
                    </label>
                    <input
                      type="number"
                      id="min_selections"
                      value={step_form_data.min_selections}
                      onChange={(e) =>
                        set_step_form_data((prev) => ({
                          ...prev,
                          min_selections: Number(e.target.value),
                        }))
                      }
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="max_selections"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Max Selections
                    </label>
                    <input
                      type="number"
                      id="max_selections"
                      value={step_form_data.max_selections || ''}
                      onChange={(e) =>
                        set_step_form_data((prev) => ({
                          ...prev,
                          max_selections: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      min="1"
                      placeholder="Unlimited"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Sort Order */}
              <div>
                <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  id="sort_order"
                  value={step_form_data.sort_order}
                  onChange={(e) =>
                    set_step_form_data((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                  }
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Required Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_required"
                  checked={step_form_data.is_required}
                  onChange={(e) =>
                    set_step_form_data((prev) => ({ ...prev, is_required: e.target.checked }))
                  }
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="is_required" className="ml-2 text-sm font-medium text-gray-700">
                  Required step (customer must make a selection)
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    set_step_form_open(false);
                    set_editing_step(null);
                    reset_step_form();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create_step_mutation.isPending}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {create_step_mutation.isPending ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      {editing_step ? 'Update Step' : 'Create Step'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step Item Form Modal */}
      {step_item_form_open && selected_step_for_item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Add Item to "{selected_step_for_item.step_name}"
              </h2>
              <button
                onClick={() => {
                  set_step_item_form_open(false);
                  set_selected_step_for_item(null);
                  reset_step_item_form();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handle_step_item_form_submit} className="p-6 space-y-4">
              {/* Item Selection */}
              <div>
                <label htmlFor="item_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Menu Item <span className="text-red-600">*</span>
                </label>
                <select
                  id="item_id"
                  required
                  value={step_item_form_data.item_id}
                  onChange={(e) =>
                    set_step_item_form_data((prev) => ({ ...prev, item_id: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">-- Select an item --</option>
                  {get_available_items(selected_step_for_item).map((item) => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.name} - €{Number(item.price).toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only active items not already in this step are shown
                </p>
              </div>

              {/* Override Price */}
              <div>
                <label
                  htmlFor="override_price"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Override Price (€)
                </label>
                <input
                  type="number"
                  id="override_price"
                  value={step_item_form_data.override_price}
                  onChange={(e) =>
                    set_step_item_form_data((prev) => ({ ...prev, override_price: e.target.value }))
                  }
                  placeholder="Leave empty to use item's original price"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set a different price for this item when used in the builder
                </p>
              </div>

              {/* Sort Order */}
              <div>
                <label htmlFor="item_sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <input
                  type="number"
                  id="item_sort_order"
                  value={step_item_form_data.sort_order}
                  onChange={(e) =>
                    set_step_item_form_data((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                  }
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="item_is_active"
                  checked={step_item_form_data.is_active}
                  onChange={(e) =>
                    set_step_item_form_data((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="item_is_active" className="ml-2 text-sm font-medium text-gray-700">
                  Active (visible to customers)
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    set_step_item_form_open(false);
                    set_selected_step_for_item(null);
                    reset_step_item_form();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create_step_item_mutation.isPending || !step_item_form_data.item_id}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {create_step_item_mutation.isPending ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Step Confirmation Modal */}
      {delete_confirm_step_id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Delete Builder Step</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this step? All items assigned to it will also be removed.
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => set_delete_confirm_step_id(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handle_delete_step(delete_confirm_step_id)}
                disabled={delete_step_mutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {delete_step_mutation.isPending ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete Step'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Step Item Confirmation Modal */}
      {delete_confirm_step_item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Remove Item from Step</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this item from the step? The menu item itself will not be
              deleted.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => set_delete_confirm_step_item(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handle_delete_step_item(delete_confirm_step_item.step_item_id)}
                disabled={delete_step_item_mutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {delete_step_item_mutation.isPending ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing...
                  </span>
                ) : (
                  'Remove Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UV_AdminMenuBuilderSettings;
