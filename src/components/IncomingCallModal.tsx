'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { VideoCall } from '@/types';

export default function IncomingCallModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<VideoCall | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const notifiedCallIdsRef = useRef<Set<string>>(new Set());
  const activeNotificationRef = useRef<Notification | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const callsQuery = query(
      collection(db, 'videoCalls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoCall));

      if (calls.length > 0) {
        const call = calls[0];
        setIncomingCall(call);
        playRingtone();
        // If the tab is hidden or backgrounded, Firestore listeners + the
        // inline ringtone may be throttled. Fire a native notification as a
        // secondary cue so the receiver actually knows a call is coming.
        fireIncomingNotification(call);
      } else {
        setIncomingCall(null);
        stopRingtone();
        dismissNotification();
      }
    });

    return () => {
      unsubscribe();
      stopRingtone();
      dismissNotification();
    };
  }, [user]);

  const fireIncomingNotification = (call: VideoCall) => {
    try {
      if (typeof window === 'undefined') return;
      if ('vibrate' in navigator) {
        try { navigator.vibrate([300, 150, 300, 150, 300]); } catch {}
      }
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (notifiedCallIdsRef.current.has(call.id)) return;
      notifiedCallIdsRef.current.add(call.id);
      const n = new Notification('Incoming video call', {
        body: `${call.callerName} is calling you`,
        tag: `kuppi-call-${call.id}`,
        requireInteraction: true,
        silent: false,
      });
      n.onclick = () => {
        try {
          window.focus();
        } catch {}
        n.close();
      };
      activeNotificationRef.current = n;
    } catch (err) {
      console.warn('Could not fire incoming call notification:', err);
    }
  };

  const dismissNotification = () => {
    try {
      if (activeNotificationRef.current) {
        activeNotificationRef.current.close();
        activeNotificationRef.current = null;
      }
    } catch {}
  };

  // Clean up stale ringing calls on mount (older than 60 seconds)
  useEffect(() => {
    if (!user) return;
    
    const cleanupStaleCalls = async () => {
      try {
        const sixtySecondsAgo = new Date(Date.now() - 60000);
        const staleCallsQuery = query(
          collection(db, 'videoCalls'),
          where('receiverId', '==', user.uid),
          where('status', '==', 'ringing')
        );
        
        const snapshot = await getDocs(staleCallsQuery);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt?.toDate?.() || new Date(0);
          if (createdAt < sixtySecondsAgo) {
            batch.update(docSnap.ref, { status: 'missed', endedAt: Timestamp.now() });
          }
        });
        
        await batch.commit();
      } catch (err) {
        console.error('Error cleaning up stale calls:', err);
      }
    };
    
    cleanupStaleCalls();
  }, [user]);

  const playRingtone = () => {
    // Prevent multiple ringtones
    if (audioIntervalRef.current) return;
    
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        // Create AudioContext - it may be in suspended state
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        
        const playBeep = async () => {
          if (!audioContextRef.current) return;
          
          // Try to resume if suspended (needed for autoplay policy)
          if (audioContextRef.current.state === 'suspended') {
            try {
              await audioContextRef.current.resume();
            } catch (e) {
              // Can't resume without user gesture, just skip the beep
              return;
            }
          }
          
          try {
            const oscillator = audioContextRef.current.createOscillator();
            const gainNode = audioContextRef.current.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);
            
            oscillator.frequency.value = 440;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            oscillator.stop(audioContextRef.current.currentTime + 0.2);
          } catch (e) {
            // Ignore oscillator errors
          }
        };
        
        playBeep();
        audioIntervalRef.current = setInterval(playBeep, 1000);
      }
    } catch (e) {
      console.log('Could not play ringtone');
    }
  };

  const stopRingtone = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleAccept = () => {
    if (!incomingCall) return;

    stopRingtone();
    dismissNotification();
    const params = new URLSearchParams({
      incoming: 'true',
      callId: incomingCall.id,
      conversationId: incomingCall.conversationId,
    });
    router.push(`/call?${params.toString()}`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    stopRingtone();
    dismissNotification();
    try {
      await updateDoc(doc(db, 'videoCalls', incomingCall.id), {
        status: 'declined',
        endedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('Error declining call:', err);
    }
    setIncomingCall(null);
  };

  // Lock background scroll while the modal is open so a mobile user can't
  // accidentally scroll the page behind it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!incomingCall) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-pulse-slow">
        <div className="text-center">
          {/* Caller avatar */}
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
            <svg className="w-12 h-12 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          
          {/* Caller name */}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {incomingCall.callerName}
          </h2>
          <p className="text-gray-500 mb-6">Incoming video call...</p>
          
          {/* Action buttons */}
          <div className="flex justify-center gap-6">
            {/* Decline button */}
            <button
              type="button"
              onClick={handleDecline}
              aria-label="Decline call"
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg"
            >
              <svg className="w-8 h-8" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
            
            {/* Accept button */}
            <button
              type="button"
              onClick={handleAccept}
              aria-label="Accept call"
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 shadow-lg animate-pulse"
            >
              <svg className="w-8 h-8" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.95; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
