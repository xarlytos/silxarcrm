declare module 'whatsapp-web.js' {
  export class Client {
    constructor(options: ClientOptions);
    on(event: 'qr', listener: (qr: string) => void): this;
    on(event: 'authenticated', listener: () => void): this;
    on(event: 'auth_failure', listener: (msg: string) => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'disconnected', listener: (reason: string) => void): this;
    on(event: 'message_create', listener: (msg: Message) => void): this;
    on(event: 'message', listener: (msg: Message) => void): this;
    initialize(): Promise<void>;
    destroy(): Promise<void>;
    sendMessage(chatId: string, content: string): Promise<Message>;
    getState(): Promise<string>;
    info: ClientInfo;
    isRegisteredUser(chatId: string): Promise<boolean>;
  }

  export interface ClientOptions {
    authStrategy: AuthStrategy;
    puppeteer?: {
      headless?: boolean;
      args?: string[];
      defaultViewport?: { width: number; height: number };
      executablePath?: string;
    };
    qrMaxRetries?: number;
    takeoverOnConflict?: boolean;
    takeoverTimeoutMs?: number;
  }

  export interface AuthStrategy {
    // Base class
  }

  export class LocalAuth implements AuthStrategy {
    constructor(options?: { dataPath?: string; clientId?: string });
  }

  export class NoAuth implements AuthStrategy {
    constructor();
  }

  export interface ClientInfo {
    pushname?: string;
    platform?: string;
    wid: {
      user: string;
    };
  }

  export class Message {
    id: { id: string };
    body: string;
    from: string;
    to: string;
    fromMe: boolean;
    timestamp: number;
    ack: number;
    hasMedia: boolean;
    hasQuotedMsg: boolean;
    deviceType: string;
    isForwarded: boolean;
    forwardingScore: number;
    isStatus: boolean;
    isStarred: boolean;
    broadcast: boolean;
    type: string;
    getChat(): Promise<Chat>;
    getContact(): Promise<Contact>;
    reply(content: string): Promise<Message>;
    delete(everyone: boolean): Promise<void>;
    react(reaction: string): Promise<void>;
    acceptInvite(): Promise<string>;
    getMentions(): Promise<Contact[]>;
    getQuotedMessage(): Promise<Message>;
  }

  export interface Chat {
    id: { user: string };
    name: string;
    isGroup: boolean;
    unreadCount: number;
    timestamp: number;
    pinned: boolean;
    archive: boolean;
    muteExpiration: number;
    sendMessage(content: string): Promise<Message>;
    sendStateTyping(): Promise<void>;
    sendStateRecording(): Promise<void>;
    clearState(): Promise<void>;
    delete(): Promise<void>;
    fetchMessages(options: { limit?: number }): Promise<Message[]>;
  }

  export interface Contact {
    id: { user: string };
    number: string;
    isBusiness: boolean;
    isEnterprise: boolean;
    name: string;
    pushname: string;
    sectionHeader: string;
    shortName: string;
    labels: any[];
    type: string;
    isMe: boolean;
    isUser: boolean;
    isGroup: boolean;
    isWAContact: boolean;
    getProfilePicUrl(): Promise<string>;
    getChat(): Promise<Chat>;
  }
}

declare module 'qrcode-terminal' {
  export function generate(text: string, options?: { small?: boolean }): void;
}
