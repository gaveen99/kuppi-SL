'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import JitsiCall from '@/components/JitsiCall';
import VideoQualityPicker from '@/components/VideoQualityPicker';
import {
  buildRoomName,
  generateCallSecret,
} from '@/lib/jitsiConfig';
import {
  resolveInitialQuality,
  storeQualityPreference,
  type VideoQualityTier,
} from '@/lib/videoQuality';
import type { VideoCall } from '@/types';

type Phase = 'pre-call' | 'joining' | 'in-call' | 'ended';

function VideoCallContent() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId = searchParams.get('conversationId');
  const receiverId = searchParams.get('receiverId');
  const receiverName = searchParams.get('receiverName');
  const isIncoming = searchParams.get('incoming') === 'true';
  const incomingCallId = searchParams.get('callId');

  const [phase, setPhase] = useState<Phase>(isIncoming ? 'joining' : 'pre-call');
  const [quality, setQuality] = useState<VideoQualityTier>('hd');
  const [callDocId, setCallDocId] = useState<string | null>(incomingCallId);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasEndedRef = useRef(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    setQuality(resolveInitialQuality());
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  // Incoming flow: load existing call doc, flip status to active, derive room name.
  useEffect(() => {
    if (!isIncoming || !incomingCallId || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'videoCalls', incomingCallId));
        if (cancelled) return;
        if (!snap.exists()) {
          setErrorMessage(t('callDoesNotExist'));
          setPhase('ended');
          return;
        }
        const data = snap.data() as VideoCall;
        const name =
          data.roomId ||
          buildRoomName(incomingCallId, data.callSecret || generateCallSecret());
        setRoomName(name);
        await updateDoc(snap.ref, {
          status: 'active',
          startedAt: Timestamp.now(),
        });
        setPhase('in-call');
      } catch (err) {
        console.error('Error loading incoming call:', err);
        if (!cancelled) {
          setErrorMessage(t('callCouldNotJoin'));
          setPhase('ended');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isIncoming, incomingCallId, user]);

  // Subscribe to call-doc status to detect remote hangup / decline.
  useEffect(() => {
    if (!callDocId || !user) return;
    const unsub = onSnapshot(doc(db, 'videoCalls', callDocId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as VideoCall;
      if (
        data.status === 'ended' ||
        data.status === 'declined' ||
        data.status === 'missed'
      ) {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;
        setStatusMessage(
          data.status === 'declined'
            ? t('callDeclined')
            : data.status === 'missed'
            ? t('callMissed')
            : t('callEnded')
        );
        setPhase('ended');
      }
    });
    return () => unsub();
  }, [callDocId, user]);

  // Caller-side ringing timeout: if the receiver doesn't pick up in 60s, mark missed.
  useEffect(() => {
    if (isIncoming || !callDocId || phase !== 'in-call') return;
    const timer = setTimeout(async () => {
      try {
        const ref = doc(db, 'videoCalls', callDocId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data = snap.data() as VideoCall;
        if (data.status === 'ringing') {
          await updateDoc(ref, { status: 'missed', endedAt: Timestamp.now() });
        }
      } catch (err) {
        console.error('Ringing timeout update failed:', err);
      }
    }, 60000);
    return () => clearTimeout(timer);
  }, [isIncoming, callDocId, phase]);

  // Ended screen auto-redirects back.
  useEffect(() => {
    if (phase !== 'ended') return;
    const timer = setTimeout(() => {
      if (conversationId) router.push(`/messages/${conversationId}`);
      else router.push('/messages');
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, router, conversationId]);

  const handleStartCall = async () => {
    if (hasStartedRef.current) return;
    if (!user || !conversationId || !receiverId || !receiverName) return;
    hasStartedRef.current = true;
    try {
      storeQualityPreference(quality);
      const secret = generateCallSecret();
      const callRef = await addDoc(collection(db, 'videoCalls'), {
        conversationId,
        callerId: user.uid,
        callerName: user.name || user.email || t('callKuppiUser'),
        receiverId,
        receiverName,
        callSecret: secret,
        status: 'ringing',
        createdAt: Timestamp.now(),
      });
      const room = buildRoomName(callRef.id, secret);
      await updateDoc(callRef, { roomId: room });
      setCallDocId(callRef.id);
      setRoomName(room);
      setPhase('in-call');
    } catch (err) {
      console.error('Failed to start call:', err);
      hasStartedRef.current = false;
      setErrorMessage(t('callCouldNotStart'));
    }
  };

  const handleCancelPreCall = () => {
    if (conversationId) router.push(`/messages/${conversationId}`);
    else router.push('/messages');
  };

  const handleReadyToClose = async () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    try {
      if (callDocId) {
        await updateDoc(doc(db, 'videoCalls', callDocId), {
          status: 'ended',
          endedAt: Timestamp.now(),
        });
      }
    } catch (err) {
      console.error('Error ending call:', err);
    }
    setStatusMessage(t('callEnded'));
    setPhase('ended');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">{t('callLoading')}</div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-2">{statusMessage || t('callEnded')}</p>
          {errorMessage && (
            <p className="text-red-400 text-sm">{errorMessage}</p>
          )}
          <p className="text-gray-400 text-sm mt-3">{t('callReturning')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'pre-call') {
    return (
      <div className="h-[100dvh] bg-gray-900 flex flex-col overflow-hidden">
        <div className="bg-gray-800 px-4 py-3 flex items-center">
          <button
            type="button"
            onClick={handleCancelPreCall}
            aria-label={t('callBackAria')}
            className="text-gray-400 hover:text-white mr-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-white font-semibold">
            {t('callWithPrefix')} {receiverName || t('callDefaultUser')}
          </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-5">
            <svg className="w-12 h-12 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <p className="text-white text-lg font-semibold mb-1">
            {receiverName || t('callKuppiUser')}
          </p>
          <p className="text-gray-400 text-sm mb-8">
            {t('callReadyToStart')}
          </p>

          <div className="flex items-center gap-3 text-gray-300 text-sm mb-8">
            <span>{t('callQualityLabel')}</span>
            <VideoQualityPicker
              value={quality}
              onChange={(tier) => setQuality(tier)}
              compact
            />
          </div>

          {errorMessage && (
            <p className="text-red-400 text-sm mb-4">{errorMessage}</p>
          )}

          <button
            type="button"
            onClick={handleStartCall}
            disabled={hasStartedRef.current}
            className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-full text-lg font-semibold transition-colors shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {t('callStartButton')}
          </button>

          <p className="text-gray-500 text-xs mt-6 text-center max-w-sm">
            {t('callStartHint')}
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'joining' || !roomName) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">{t('callJoining')}</p>
        </div>
      </div>
    );
  }

  return (
    <JitsiCall
      roomName={roomName}
      displayName={user.name || user.email || t('callKuppiUser')}
      email={user.email || undefined}
      initialQuality={quality}
      onReadyToClose={handleReadyToClose}
      onError={(msg) => setErrorMessage(msg)}
    />
  );
}

function VideoCallLoading() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">{t('callLoadingVideo')}</p>
      </div>
    </div>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense fallback={<VideoCallLoading />}>
      <VideoCallContent />
    </Suspense>
  );
}
