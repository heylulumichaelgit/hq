import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type {
  GmailMessageSummary,
  GmailMessage,
  GmailProfile,
  SendMessageOptions,
} from "./gmail-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode a base64url-encoded string to UTF-8. */
function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

/** Extract a header value by name (case-insensitive). */
function getHeader(
  headers: { name?: string | null; value?: string | null }[],
  name: string
): string {
  const lower = name.toLowerCase();
  return headers.find((h) => h.name?.toLowerCase() === lower)?.value ?? "";
}

/** Walk a multipart message tree and return the best text body.
 *  Prefers text/plain, falls back to text/html. */
function extractBody(
  payload: { mimeType?: string | null; body?: { data?: string | null }; parts?: typeof payload[] }
): string {
  // Leaf node with data
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (!payload.parts || payload.parts.length === 0) return "";

  // Look for text/plain first, then text/html
  let plainPart: typeof payload | undefined;
  let htmlPart: typeof payload | undefined;

  for (const part of payload.parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      plainPart = part;
    } else if (part.mimeType === "text/html" && part.body?.data) {
      htmlPart = part;
    } else if (part.mimeType?.startsWith("multipart/")) {
      // Recurse into nested multipart
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data);
  if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data);

  return "";
}

/** Strip CR/LF to prevent header injection attacks. */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "");
}

/** Build a raw RFC 2822 message and return it base64url-encoded. */
function buildRawMessage(
  to: string,
  subject: string,
  body: string,
  options?: SendMessageOptions
): string {
  const lines: string[] = [];
  lines.push(`To: ${sanitizeHeader(to)}`);
  if (options?.cc) lines.push(`Cc: ${sanitizeHeader(options.cc)}`);
  if (options?.bcc) lines.push(`Bcc: ${sanitizeHeader(options.bcc)}`);
  lines.push(`Subject: ${sanitizeHeader(subject)}`);
  lines.push("Content-Type: text/plain; charset=utf-8");
  lines.push("MIME-Version: 1.0");
  if (options?.replyTo) lines.push(`Reply-To: ${sanitizeHeader(options.replyTo)}`);
  if (options?.inReplyTo) {
    lines.push(`In-Reply-To: ${sanitizeHeader(options.inReplyTo)}`);
    lines.push(`References: ${sanitizeHeader(options.inReplyTo)}`);
  }
  lines.push(""); // blank line separating headers from body
  lines.push(body);

  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Search / list messages. Returns summaries with key headers. */
export async function listMessages(
  auth: OAuth2Client,
  query?: string,
  maxResults = 20
): Promise<GmailMessageSummary[]> {
  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query || undefined,
    maxResults,
  });

  const messageIds = listRes.data.messages ?? [];
  if (messageIds.length === 0) return [];

  // Fetch metadata with bounded concurrency to avoid Gmail rate limits
  const CONCURRENCY = 10;
  type MsgData = { id?: string | null; threadId?: string | null; snippet?: string | null; labelIds?: string[] | null; payload?: { headers?: { name?: string | null; value?: string | null }[] | null } | null };
  const allMessages: MsgData[] = [];

  for (let i = 0; i < messageIds.length; i += CONCURRENCY) {
    const batch = messageIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (m) => {
        const res = await gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });
        return res.data;
      })
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") allMessages.push(r.value);
    }
  }

  const summaries: GmailMessageSummary[] = [];
  for (const msg of allMessages) {
    const headers = msg.payload?.headers ?? [];
    summaries.push({
      id: msg.id ?? "",
      threadId: msg.threadId ?? "",
      snippet: msg.snippet ?? "",
      from: getHeader(headers, "From"),
      subject: getHeader(headers, "Subject"),
      date: getHeader(headers, "Date"),
      labelIds: msg.labelIds ?? [],
      isUnread: (msg.labelIds ?? []).includes("UNREAD"),
    });
  }

  return summaries;
}

/** Fetch a full message with decoded body. */
export async function getMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<GmailMessage> {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const msg = res.data;
  const headers = msg.payload?.headers ?? [];
  const headerMap: Record<string, string> = {};
  for (const h of headers) {
    if (h.name && h.value) headerMap[h.name] = h.value;
  }

  const body = msg.payload ? extractBody(msg.payload as Parameters<typeof extractBody>[0]) : "";

  return {
    id: msg.id ?? "",
    threadId: msg.threadId ?? "",
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    cc: getHeader(headers, "Cc"),
    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    body,
    snippet: msg.snippet ?? "",
    labelIds: msg.labelIds ?? [],
    headers: headerMap,
  };
}

/** Compose and send an email. Returns the sent message id and threadId. */
export async function sendMessage(
  auth: OAuth2Client,
  to: string,
  subject: string,
  body: string,
  options?: SendMessageOptions
): Promise<{ id: string; threadId: string }> {
  const gmail = google.gmail({ version: "v1", auth });

  const raw = buildRawMessage(to, subject, body, options);

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: options?.threadId || undefined,
    },
  });

  return {
    id: res.data.id ?? "",
    threadId: res.data.threadId ?? "",
  };
}

/** Modify message labels (archive, mark read, etc). */
export async function modifyMessage(
  auth: OAuth2Client,
  messageId: string,
  addLabelIds?: string[],
  removeLabelIds?: string[]
): Promise<{ id: string; labelIds: string[] }> {
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: addLabelIds ?? [],
      removeLabelIds: removeLabelIds ?? [],
    },
  });

  return {
    id: res.data.id ?? "",
    labelIds: res.data.labelIds ?? [],
  };
}

/** Get the authenticated user's Gmail profile. */
export async function getProfile(auth: OAuth2Client): Promise<GmailProfile> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.getProfile({ userId: "me" });

  return {
    emailAddress: res.data.emailAddress ?? "",
    messagesTotal: res.data.messagesTotal ?? 0,
    threadsTotal: res.data.threadsTotal ?? 0,
    historyId: res.data.historyId ?? "",
  };
}


export async function getGoogleUserProfile(auth: OAuth2Client): Promise<{
  email: string | null;
  name: string | null;
  picture: string | null;
}> {
  const oauth2 = google.oauth2({ version: "v2", auth });
  const { data } = await oauth2.userinfo.get();
  return {
    email: data.email ?? null,
    name: data.name ?? null,
    picture: data.picture ?? null,
  };
}
