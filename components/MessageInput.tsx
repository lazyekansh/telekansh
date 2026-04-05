'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';

export default function MessageInput() {
  const {
    session, selectedChat, sending, replyToMessage, editingMessage,
    setSending, setSession, setError, clearReplyTo, clearEditing,
  } = useTelegramStore();

  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedTextRef = useRef('');

  // When entering edit mode, populate the textarea
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // When entering reply mode, focus
  useEffect(() => {
    if (replyToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyToMessage]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !session || !selectedChat || sending) return;

    const messageText = text.trim();
    savedTextRef.current = messageText;
    setText('');
    setSending(true);

    try {
      // Edit mode
      if (editingMessage) {
        const res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session,
            chatId: selectedChat.id,
            peerType: selectedChat.peerType,
            accessHash: selectedChat.accessHash,
            messageId: editingMessage.id,
            text: messageText,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setText(savedTextRef.current);
          setError(data.error);
          return;
        }
        if (data.sessionString) setSession(data.sessionString);
        clearEditing();
      } else {
        // Normal send (with optional reply)
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session,
            chatId: selectedChat.id,
            peerType: selectedChat.peerType,
            accessHash: selectedChat.accessHash,
            message: messageText,
            replyToMsgId: replyToMessage?.id,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setText(savedTextRef.current);
          setError(data.error);
          return;
        }
        if (data.sessionString) setSession(data.sessionString);
        clearReplyTo();
      }

      savedTextRef.current = '';

      // Quick refresh messages
      const msgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: useTelegramStore.getState().session,
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
      setText(savedTextRef.current);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [text, session, selectedChat, sending, editingMessage, replyToMessage, setSending, setSession, setError, clearEditing, clearReplyTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape to cancel reply/edit
    if (e.key === 'Escape') {
      if (editingMessage) {
        clearEditing();
        setText('');
      }
      if (replyToMessage) {
        clearReplyTo();
      }
    }
  };

  const handleCancelAction = () => {
    if (editingMessage) {
      clearEditing();
      setText('');
    }
    if (replyToMessage) {
      clearReplyTo();
    }
  };

  return (
    <div className="border-t border-tg-border/30 bg-tg-sidebar flex-shrink-0">
      {/* Reply / Edit indicator bar */}
      {(replyToMessage || editingMessage) && (
        <div className="px-4 py-2 flex items-center gap-3 border-b border-tg-border/20 animate-fade-in">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {editingMessage ? (
                <svg className="w-3.5 h-3.5 text-tg-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-tg-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              )}
              <span className="text-xs font-semibold text-tg-accent">
                {editingMessage ? 'Editing message' : `Reply to ${replyToMessage?.senderName || 'message'}`}
              </span>
            </div>
            <p className="text-xs text-tg-tx2 truncate mt-0.5 max-w-[300px]">
              {(editingMessage || replyToMessage)?.text || '[Media]'}
            </p>
          </div>
          <button
            onClick={handleCancelAction}
            className="p-1.5 rounded-lg text-tg-tx2 hover:text-tg-tx hover:bg-tg-hover transition-all flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-3 sm:px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2 sm:gap-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Edit message...' : 'Write a message...'}
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
            ) : editingMessage ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
