'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';

export default function MessageInput() {
  const {
    session, selectedChat, sending,
    setSending, setSession, setError,
  } = useTelegramStore();

  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedTextRef = useRef('');

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; // max ~5 lines
  }, [text]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !session || !selectedChat || sending) return;

    const messageText = text.trim();
    savedTextRef.current = messageText;
    setText('');
    setSending(true);

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          chatId: selectedChat.id,
          peerType: selectedChat.peerType,
          accessHash: selectedChat.accessHash,
          message: messageText,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setText(savedTextRef.current); // restore on fail
        setError(data.error);
        return;
      }
      if (data.sessionString) setSession(data.sessionString);
      savedTextRef.current = '';

      // Trigger a quick message refresh
      const msgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: data.sessionString || session,
          chatId: selectedChat.id,
          peerType: selectedChat.peerType,
          accessHash: selectedChat.accessHash,
        }),
      });
      const msgData = await msgRes.json();
      if (msgData.messages) {
        useTelegramStore.getState().setMessages(msgData.messages);
      }
    } catch (err: any) {
      setText(savedTextRef.current); // restore on fail
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [text, session, selectedChat, sending, setSending, setSession, setError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-tg-border/30 bg-tg-sidebar px-4 py-3 flex-shrink-0">
      <div className="max-w-3xl mx-auto flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          disabled={sending}
          className="flex-1 bg-tg-panel border border-tg-border/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-tg-tx2/40 focus:outline-none focus:ring-1 focus:ring-tg-accent/40 focus:border-tg-accent/40 transition-all disabled:opacity-50"
          style={{ maxHeight: '120px' }}
          id="message-input"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="p-2.5 bg-tg-accent hover:bg-tg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-all duration-200 flex-shrink-0 shadow-lg shadow-tg-accent/10"
          id="send-message-btn"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
