'use client';

import { useState, useRef, useEffect } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';
import MediaViewer from '@/components/MediaViewer';
import type { Message } from '@/types';

const SENDER_COLORS = [
  '#e17076', '#7bc862', '#e5ca77', '#65aadd',
  '#a695e7', '#ee7aae', '#6ec9cb', '#faa774',
];

function getSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  msg: Message;
  isGroup: boolean;
  messages: Message[];
}

const RENDERABLE_MEDIA = ['Photo', 'Document', 'Sticker', 'Video', 'GIF'];

export default function MessageBubble({ msg, isGroup, messages }: MessageBubbleProps) {
  const {
    session, selectedChat, setReplyTo, setEditing, setError, setSession,
  } = useTelegramStore();

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isSticker = msg.mediaType === 'Sticker';

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        x: Math.min(e.clientX - rect.left, rect.width - 160),
        y: e.clientY - rect.top,
      });
    }
    setShowMenu(true);
  };

  const handleReply = () => {
    setReplyTo(msg);
    setShowMenu(false);
  };

  const handleEdit = () => {
    if (msg.isOutgoing) {
      setEditing(msg);
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!session || !selectedChat) return;
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          chatId: selectedChat.id,
          peerType: selectedChat.peerType,
          accessHash: selectedChat.accessHash,
          messageIds: [msg.id],
          revoke: true,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      if (data.sessionString) setSession(data.sessionString);
      // Remove from local state immediately
      const store = useTelegramStore.getState();
      store.setMessages(store.messages.filter((m) => m.id !== msg.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleCopy = () => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text).catch(() => {});
    }
    setShowMenu(false);
  };

  // Find replied message preview
  const repliedMsg = msg.replyToId ? messages.find((m) => m.id === msg.replyToId) : null;

  return (
    <div
      className={`flex mb-1.5 ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}
    >
      <div
        ref={bubbleRef}
        onContextMenu={handleContextMenu}
        className={`
          relative max-w-[80%] sm:max-w-[75%] select-text
          ${isSticker
            ? 'bg-transparent'
            : msg.isOutgoing
              ? 'bg-tg-msg-out text-white rounded-2xl rounded-br-md px-3 py-2'
              : 'bg-tg-msg-in text-tg-tx rounded-2xl rounded-bl-md px-3 py-2'
          }
        `}
      >
        {/* Sender name in groups */}
        {isGroup && !msg.isOutgoing && msg.senderName && !isSticker && (
          <p
            className="text-xs font-semibold mb-0.5 truncate"
            style={{ color: getSenderColor(msg.senderName) }}
          >
            {msg.senderName}
          </p>
        )}

        {/* Reply indicator */}
        {repliedMsg && !isSticker && (
          <div className="border-l-2 border-tg-accent pl-2 mb-1.5 py-0.5 opacity-70">
            {repliedMsg.senderName && (
              <p className="text-[10px] font-semibold text-tg-accent">{repliedMsg.senderName}</p>
            )}
            <p className="text-[11px] truncate max-w-[200px]">
              {repliedMsg.text || (repliedMsg.mediaType ? `[${repliedMsg.mediaType}]` : 'Message')}
            </p>
          </div>
        )}

        {/* Media */}
        {RENDERABLE_MEDIA.includes(msg.mediaType || '') && (
          <div className={isSticker ? '' : 'mb-1'}>
            <MediaViewer messageId={msg.id} mediaType={msg.mediaType} />
          </div>
        )}

        {/* Non-renderable media placeholder */}
        {msg.mediaType && !RENDERABLE_MEDIA.includes(msg.mediaType) && !msg.text && (
          <span className="italic text-tg-tx2 text-xs">[{msg.mediaType}]</span>
        )}

        {/* Text */}
        {msg.text && !isSticker && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.text}</p>
        )}

        {/* Non-renderable media tag with text */}
        {msg.mediaType && !RENDERABLE_MEDIA.includes(msg.mediaType) && msg.text && (
          <span className="italic text-tg-tx2 text-[10px] block mt-1">[{msg.mediaType}]</span>
        )}

        {/* Time */}
        {!isSticker && (
          <span className={`text-[10px] float-right ml-3 mt-1 ${msg.isOutgoing ? 'text-white/40' : 'text-tg-tx2/60'}`}>
            {formatMessageTime(msg.date)}
          </span>
        )}

        {/* Context Menu */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute z-50 bg-tg-sidebar border border-tg-border rounded-xl shadow-2xl py-1 min-w-[150px] animate-fade-in"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              onClick={handleReply}
              className="w-full px-3 py-2 text-left text-sm text-tg-tx hover:bg-tg-hover flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4 text-tg-tx2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply
            </button>
            {msg.isOutgoing && msg.text && (
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2 text-left text-sm text-tg-tx hover:bg-tg-hover flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-tg-tx2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            {msg.text && (
              <button
                onClick={handleCopy}
                className="w-full px-3 py-2 text-left text-sm text-tg-tx hover:bg-tg-hover flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-tg-tx2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            )}
            <div className="border-t border-tg-border/30 my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
