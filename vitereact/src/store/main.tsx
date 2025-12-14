import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// ===========================
// Type Definitions
// ===========================

export interface User {
  user_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'staff' | 'manager' | 'admin';
  profile_photo_url: string | null;
  email_verified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login_at: string | null;
  marketing_opt_in: boolean;
  dietary_preferences: string[] | null;
  referral_code: string | null;
}

export interface CartItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  customizations: Array<{
    group_name: string;
    option_name: string;
    additional_price: number;
  }>;
  line_total: number;
}

export interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  delivery_fee: number;
  tax_amount: number;
  total: number;
}

export interface BusinessSettings {
  delivery_enabled: boolean;
  operating_hours: Record<string, any>;
  business_info: {
    name: string;
    phone: string;
    email: string;
    address: string | {
      line1: string;
      line2?: string | null;
      city: string;
      postal_code: string;
    };
  };
  tax_settings: {
    vat_rate: number;
  };
  loyalty_settings: {
    earning_rate: number;
    referral_enabled: boolean;
  };
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface NotificationState {
  notifications: Notification[];
  unread_count: number;
}

// ===========================
// Main Store Interface
// ===========================

interface AppStore {
  // State
  authentication_state: AuthenticationState;
  cart_state: CartState;
  business_settings: BusinessSettings;
  notification_state: NotificationState;
  websocket_state: {
    socket: Socket | null;
    connected: boolean;
    subscribed_channels: string[];
  };

  // Authentication Actions
  login_user: (email: string, password: string, remember_me?: boolean) => Promise<void>;
  register_user: (data: {
    email: string;
    phone: string;
    password: string;
    first_name: string;
    last_name: string;
    marketing_opt_in?: boolean;
    referred_by_user_id?: string;
  }) => Promise<{ user: User; token: string; first_order_discount_code: string }>;
  logout_user: () => Promise<void>;
  initialize_auth: () => Promise<void>;
  update_auth_user: (user: Partial<User>) => void;
  clear_auth_error: () => void;

  // Cart Actions
  add_to_cart: (item: CartItem) => void;
  update_cart_quantity: (item_id: string, quantity: number) => void;
  remove_from_cart: (item_id: string) => void;
  apply_discount: (code: string, amount: number) => void;
  remove_discount: () => void;
  update_cart_fees: (delivery_fee: number, tax_amount: number) => void;
  clear_cart: () => void;
  recalculate_totals: () => void;
  sync_guest_cart_to_backend: () => Promise<void>;

  // Business Settings Actions
  fetch_business_settings: () => Promise<void>;
  update_business_settings: (settings: Partial<BusinessSettings>) => void;

  // Notification Actions
  add_notification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => void;
  mark_notification_read: (id: string) => void;
  mark_all_notifications_read: () => void;
  clear_notifications: () => void;
  remove_notification: (id: string) => void;

  // WebSocket Actions
  connect_websocket: () => void;
  disconnect_websocket: () => void;
  subscribe_to_order_updates: (order_id: string) => void;
  unsubscribe_from_order_updates: (order_id: string) => void;
  subscribe_to_user_notifications: (user_id: string) => void;
  subscribe_to_staff_events: () => void;
  subscribe_to_admin_events: () => void;
}

// ===========================
// Helper Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
// Dynamically determine WebSocket URL based on current location
const getWebSocketURL = (): string => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  // Use production URL if available, fallback to localhost
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  return 'ws://localhost:3000';
};
const WS_BASE_URL = getWebSocketURL();

