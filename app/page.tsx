'use client';

import { useEffect } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';
import AuthFlow from '@/components/AuthFlow';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  const { authStep, selectedChat, boot } = useTelegramStore();

  useEffect(() => {
    boot();

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, [boot]);

  if (authStep !== 'done') {
    return <AuthFlow />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar: hidden on mobile when a chat is selected */}
      <div className={`
        w-full md:w-80 md:min-w-[320px] h-screen flex-shrink-0
        ${selectedChat ? 'hidden md:flex' : 'flex'}
      `}>
        <ChatList />
      </div>

      {/* Chat window: hidden on mobile when no chat selected */}
      <div className={`
        flex-1 h-screen min-w-0
        ${selectedChat ? 'flex' : 'hidden md:flex'}
      `}>
        <ChatWindow />
      </div>
    </div>
  );
}
