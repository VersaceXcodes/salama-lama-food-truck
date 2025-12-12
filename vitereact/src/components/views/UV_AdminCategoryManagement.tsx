import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { PlusCircle, Edit2, Trash2, GripVertical, X, Check, AlertTriangle } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface Category {
  category_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

interface CategoryFormData {
  category_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
}

interface CategoriesResponse {
  categories: Category[];
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchCategories = async (token: string): Promise<Category[]> => {
  const response = await axios.get<CategoriesResponse>(
    `${API_BASE_URL}/api/admin/menu/categories`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data.categories;
};

const createCategory = async (data: { name: string; description: string | null; sort_order: number }, token: string): Promise<Category> => {
  const response = await axios.post<Category>(
    `${API_BASE_URL}/api/admin/menu/categories`,
    data,
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const updateCategory = async (
  categoryId: string, 
  data: { name: string; description: string | null; sort_order: number }, 
  token: string
): Promise<Category> => {
  const response = await axios.put<Category>(
    `${API_BASE_URL}/api/admin/menu/categories/${categoryId}`,
    data,
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const deleteCategory = async (categoryId: string, token: string): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/api/admin/menu/categories/${categoryId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
};

// ===========================
// Main Component
// ===========================

const UV_AdminCategoryManagement: React.FC = () => {
  // Zustand store - individual selectors
  const auth_token = useAppStore(state => state.authentication_state.auth_token);

  // React Query
  const queryClient = useQueryClient();

  // Local state
  const [form_visible, setFormVisible] = useState(false);
  const [form_mode, setFormMode] = useState<'create' | 'edit'>('create');
  const [category_form, setCategoryForm] = useState<CategoryFormData>({
    category_id: null,
    name: '',
    description: null,
    sort_order: 0,
  });
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [delete_modal_open, setDeleteModalOpen] = useState(false);
  const [category_to_delete, setCategoryToDelete] = useState<Category | null>(null);
  const [drag_index, setDragIndex] = useState<number | null>(null);
  const [drop_index, setDropIndex] = useState<number | null>(null);

  // Fetch categories
  const { data: categories_list = [], isLoading: loading } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: () => fetchCategories(auth_token || ''),
    enabled: !!auth_token,
    select: (data) => data.sort((a, b) => a.sort_order - b.sort_order),
    staleTime: 30000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string | null; sort_order: number }) => 
      createCategory(data, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setFormVisible(false);
      resetForm();
      setErrorMessage(null);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to create category');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: { name: string; description: string | null; sort_order: number } }) =>
      updateCategory(categoryId, data, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setFormVisible(false);
      resetForm();
      setErrorMessage(null);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to update category');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId, auth_token || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      setErrorMessage(null);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to delete category. It may have assigned items.');
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    },
  });

  // ===========================
  // Form Handlers
  // ===========================

  const resetForm = () => {
    setCategoryForm({
      category_id: null,
      name: '',
      description: null,
      sort_order: 0,
    });
    setFormMode('create');
  };

  const openCreateForm = () => {
    resetForm();
    const next_sort_order = categories_list.length > 0 
      ? Math.max(...categories_list.map(cat => cat.sort_order)) + 1 
      : 0;
    setCategoryForm(prev => ({ ...prev, sort_order: next_sort_order }));
    setFormMode('create');
    setFormVisible(true);
    setErrorMessage(null);
  };

  const openEditForm = (category: Category) => {
    setCategoryForm({
      category_id: category.category_id,
      name: category.name,
      description: category.description,
      sort_order: category.sort_order,
    });
    setFormMode('edit');
    setFormVisible(true);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!category_form.name.trim()) {
      setErrorMessage('Category name is required');
      return;
    }
    if (category_form.name.length > 100) {
      setErrorMessage('Category name must be 100 characters or less');
      return;
    }
    if (category_form.description && category_form.description.length > 500) {
      setErrorMessage('Description must be 500 characters or less');
      return;
    }

    const submitData = {
      name: category_form.name.trim(),
      description: category_form.description?.trim() || null,
      sort_order: category_form.sort_order,
    };

    if (form_mode === 'create') {
      createMutation.mutate(submitData);
    } else if (form_mode === 'edit' && category_form.category_id) {
      updateMutation.mutate({
        categoryId: category_form.category_id,
        data: submitData,
      });
    }
  };

  // ===========================
  // Delete Handlers
  // ===========================

  const openDeleteModal = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteModalOpen(true);
    setErrorMessage(null);
  };

  const handleDeleteConfirm = () => {
    if (category_to_delete) {
      deleteMutation.mutate(category_to_delete.category_id);
    }
  };

  // ===========================
  // Drag and Drop Handlers
  // ===========================

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.opacity = '1';
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (drag_index !== index) {
      setDropIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, drop_idx: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (drag_index === null || drag_index === drop_idx) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }

    // Reorder categories
    const reordered = [...categories_list];
    const [draggedItem] = reordered.splice(drag_index, 1);
    reordered.splice(drop_idx, 0, draggedItem);

    // Update sort_order for all affected categories
    const updates = reordered.map((cat, idx) => ({
      ...cat,
      sort_order: idx,
    }));

    // Optimistically update UI
    queryClient.setQueryData(['admin-categories'], updates);

    // Send updates to backend (batch update)
    try {
      for (const cat of updates) {
        if (cat.sort_order !== categories_list.find(c => c.category_id === cat.category_id)?.sort_order) {
          await updateCategory(
            cat.category_id,
            {
              name: cat.name,
              description: cat.description,
              sort_order: cat.sort_order,
            },
            auth_token || ''
          );
        }
      }
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    } catch {
      setErrorMessage('Failed to reorder categories');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    }

    setDragIndex(null);
    setDropIndex(null);
  };

  // ===========================
  // Render
  // ===========================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Menu Categories</h1>
                <p className="mt-2 text-gray-600">
                  Organize your menu structure and manage category display order
                </p>
              </div>
              <button
                onClick={openCreateForm}
                className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-100"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Add New Category
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error_message && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error_message}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
              </div>
            ) : categories_list.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <PlusCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
                <p className="text-gray-600 mb-6">Create your first menu category to get started</p>
                <button
                  onClick={openCreateForm}
                  className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Add Category
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="w-32 px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories_list.map((category, index) => (
                      <tr
                        key={category.category_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`hover:bg-gray-50 transition-colors cursor-move ${
                          drag_index === index ? 'opacity-50' : ''
                        } ${drop_index === index ? 'border-t-2 border-orange-500' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-gray-400 hover:text-gray-600">
                            <GripVertical className="w-5 h-5" />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                              {category.sort_order}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {category.description || (
                              <span className="italic text-gray-400">No description</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(category.created_at).toLocaleDateString('en-IE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditForm(category)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label={`Edit ${category.name}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(category)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Drag and Drop Instructions */}
          {categories_list.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <GripVertical className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Drag and drop categories to reorder them. The order here will be reflected in the customer menu.
                </p>
              </div>
            </div>
          )}

          {/* Create/Edit Form Modal */}
          {form_visible && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {form_mode === 'create' ? 'Create New Category' : 'Edit Category'}
                    </h2>
                    <button
                      onClick={() => {
                        setFormVisible(false);
                        resetForm();
                        setErrorMessage(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Category Name */}
                  <div>
                    <label htmlFor="category-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={category_form.name}
                      onChange={(e) => {
                        setErrorMessage(null);
                        setCategoryForm(prev => ({ ...prev, name: e.target.value }));
                      }}
                      placeholder="e.g., Mains, Sides, Drinks"
                      maxLength={100}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {category_form.name.length}/100 characters
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="category-description" className="block text-sm font-semibold text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="category-description"
                      value={category_form.description || ''}
                      onChange={(e) => {
                        setErrorMessage(null);
                        setCategoryForm(prev => ({ ...prev, description: e.target.value || null }));
                      }}
                      placeholder="Brief description of this category"
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none resize-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {(category_form.description?.length || 0)}/500 characters
                    </p>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label htmlFor="category-sort-order" className="block text-sm font-semibold text-gray-700 mb-2">
                      Display Order
                    </label>
                    <input
                      id="category-sort-order"
                      type="number"
                      value={category_form.sort_order}
                      onChange={(e) => {
                        setErrorMessage(null);
                        setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }));
                      }}
                      min={0}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Lower numbers appear first in the menu. You can also drag and drop to reorder.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setFormVisible(false);
                        resetForm();
                        setErrorMessage(null);
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {form_mode === 'create' ? 'Creating...' : 'Updating...'}
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          {form_mode === 'create' ? 'Create Category' : 'Update Category'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {delete_modal_open && category_to_delete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-start mb-4">
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Delete Category
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Are you sure you want to delete <strong>{category_to_delete.name}</strong>? 
                        This action cannot be undone.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Warning:</strong> If this category has menu items assigned to it, deletion will fail. 
                          Please reassign or delete those items first.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setCategoryToDelete(null);
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleteMutation.isPending}
                      className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5 mr-2" />
                          Delete Category
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AdminCategoryManagement;