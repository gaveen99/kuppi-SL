'use client';

import { useEffect, useState, useCallback } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported) {
      console.warn('Browser does not support notifications');
      return null;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Don't show notification if the page is visible/focused
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: options?.tag || 'default',
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const showMessageNotification = useCallback((
    senderName: string, 
    messagePreview: string,
    conversationId?: string,
    onClick?: () => void
  ) => {
    const notification = showNotification(`New message from ${senderName}`, {
      body: messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview,
      tag: `message-${conversationId || 'general'}`,
      data: { conversationId },
    });

    if (notification && onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  }, [showNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showMessageNotification,
  };
}
