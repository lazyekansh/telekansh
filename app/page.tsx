'use client';

import { useEffect } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';
import AuthFlow from '@/components/AuthFlow';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  const { authStep, boot } = useTelegramStore();

  useEffect(() => {
    boot();
  }, [boot]);

  if (authStep !== 'done') {
    return <AuthFlow />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ChatList />
      <ChatWindow />
    </div>
  );
}
