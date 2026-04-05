import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { computeCheck } from 'telegram/Password';
import bigInt from 'big-integer';
import type { Dialog, Message, TgUser } from '@/types';

const apiId = parseInt(process.env.TG_API_ID || '0', 10);
const apiHash = process.env.TG_API_HASH || '';

// Silence GramJS logger (handle both old and new API)
try {
  const { Logger } = require('telegram/extensions');
  if (Logger && typeof Logger.setLevel === 'function') {
    Logger.setLevel('none');
  }
} catch {
  // Logger not available, ignore
}

function createClient(sessionString: string = ''): TelegramClient {
  const session = new StringSession(sessionString);
  return new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
    useWSS: false,
  });
}

function snap(client: TelegramClient): string {
  return (client.session as StringSession).save();
}

// ─── Auth ───────────────────────────────────────────────────────────

export async function sendCode(phone: string) {
  const client = createClient();
  try {
    await client.connect();
    const result = await client.sendCode(
      { apiId, apiHash },
      phone
    );
    const sessionString = snap(client);
    return { phoneCodeHash: result.phoneCodeHash, sessionString };
  } finally {
    await client.disconnect();
  }
}

export async function signIn(
  sessionString: string,
  phone: string,
  phoneCodeHash: string,
  code: string
): Promise<{ sessionString: string; user?: TgUser; needs2FA?: boolean }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    try {
      const result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      );
      const updatedSession = snap(client);
      const u = (result as any).user;
      const user: TgUser = {
        id: u.id.toString(),
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        username: u.username || '',
      };
      return { sessionString: updatedSession, user };
    } catch (err: any) {
      if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        return { sessionString: snap(client), needs2FA: true };
      }
      throw err;
    }
  } finally {
    await client.disconnect();
  }
}

export async function checkPassword(
  sessionString: string,
  password: string
): Promise<{ sessionString: string; user: TgUser }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const passwordSrp = await client.invoke(new Api.account.GetPassword());
    const srpResult = await computeCheck(passwordSrp, password);
    const result = await client.invoke(
      new Api.auth.CheckPassword({
        password: srpResult,
      })
    );
    const updatedSession = snap(client);
    const u = (result as any).user;
    const user: TgUser = {
      id: u.id.toString(),
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      username: u.username || '',
    };
    return { sessionString: updatedSession, user };
  } finally {
    await client.disconnect();
  }
}

// ─── Dialogs ────────────────────────────────────────────────────────

export async function getDialogs(
  sessionString: string,
  limit: number = 40
): Promise<{ dialogs: Dialog[]; sessionString: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const result = await client.getDialogs({ limit });
    const dialogs: Dialog[] = [];

    for (const d of result) {
      if (!d.entity) continue;

      const entity = d.entity;
      const className = entity.className;
      let peerType: 'user' | 'chat' | 'channel';
      let accessHash = '0';
      let name = '';

      if (className === 'User') {
        peerType = 'user';
        const u = entity as Api.User;
        accessHash = u.accessHash?.toString() || '0';
        name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Unknown';
      } else if (className === 'Chat') {
        peerType = 'chat';
        const c = entity as Api.Chat;
        name = c.title || 'Unnamed Chat';
      } else if (className === 'Channel') {
        peerType = 'channel';
        const ch = entity as Api.Channel;
        accessHash = ch.accessHash?.toString() || '0';
        name = ch.title || 'Unnamed Channel';
      } else {
        continue;
      }

      const entityId = entity.id.toString();

      dialogs.push({
        id: entityId,
        name,
        lastMessage: d.message?.message || '',
        lastMessageDate: d.message?.date || 0,
        unreadCount: d.unreadCount || 0,
        peerType,
        accessHash,
      });
    }

    return { dialogs, sessionString: snap(client) };
  } finally {
    await client.disconnect();
  }
}

// ─── Messages ───────────────────────────────────────────────────────

function buildInputPeer(chatId: string, peerType: string, accessHash: string) {
  const rawId = bigInt(chatId);
  const id = rawId.isNegative() ? rawId.abs() : rawId;
  const hash = bigInt(accessHash);
  switch (peerType) {
    case 'user':
      return new Api.InputPeerUser({ userId: id, accessHash: hash });
    case 'chat':
      return new Api.InputPeerChat({ chatId: id });
    case 'channel':
      return new Api.InputPeerChannel({ channelId: id, accessHash: hash });
    default:
      throw new Error(`Unknown peer type: ${peerType}`);
  }
}

