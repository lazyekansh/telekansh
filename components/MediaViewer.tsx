'use client';

import { useState, useEffect } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';

interface MediaViewerProps {
  messageId: number;
}

export default function MediaViewer({ messageId }: MediaViewerProps) {
  const { session, selectedChat } = useTelegramStore();
  
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMedia() {
      if (!session || !selectedChat) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session,
            chatId: selectedChat.id,
            peerType: selectedChat.peerType,
            accessHash: selectedChat.accessHash,
            messageId,
          }),
        });

        const json = await res.json();

        if (!isMounted) return;

        if (json.error) {
          throw new Error(json.error);
        }

        setDataUrl(json.data);
        setMimeType(json.mimeType);

      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMedia();

    return () => {
      isMounted = false;
    };
  }, [messageId, session, selectedChat]);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="w-48 h-48 sm:w-64 sm:h-64 bg-tg-panel/50 animate-pulse rounded-lg flex items-center justify-center border border-tg-border/20">
        <svg className="w-8 h-8 text-tg-tx2/30 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="w-48 h-16 sm:w-64 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 text-xs text-red-400 p-2 text-center">
        {error.includes('timeout') ? 'Media too large to load' : 'Failed to load media'}
      </div>
    );
  }

  // Loaded Media
  if (dataUrl) {
    if (mimeType?.startsWith('image/')) {
      return (
        <img 
          src={dataUrl} 
          alt="Telegram media" 
          className="max-w-[240px] max-h-[320px] sm:max-w-[320px] sm:max-h-[400px] rounded-lg object-contain bg-black/20"
          loading="lazy"
        />
      );
    }
    
    // For non-images (like small documents/videos fetched via buffer), we render a generic file box
    return (
      <div className="flex items-center gap-3 p-3 bg-tg-panel/40 rounded-lg border border-tg-border/30 max-w-[240px] sm:max-w-[320px]">
        <div className="w-10 h-10 rounded bg-tg-accent/20 text-tg-accent flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-tg-tx truncate">Document</p>
          <p className="text-[10px] text-tg-tx2 mt-0.5 truncate">{mimeType}</p>
        </div>
      </div>
    );
  }

  return null;
}
