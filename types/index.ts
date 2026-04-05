export interface Dialog {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageDate: number;
  unreadCount: number;
  peerType: 'user' | 'chat' | 'channel';
  accessHash: string;
}

export interface Message {
  id: number;
  text: string;
  date: number;
  isOutgoing: boolean;
  mediaType?: string;
}

export interface TgUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

export type AuthStep = 'phone' | 'otp' | 'password' | 'done';
