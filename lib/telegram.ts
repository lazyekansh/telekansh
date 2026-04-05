import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
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
    const srpPassword = await (client as any)._computePasswordCheck(passwordSrp, password);
    const result = await client.invoke(
      new Api.auth.CheckPassword({
        password: srpPassword,
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

      dialogs.push({
        id: d.id?.toString() || entity.id.toString(),
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
  const id = bigInt(chatId);
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
          mediaType = msg.media.className?.replace('MessageMedia', '') || 'Media';
        }
        return {
          id: msg.id,
          text: msg.message || '',
          date: msg.date || 0,
          isOutgoing: Boolean(msg.out),
          mediaType,
        };
      })
      .reverse(); // API returns newest-first, we want oldest-first

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
  message: string
): Promise<{ success: boolean; sessionString: string }> {
  const client = createClient(sessionString);
  try {
    await client.connect();
    const peer = buildInputPeer(chatId, peerType, accessHash);
    await client.sendMessage(peer, { message });
    return { success: true, sessionString: snap(client) };
  } finally {
    await client.disconnect();
  }
}