export async function getMessages(
  sessionString: string,
  chatId: string,
  peerType: string,
  accessHash: string,
  limit: number = 50
): Promise<{ messages: Message[]; sessionString: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const peer = buildInputPeer(chatId, peerType, accessHash);
    const result = await client.getMessages(peer, { limit });

    const messages: Message[] = result
      .filter((m: any) => m.className === 'Message')
      .map((msg: any) => {
        let mediaType: string | undefined;
        if (msg.media) {
          const mc = msg.media.className || '';
          if (mc === 'MessageMediaPhoto') {
            mediaType = 'Photo';
          } else if (mc === 'MessageMediaDocument') {
            const doc = (msg.media as any).document;
            const mime = doc?.mimeType || '';
            if (mime === 'image/webp' || mime === 'application/x-tgsticker') {
              mediaType = 'Sticker';
            } else if (mime.startsWith('video/')) {
              mediaType = 'Video';
            } else if (mime === 'image/gif' || mime === 'video/mp4') {
              // GIFs are often stored as mp4 in Telegram
              const isGif = doc?.attributes?.some((a: any) => a.className === 'DocumentAttributeAnimated');
              mediaType = isGif ? 'GIF' : (mime.startsWith('video/') ? 'Video' : 'Document');
            } else {
              mediaType = 'Document';
            }
          } else if (mc === 'MessageMediaWebPage') {
            mediaType = undefined; // web page previews are just text
          } else {
            mediaType = mc.replace('MessageMedia', '') || 'Media';
          }
        }

        // Extract sender info for groups
        let senderName: string | undefined;
        let senderId: string | undefined;
        if (msg.fromId) {
          senderId = msg.fromId.userId?.toString() || msg.fromId.channelId?.toString() || undefined;
        }
        // Try to get sender name from the message's sender entity
        if (msg._sender) {
          const s = msg._sender;
          if (s.firstName || s.lastName) {
            senderName = [s.firstName, s.lastName].filter(Boolean).join(' ');
          } else if (s.title) {
            senderName = s.title;
          } else if (s.username) {
            senderName = s.username;
          }
        }

        // Extract reply info
        let replyToId: number | undefined;
        if (msg.replyTo && msg.replyTo.replyToMsgId) {
          replyToId = msg.replyTo.replyToMsgId;
        }

        return {
          id: msg.id,
          text: msg.message || '',
          date: msg.date || 0,
          isOutgoing: Boolean(msg.out),
          mediaType,
          replyToId,
          senderName,
          senderId,
        };
      })
      .reverse();

    return { messages, sessionString: snap(client) };
  } finally {
    await client.disconnect();
  }
}

// ─── Send ───────────────────────────────────────────────────────────

export async function sendMessage(
  sessionString: string,
  chatId: string,
  peerType: string,
  accessHash: string,
  message: string,
  replyToMsgId?: number
): Promise<{ success: boolean; sessionString: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const peer = buildInputPeer(chatId, peerType, accessHash);
    await client.sendMessage(peer, { message, replyTo: replyToMsgId });
    return { success: true, sessionString: snap(client) };
  } finally {
    await client.disconnect();
  }
}

// ─── Edit ───────────────────────────────────────────────────────────

export async function editMessage(
  sessionString: string,
  chatId: string,
  peerType: string,
  accessHash: string,
  messageId: number,
  newText: string
): Promise<{ success: boolean; sessionString: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const peer = buildInputPeer(chatId, peerType, accessHash);
    await client.invoke(
      new Api.messages.EditMessage({
        peer,
        id: messageId,
        message: newText,
      })
    );
    return { success: true, sessionString: snap(client) };
  } finally {
    await client.disconnect();
  }
}

// ─── Delete ─────────────────────────────────────────────────────────

export async function deleteMessages(
  sessionString: string,
  chatId: string,
  peerType: string,
  accessHash: string,
  messageIds: number[],
  revoke: boolean = true
): Promise<{ success: boolean; sessionString: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    if (peerType === 'channel') {
      const peer = buildInputPeer(chatId, peerType, accessHash);
      await client.invoke(
        new Api.channels.DeleteMessages({
          channel: peer as Api.InputPeerChannel,
          id: messageIds,
        })
      );
    } else {
      await client.invoke(
        new Api.messages.DeleteMessages({
          id: messageIds,
          revoke,
        })
      );
    }
    return { success: true, sessionString: snap(client) };
  } finally {
    await client.disconnect();
  }
}

// ─── Media ──────────────────────────────────────────────────────────

export async function downloadMedia(
  sessionString: string,
  chatId: string,
  peerType: string,
  accessHash: string,
  messageId: number
): Promise<{ base64Data: string; mimeType: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const peer = buildInputPeer(chatId, peerType, accessHash);
    const messages = await client.getMessages(peer, { ids: [messageId] });

    if (!messages || messages.length === 0) {
      throw new Error('Message not found');
    }

    const msg = messages[0];
    const buffer = await client.downloadMedia(msg, {});

    if (!buffer) {
      throw new Error('Failed to download media or media not supported');
    }

    let mimeType = 'application/octet-stream';
    if (msg.media && (msg.media as any).className === 'MessageMediaPhoto') {
      mimeType = 'image/jpeg';
    } else if (msg.media && (msg.media as any).className === 'MessageMediaDocument') {
      const doc = (msg.media as any).document;
      if (doc && doc.mimeType) {
        mimeType = doc.mimeType;
      }
    }

    const base64Data = buffer.toString('base64');
    return { base64Data, mimeType };

  } finally {
    await client.disconnect();
  }
}

// ─── Avatar ─────────────────────────────────────────────────────────

export async function downloadAvatar(
  sessionString: string,
  peerId: string,
  peerType: string,
  accessHash: string
): Promise<{ base64Data: string | null }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const peer = buildInputPeer(peerId, peerType, accessHash);
    const buffer = await client.downloadProfilePhoto(peer);

    if (!buffer || (buffer instanceof Buffer && buffer.length === 0)) {
      return { base64Data: null };
    }

    const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    return { base64Data };
  } catch {
    return { base64Data: null };
  } finally {
    await client.disconnect();
  }
}
