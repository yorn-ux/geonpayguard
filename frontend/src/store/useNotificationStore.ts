import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Simple types
export type NotificationType = 'info' | 'success' | 'error' | 'warning';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationCategory = 'system' | 'security' | 'kyc' | 'payment' | 'dispute' | 'vault' | 'welcome';

interface ToastNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
  metadata?: Record<string, any>;
}

interface NotificationState {
  // Popup notifications
  toastNotifications: ToastNotification[];
  activeToast: ToastNotification | null;
  
  // User's notification list
  userNotifications: UserNotification[];
  unreadCount: number;
  
  // UI states
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  lastFetched: Date | null;
  
  // Toast functions
  showToast: (message: string, type?: NotificationType, options?: {
    duration?: number;
    action?: { label: string; onClick: () => void };
  }) => void;
  dismissToast: () => void;
  clearToastNotifications: () => void;
  removeToastNotification: (id: string) => void;
  
  // User notification functions
  fetchUserNotifications: (userId: string, limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  addUserNotification: (notification: UserNotification) => void;
  clearUserNotifications: () => void;
  clearAllNotifications: (userId?: string) => Promise<void>;
  
  // Additional clear methods
  clearReadNotifications: (userId: string) => Promise<void>;
  clearOldNotifications: (userId: string, days?: number) => Promise<void>;
  
  // Polling control
  startPolling: (userId: string, interval?: number) => void;
  stopPolling: () => void;
  
  // Utility
  getUnreadByPriority: (priority: NotificationPriority) => number;
  getNotificationsByCategory: (category: NotificationCategory) => UserNotification[];
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_VERSION = 'api/v1';

// Get token from cookie with better parsing
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('geon_token='));
    
    if (cookie) {
      const token = cookie.split('=')[1];
      if (token) return decodeURIComponent(token);
    }
    
    return localStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error reading token:', error);
    return null;
  }
};

