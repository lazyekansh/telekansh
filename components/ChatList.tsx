'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';
import type { Dialog } from '@/types';

const AVATAR_COLORS = [
  '#e17076', '#7bc862', '#e5ca77', '#65aadd',
  '#a695e7', '#ee7aae', '#6ec9cb', '#faa774',
];

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

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < oneDay * 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatList() {
  const {
    session, dialogs, selectedChat, loadingDialogs,
    setDialogs, setSelectedChat, setLoadingDialogs, setSession, setError, logout,
  } = useTelegramStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDialogs = useCallback(async () => {
    if (!session) return;
    try {
      setLoadingDialogs(true);
      const res = await fetch('/api/dialogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setDialogs(data.dialogs);
      if (data.sessionString) setSession(data.sessionString);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dialogs');
    } finally {
      setLoadingDialogs(false);
    }
  }, [session, setDialogs, setLoadingDialogs, setSession, setError]);

  useEffect(() => {
    fetchDialogs();
    intervalRef.current = setInterval(fetchDialogs, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDialogs]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    logout();
  };

  const handleSelectChat = (dialog: Dialog) => {
    setSelectedChat(dialog);
  };

  return (
    <div className="w-80 min-w-[320px] h-screen bg-tg-sidebar flex flex-col border-r border-tg-border/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-tg-border/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-tg-accent to-[#3a6fa0] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z"/>
            </svg>
          </div>
          <h1 className="text-sm font-bold text-white tracking-tight">Telekansh</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchDialogs}
            disabled={loadingDialogs}
            className="p-2 rounded-lg text-tg-tx2 hover:text-tg-tx hover:bg-tg-hover transition-all"
            title="Refresh"
            id="refresh-dialogs-btn"
          >
            <svg className={`w-4 h-4 ${loadingDialogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-tg-tx2 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Logout"
            id="logout-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search placeholder (visual only) */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-tg-panel/50 rounded-xl text-tg-tx2 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-tg-tx2/50">Search</span>
        </div>
      </div>

      {/* Dialogs list */}
      <div className="flex-1 overflow-y-auto">
        {loadingDialogs && dialogs.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-tg-accent/30 border-t-tg-accent rounded-full animate-spin" />
          </div>
        ) : dialogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-tg-tx2">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          dialogs.map((dialog) => {
            const isSelected = selectedChat?.id === dialog.id;
            return (
              <button
                key={dialog.id}
                onClick={() => handleSelectChat(dialog)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ${
                  isSelected
                    ? 'bg-tg-accent/20 border-l-2 border-tg-accent'
                    : 'hover:bg-tg-hover border-l-2 border-transparent'
                }`}
                id={`dialog-${dialog.id}`}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(dialog.name) }}
                >
                  {getInitials(dialog.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-tg-tx'}`}>
                      {dialog.name}
                    </span>
                    <span className="text-[11px] text-tg-tx2 ml-2 flex-shrink-0">
                      {formatTime(dialog.lastMessageDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-tg-tx2 truncate pr-2">
                      {dialog.lastMessage || '\u00A0'}
                    </p>
                    {dialog.unreadCount > 0 && (
                      <span className="bg-tg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                        {dialog.unreadCount > 99 ? '99+' : dialog.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
