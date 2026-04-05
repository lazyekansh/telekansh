'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';
import MessageInput from '@/components/MessageInput';

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

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDate(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return 'Today';
  }
  if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ChatWindow() {
  const {
    session, selectedChat, messages, loadingMessages,
    setMessages, setLoadingMessages, setSession, setError,
  } = useTelegramStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!session || !selectedChat) return;
    try {
      setLoadingMessages(true);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          chatId: selectedChat.id,
          peerType: selectedChat.peerType,
          accessHash: selectedChat.accessHash,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setMessages(data.messages);
      if (data.sessionString) setSession(data.sessionString);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [session, selectedChat, setMessages, setLoadingMessages, setSession, setError]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      intervalRef.current = setInterval(fetchMessages, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedChat, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Empty state
  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-tg-bg">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-tg-panel/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-tg-tx2/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-tg-tx2/50 mb-1">Select a Chat</h2>
          <p className="text-sm text-tg-tx2/30">Choose a conversation from the sidebar</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof messages }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const dateStr = formatMessageDate(msg.date);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedMessages.push({ date: dateStr, msgs: [] });
    }
    groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  const peerLabel = selectedChat.peerType === 'user' ? 'Private' : selectedChat.peerType === 'channel' ? 'Channel' : 'Group';

  return (
    <div className="flex-1 flex flex-col h-screen bg-tg-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-tg-border/30 bg-tg-sidebar flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ backgroundColor: getAvatarColor(selectedChat.name) }}
        >
          {getInitials(selectedChat.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{selectedChat.name}</h2>
          <p className="text-[11px] text-tg-tx2">{peerLabel}</p>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loadingMessages}
          className="p-2 rounded-lg text-tg-tx2 hover:text-tg-tx hover:bg-tg-hover transition-all"
          title="Refresh messages"
          id="refresh-messages-btn"
        >
          <svg className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4" id="messages-container">
        {loadingMessages && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-tg-accent/30 border-t-tg-accent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-tg-tx2/50 text-sm">
            No messages yet
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-1">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 bg-tg-panel/60 text-tg-tx2 text-xs rounded-full font-medium">
                    {group.date}
                  </span>
                </div>

                {/* Messages */}
                {group.msgs.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-1 ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                        ${msg.isOutgoing
                          ? 'bg-tg-msg-out text-white rounded-br-md'
                          : 'bg-tg-msg-in text-tg-tx rounded-bl-md'
                        }
                      `}
                    >
                      {msg.mediaType && !msg.text && (
                        <span className="italic text-tg-tx2 text-xs">[{msg.mediaType}]</span>
                      )}
                      {msg.text && (
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      )}
                      {msg.mediaType && msg.text && (
                        <span className="italic text-tg-tx2 text-[10px] block mt-1">[{msg.mediaType}]</span>
                      )}
                      <span className={`text-[10px] float-right ml-3 mt-1 ${msg.isOutgoing ? 'text-white/40' : 'text-tg-tx2/60'}`}>
                        {formatMessageTime(msg.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <MessageInput />
    </div>
  );
}