// Helper to make authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response;
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => {
      let pollingInterval: NodeJS.Timeout | null = null;

      return {
        // Initial state
        toastNotifications: [],
        activeToast: null,
        userNotifications: [],
        unreadCount: 0,
        isLoading: false,
        isPolling: false,
        error: null,
        lastFetched: null,

        // ===== TOAST NOTIFICATIONS =====
        
        showToast: (message, type = 'info', options = {}) => {
          const id = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
          const { duration = 4000, action } = options;
          
          const newToast: ToastNotification = {
            id,
            message,
            type,
            timestamp: new Date(),
            duration,
            action,
          };

          set((state) => ({
            toastNotifications: [newToast, ...state.toastNotifications].slice(0, 20),
            activeToast: newToast,
          }));

          setTimeout(() => {
            const currentState = get();
            if (currentState.activeToast?.id === id) {
              get().dismissToast();
            }
          }, duration);
        },

        dismissToast: () => set({ activeToast: null }),

        clearToastNotifications: () => set({ toastNotifications: [] }),

        removeToastNotification: (id) => set((state) => ({
          toastNotifications: state.toastNotifications.filter(n => n.id !== id),
          activeToast: state.activeToast?.id === id ? null : state.activeToast,
        })),

        // ===== USER NOTIFICATIONS =====
        
        fetchUserNotifications: async (userId: string, limit = 50) => {
          if (!userId) {
            set({ error: 'User ID is required' });
            return;
          }
          
          set({ isLoading: true, error: null });
          
          try {
            const url = `${API_BASE_URL}/${API_VERSION}/notifications/${userId}/with-count?limit=${limit}`;
            const response = await authenticatedFetch(url);
            
            const data = await response.json();
            
            const notifications = data.notifications || [];
            const unread = data.unread_count || 0;
            
            set({ 
              userNotifications: notifications,
              unreadCount: unread,
              lastFetched: new Date(),
              error: null
            });

            // Show toast for CRITICAL notifications on fetch
            const criticalUnread = notifications.filter(
              (n: UserNotification) => !n.is_read && n.priority === 'CRITICAL'
            );
            
            if (criticalUnread.length > 0) {
              setTimeout(() => {
                get().showToast(
                  `${criticalUnread.length} critical notification${criticalUnread.length > 1 ? 's' : ''}`, 
                  'error',
                  { duration: 6000 }
                );
              }, 500);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load notifications';
            set({ error: message });
            get().showToast(message, 'error');
          } finally {
            set({ isLoading: false });
          }
        },

        markAsRead: async (notificationId: string) => {
          const previousNotifications = get().userNotifications;
          const previousUnreadCount = get().unreadCount;
          
          set(state => {
            const updated = state.userNotifications.map(n =>
              n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
            );
            const unread = updated.filter(n => !n.is_read).length;
            
            return {
              userNotifications: updated,
              unreadCount: unread
            };
          });
          
          try {
            const url = `${API_BASE_URL}/${API_VERSION}/notifications/${notificationId}/read`;
            await authenticatedFetch(url, { method: 'POST' });
          } catch (error) {
            set({
              userNotifications: previousNotifications,
              unreadCount: previousUnreadCount
            });
            
            const message = error instanceof Error ? error.message : 'Failed to mark as read';
            get().showToast(message, 'error');
          }
        },

        markAllAsRead: async (userId: string) => {
          const previousNotifications = get().userNotifications;
          const previousUnreadCount = get().unreadCount;
          
          set(state => ({
            userNotifications: state.userNotifications.map(n => ({ 
              ...n, 
              is_read: true,
              read_at: n.read_at || new Date().toISOString()
            })),
            unreadCount: 0
          }));
          
          try {
            const url = `${API_BASE_URL}/${API_VERSION}/notifications/mark-all-read/${userId}`;
            await authenticatedFetch(url, { method: 'POST' });
            
            get().showToast('All notifications marked as read', 'success');
          } catch (error) {
            set({
              userNotifications: previousNotifications,
              unreadCount: previousUnreadCount
            });
            
            const message = error instanceof Error ? error.message : 'Failed to mark all as read';
            get().showToast(message, 'error');
          }
        },

        deleteNotification: async (notificationId: string) => {
          const previousNotifications = get().userNotifications;
          const previousUnreadCount = get().unreadCount;
          
          set(state => {
            const updated = state.userNotifications.filter(n => n.id !== notificationId);
            const unread = updated.filter(n => !n.is_read).length;
            
            return {
              userNotifications: updated,
              unreadCount: unread
            };
          });
          
          try {
            const url = `${API_BASE_URL}/${API_VERSION}/notifications/${notificationId}`;
            await authenticatedFetch(url, { method: 'DELETE' });
            
            get().showToast('Notification deleted', 'success');
          } catch (error) {
            set({
              userNotifications: previousNotifications,
              unreadCount: previousUnreadCount
            });
            
            const message = error instanceof Error ? error.message : 'Failed to delete notification';
            get().showToast(message, 'error');
          }
        },

        addUserNotification: (notification: UserNotification) => {
          set(state => {
            if (state.userNotifications.some(n => n.id === notification.id)) {
              return state;
            }
            
            const updated = [notification, ...state.userNotifications].slice(0, 100);
            const unread = updated.filter(n => !n.is_read).length;
            
            if (!notification.is_read) {
              // Priority-based toast notifications
              const toastConfig = {
                CRITICAL: { type: 'error' as const, duration: 6000, prefix: '🔴' },
                HIGH: { type: 'warning' as const, duration: 5000, prefix: '🟠' },
                MEDIUM: { type: 'info' as const, duration: 4000, prefix: '🔵' },
                LOW: { type: 'success' as const, duration: 3000, prefix: '🟢' }
              }[notification.priority];

              setTimeout(() => {
                get().showToast(
                  `${toastConfig.prefix} ${notification.title}`,
                  toastConfig.type,
                  {
                    duration: toastConfig.duration,
                    action: notification.action_url ? {
                      label: 'View',
                      onClick: () => window.location.href = notification.action_url!
                    } : undefined
                  }
                );
              }, 100);
            }
            
            return {
              userNotifications: updated,
              unreadCount: unread
            };
          });
        },

        clearUserNotifications: () => set({ 
          userNotifications: [], 
          unreadCount: 0 
        }),
        
        clearAllNotifications: async (userId?: string) => {
          const previousNotifications = get().userNotifications;
          const previousUnreadCount = get().unreadCount;
          
          set({ 
            toastNotifications: [], 
            userNotifications: [], 
            unreadCount: 0, 
            activeToast: null,
            error: null
          });

          if (userId) {
            try {
              const url = `${API_BASE_URL}/${API_VERSION}/notifications/clear-all/${userId}`;
              const response = await authenticatedFetch(url, { method: 'DELETE' });
              const data = await response.json();
              
              get().showToast(data.message || 'All notifications cleared', 'success');
            } catch (error) {
              set({ 
                userNotifications: previousNotifications,
                unreadCount: previousUnreadCount,
                error: error instanceof Error ? error.message : 'Failed to clear notifications on server'
              });
              
              const message = error instanceof Error ? error.message : 'Failed to clear notifications on server';
              get().showToast(message, 'error');
              
              throw error;
            }
          }
        },

        clearReadNotifications: async (userId: string) => {
          const previousNotifications = get().userNotifications;
          const previousUnreadCount = get().unreadCount;
          
          set(state => {
            const updated = state.userNotifications.filter(n => !n.is_read);
            const unread = updated.length;
            return {
              userNotifications: updated,
              unreadCount: unread
            };
          });
          
          try {
            const url = `${API_BASE_URL}/${API_VERSION}/notifications/clear-read/${userId}`;
            const response = await authenticatedFetch(url, { method: 'DELETE' });
            const data = await response.json();
            
            get().showToast(data.message || 'Read notifications cleared', 'success');
          } catch (error) {
            set({
              userNotifications: previousNotifications,
              unreadCount: previousUnreadCount
            });
            
            const message = error instanceof Error ? error.message : 'Failed to clear read notifications';
            get().showToast(message, 'error');
          }
        },

        clearOldNotifications: async (userId: string, days: number = 30) => {
          try {
            const url = `${API_BASE_URL}/${API_VERSION}/notifications/clear-old/${userId}?days=${days}`;
            const response = await authenticatedFetch(url, { method: 'DELETE' });
            const data = await response.json();
            
            await get().fetchUserNotifications(userId);
            
            get().showToast(data.message || `Cleared notifications older than ${days} days`, 'success');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to clear old notifications';
            get().showToast(message, 'error');
            throw error;
          }
        },

        // ===== POLLING =====
        
        startPolling: (userId: string, interval = 30000) => {
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          set({ isPolling: true });
          
          get().fetchUserNotifications(userId);
          
          pollingInterval = setInterval(() => {
            if (userId) {
              get().fetchUserNotifications(userId);
            }
          }, interval);
        },

        stopPolling: () => {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          set({ isPolling: false });
        },

        // ===== UTILITY FUNCTIONS =====
        
        getUnreadByPriority: (priority: NotificationPriority) => {
          return get().userNotifications.filter(
            n => !n.is_read && n.priority === priority
          ).length;
        },

        getNotificationsByCategory: (category: NotificationCategory) => {
          return get().userNotifications.filter(n => n.category === category);
        },
      };
    },
    {
      name: 'geon-notification-storage',
      partialize: (state) => ({
        userNotifications: state.userNotifications,
      }),
    }
  )
);

// Cleanup on unmount
if (typeof window !== 'undefined') {
  const originalStopPolling = useNotificationStore.getState().stopPolling;
  window.addEventListener('beforeunload', originalStopPolling);
  
  // Add cleanup on page hide
  window.addEventListener('pagehide', originalStopPolling);
}