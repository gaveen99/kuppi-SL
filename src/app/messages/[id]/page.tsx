'use client';

import { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
  PaperClipOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Conversation, Message, MessageAttachment } from '@/types';

export default function ConversationPage({ params }: { params: { id: string } }) {
  const { user, firebaseUser, loading } = useAuth();
  const { t } = useLanguage();
  const { permission, requestPermission, showMessageNotification } = useNotifications();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>('');
  const [usePolling, setUsePolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousMessagesCountRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit/Delete state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Check if message can be deleted (within 30 minutes)
  const canDeleteMessage = (message: Message): boolean => {
    const sentAt = message.sentAt instanceof Date ? message.sentAt : message.sentAt.toDate();
    const now = new Date();
    const diffMinutes = (now.getTime() - sentAt.getTime()) / (1000 * 60);
    return diffMinutes <= 30;
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!user) return;
    
    fetchConversation();
    
    // Try real-time first
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToMessages();
    } catch (error) {
      console.warn('Real-time messaging failed, using polling:', error);
      setUsePolling(true);
    }
    
    // Set up polling if needed
    if (usePolling) {
      fetchMessagesPolling(); // Initial fetch
      pollingIntervalRef.current = setInterval(fetchMessagesPolling, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, params.id, usePolling]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    try {
      const conversationDoc = await getDoc(doc(db, 'conversations', params.id));
      if (conversationDoc.exists()) {
        const conversationData = { 
          id: conversationDoc.id, 
          ...conversationDoc.data() 
        } as Conversation;
        
        // Check if user is a participant
        if (!conversationData.participantIds.includes(user!.uid)) {
          router.push('/messages');
          return;
        }
        
        setConversation(conversationData);
      } else {
        router.push('/messages');
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessagesPolling = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', params.id),
        orderBy('sentAt', 'asc')
      );
      const snapshot = await getDocs(messagesQuery);
      const messagesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Message));
      setMessages(messagesData);
      setError('');
      markMessagesAsDelivered(messagesData);
      markMessagesAsRead(messagesData);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error?.message || 'Failed to load messages');
    }
  };

  const subscribeToMessages = () => {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', params.id),
      orderBy('sentAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.log('Messages received:', snapshot.docs.length);
        const messagesData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Message));
        
        // Check for new incoming messages to show notification
        if (user && messagesData.length > previousMessagesCountRef.current) {
          const newMessages = messagesData.slice(previousMessagesCountRef.current);
          newMessages.forEach(message => {
            // Only notify for messages from others (not our own)
            if (message.senderId !== user.uid && !message.isRead) {
              const senderName = conversation?.participantNames?.[message.senderId] || 'Someone';
              showMessageNotification(senderName, message.text, params.id);
            }
          });
        }
        previousMessagesCountRef.current = messagesData.length;
        
        setMessages(messagesData);
        setError(''); // Clear any errors
        
        // Mark messages as delivered first, then as read (non-blocking)
        markMessagesAsDelivered(messagesData);
        markMessagesAsRead(messagesData);
      },
      (error) => {
        console.error('Error loading messages:', error);
        setError(error?.message || 'Failed to load messages');
      }
    );

    return unsubscribe;
  };

  const markMessagesAsRead = async (messages: Message[]) => {
    if (!user) return;
    
    const unreadMessages = messages.filter(m => 
      m.receiverId === user.uid && !m.isRead
    );

    if (unreadMessages.length === 0) return;

    // Use Promise.all to update in parallel instead of sequentially
    try {
      await Promise.all(
        unreadMessages.map(message =>
          updateDoc(doc(db, 'messages', message.id), { 
            isRead: true,
            isDelivered: true,
            status: 'read'
          })
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Mark messages as delivered when recipient opens conversation
  const markMessagesAsDelivered = async (messages: Message[]) => {
    if (!user) return;
    
    const undeliveredMessages = messages.filter(m => 
      m.receiverId === user.uid && !m.isDelivered && !m.isRead
    );

    if (undeliveredMessages.length === 0) return;

    try {
      await Promise.all(
        undeliveredMessages.map(message =>
          updateDoc(doc(db, 'messages', message.id), { 
            isDelivered: true,
            status: 'delivered'
          })
        )
      );
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle file selection (multiple files)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Check each file size (max 10MB each)
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      validFiles.push(file);
    }
    
    // Limit to 5 files at a time
    if (selectedFiles.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed per message');
      const remaining = 5 - selectedFiles.length;
      setSelectedFiles([...selectedFiles, ...validFiles.slice(0, remaining)]);
    } else {
      setSelectedFiles([...selectedFiles, ...validFiles]);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // Upload file
  const uploadFile = async (file: File): Promise<MessageAttachment | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const idToken = await firebaseUser?.getIdToken();
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      // API returns data.file.filePath as /uploads/filename, convert to API route
      const filename = data.file.filename;
      return {
        fileName: data.file.originalFileName || file.name,
        fileSize: data.file.fileSize || file.size,
        fileType: data.file.mimeType || file.type,
        fileUrl: `/api/files/${filename}`,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      return null;
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) return;
    
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        text: editText.trim(),
        isEdited: true,
        editedAt: Timestamp.now(),
      });
      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
      setError('Failed to edit message');
    }
  };

  // Delete message (soft delete - just mark as deleted, only within 30 mins)
  const handleDeleteMessage = async (messageId: string, message: Message) => {
    // Check if within 30-minute window
    if (!canDeleteMessage(message)) {
      setError('Messages can only be deleted within 30 minutes of sending');
      setShowMenuFor(null);
      return;
    }
    
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        isDeleted: true,
        text: '',
        attachment: null,
        attachments: null,
      });
      setShowMenuFor(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };

  // Start editing
  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
    setShowMenuFor(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Clear all selected files
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string): ReactNode => {
    if (fileType.startsWith('image/')) {
      return <FileImageOutlined />;
    } else if (fileType === 'application/pdf') {
      return <FilePdfOutlined />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileWordOutlined />;
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      return <FileExcelOutlined />;
    } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
      return <FilePptOutlined />;
    } else if (fileType.startsWith('video/')) {
      return <VideoCameraOutlined />;
    } else if (fileType.startsWith('audio/')) {
      return <CustomerServiceOutlined />;
    } else {
      return <PaperClipOutlined />;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !conversation || (!newMessage.trim() && selectedFiles.length === 0)) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSending(true);
    setError(''); // Clear any errors
    
    try {
      const otherParticipantId = conversation.participantIds.find(id => id !== user.uid)!;

      // Upload files if selected
      let attachments: MessageAttachment[] = [];
      if (selectedFiles.length > 0) {
        setUploading(true);
        for (const file of selectedFiles) {
          const attachment = await uploadFile(file);
          if (attachment) {
            attachments.push(attachment);
          }
        }
        setUploading(false);
        if (attachments.length === 0 && !messageText) {
          setError('Failed to upload files');
          setSending(false);
          return;
        }
        clearSelectedFiles();
      }

      console.log('Sending message:', messageText || `[${attachments.length} file(s)]`);
      
      // Add message to Firestore (real-time listener will update UI)
      const messageData: any = {
        conversationId: params.id,
        senderId: user.uid,
        receiverId: otherParticipantId,
        text: messageText,
        sentAt: Timestamp.now(),
        isRead: false,
        isDelivered: false,
        status: 'sent',
      };

      // Support both single attachment (backward compat) and multiple
      if (attachments.length === 1) {
        messageData.attachment = attachments[0];
      } else if (attachments.length > 1) {
        messageData.attachments = attachments;
      }

      const messageRef = await addDoc(collection(db, 'messages'), messageData);

      console.log('Message sent with ID:', messageRef.id);

      // Update conversation last message
      const previewText = messageText || `${attachments.length} file(s)`;
      await updateDoc(doc(db, 'conversations', params.id), {
        lastMessageAt: Timestamp.now(),
        lastMessagePreview: previewText.slice(0, 100),
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error?.message || 'Failed to send message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!conversation) {
    return <div className="min-h-screen flex items-center justify-center">Loading conversation...</div>;
  }

  const otherParticipantId = conversation.participantIds.find(id => id !== user.uid)!;
  const otherParticipantName = conversation.participantNames?.[otherParticipantId] || 'Unknown';

  const handleStartVideoCall = () => {
    const params = new URLSearchParams({
      conversationId: conversation.id,
      receiverId: otherParticipantId,
      receiverName: otherParticipantName,
    });
    router.push(`/call?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/messages')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← {t('back')}
              </button>
              <h1 className="text-xl font-bold text-gray-900">{otherParticipantName}</h1>
              {usePolling && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Polling mode (updates every 3s)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Video Call Button */}
              <button
                onClick={handleStartVideoCall}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                title="Start video call"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => usePolling ? fetchMessagesPolling() : null}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                ↻ {t('refresh')}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
              <button
                onClick={() => setUsePolling(true)}
                className="ml-2 underline text-sm"
              >
                Switch to polling mode
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 card overflow-y-auto mb-4" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message.senderId === user.uid;
                const sentAt = message.sentAt instanceof Date 
                  ? message.sentAt 
                  : message.sentAt.toDate();
                const isEditing = editingMessageId === message.id;

                // Skip rendering deleted messages from others, show "deleted" for own
                if (message.isDeleted && !isMine) {
                  return null;
                }

                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="relative">
                      {/* Message Options Menu (only for own messages) */}
                      {isMine && !message.isDeleted && (
                        <div className={`absolute ${isMine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 pr-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button
                            onClick={() => setShowMenuFor(showMenuFor === message.id ? null : message.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                          </button>
                          {showMenuFor === message.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border z-10">
                              <button
                                onClick={() => startEditing(message)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              {canDeleteMessage(message) ? (
                                <button
                                  onClick={() => handleDeleteMessage(message.id, message)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              ) : (
                                <div className="w-full px-3 py-2 text-left text-xs text-gray-400 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Delete expired
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isDeleted
                          ? 'bg-gray-100 text-gray-400 italic'
                          : isMine 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-gray-200 text-gray-900'
                      }`}>
                        {message.isDeleted ? (
                          <p className="text-sm"><StopOutlined /> This message was deleted</p>
                        ) : isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-2 py-1 text-gray-900 rounded border"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={cancelEditing}
                                className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditMessage(message.id)}
                                className="text-xs px-2 py-1 bg-white text-primary-600 rounded hover:bg-gray-100"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Attachment */}
                            {message.attachment && (
                              <div className="mb-2">
                                {/* Image preview */}
                                {message.attachment.fileType?.startsWith('image/') ? (
                                  <a
                                    href={message.attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={message.attachment.fileUrl}
                                      alt={message.attachment.fileName}
                                      className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90"
                                    />
                                    <p className={`text-xs mt-1 ${isMine ? 'text-primary-200' : 'text-gray-500'}`}>
                                      {message.attachment.fileName}
                                    </p>
                                  </a>
                                ) : (
                                  /* File download link */
                                  <a
                                    href={message.attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded ${
                                      isMine ? 'bg-primary-700 hover:bg-primary-800' : 'bg-gray-300 hover:bg-gray-400'
                                    }`}
                                  >
                                    <span className="text-2xl">{getFileIcon(message.attachment.fileType)}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{message.attachment.fileName}</p>
                                      <p className={`text-xs ${isMine ? 'text-primary-200' : 'text-gray-500'}`}>
                                        {formatFileSize(message.attachment.fileSize)}
                                      </p>
                                    </div>
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            )}
                            {/* Multiple Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {message.attachments.map((att, index) => (
                                  <div key={index}>
                                    {att.fileType?.startsWith('image/') ? (
                                      <a
                                        href={att.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <img
                                          src={att.fileUrl}
                                          alt={att.fileName}
                                          className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90"
                                        />
                                        <p className={`text-xs mt-1 ${isMine ? 'text-primary-200' : 'text-gray-500'}`}>
                                          {att.fileName}
                                        </p>
                                      </a>
                                    ) : (
                                      <a
                                        href={att.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded ${
                                          isMine ? 'bg-primary-700 hover:bg-primary-800' : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                      >
                                        <span className="text-2xl">{getFileIcon(att.fileType)}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                                          <p className={`text-xs ${isMine ? 'text-primary-200' : 'text-gray-500'}`}>
                                            {formatFileSize(att.fileSize)}
                                          </p>
                                        </div>
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Text */}
                            {message.text && (
                              <p className="whitespace-pre-wrap break-words">{message.text}</p>
                            )}
                          </>
                        )}
                        <p className={`text-xs mt-1 flex items-center gap-1 ${
                          message.isDeleted ? 'text-gray-400' : isMine ? 'text-primary-100 justify-end' : 'text-gray-500'
                        }`}>
                          {sentAt.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {message.isEdited && !message.isDeleted && (
                            <span className="ml-1 italic">(edited)</span>
                          )}
                          {isMine && !message.isDeleted && (
                            <span className="ml-1 inline-flex items-center">
                              {message.status === 'read' || message.isRead ? (
                                // Double blue tick - Read
                                <span className="text-blue-300" title="Read">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                                  </svg>
                                </span>
                              ) : message.status === 'delivered' || message.isDelivered ? (
                                // Double grey tick - Delivered
                                <span className={isMine ? 'text-primary-200' : 'text-gray-400'} title="Delivered">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                                  </svg>
                                </span>
                              ) : (
                                // Single grey tick - Sent
                                <span className={isMine ? 'text-primary-200' : 'text-gray-400'} title="Sent">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                  </svg>
                                </span>
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="card mb-2 p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{selectedFiles.length} file(s) selected</span>
              <button
                type="button"
                onClick={clearSelectedFiles}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 bg-gray-50 rounded p-2">
                <span className="text-2xl">{getFileIcon(file.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="card">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg mb-3 text-xs">
            <ExclamationCircleOutlined /> <strong>{t('disclaimer').split(':')[0]}:</strong> {t('disclaimer').split(':')[1]}
          </div>
          <div className="flex gap-2 items-center">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 hover:bg-gray-100 rounded-full transition-colors relative ${
                selectedFiles.length > 0 ? 'text-primary-600' : 'text-gray-500 hover:text-primary-600'
              }`}
              title="Attach files (max 5)"
              disabled={sending || uploading || selectedFiles.length >= 5}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {selectedFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {selectedFiles.length}
                </span>
              )}
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('typeMessage')}
              className="input-field flex-1"
              disabled={sending || uploading}
            />
            <button 
              type="submit" 
              disabled={sending || uploading || (!newMessage.trim() && selectedFiles.length === 0)}
              className="btn-primary"
            >
              {uploading ? 'Uploading...' : sending ? t('sending') : t('send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
