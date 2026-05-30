'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Message } from '@/types';

interface NotificationContextType {
  requestNotificationPermission: () => Promise<'default' | 'granted' | 'denied'>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { permission, requestPermission, showMessageNotification } = useNotifications();
  const lastCheckedRef = useRef<Date>(new Date());
  const isInitialLoadRef = useRef(true);

  // Listen for new messages across all conversations
  useEffect(() => {
    if (!user) return;

    // Query for messages where the current user is the receiver
    const messagesQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('isRead', '==', false),
      orderBy('sentAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        // Skip initial load to avoid showing notifications for old messages
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          lastCheckedRef.current = new Date();
          return;
        }

        // Check for new messages (added since last check)
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = { id: change.doc.id, ...change.doc.data() } as Message;
            const sentAt = message.sentAt instanceof Date 
              ? message.sentAt 
              : (message.sentAt as Timestamp).toDate();
            
            // Only notify for messages sent after our last check
            if (sentAt > lastCheckedRef.current) {
              // Get sender name from the message or use generic
              showMessageNotification(
                'New Message',
                message.text,
                message.conversationId,
                () => {
                  window.location.href = `/messages/${message.conversationId}`;
                }
              );
            }
          }
        });
        
        lastCheckedRef.current = new Date();
      },
      (error) => {
        console.error('Error listening for notifications:', error);
      }
    );

    return () => unsubscribe();
  }, [user, showMessageNotification]);

  const requestNotificationPermission = useCallback(async () => {
    return requestPermission();
  }, [requestPermission]);

  return (
    <NotificationContext.Provider value={{ requestNotificationPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
