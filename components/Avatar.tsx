'use client';

import { useState, useEffect, useRef } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';

const AVATAR_COLORS = [
  '#e17076', '#7bc862', '#e5ca77', '#65aadd',
  '#a695e7', '#ee7aae', '#6ec9cb', '#faa774',
];

// Client-side cache to avoid re-fetching the same avatar
const avatarCache = new Map<string, string | null>();

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

interface AvatarProps {
  peerId: string;
  peerType: string;
  accessHash: string;
  name: string;
  size?: number; // px
}

export default function Avatar({ peerId, peerType, accessHash, name, size = 40 }: AvatarProps) {
  const { session } = useTelegramStore();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    const cacheKey = `${peerId}-${peerType}`;

    // Check cache first
    if (avatarCache.has(cacheKey)) {
      setPhotoUrl(avatarCache.get(cacheKey) || null);
      fetchedRef.current = true;
      return;
    }

    if (!session) return;

    fetchedRef.current = true;

    // Fetch avatar in background
    fetch('/api/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, peerId, peerType, accessHash }),
    })
      .then((res) => res.json())
      .then((data) => {
        avatarCache.set(cacheKey, data.base64Data || null);
        if (data.base64Data) {
          setPhotoUrl(data.base64Data);
        }
      })
      .catch(() => {
        avatarCache.set(cacheKey, null);
      });
  }, [peerId, peerType, accessHash, session]);

  const color = getAvatarColor(name);
  const initials = getInitials(name);
  const fontSize = size < 30 ? '10px' : size < 38 ? '12px' : '14px';

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: photoUrl ? 'transparent' : color,
        fontSize,
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        initials
      )}
    </div>
  );
}
