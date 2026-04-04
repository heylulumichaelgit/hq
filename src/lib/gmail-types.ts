export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  labelIds: string[];
  isUnread: boolean;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  body: string;
  snippet: string;
  labelIds: string[];
  headers: Record<string, string>;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface SendMessageOptions {
  cc?: string;
  bcc?: string;
  replyTo?: string;
  threadId?: string;
  inReplyTo?: string;
}
