'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApiOutlined } from '@ant-design/icons';
import type { VideoQualityTier } from '@/lib/videoQuality';
import {
  JITSI_DOMAIN,
  JITSI_IFRAME_ALLOW,
  buildJitsiConstraints,
} from '@/lib/jitsiConfig';

const JitsiMeeting = dynamic(
  () => import('@jitsi/react-sdk').then((m) => m.JitsiMeeting),
  { ssr: false }
);

export interface JitsiCallProps {
  roomName: string;
  displayName: string;
  email?: string;
  initialQuality: VideoQualityTier;
  onReadyToClose: () => void;
  onError?: (message: string) => void;
}

export default function JitsiCall({
  roomName,
  displayName,
  email,
  initialQuality,
  onReadyToClose,
  onError,
}: JitsiCallProps) {
  const apiRef = useRef<any>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    const handlePageHide = () => {
      try {
        apiRef.current?.dispose?.();
      } catch {}
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      try {
        apiRef.current?.dispose?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!apiRef.current) setLoadFailed(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [remountKey]);

  if (loadFailed) {
    return (
      <div className="h-[100dvh] bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-6 text-center">
          <ApiOutlined className="mb-3" style={{ fontSize: '2.25rem' }} />
          <h2 className="text-white text-lg font-semibold mb-2">
            Couldn&apos;t reach the video service
          </h2>
          <p className="text-gray-300 text-sm mb-5">
            Jitsi Meet (meet.jit.si) isn&apos;t responding. Check your connection and try again, or end the call.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                setRemountKey((k) => k + 1);
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onReadyToClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              End call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-gray-900">
      <JitsiMeeting
        key={remountKey}
        domain={JITSI_DOMAIN}
        roomName={roomName}
        configOverwrite={{
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          enableClosePage: false,
          disableInviteFunctions: true,
          defaultLanguage: 'en',
          toolbarButtons: [
            'microphone',
            'camera',
            'desktop',
            'chat',
            'raisehand',
            'tileview',
            'hangup',
            'settings',
            'fullscreen',
          ],
          ...buildJitsiConstraints(initialQuality),
        }}
        interfaceConfigOverwrite={{
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          DEFAULT_BACKGROUND: '#111827',
          LANG_DETECTION: false,
        }}
        userInfo={{
          displayName: displayName || 'Kuppi user',
          email: email || '',
        }}
        onApiReady={(api) => {
          apiRef.current = api;
        }}
        onReadyToClose={onReadyToClose}
        getIFrameRef={(iframeRef) => {
          if (!iframeRef) return;
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
          iframeRef.style.border = '0';
          iframeRef.setAttribute('allow', JITSI_IFRAME_ALLOW);
          iframeRef.setAttribute('allowfullscreen', 'true');
          iframeRef.onerror = () => {
            setLoadFailed(true);
            onError?.('Failed to load video service');
          };
        }}
      />
    </div>
  );
}
