import axios from 'axios';

// Configure axios to send cookies with all requests
// This is critical for guest session tracking via cookies
axios.defaults.withCredentials = true;

// Optional: Set base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
axios.defaults.baseURL = API_BASE_URL;

/**
 * AUTHENTICATION CONFIGURATION
 * 
 * This file configures axios interceptors to automatically handle authentication tokens.
 * Components do NOT need to manually add Authorization headers - the interceptor handles it automatically.
 * 
 * The interceptor will:
 * 1. Automatically add the Bearer token from localStorage to all requests
 * 2. Handle 401 errors and redirect to appropriate login pages
 * 3. Clear invalid tokens from storage
 */

// Add request interceptor to automatically include auth token
axios.interceptors.request.use(
  (config) => {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }
    
    // Get auth token from localStorage (Zustand persist storage)
    try {
      const persistedState = localStorage.getItem('salama-lama-store');
      if (persistedState) {
        const state = JSON.parse(persistedState);
        const authToken = state?.state?.authentication_state?.auth_token;
        
        // Add Authorization header if token exists and not already set
        // Check both Authorization and authorization (case-insensitive)
        const hasAuthHeader = config.headers.Authorization || config.headers.authorization;
        
        if (authToken && !hasAuthHeader) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
      }
    } catch (error) {
      console.error('Error reading auth token from storage:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error_code;
      const currentPath = window.location.pathname;
      
      // Token-related errors - clear auth state and optionally redirect to login
      if (errorCode === 'AUTH_TOKEN_REQUIRED' || 
          errorCode === 'AUTH_TOKEN_INVALID' || 
          errorCode === 'AUTH_SESSION_SUPERSEDED') {
        
        console.log('[AUTH ERROR]', errorCode, 'on', currentPath);
        
        // Determine if this is a protected route that requires authentication
        const isLoginPage = currentPath.includes('/login');
        const isSignupPage = currentPath.includes('/signup');
        const isPublicRoute = ['/', '/menu', '/about', '/contact', '/faqs', '/terms', '/privacy', '/catering', '/cart'].includes(currentPath);
        const isCheckoutFlow = currentPath.includes('/checkout');
        const isPasswordReset = currentPath.includes('/reset-password') || currentPath.includes('/forgot-password');
        const isEmailVerification = currentPath.includes('/verify-email');
        const isOrderTracking = currentPath.includes('/track/');
        
        // Routes that don't need authentication
        const noAuthRequired = isLoginPage || isSignupPage || isPublicRoute || isPasswordReset || isEmailVerification || isOrderTracking;
        
        // Clear auth state from localStorage for invalid/expired tokens
        if (errorCode === 'AUTH_TOKEN_INVALID' || errorCode === 'AUTH_SESSION_SUPERSEDED') {
          try {
            const persistedState = localStorage.getItem('salama-lama-store');
            if (persistedState) {
              const state = JSON.parse(persistedState);
              if (state?.state?.authentication_state) {
                state.state.authentication_state = {
                  current_user: null,
                  auth_token: null,
                  authentication_status: {
                    is_authenticated: false,
                    is_loading: false,
                  },
                  error_message: null,
                };
                localStorage.setItem('salama-lama-store', JSON.stringify(state));
              }
            }
          } catch (error) {
            console.error('Error clearing auth state:', error);
          }
        }
        
        // Only redirect to login for protected routes that require authentication
        // Don't redirect for checkout flow (guest checkout is allowed) or public routes
        if (!noAuthRequired && !isCheckoutFlow) {
          const returnTo = encodeURIComponent(currentPath + window.location.search);
          
          // Determine which login page based on route
          if (currentPath.startsWith('/admin')) {
            window.location.href = `/admin/login?returnTo=${returnTo}`;
          } else if (currentPath.startsWith('/staff')) {
            window.location.href = `/staff/login?returnTo=${returnTo}`;
          } else {
            window.location.href = `/login?returnTo=${returnTo}`;
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axios;
