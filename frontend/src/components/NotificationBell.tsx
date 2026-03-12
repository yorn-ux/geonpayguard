'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Bell, Check, Clock, AlertCircle, AlertTriangle, 
  Info, X, Loader2, ChevronRight, Trash2, Filter
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBellProps {
  userId: string;
  className?: string;
  onNotificationClick?: (notification: any) => void;
  onViewAllClick?: () => void;
  maxDisplay?: number;
  pollInterval?: number;
}

type PriorityType = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export default function NotificationBell({ 
  userId, 
  className = '', 
  onNotificationClick,
  onViewAllClick,
  maxDisplay = 50,
  pollInterval = 30000
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityType | 'ALL'>('ALL');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  
  const { 
    userNotifications = [],
    unreadCount = 0,
    isLoading = false,
    error = null,
    fetchUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotificationStore();

  // Memoize filtered notifications
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(userNotifications)) return [];
    
    let notifications = userNotifications.slice(0, maxDisplay);
    
    if (activeTab === 'unread') {
      notifications = notifications.filter(n => !n.is_read);
    }
    
    if (priorityFilter !== 'ALL') {
      notifications = notifications.filter(n => n.priority === priorityFilter);
    }
    
    return notifications;
  }, [userNotifications, activeTab, maxDisplay, priorityFilter]);

  // Get counts for different priorities
  const priorityCounts = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    
    userNotifications.forEach(n => {
      if (!n.is_read && counts.hasOwnProperty(n.priority)) {
        counts[n.priority as PriorityType]++;
      }
    });
    
    return counts;
  }, [userNotifications]);

  // Handle click/touch outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current && 
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowClearConfirm(false);
        setShowFilters(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Prevent body scroll when dropdown is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (userId && isOpen) {
      fetchUserNotifications(userId, maxDisplay);
    }
  }, [userId, isOpen, fetchUserNotifications, maxDisplay]);

  // Polling for real-time updates
  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const interval = setInterval(() => {
      fetchUserNotifications(userId, maxDisplay);
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [isOpen, userId, fetchUserNotifications, maxDisplay, pollInterval]);

  // Handle touch events for swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !dropdownRef.current) return;
    
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStart;
    
    // Only allow pull-to-close when pulling down from top
    if (diff > 0 && dropdownRef.current.scrollTop === 0) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !dropdownRef.current) return;
    
    const endTouch = e.changedTouches[0].clientY;
    const diff = endTouch - touchStart;
    
    // Close if pulled down more than 100px
    if (diff > 100 && dropdownRef.current.scrollTop === 0) {
      setIsOpen(false);
      setShowClearConfirm(false);
      setShowFilters(false);
    }
    
    setTouchStart(null);
  };

  // Mark all as read handler
  const handleMarkAllAsRead = async () => {
    if (!userId || !unreadCount) return;
    
    setIsMarkingAll(true);
    try {
      await markAllAsRead(userId);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Clear all notifications handler
  const handleClearAll = async () => {
    if (!userId || !userNotifications.length) return;
    
    setIsClearingAll(true);
    try {
      await clearAllNotifications(userId);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    setIsOpen(false);
  }, [markAsRead, onNotificationClick]);

  // Handle delete
  const handleDelete = useCallback(async (e: React.MouseEvent | React.TouchEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  }, [deleteNotification]);

  // Handle view all
  const handleViewAll = useCallback(() => {
    setIsOpen(false);
    if (onViewAllClick) {
      onViewAllClick();
    }
  }, [onViewAllClick]);

  // Get priority icon
  const getPriorityIcon = useCallback((priority: string, isRead: boolean) => {
    const size = typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 18;
    const baseClass = isRead ? 'text-slate-400' : '';
    
    const config = {
      CRITICAL: { icon: AlertTriangle, class: 'text-rose-500' },
      HIGH: { icon: AlertCircle, class: 'text-amber-500' },
      MEDIUM: { icon: Info, class: 'text-blue-500' },
      LOW: { icon: Clock, class: 'text-slate-500' }
    } as const;

    const { icon: Icon, class: colorClass } = config[priority as PriorityType] || config.LOW;
    
    return <Icon className={`${baseClass} ${!isRead ? colorClass : ''}`} size={size} />;
  }, []);

  // Get priority badge color
  const getPriorityBadgeColor = useCallback((priority: string) => {
    const colors = {
      CRITICAL: 'bg-rose-100 text-rose-700',
      HIGH: 'bg-amber-100 text-amber-700',
      MEDIUM: 'bg-blue-100 text-blue-700',
      LOW: 'bg-slate-100 text-slate-700'
    };
    return colors[priority as PriorityType] || colors.LOW;
  }, []);

  // Format time
  const formatTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return 'Recently';
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 sm:p-2.5 rounded-xl border-2 transition-all group touch-manipulation ${
          isOpen 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
            : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:bg-indigo-100'
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={typeof window !== 'undefined' && window.innerWidth < 640 ? 22 : 20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -right-1 min-w-5 h-5 bg-rose-500 text-white text-[10px] sm:text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
              aria-hidden="true"
            />

            {/* Dropdown */}
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`
                fixed sm:absolute z-50 overflow-hidden bg-white shadow-2xl
                sm:right-0 sm:mt-2 sm:w-96 sm:rounded-2xl sm:border-2 sm:border-slate-100
                inset-x-4 top-20 bottom-4 rounded-2xl border border-slate-200
                sm:inset-auto
              `}
            >
              {/* Pull indicator for mobile */}
              <div className="sm:hidden w-full flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-slate-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-slate-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full"
                      >
                        {unreadCount} new
                      </motion.span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-1">
                    {/* Tabs - Hidden on mobile, shown in separate bar below */}
                    <div className="hidden sm:flex bg-slate-100 rounded-lg p-0.5 mr-2">
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                          activeTab === 'all' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveTab('unread')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                          activeTab === 'unread' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Unread
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {userNotifications.length > 0 && (
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`p-2 sm:p-1.5 rounded-lg transition touch-manipulation ${
                            showFilters || priorityFilter !== 'ALL'
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
                          }`}
                          aria-label="Filter notifications"
                        >
                          <Filter size={typeof window !== 'undefined' && window.innerWidth < 640 ? 18 : 16} />
                        </button>
                      )}

                      {userNotifications.length > 0 && !showClearConfirm && !showFilters && (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="p-2 sm:p-1.5 text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-lg transition touch-manipulation"
                          aria-label="Clear all notifications"
                        >
                          <Trash2 size={typeof window !== 'undefined' && window.innerWidth < 640 ? 18 : 16} />
                        </button>
                      )}

                      {unreadCount > 0 && !showFilters && !showClearConfirm && (
                        <button
                          onClick={handleMarkAllAsRead}
                          disabled={isMarkingAll}
                          className="p-2 sm:p-1.5 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 rounded-lg transition disabled:opacity-50 touch-manipulation"
                          aria-label="Mark all as read"
                        >
                          {isMarkingAll ? (
                            <Loader2 size={typeof window !== 'undefined' && window.innerWidth < 640 ? 18 : 16} className="animate-spin" />
                          ) : (
                            <Check size={typeof window !== 'undefined' && window.innerWidth < 640 ? 18 : 16} />
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          setShowClearConfirm(false);
                          setShowFilters(false);
                        }}
                        className="p-2 sm:p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition touch-manipulation"
                        aria-label="Close"
                      >
                        <X size={typeof window !== 'undefined' && window.innerWidth < 640 ? 18 : 16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Tabs */}
                <div className="flex sm:hidden mt-3 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition ${
                      activeTab === 'all' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('unread')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition ${
                      activeTab === 'unread' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-600'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                {/* Confirmation for Clear All */}
                <AnimatePresence>
                  {showClearConfirm && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3 flex items-center justify-between bg-rose-50 rounded-lg p-2"
                    >
                      <span className="text-xs font-bold text-rose-700">
                        Clear all notifications?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleClearAll}
                          disabled={isClearingAll}
                          className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 active:bg-rose-700 transition disabled:opacity-50 touch-manipulation min-w-[60px]"
                        >
                          {isClearingAll ? (
                            <Loader2 size={14} className="animate-spin mx-auto" />
                          ) : (
                            'Yes'
                          )}
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 active:bg-slate-200 transition touch-manipulation"
                        >
                          No
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-500 mb-2">
                          Filter by priority:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setPriorityFilter('ALL')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition touch-manipulation ${
                              priorityFilter === 'ALL'
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                            }`}
                          >
                            All
                          </button>
                          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => (
                            <button
                              key={priority}
                              onClick={() => setPriorityFilter(priority)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition touch-manipulation flex items-center gap-1 ${
                                priorityFilter === priority
                                  ? getPriorityBadgeColor(priority)
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                              }`}
                            >
                              {priority}
                              {priorityCounts[priority] > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-white/30 rounded-full text-[10px]">
                                  {priorityCounts[priority]}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notification List */}
              <div className="h-[calc(100%-140px)] sm:max-h-[400px] overflow-y-auto overscroll-contain">
                {isLoading && !filteredNotifications.length ? (
                  <div className="p-8 sm:p-12 text-center">
                    <Loader2 className="mx-auto text-indigo-600 animate-spin mb-3 sm:mb-4" size={typeof window !== 'undefined' && window.innerWidth < 640 ? 36 : 32} />
                    <p className="text-sm sm:text-base text-slate-500">Loading notifications...</p>
                  </div>
                ) : error ? (
                  <div className="p-6 sm:p-8 text-center">
                    <AlertCircle className="mx-auto text-rose-400 mb-3" size={typeof window !== 'undefined' && window.innerWidth < 640 ? 36 : 32} />
                    <p className="text-sm sm:text-base text-slate-600 mb-2">Failed to load</p>
                    <p className="text-xs text-slate-500 mb-4">{error}</p>
                    <button
                      onClick={() => fetchUserNotifications(userId, maxDisplay)}
                      className="px-4 py-2 text-xs sm:text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 active:bg-indigo-200 transition touch-manipulation"
                    >
                      Try again
                    </button>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <Bell className="mx-auto text-slate-200 mb-3 sm:mb-4" size={typeof window !== 'undefined' && window.innerWidth < 640 ? 40 : 32} />
                    <p className="text-sm sm:text-base font-bold text-slate-700">All caught up!</p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      {activeTab === 'unread' 
                        ? 'No unread notifications' 
                        : priorityFilter !== 'ALL' 
                          ? `No ${priorityFilter.toLowerCase()} priority notifications`
                          : 'No notifications yet'}
                    </p>
                    {priorityFilter !== 'ALL' && (
                      <button
                        onClick={() => setPriorityFilter('ALL')}
                        className="mt-4 text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-700 active:text-indigo-800 transition touch-manipulation"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                ) : (
                  <motion.div 
                    className="divide-y divide-slate-100"
                    initial={false}
                  >
                    {filteredNotifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleNotificationClick(notification)}
                        onTouchEnd={() => handleNotificationClick(notification)}
                        className={`p-3 sm:p-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition group relative touch-manipulation ${
                          !notification.is_read ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <div className="flex gap-2 sm:gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getPriorityIcon(notification.priority, notification.is_read)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <span className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                                  {notification.title}
                                </span>
                                {!notification.is_read && (
                                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold rounded-full ${getPriorityBadgeColor(notification.priority)}`}>
                                    {notification.priority}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">
                                {formatTime(notification.created_at)}
                              </span>
                            </div>
                            
                            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            
                            {notification.action_url && (
                              <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-indigo-600 font-bold opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                View details <ChevronRight size={typeof window !== 'undefined' && window.innerWidth < 640 ? 14 : 12} />
                              </div>
                            )}
                          </div>

                          {/* Delete button - always visible on mobile */}
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            onTouchEnd={(e) => handleDelete(e, notification.id)}
                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1.5 sm:p-1 hover:bg-slate-200 active:bg-slate-300 rounded transition self-start touch-manipulation"
                            aria-label="Delete notification"
                          >
                            <X size={typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 12} className="text-slate-400" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {filteredNotifications.length > 0 && (
                <div className="p-3 sm:p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                  <button
                    onClick={handleViewAll}
                    onTouchEnd={handleViewAll}
                    className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-700 active:text-indigo-800 transition touch-manipulation py-2 px-4"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
