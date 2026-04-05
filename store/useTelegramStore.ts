'use client';

import { create } from 'zustand';
import type { AuthStep, Dialog, Message, TgUser } from '@/types';

const SESSION_KEY = 'tk_session';

interface TelegramState {
  // Auth
  phone: string;
  phoneCodeHash: string;
  session: string;
  authStep: AuthStep;
  user: TgUser | null;
  error: string;

  // Chat data
  dialogs: Dialog[];
  messages: Message[];
  selectedChat: Dialog | null;

  // Message actions
  replyToMessage: Message | null;
  editingMessage: Message | null;

  // Loading flags
  loadingAuth: boolean;
  loadingDialogs: boolean;
  loadingMessages: boolean;
  sending: boolean;

  // Actions
  setPhone: (phone: string) => void;
  setPhoneCodeHash: (hash: string) => void;
  setSession: (session: string) => void;
  setAuthStep: (step: AuthStep) => void;
  setUser: (user: TgUser) => void;
  setError: (error: string) => void;
  setDialogs: (dialogs: Dialog[]) => void;
  setMessages: (messages: Message[]) => void;
  setSelectedChat: (chat: Dialog | null) => void;
  setReplyTo: (msg: Message | null) => void;
  setEditing: (msg: Message | null) => void;
  clearReplyTo: () => void;
  clearEditing: () => void;
  setLoadingAuth: (v: boolean) => void;
  setLoadingDialogs: (v: boolean) => void;
  setLoadingMessages: (v: boolean) => void;
  setSending: (v: boolean) => void;
  boot: () => void;
  logout: () => void;
}

export const useTelegramStore = create<TelegramState>((set) => ({
  phone: '',
  phoneCodeHash: '',
  session: '',
  authStep: 'phone',
  user: null,
  error: '',
  dialogs: [],
  messages: [],
  selectedChat: null,
  replyToMessage: null,
  editingMessage: null,
  loadingAuth: false,
  loadingDialogs: false,
  loadingMessages: false,
  sending: false,

  setPhone: (phone) => set({ phone }),
  setPhoneCodeHash: (phoneCodeHash) => set({ phoneCodeHash }),
  setSession: (session) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, session);
    }
    set({ session });
  },
  setAuthStep: (authStep) => set({ authStep }),
  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
  setDialogs: (dialogs) => set({ dialogs }),
  setMessages: (messages) => set({ messages }),
  setSelectedChat: (selectedChat) => set({ selectedChat, messages: [], replyToMessage: null, editingMessage: null }),
  setReplyTo: (replyToMessage) => set({ replyToMessage, editingMessage: null }),
  setEditing: (editingMessage) => set({ editingMessage, replyToMessage: null }),
  clearReplyTo: () => set({ replyToMessage: null }),
  clearEditing: () => set({ editingMessage: null }),
  setLoadingAuth: (loadingAuth) => set({ loadingAuth }),
  setLoadingDialogs: (loadingDialogs) => set({ loadingDialogs }),
  setLoadingMessages: (loadingMessages) => set({ loadingMessages }),
  setSending: (sending) => set({ sending }),

  boot: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      set({ session: saved, authStep: 'done' });
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    set({
      phone: '',
      phoneCodeHash: '',
      session: '',
      authStep: 'phone',
      user: null,
      error: '',
      dialogs: [],
      messages: [],
      selectedChat: null,
      replyToMessage: null,
      editingMessage: null,
      loadingAuth: false,
      loadingDialogs: false,
      loadingMessages: false,
      sending: false,
    });
  },
}));