const generate_notification_id = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ===========================
// Zustand Store Implementation
// ===========================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ===========================
      // Initial State
      // ===========================
      
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      cart_state: {
        items: [],
        subtotal: 0,
        discount_code: null,
        discount_amount: 0,
        delivery_fee: 0,
        tax_amount: 0,
        total: 0,
      },

      business_settings: {
        delivery_enabled: false,
        operating_hours: {},
        business_info: {
          name: '',
          phone: '',
          email: '',
          address: '',
        },
        tax_settings: {
          vat_rate: 0,
        },
        loyalty_settings: {
          earning_rate: 1,
          referral_enabled: false,
        },
      },

      notification_state: {
        notifications: [],
        unread_count: 0,
      },

      websocket_state: {
        socket: null,
        connected: false,
        subscribed_channels: [],
      },

      // ===========================
      // Authentication Actions
      // ===========================

      login_user: async (email: string, password: string, remember_me: boolean = false) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/login`,
            { email, password, remember_me },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Initialize WebSocket connection for authenticated users
          get().connect_websocket();

          // Sync guest cart items to backend if any exist
          await get().sync_guest_cart_to_backend();

        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          
          throw new Error(errorMessage);
        }
      },

      register_user: async (data) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/register`,
            data,
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token, first_order_discount_code } = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Initialize WebSocket connection
          get().connect_websocket();

          // Sync guest cart items to backend if any exist
          await get().sync_guest_cart_to_backend();

          return { user, token, first_order_discount_code };

        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          
          // Preserve the full error response for better error handling in components
          const enhancedError: any = new Error(errorMessage);
          enhancedError.response = error.response;
          throw enhancedError;
        }
      },

      logout_user: async () => {
        const { auth_token } = get().authentication_state;
        
        try {
          if (auth_token) {
            await axios.post(
              `${API_BASE_URL}/api/auth/logout`,
              {},
              { headers: { Authorization: `Bearer ${auth_token}` } }
            );
          }
        } catch (error) {
          console.error('Logout API call failed:', error);
        }

        // Disconnect WebSocket
        get().disconnect_websocket();

        // Clear all state
        set(() => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
          cart_state: {
            items: [],
            subtotal: 0,
            discount_code: null,
            discount_amount: 0,
            delivery_fee: 0,
            tax_amount: 0,
            total: 0,
          },
          notification_state: {
            notifications: [],
            unread_count: 0,
          },
        }));
      },

      initialize_auth: async () => {
        const { authentication_state } = get();
        const token = authentication_state.auth_token;

        if (!token) {
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const user = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Initialize WebSocket connection
          get().connect_websocket();

        } catch (error) {
          console.error('Token verification failed:', error);
          
          // Token is invalid, clear auth state
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      update_auth_user: (userData: Partial<User>) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            current_user: state.authentication_state.current_user
              ? { ...state.authentication_state.current_user, ...userData }
              : null,
          },
        }));
      },

      clear_auth_error: () => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            error_message: null,
          },
        }));
      },

      // ===========================
      // Cart Actions
      // ===========================

      add_to_cart: (item: CartItem) => {
        set((state) => {
          const existingItemIndex = state.cart_state.items.findIndex(
            (i) => i.item_id === item.item_id &&
                   JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
          );

          let updatedItems: CartItem[];
          
          if (existingItemIndex >= 0) {
            // Item with same customizations exists, update quantity
            updatedItems = state.cart_state.items.map((i, index) =>
              index === existingItemIndex
                ? { ...i, quantity: i.quantity + item.quantity, line_total: (i.quantity + item.quantity) * i.unit_price }
                : i
            );
          } else {
            // New item or different customizations
            updatedItems = [...state.cart_state.items, item];
          }

          const new_cart_state = {
            ...state.cart_state,
            items: updatedItems,
          };

          return {
            cart_state: new_cart_state,
          };
        });

        // Recalculate totals
        get().recalculate_totals();
      },

      update_cart_quantity: (item_id: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            return {
              cart_state: {
                ...state.cart_state,
                items: state.cart_state.items.filter((item) => item.item_id !== item_id),
              },
            };
          }

          const updatedItems = state.cart_state.items.map((item) =>
            item.item_id === item_id
              ? { ...item, quantity, line_total: quantity * item.unit_price }
              : item
          );

          return {
            cart_state: {
              ...state.cart_state,
              items: updatedItems,
            },
          };
        });

        // Recalculate totals
        get().recalculate_totals();
      },

      remove_from_cart: (item_id: string) => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            items: state.cart_state.items.filter((item) => item.item_id !== item_id),
          },
        }));

        // Recalculate totals
        get().recalculate_totals();
      },

      apply_discount: (code: string, amount: number) => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            discount_code: code,
            discount_amount: amount,
          },
        }));

        // Recalculate totals
        get().recalculate_totals();
      },

      remove_discount: () => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            discount_code: null,
            discount_amount: 0,
          },
        }));

        // Recalculate totals
        get().recalculate_totals();
      },

      update_cart_fees: (delivery_fee: number, tax_amount: number) => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            delivery_fee,
            tax_amount,
          },
        }));

        // Recalculate totals
        get().recalculate_totals();
      },

      clear_cart: () => {
        set(() => ({
          cart_state: {
            items: [],
            subtotal: 0,
            discount_code: null,
            discount_amount: 0,
            delivery_fee: 0,
            tax_amount: 0,
            total: 0,
          },
        }));
      },

      recalculate_totals: () => {
        set((state) => {
          const subtotal = state.cart_state.items.reduce(
            (sum, item) => sum + item.line_total,
            0
          );

          const total = subtotal - state.cart_state.discount_amount + 
                       state.cart_state.delivery_fee + 
                       state.cart_state.tax_amount;

          return {
            cart_state: {
              ...state.cart_state,
              subtotal,
              total,
            },
          };
        });
      },

      sync_guest_cart_to_backend: async () => {
        const state = get();
        const { cart_state, authentication_state } = state;
        
        // Only sync if authenticated and there are items in the cart
        if (!authentication_state.auth_token || cart_state.items.length === 0) {
          return;
        }

        try {
          // Sync each cart item to the backend
          for (const item of cart_state.items) {
            // Convert customizations array to the format expected by backend
            const selected_customizations: Record<string, any> = {};
            item.customizations.forEach((customization, index) => {
              const groupKey = `group_${index}`;
              if (!selected_customizations[groupKey]) {
                selected_customizations[groupKey] = [];
              }
              selected_customizations[groupKey].push({
                option_name: customization.option_name,
                additional_price: customization.additional_price,
              });
            });

            await axios.post(
              `${API_BASE_URL}/api/cart/items`,
              {
                item_id: item.item_id,
                quantity: item.quantity,
                selected_customizations,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authentication_state.auth_token}`,
                },
              }
            );
          }
          
          console.log('Guest cart synced to backend successfully');
        } catch (error) {
          console.error('Failed to sync guest cart to backend:', error);
          // Don't throw error - cart is already in local state
        }
      },

      // ===========================
      // Business Settings Actions
      // ===========================

      fetch_business_settings: async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/business/info`);
          
          const { name, phone, email, address, operating_hours, delivery_enabled } = response.data;

          set((state) => ({
            business_settings: {
              ...state.business_settings,
              delivery_enabled: delivery_enabled || false,
              operating_hours: operating_hours || {},
              business_info: {
                name: name || '',
                phone: phone || '',
                email: email || '',
                address: address || '',
              },
            },
          }));

        } catch (error) {
          console.error('Failed to fetch business settings:', error);
        }
      },

      update_business_settings: (settings: Partial<BusinessSettings>) => {
        set((state) => ({
          business_settings: {
            ...state.business_settings,
            ...settings,
          },
        }));
      },

      // ===========================
      // Notification Actions
      // ===========================

      add_notification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
        const new_notification: Notification = {
          ...notification,
          id: generate_notification_id(),
          created_at: new Date().toISOString(),
          read: false,
        };

        set((state) => ({
          notification_state: {
            notifications: [new_notification, ...state.notification_state.notifications],
            unread_count: state.notification_state.unread_count + 1,
          },
        }));
      },

      mark_notification_read: (id: string) => {
        set((state) => {
          const notifications = state.notification_state.notifications.map((notif) =>
            notif.id === id ? { ...notif, read: true } : notif
          );

          const unread_count = notifications.filter((n) => !n.read).length;

          return {
            notification_state: {
              notifications,
              unread_count,
            },
          };
        });
      },

      mark_all_notifications_read: () => {
        set((state) => ({
          notification_state: {
            notifications: state.notification_state.notifications.map((notif) => ({
              ...notif,
              read: true,
            })),
            unread_count: 0,
          },
        }));
      },

      clear_notifications: () => {
        set(() => ({
          notification_state: {
            notifications: [],
            unread_count: 0,
          },
        }));
      },

      remove_notification: (id: string) => {
        set((state) => {
          const notifications = state.notification_state.notifications.filter(
            (notif) => notif.id !== id
          );
          const unread_count = notifications.filter((n) => !n.read).length;

          return {
            notification_state: {
              notifications,
              unread_count,
            },
          };
        });
      },

      // ===========================
      // WebSocket Actions
      // ===========================

      connect_websocket: () => {
        const { auth_token, current_user } = get().authentication_state;
        const { socket } = get().websocket_state;

        // Don't reconnect if already connected
        if (socket?.connected) {
          return;
        }

        // Disconnect existing socket if any
        if (socket) {
          socket.disconnect();
        }

        if (!auth_token) {
          console.warn('Cannot connect WebSocket: No auth token');
          return;
        }

        try {
          const new_socket = io(WS_BASE_URL, {
            auth: {
              token: auth_token,
            },
            transports: ['websocket', 'polling'],
          });

          // Connection event handlers
          new_socket.on('connect', () => {
            console.log('WebSocket connected');
            
            set((state) => ({
              websocket_state: {
                ...state.websocket_state,
                socket: new_socket,
                connected: true,
              },
            }));

            // Auto-subscribe based on user role
            if (current_user) {
              if (current_user.role === 'customer') {
                get().subscribe_to_user_notifications(current_user.user_id);
              } else if (current_user.role === 'staff' || current_user.role === 'manager') {
                get().subscribe_to_staff_events();
              } else if (current_user.role === 'admin') {
                get().subscribe_to_admin_events();
              }
            }
          });

          new_socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            
            set((state) => ({
              websocket_state: {
                ...state.websocket_state,
                connected: false,
                subscribed_channels: [],
              },
            }));
          });

          new_socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
          });

          // ===========================
          // WebSocket Event Handlers
          // ===========================

          // New order notifications (staff/admin)
          new_socket.on('new_order', (data) => {
            get().add_notification({
              type: 'new_order',
              message: `New order #${data.data.order_number} received`,
            });
          });

          // Order status updates
          new_socket.on('order_status_updated', (data) => {
            const { order_number, new_status } = data.data;
            
            get().add_notification({
              type: 'order_status_update',
              message: `Order #${order_number} status: ${new_status}`,
            });
          });

          // Stock alerts (staff/admin)
          new_socket.on('low_stock_alert', (data) => {
            const { item_name, status } = data.data;
            
            get().add_notification({
              type: 'stock_alert',
              message: `${item_name} is ${status === 'out_of_stock' ? 'out of stock' : 'running low'}`,
            });
          });

          // Loyalty points updates (customer)
          new_socket.on('loyalty.points_updated', (data) => {
            const { points_amount, transaction_type } = data.data;
            
            get().add_notification({
              type: 'loyalty_points',
              message: `You ${transaction_type === 'earned' ? 'earned' : 'redeemed'} ${Math.abs(points_amount)} points!`,
            });

            // Update user's loyalty balance if authenticated
            const current_user = get().authentication_state.current_user;
            if (current_user) {
              // Note: This assumes loyalty data is part of user object
              // Views will handle full loyalty state management
            }
          });

          // Badge unlock notifications (customer)
          new_socket.on('loyalty.badge_unlocked', (data) => {
            const { badge_name } = data.data;
            
            get().add_notification({
              type: 'badge_unlocked',
              message: `Achievement unlocked: ${badge_name}!`,
            });
          });

          // Catering inquiry notifications (admin)
          new_socket.on('new_catering_inquiry', (data) => {
            const { contact_name, event_type } = data.data;
            
            get().add_notification({
              type: 'new_catering_inquiry',
              message: `New ${event_type} catering inquiry from ${contact_name}`,
            });
          });

          // Dashboard metrics updates (admin)
          new_socket.on('admin.metrics_updated', (data) => {
            // This would trigger dashboard refresh in admin views
            console.log('Dashboard metrics updated:', data.data.metrics);
          });

          set((state) => ({
            websocket_state: {
              ...state.websocket_state,
              socket: new_socket,
              connected: false, // Will be set to true on 'connect' event
            },
          }));

        } catch (error) {
          console.error('Failed to create WebSocket connection:', error);
        }
      },

      disconnect_websocket: () => {
        const { socket } = get().websocket_state;
        
        if (socket) {
          socket.disconnect();
          
          set(() => ({
            websocket_state: {
              socket: null,
              connected: false,
              subscribed_channels: [],
            },
          }));
        }
      },

      subscribe_to_order_updates: (order_id: string) => {
        const { socket } = get().websocket_state;
        
        if (!socket?.connected) {
          console.warn('Cannot subscribe: WebSocket not connected');
          return;
        }

        const channel = `orders/${order_id}/tracking`;
        
        socket.emit('subscribe', { channel });

        set((state) => ({
          websocket_state: {
            ...state.websocket_state,
            subscribed_channels: [...state.websocket_state.subscribed_channels, channel],
          },
        }));
      },

      unsubscribe_from_order_updates: (order_id: string) => {
        const { socket } = get().websocket_state;
        
        if (!socket?.connected) {
          return;
        }

        const channel = `orders/${order_id}/tracking`;
        
        socket.emit('unsubscribe', { channel });

        set((state) => ({
          websocket_state: {
            ...state.websocket_state,
            subscribed_channels: state.websocket_state.subscribed_channels.filter(
              (ch) => ch !== channel
            ),
          },
        }));
      },

      subscribe_to_user_notifications: (user_id: string) => {
        const { socket } = get().websocket_state;
        
        if (!socket?.connected) {
          console.warn('Cannot subscribe: WebSocket not connected');
          return;
        }

        const channel = `notifications/${user_id}`;
        
        socket.emit('subscribe', { channel });

        set((state) => ({
          websocket_state: {
            ...state.websocket_state,
            subscribed_channels: [...state.websocket_state.subscribed_channels, channel],
          },
        }));
      },

      subscribe_to_staff_events: () => {
        const { socket } = get().websocket_state;
        
        if (!socket?.connected) {
          console.warn('Cannot subscribe: WebSocket not connected');
          return;
        }

        const channels = ['orders/new', 'staff/queue/updates', 'stock/alerts'];
        
        channels.forEach((channel) => {
          socket.emit('subscribe', { channel });
        });

        set((state) => ({
          websocket_state: {
            ...state.websocket_state,
            subscribed_channels: [
              ...state.websocket_state.subscribed_channels,
              ...channels,
            ],
          },
        }));
      },

      subscribe_to_admin_events: () => {
        const { socket } = get().websocket_state;
        
        if (!socket?.connected) {
          console.warn('Cannot subscribe: WebSocket not connected');
          return;
        }

        const channels = [
          'orders/new',
          'staff/queue/updates',
          'stock/alerts',
          'catering/inquiries/new',
          'admin/dashboard/metrics',
        ];
        
        channels.forEach((channel) => {
          socket.emit('subscribe', { channel });
        });

        set((state) => ({
          websocket_state: {
            ...state.websocket_state,
            subscribed_channels: [
              ...state.websocket_state.subscribed_channels,
              ...channels,
            ],
          },
        }));
      },
    }),
    {
      name: 'salama-lama-store',
      // Persist only authentication and cart state
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false, // Never persist loading state
          },
          error_message: null, // Never persist errors
        },
        cart_state: state.cart_state,
      }),
    }
  )
);

// ===========================
// Typed Selector Hooks (Optional Convenience)
// ===========================

export const useAuth = () => useAppStore((state) => state.authentication_state);
export const useCart = () => useAppStore((state) => state.cart_state);
export const useBusinessSettings = () => useAppStore((state) => state.business_settings);
export const useNotifications = () => useAppStore((state) => state.notification_state);
export const useWebSocket = () => useAppStore((state) => state.websocket_state);